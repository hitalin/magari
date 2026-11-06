import { error } from "@sveltejs/kit";
import type { EventSummary } from "#lib/types.ts";
import type { PageLoad } from "./$types";

// universal load: クライアント遷移時は CDN キャッシュ済みの JSON を直接取る
export const load: PageLoad = async ({ fetch }) => {
	const res = await fetch("/api/wall");
	if (!res.ok) error(res.status, "フライヤーを取得できませんでした");
	return { events: (await res.json()) as EventSummary[] };
};
