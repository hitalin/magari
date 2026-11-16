import { env } from "cloudflare:workers";
import { error } from "@sveltejs/kit";
import { cardVersion } from "#lib/card.ts";
import { getEvent } from "#lib/server/events.ts";
import type { RequestHandler } from "./$types";

// X で共有したときのカード画像。/e/{id}/card を Browser Run で撮って R2（cards/{id}.png）に置く。
// 版（cardVersion）が同じ間は置いたものを返し、会を編集して版が変わったら撮り直す。
export const GET: RequestHandler = async ({ locals, params, url }) => {
	const event = await getEvent(locals.db, params.id);
	if (!event) error(404, "見つかりません");
	const version = cardVersion(event);
	const key = `cards/${event.id}.png`;
	const headers = {
		"content-type": "image/png",
		// 版つきの URL（og:image に書くもの）は中身が変わらない
		"cache-control":
			url.searchParams.get("v") === version
				? "public, max-age=31536000, immutable"
				: "public, max-age=300",
	};

	const stored = await env.MEDIA.get(key);
	if (stored?.customMetadata?.v === version)
		return new Response(stored.body, { headers });

	// 無料枠はブラウザ時間が 1 日 10 分、10 秒に 1 回まで。超えたら（429）その回は元の画像に逃がし、覚えさせない
	let shot: Response;
	try {
		shot = await env.BROWSER.quickAction("screenshot", {
			url: `${url.origin}/e/${event.id}/card`,
			viewport: { width: 1200, height: 630 },
			gotoOptions: { waitUntil: "networkidle0" },
		});
	} catch (e) {
		shot = new Response(String(e), { status: 502 });
	}
	if (!shot.ok) {
		console.error(`card ${event.id}: ${shot.status} ${await shot.text()}`);
		return new Response(null, {
			status: 302,
			headers: {
				location: event.flyerUrl ?? "/og.png",
				"cache-control": "no-store",
			},
		});
	}
	const png = await shot.arrayBuffer();
	await env.MEDIA.put(key, png, {
		httpMetadata: { contentType: "image/png" },
		customMetadata: { v: version },
	});
	return new Response(png, { headers });
};
