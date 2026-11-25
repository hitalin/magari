import { error } from "@sveltejs/kit";
import { cacheLike } from "#lib/cache.ts";
import { weekAhead } from "#lib/date.ts";
import type { EventSummary, SpaceSummary } from "#lib/types.ts";
import type { PageLoad } from "./$types";

// トップは紹介のランディング。ログインしていても同じものを出す（図像を押せばいつでも戻れる）
export const load: PageLoad = async ({ fetch, setHeaders }) => {
	// /home・/spaces と同じ問い合わせにして、続けて開いたときに使い回す
	const [upcoming, spaces] = await Promise.all([
		fetch(
			`/api/events?${new URLSearchParams({ to: weekAhead().toISOString() })}`,
		),
		fetch("/api/spaces"),
	]);
	if (!upcoming.ok) error(500, "間の一覧を取得できませんでした");
	if (!spaces.ok) error(500, "ハコの一覧を取得できませんでした");
	cacheLike(upcoming, setHeaders);
	return {
		events: (await upcoming.json()) as EventSummary[],
		spaces: (await spaces.json()) as SpaceSummary[],
	};
};
