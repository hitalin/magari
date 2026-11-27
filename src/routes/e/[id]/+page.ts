import { error } from "@sveltejs/kit";
import { cacheLike } from "#lib/cache.ts";
import { cardImagePath } from "#lib/card.ts";
import type { EventDetail } from "#lib/types.ts";
import { reach } from "#lib/visibility.ts";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, params, setHeaders }) => {
	const res = await fetch(`/api/events/${params.id}`);
	if (!res.ok) error(res.status, "間が見つかりません");
	cacheLike(res, setHeaders);
	const event = (await res.json()) as EventDetail;
	// 下書きはカードを作らない（外から見えないので撮れない）。
	// URL を知っている人だけの会は、貼られても中身が広がらないよう既定の画像にする
	return {
		event,
		// この会の落書きの壁（Graffiti が読む。無ければ共有の地面）
		wall: event.wall,
		ogImage: !reach(event.visibility).share
			? undefined
			: event.status === "draft"
				? event.flyerUrl
				: cardImagePath(event),
	};
};
