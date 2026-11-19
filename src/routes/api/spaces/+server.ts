import { env } from "cloudflare:workers";
import { json } from "@sveltejs/kit";
import { CACHE_PUBLIC } from "#lib/server/cache.ts";
import { listSpaces } from "#lib/server/spaces.ts";
import type { RequestHandler } from "./$types";

// 見本を出す環境（開発）では、取り込んだハコを紹介文つきで返す。本番には IMPORT_SAMPLES を置かない
export const GET: RequestHandler = async ({ locals }) =>
	json(await listSpaces(locals.db, env.IMPORT_SAMPLES === "1"), {
		headers: { "cache-control": CACHE_PUBLIC },
	});
