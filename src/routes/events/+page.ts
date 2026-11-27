import { error } from "@sveltejs/kit";
import { cacheLike } from "#lib/cache.ts";
import { weekAhead } from "#lib/date.ts";
import type { EventSummary } from "#lib/types.ts";
import type { PageLoad } from "./$types";

// universal load: クライアント遷移時は CDN キャッシュ済みの JSON を直接取る
export const load: PageLoad = async ({ fetch, setHeaders }) => {
	const upcoming = await fetch(
		`/api/events?${new URLSearchParams({ to: weekAhead().toISOString() })}`,
	);
	if (!upcoming.ok) error(500, "間の一覧を取得できませんでした");
	cacheLike(upcoming, setHeaders);
	return { events: (await upcoming.json()) as EventSummary[] };
};
