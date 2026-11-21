import { error } from "@sveltejs/kit";
import { toIcs } from "#lib/ics.ts";
import { CACHE_PUBLIC } from "#lib/server/cache.ts";
import { getEvent } from "#lib/server/events.ts";
import type { RequestHandler } from "./$types";

// 会 1 件の iCal。カレンダーアプリに入れるためのもの。下書きと非表示は出さない
export const GET: RequestHandler = async ({ locals, params, url }) => {
	const event = await getEvent(locals.db, params.id);
	if (!event) error(404, "間が見つかりません");
	return new Response(toIcs([event], { origin: url.origin }), {
		headers: {
			"content-type": "text/calendar; charset=utf-8",
			"content-disposition": `attachment; filename="magari-${event.id}.ics"`,
			"cache-control": CACHE_PUBLIC,
		},
	});
};
