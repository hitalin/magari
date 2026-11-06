import { error, json } from "@sveltejs/kit";
import { currentMonth, gridRange } from "#lib/calendar.ts";
import { CACHE_PUBLIC } from "#lib/server/cache.ts";
import { getActorByHandle, listUpcomingEvents } from "#lib/server/events.ts";
import { listPlans, listPosts } from "#lib/server/spaces.ts";
import type { ActorPage } from "#lib/types.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals, params }) => {
	const actor = await getActorByHandle(locals.db, params.handle);
	if (!actor) error(404, "見つかりません");
	// 今月のカレンダーも描くので、今月グリッドの先頭から先を返す
	const { year, month } = currentMonth();
	const [events, plans, posts] = await Promise.all([
		listUpcomingEvents(locals.db, {
			actorId: actor.id,
			from: gridRange(year, month).from,
			limit: 2000,
		}),
		actor.kind === "space"
			? listPlans(locals.db, actor.id)
			: Promise.resolve([]),
		listPosts(locals.db, actor.id),
	]);
	const page: ActorPage = { actor, plans, posts, events };
	return json(page, { headers: { "cache-control": CACHE_PUBLIC } });
};
