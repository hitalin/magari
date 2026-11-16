import { env } from "cloudflare:workers";
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { graffiti } from "#lib/server/db/schema.ts";
import type { RequestHandler } from "./$types";

// 落書きを消す。運営者（ADMIN_HANDLE の本人）だけ。ほかの人には無いものに見せる
export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!env.ADMIN_HANDLE || locals.actor?.handle !== env.ADMIN_HANDLE)
		error(404, "見つかりません");
	await locals.db.delete(graffiti).where(eq(graffiti.id, params.id));
	return new Response(null, { status: 204 });
};
