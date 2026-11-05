import { error, json } from '@sveltejs/kit';
import { CACHE_PUBLIC } from '#lib/server/cache.ts';
import { listUpcomingEvents } from '#lib/server/events.ts';
import type { RequestHandler } from './$types';

const MAX_RANGE_MS = 62 * 86_400_000;

// ?from=ISO&to=ISO で範囲指定（カレンダー用）。省略時は今から先。
export const GET: RequestHandler = async ({ locals, url }) => {
	const fromParam = url.searchParams.get('from');
	const toParam = url.searchParams.get('to');
	const from = fromParam ? new Date(fromParam) : undefined;
	const to = toParam ? new Date(toParam) : undefined;
	if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime())))
		error(400, '日付の形式が不正です');
	if (from && to && to.getTime() - from.getTime() > MAX_RANGE_MS) error(400, '範囲が広すぎます');

	return json(await listUpcomingEvents(locals.db, { from, to, limit: 2000 }), {
		headers: { 'cache-control': CACHE_PUBLIC }
	});
};
