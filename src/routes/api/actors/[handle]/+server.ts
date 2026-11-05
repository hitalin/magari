import { error, json } from '@sveltejs/kit';
import { currentMonth, gridRange } from '#lib/calendar.ts';
import { CACHE_PUBLIC } from '#lib/server/cache.ts';
import { getActorByHandle, listUpcomingEvents } from '#lib/server/events.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	const actor = await getActorByHandle(locals.db, params.handle);
	if (!actor) error(404, '見つかりません');
	// 今月のカレンダーも描くので、今月グリッドの先頭から先を返す
	const { year, month } = currentMonth();
	const events = await listUpcomingEvents(locals.db, {
		actorId: actor.id,
		from: gridRange(year, month).from,
		limit: 2000
	});
	return json({ actor, events }, { headers: { 'cache-control': CACHE_PUBLIC } });
};
