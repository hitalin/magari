import { error } from "@sveltejs/kit";
import { cardVersion } from "#lib/card.ts";
import { makeCard, storedCard } from "#lib/server/card.ts";
import { getEvent } from "#lib/server/events.ts";
import type { RequestHandler } from "./$types";

// X で共有したときのカード画像。ふだんは会を開けた・直したときに作ってある（warmCard）。
// 無ければ（取り込んだ会など）ここで撮る。版（cardVersion）が同じ間は置いたものを返す。
export const GET: RequestHandler = async ({ locals, params, url }) => {
	const event = await getEvent(locals.db, params.id);
	if (!event) error(404, "見つかりません");
	const headers = {
		"content-type": "image/png",
		// 版つきの URL（og:image に書くもの）は中身が変わらない
		"cache-control":
			url.searchParams.get("v") === cardVersion(event)
				? "public, max-age=31536000, immutable"
				: "public, max-age=300",
	};

	const stored = await storedCard(event);
	if (stored) return new Response(stored.body, { headers });

	// 撮れなかったら、その回は元の画像に逃がし、覚えさせない
	const png = await makeCard(event, url.origin);
	if (!png)
		return new Response(null, {
			status: 302,
			headers: {
				location: event.flyerUrl ?? "/og.png",
				"cache-control": "no-store",
			},
		});
	return new Response(png, { headers });
};
