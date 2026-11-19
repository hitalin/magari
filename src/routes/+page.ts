import { error } from "@sveltejs/kit";
import type { EventSummary } from "#lib/types.ts";
import type { PageLoad } from "./$types";

// トップは紹介のランディング。ログインしていても同じものを出す（図像を押せばいつでも戻れる）
export const load: PageLoad = async ({ fetch }) => {
	// 右に貼るビラ 3 枚分。/home と同じ問い合わせにして、続けて開いたときに使い回す
	const weekTo = new Date(Date.now() + 7 * 86_400_000);
	const upcoming = await fetch(
		`/api/events?${new URLSearchParams({ to: weekTo.toISOString() })}`,
	);
	if (!upcoming.ok) error(500, "間の一覧を取得できませんでした");
	return { events: (await upcoming.json()) as EventSummary[] };
};
