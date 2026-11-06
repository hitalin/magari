import { error } from "@sveltejs/kit";
import type { SpaceSummary } from "#lib/types.ts";
import type { PageLoad } from "./$types";

// universal load: クライアント遷移時は CDN キャッシュ済みの JSON を直接取る
export const load: PageLoad = async ({ fetch }) => {
	const res = await fetch("/api/spaces");
	if (!res.ok) error(res.status, "ハコの一覧を取得できませんでした");
	return { spaces: (await res.json()) as SpaceSummary[] };
};
