import { error, json } from '@sveltejs/kit';
import { CACHE_PUBLIC } from '#lib/server/cache.ts';
import { getEvent } from '#lib/server/events.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	const event = await getEvent(locals.db, params.id);
	if (!event) error(404, '間が見つかりません');
	return json(event, { headers: { 'cache-control': CACHE_PUBLIC } });
};
