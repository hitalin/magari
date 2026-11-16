import { error, redirect } from "@sveltejs/kit";
import type { EventSummary } from "#lib/types.ts";
import type { PageLoad } from "./$types";

// トップは紹介のランディング。ログインしている人には要らないので /home（一覧）へ送る
export const load: PageLoad = async ({ fetch, parent }) => {
	const { loggedIn } = await parent();
	if (loggedIn) redirect(307, "/home");
	// 右に貼るビラ 3 枚分。/home と同じ問い合わせにして、続けて開いたときに使い回す
	const weekTo = new Date(Date.now() + 7 * 86_400_000);
	const upcoming = await fetch(
		`/api/events?${new URLSearchParams({ to: weekTo.toISOString() })}`,
	);
	if (!upcoming.ok) error(500, "間の一覧を取得できませんでした");
	return { events: (await upcoming.json()) as EventSummary[] };
};
