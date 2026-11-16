import { error } from "@sveltejs/kit";
import { cardImagePath } from "#lib/card.ts";
import type { EventDetail } from "#lib/types.ts";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, params }) => {
	const res = await fetch(`/api/events/${params.id}`);
	if (!res.ok) error(res.status, "間が見つかりません");
	const event = (await res.json()) as EventDetail;
	// 下書きはカードを作らない（外から見えないので撮れない）
	return {
		event,
		ogImage: event.status === "draft" ? event.flyerUrl : cardImagePath(event),
	};
};
