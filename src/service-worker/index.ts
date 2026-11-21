import { keepable, strategy, trimmed } from "#lib/offline.ts";
import { self } from "$app/service-worker";

// 回線が切れても、前に見たページを出す。回線があるあいだは何も変えない（いつも回線の応答を出し、その写しを取っておくだけ）。
// 決め事は src/lib/offline.ts。取っておくのはサーバーが「公開」と書いた応答だけなので、本人だけのページは端末に残らない。

// 前に見たページ・JSON・スクリプト。版をまたいで持ち続ける（デプロイのたびに空にすると、そのあとオフラインで何も出ない）
const SEEN = "seen-1";
const MAX_SEEN = 300;
// 何も取っていないページを開いたときの「オフラインです」
const SHELL = "shell-1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
	event.waitUntil(
		(async () => {
			// 新しい版のたびに取り直す。応答は作り直して入れる: 置き場所が /offline.html を /offline へ転送すると、
			// 転送を経た応答はページの表示には使えない（ブラウザが断る）
			const response = await fetch(OFFLINE, { cache: "reload" });
			if (!response.ok) throw new Error(`offline page: ${response.status}`);
			const cache = await caches.open(SHELL);
			await cache.put(
				OFFLINE,
				new Response(await response.blob(), { headers: response.headers }),
			);
			await self.skipWaiting();
		})(),
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			for (const name of await caches.keys())
				if (name !== SEEN && name !== SHELL) await caches.delete(name);
			await self.clients.claim();
		})(),
	);
});

// 応答の写しを取っておく。入れ直したものは並びの最後に回るので、上限を超えたら先頭（長く見ていないもの）から捨てる
async function keep(request: Request | string, copy: Response) {
	if (!keepable(copy.status, copy.headers.get("cache-control"))) return;
	try {
		const cache = await caches.open(SEEN);
		await cache.put(request, copy);
		for (const old of trimmed(await cache.keys(), MAX_SEEN))
			await cache.delete(old);
	} catch {
		// 容量が足りない、Vary: * など。取っておけないだけで、表示は変わらない
	}
}

async function networkFirst(event: FetchEvent): Promise<Response> {
	try {
		const response = await fetch(event.request);
		event.waitUntil(keep(event.request, response.clone()));
		return response;
	} catch (e) {
		const seen = await caches.match(event.request);
		if (seen) return seen;
		const offline =
			event.request.mode === "navigate" && (await caches.match(OFFLINE));
		if (offline) return offline;
		throw e;
	}
}

async function cacheFirst(event: FetchEvent): Promise<Response> {
	const seen = await caches.match(event.request);
	if (seen) return seen;
	const response = await fetch(event.request);
	event.waitUntil(keep(event.request, response.clone()));
	return response;
}

self.addEventListener("fetch", (event) => {
	const how = strategy(
		event.request.method,
		new URL(event.request.url),
		self.location.origin,
	);
	// null なら手を出さない（ブラウザがいつもどおり取りに行く）
	if (how === "network-first") event.respondWith(networkFirst(event));
	if (how === "cache-first") event.respondWith(cacheFirst(event));
});

// はじめて開いたページは、この Service Worker が動き出す前に読み込まれているので、写しが無い。
// ページの側から、いま開いているページと読み込んだファイルの URL を知らせてもらい、取っておく（+layout.svelte）。
// スクリプトはブラウザのキャッシュから来るので、回線に出るのはページの HTML ぶんだけ
async function warm(urls: unknown[]) {
	const cache = await caches.open(SEEN);
	for (const raw of urls.slice(0, 100)) {
		if (typeof raw !== "string") continue;
		try {
			const url = new URL(raw, self.location.origin);
			if (!strategy("GET", url, self.location.origin)) continue;
			if (await cache.match(url.href)) continue;
			await keep(url.href, await fetch(url.href));
		} catch {
			// 取れなかったものは、次に開いたときに取る
		}
	}
}

self.addEventListener("message", (event) => {
	if (event.data?.type === "warm" && Array.isArray(event.data.urls))
		event.waitUntil(warm(event.data.urls));
});
