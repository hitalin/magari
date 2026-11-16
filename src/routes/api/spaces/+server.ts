import { env } from "cloudflare:workers";
import { json } from "@sveltejs/kit";
import { CACHE_PUBLIC } from "#lib/server/cache.ts";
import { listSpaces } from "#lib/server/spaces.ts";
import type { RequestHandler } from "./$types";

// 取り込みを有効にした環境（開発）では、見本のハコを写真つきで返す。本番には IMPORT_ENABLED が無い
export const GET: RequestHandler = async ({ locals }) =>
	json(await listSpaces(locals.db, env.IMPORT_ENABLED === "1"), {
		headers: { "cache-control": CACHE_PUBLIC },
	});
