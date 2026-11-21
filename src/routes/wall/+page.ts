import { error } from "@sveltejs/kit";
import { cacheLike } from "#lib/cache.ts";
import type { EventSummary } from "#lib/types.ts";
import type { PageLoad } from "./$types";

// universal load: クライアント遷移時は CDN キャッシュ済みの JSON を直接取る
export const load: PageLoad = async ({ fetch, setHeaders }) => {
	const res = await fetch("/api/wall");
	if (!res.ok) error(res.status, "フライヤーを取得できませんでした");
	cacheLike(res, setHeaders);
	return { events: (await res.json()) as EventSummary[] };
};
