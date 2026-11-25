import * as workers from "cloudflare:workers";
import { env } from "cloudflare:workers";
import type { Handle } from "@sveltejs/kit/hooks";
import { createAuth } from "#lib/server/auth.ts";
import {
	cacheHeaders,
	PURGE_SETTLE_MS,
	PURGE_TAG,
	shouldPurge,
} from "#lib/server/cache.ts";
import { isCrossSite } from "#lib/server/cross-site.ts";
import { getDb } from "#lib/server/db/index.ts";
import { getActorForUser, syncAvatar } from "#lib/server/me.ts";
import { listManagedActors } from "#lib/server/spaces.ts";
import { encodeViewer, VIEWER_COOKIE } from "#lib/viewer.ts";

// 認証は一貫性が要るので常に primary。モジュールスコープで1回だけ生成する。
const auth = createAuth(getDb(env.DB), env);

// 直前の書き込み位置。これより新しいレプリカからしか読まない（D1 Sessions API）。
// 書き込み（GET 以外）のときだけ更新する。GET で Set-Cookie を付けると CDN がキャッシュしなくなるため。
const BOOKMARK_COOKIE = "d1b";

// どの応答にも付ける。中身を縛る CSP は vite.config.ts（スクリプトのハッシュを SvelteKit が足す）
const SECURITY_HEADERS = {
	"x-content-type-options": "nosniff",
	"referrer-policy": "strict-origin-when-cross-origin",
	// CSP の frame-ancestors を読まない古いブラウザ向け
	"x-frame-options": "DENY",
	"strict-transport-security": "max-age=31536000",
	"permissions-policy": "camera=(), microphone=(), geolocation=()",
};

// Workers Cache の purge。ローカル（vite dev、wrangler dev）には無いので、あるときだけ呼ぶ。
// 失敗しても書き込みは通す（古い中身は CACHE_PUBLIC の 5 分で切れる）
async function purgePublic() {
	const cache = workers.cache;
	if (!cache) return;
	try {
		const result = await cache.purge({ tags: [PURGE_TAG] });
		if (!result.success)
			console.error("cache purge failed", JSON.stringify(result.errors));
		// 届くまで待ってから返す。すぐ返すと、保存のあとの転送先で、直した本人に古いページが出る
		await new Promise((r) => setTimeout(r, PURGE_SETTLE_MS));
	} catch (e) {
		console.error("cache purge failed", e);
	}
}

// 表示専用の Cookie（src/lib/viewer.ts）を、今と違うときだけ書き直す。変えなくてよければ null
async function viewerCookie(
	event: Parameters<Handle>[0]["event"],
): Promise<string | null> {
	const { session, actor, db } = event.locals;
	const current = event.cookies.get(VIEWER_COOKIE, { decode: (v) => v });
	if (!session)
		return current === undefined
			? null
			: `${VIEWER_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0`;
	const wanted = encodeViewer({
		loggedIn: true,
		me: actor && {
			handle: actor.handle,
			name: actor.name,
			avatarUrl: actor.avatarUrl,
		},
		managed: [
			...(actor ? [actor.handle] : []),
			...(await listManagedActors(db, session.user.id)).map((a) => a.handle),
		],
	});
	if (wanted === current) return null;
	// ブラウザの JS が読むので HttpOnly にしない
	return `${VIEWER_COOKIE}=${wanted}; Path=/; SameSite=Lax; Max-Age=31536000${event.url.protocol === "https:" ? "; Secure" : ""}`;
}

export const handle: Handle = async ({ event, resolve }) => {
	if (isCrossSite(event.request, event.url.origin))
		return new Response("別のサイトからの書き込みは受け付けません", {
			status: 403,
		});

	const session = env.DB.withSession(
		event.cookies.get(BOOKMARK_COOKIE) ?? "first-unconstrained",
	);
	event.locals.db = getDb(session);
	event.locals.auth = auth;
	event.locals.session = await auth.api.getSession({
		headers: event.request.headers,
	});
	const actor = event.locals.session
		? await getActorForUser(event.locals.db, event.locals.session.user.id)
		: null;
	event.locals.actor =
		actor && event.locals.session
			? await syncAvatar(
					event.locals.db,
					actor,
					event.locals.session.user.image,
				)
			: actor;

	// アカウントの削除は途中でセッションを消すので、先に見ておく
	const loggedIn = !!event.locals.session;
	const response = await resolve(event, {
		// 公開ページの load が、元にした API の cache-control を読んで HTML にも付ける（src/lib/cache.ts）
		filterSerializedResponseHeaders: (name) => name === "cache-control",
	});
	for (const [name, value] of Object.entries(SECURITY_HEADERS))
		response.headers.set(name, value);

	// キャッシュに載せるのは、公開と書いた応答だけ（src/lib/server/cache.ts）
	const path = event.url.pathname;
	const cache = cacheHeaders(response.headers.get("cache-control"));
	for (const [name, value] of Object.entries(cache))
		response.headers.set(name, value);
	// 書き込みが通ったら、公開の応答をキャッシュから消す。このあとの転送先で古い中身を見せないよう、消してから返す
	if (shouldPurge(event.request.method, response.status, path, loggedIn))
		await purgePublic();
	// 表示専用の Cookie を今のログイン状態に合わせる。公開の応答には付けない（Set-Cookie の付いた応答はキャッシュに載らない）
	if (
		!cache["cache-control"].includes("public") &&
		!path.startsWith("/api/") &&
		!path.endsWith("/__data.json")
	) {
		const cookie = await viewerCookie(event);
		if (cookie) response.headers.append("set-cookie", cookie);
	}

	const bookmark = session.getBookmark();
	if (event.request.method !== "GET" && bookmark) {
		const res = new Response(response.body, response);
		res.headers.append(
			"set-cookie",
			`${BOOKMARK_COOKIE}=${bookmark}; Path=/; HttpOnly; SameSite=Lax; Max-Age=60`,
		);
		return res;
	}
	return response;
};
