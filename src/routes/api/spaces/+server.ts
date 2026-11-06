import { json } from "@sveltejs/kit";
import { CACHE_PUBLIC } from "#lib/server/cache.ts";
import { listSpaces } from "#lib/server/spaces.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) =>
	json(await listSpaces(locals.db), {
		headers: { "cache-control": CACHE_PUBLIC },
	});
