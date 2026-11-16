import { json } from "@sveltejs/kit";
import { CACHE_PUBLIC } from "#lib/server/cache.ts";
import { listUpcomingEvents } from "#lib/server/events.ts";
import type { RequestHandler } from "./$types";

// 壁: これからの会（フライヤー画像が無い会は、自動のビラで貼る）
export const GET: RequestHandler = async ({ locals }) =>
	json(await listUpcomingEvents(locals.db, { limit: 500 }), {
		headers: { "cache-control": CACHE_PUBLIC },
	});
