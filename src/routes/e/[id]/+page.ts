import { error } from "@sveltejs/kit";
import { cacheLike } from "#lib/cache.ts";
import { cardImagePath } from "#lib/card.ts";
import type { EventDetail } from "#lib/types.ts";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, params, setHeaders }) => {
	const res = await fetch(`/api/events/${params.id}`);
	if (!res.ok) error(res.status, "間が見つかりません");
	cacheLike(res, setHeaders);
	const event = (await res.json()) as EventDetail;
	// 下書きはカードを作らない（外から見えないので撮れない）
	return {
		event,
		// この会の落書きの壁（Graffiti が読む。無ければ共有の地面）
		wall: event.wall,
		ogImage: event.status === "draft" ? event.flyerUrl : cardImagePath(event),
	};
};
