import { env } from "cloudflare:workers";
import { error } from "@sveltejs/kit";
import { toIcs } from "#lib/ics.ts";
import { CACHE_PUBLIC } from "#lib/server/cache.ts";
import { getActorByHandle, listUpcomingEvents } from "#lib/server/events.ts";
import { pastBefore } from "#lib/types.ts";
import type { RequestHandler } from "./$types";

// そのページ（人・ハコ・団体）のこれからの間の iCal。カレンダーアプリから購読する
export const GET: RequestHandler = async ({ locals, params, url }) => {
	const actor = await getActorByHandle(
		locals.db,
		params.handle,
		env.IMPORT_SAMPLES === "1",
	);
	if (!actor) error(404, "見つかりません");
	const events = await listUpcomingEvents(locals.db, {
		actorId: actor.id,
		from: pastBefore(),
		limit: 500,
	});
	return new Response(
		toIcs(events, { origin: url.origin, name: `${actor.name} | まがり` }),
		{
			headers: {
				"content-type": "text/calendar; charset=utf-8",
				"cache-control": CACHE_PUBLIC,
			},
		},
	);
};
