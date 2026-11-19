import { env, waitUntil } from "cloudflare:workers";
import { cardVersion } from "#lib/card.ts";
import type { EventDetail } from "#lib/types.ts";
import { dev } from "$app/env";
import type { Db } from "./db";
import { getEvent } from "./events.ts";

// X で共有したときのカード画像。/e/{id}/card を Browser Run で撮って R2（cards/{id}.png）に置く。
const cardKey = (id: string) => `cards/${id}.png`;

// 今の版（cardVersion）の画像が置いてあれば返す
export async function storedCard(
	event: EventDetail,
): Promise<R2ObjectBody | null> {
	const stored = await env.MEDIA.get(cardKey(event.id));
	return stored?.customMetadata?.v === cardVersion(event) ? stored : null;
}

// 撮って置く。無料枠はブラウザ時間が 1 日 10 分、10 秒に 1 回まで。超えたら（429）null
export async function makeCard(
	event: EventDetail,
	origin: string,
): Promise<ArrayBuffer | null> {
	let shot: Response;
	try {
		shot = await env.BROWSER.quickAction("screenshot", {
			url: `${origin}/e/${event.id}/card`,
			viewport: { width: 1200, height: 630 },
			gotoOptions: { waitUntil: "networkidle0" },
		});
	} catch (e) {
		shot = new Response(String(e), { status: 502 });
	}
	if (!shot.ok) {
		console.error(`card ${event.id}: ${shot.status} ${await shot.text()}`);
		return null;
	}
	const png = await shot.arrayBuffer();
	await env.MEDIA.put(cardKey(event.id), png, {
		httpMetadata: { contentType: "image/png" },
		customMetadata: { v: cardVersion(event) },
	});
	return png;
}

// 会を開けた・直した・フライヤーを替えた直後に、返事を待たせずに作っておく。
// 撮るのに数秒かかるので、共有ボタンを押してから作り始めると、すぐ投稿されたときに X のクローラに間に合わない
export function warmCard(db: Db, id: string, origin: string): void {
	// vite dev の Browser Run は応答せず、サーバーごと固まる
	if (dev) return;
	waitUntil(
		(async () => {
			const event = await getEvent(db, id);
			if (event && !(await storedCard(event))) await makeCard(event, origin);
		})().catch((e) => console.error(`card ${id}: ${e}`)),
	);
}
