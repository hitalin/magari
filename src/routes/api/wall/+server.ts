import { json } from "@sveltejs/kit";
import { CACHE_PUBLIC } from "#lib/server/cache.ts";
import { listUpcomingEvents } from "#lib/server/events.ts";
import type { RequestHandler } from "./$types";

// 壁: 主催がフライヤー画像を上げた、これからの会
export const GET: RequestHandler = async ({ locals }) =>
	json(await listUpcomingEvents(locals.db, { withFlyer: true, limit: 500 }), {
		headers: { "cache-control": CACHE_PUBLIC },
	});
