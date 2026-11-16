import { error } from "@sveltejs/kit";
import { getEvent } from "#lib/server/events.ts";
import type { PageServerLoad } from "./$types";

// 撮るだけのページなので、JS は送らない
export const csr = false;

export const load: PageServerLoad = async ({ locals, params }) => {
	const event = await getEvent(locals.db, params.id);
	if (!event) error(404, "間が見つかりません");
	return { event };
};
