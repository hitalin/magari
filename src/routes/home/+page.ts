import { error } from "@sveltejs/kit";
import type { EventSummary } from "#lib/types.ts";
import type { PageLoad } from "./$types";

// universal load: クライアント遷移時は CDN キャッシュ済みの JSON を直接取る
export const load: PageLoad = async ({ fetch }) => {
	const weekTo = new Date(Date.now() + 7 * 86_400_000);
	const upcoming = await fetch(
		`/api/events?${new URLSearchParams({ to: weekTo.toISOString() })}`,
	);
	if (!upcoming.ok) error(500, "間の一覧を取得できませんでした");
	return { events: (await upcoming.json()) as EventSummary[] };
};
