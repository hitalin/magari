import { env } from "cloudflare:workers";
import { error, json } from "@sveltejs/kit";
import { currentMonth, gridRange } from "#lib/calendar.ts";
import { CACHE_PUBLIC } from "#lib/server/cache.ts";
import { getActorByHandle, listUpcomingEvents } from "#lib/server/events.ts";
import type { ActorPage } from "#lib/types.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals, params }) => {
	// 見本を出す環境（開発）では、取り込んだハコを写真つきで返す。本番には IMPORT_SAMPLES を置かない
	const actor = await getActorByHandle(
		locals.db,
		params.handle,
		env.IMPORT_SAMPLES === "1",
	);
	if (!actor) error(404, "見つかりません");
	// 今月のカレンダーも描くので、今月グリッドの先頭から先を返す
	const { year, month } = currentMonth();
	const events = await listUpcomingEvents(locals.db, {
		actorId: actor.id,
		from: gridRange(year, month).from,
		limit: 2000,
	});
	const page: ActorPage = { actor, events };
	return json(page, { headers: { "cache-control": CACHE_PUBLIC } });
};
