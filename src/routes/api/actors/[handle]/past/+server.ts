import { error, json } from "@sveltejs/kit";
import { CACHE_PUBLIC } from "#lib/server/cache.ts";
import { getActorByHandle, listPastEvents } from "#lib/server/events.ts";
import { type ActorPast, pastBefore } from "#lib/types.ts";
import type { RequestHandler } from "./$types";

const PAGE = 50;

// Actor のこれまでの間を新しい順に。?before= で続きを取る
export const GET: RequestHandler = async ({ locals, params, url }) => {
	const actor = await getActorByHandle(locals.db, params.handle);
	if (!actor) error(404, "見つかりません");
	const cursor = new Date(url.searchParams.get("before") ?? "");
	const limit = pastBefore();
	// 続きの位置は「これまで」の中だけ（先の日付を渡して、これからの間を引き出させない）
	const before =
		Number.isNaN(cursor.getTime()) || cursor > limit ? limit : cursor;
	const rows = await listPastEvents(locals.db, {
		actorId: actor.id,
		before,
		limit: PAGE + 1,
	});
	const events = rows.slice(0, PAGE);
	const page: ActorPast = {
		actor: { handle: actor.handle, name: actor.name, kind: actor.kind },
		events,
		next: rows.length > PAGE ? events[events.length - 1].startsAt : null,
	};
	return json(page, { headers: { "cache-control": CACHE_PUBLIC } });
};
