import { env } from "cloudflare:workers";
import { error, json } from "@sveltejs/kit";
import { currentMonth, gridRange } from "#lib/calendar.ts";
import { CACHE_PUBLIC } from "#lib/server/cache.ts";
import {
	getActorByHandle,
	listPastEvents,
	listUpcomingEvents,
} from "#lib/server/events.ts";
import { type ActorPage, pastBefore } from "#lib/types.ts";
import type { RequestHandler } from "./$types";

const PAST_SHOWN = 3;

export const GET: RequestHandler = async ({ locals, params }) => {
	// 見本を出す環境（開発）では、取り込んだハコを紹介文つきで返す。本番には IMPORT_SAMPLES を置かない
	const actor = await getActorByHandle(
		locals.db,
		params.handle,
		env.IMPORT_SAMPLES === "1",
	);
	if (!actor) error(404, "見つかりません");
	// 今月のカレンダーも描くので、今月グリッドの先頭から先を返す
	const { year, month } = currentMonth();
	const [events, past] = await Promise.all([
		listUpcomingEvents(locals.db, {
			actorId: actor.id,
			from: gridRange(year, month).from,
			limit: 2000,
		}),
		// ページには 3 件だけ出す。4 件目があれば「すべて見る」を出す
		listPastEvents(locals.db, {
			actorId: actor.id,
			before: pastBefore(),
			limit: PAST_SHOWN + 1,
		}),
	]);
	const page: ActorPage = {
		actor,
		events,
		past: past.slice(0, PAST_SHOWN),
		morePast: past.length > PAST_SHOWN,
	};
	return json(page, { headers: { "cache-control": CACHE_PUBLIC } });
};
