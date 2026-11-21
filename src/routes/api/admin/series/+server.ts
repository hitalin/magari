import { env } from "cloudflare:workers";
import { error, json } from "@sveltejs/kit";
import { getDb } from "#lib/server/db/index.ts";
import { extendDueSeries } from "#lib/server/series.ts";
import type { RequestHandler } from "./$types";

// 繰り返しの間の、先の回を足す（Cron から毎時）。Authorization: Bearer <IMPORT_TOKEN>
export const POST: RequestHandler = async ({ request }) => {
	const token = request.headers
		.get("authorization")
		?.replace(/^Bearer\s+/i, "");
	if (!env.IMPORT_TOKEN || token !== env.IMPORT_TOKEN)
		error(401, "unauthorized");
	return json(await extendDueSeries(getDb(env.DB)));
};
