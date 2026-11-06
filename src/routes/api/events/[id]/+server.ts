import { error, json } from "@sveltejs/kit";
import { CACHE_PUBLIC } from "#lib/server/cache.ts";
import { getEvent, getEventForUser } from "#lib/server/events.ts";
import { listManagedActorIds } from "#lib/server/me.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals, params }) => {
	const event = await getEvent(locals.db, params.id);
	if (event) return json(event, { headers: { "cache-control": CACHE_PUBLIC } });
	// 下書き・非公開は作成者と主催者にだけ見せる（キャッシュしない）
	if (locals.session) {
		const actorIds = await listManagedActorIds(
			locals.db,
			locals.session.user.id,
			locals.actor,
		);
		const mine = await getEventForUser(
			locals.db,
			params.id,
			locals.session.user.id,
			actorIds,
		);
		if (mine)
			return json(mine, { headers: { "cache-control": "private, no-store" } });
	}
	error(404, "間が見つかりません");
};
