import { error } from "@sveltejs/kit";
import { currentMonth, gridRange, monthGrid } from "#lib/calendar.ts";
import type { EventSummary } from "#lib/types.ts";
import type { PageLoad } from "./$types";

// universal load: クライアント遷移時は CDN キャッシュ済みの JSON を直接取る
export const load: PageLoad = async ({ fetch }) => {
	const ym = currentMonth();
	const { from, to } = gridRange(ym.year, ym.month);
	const weekTo = new Date(Date.now() + 7 * 86_400_000);
	const [upcoming, month] = await Promise.all([
		fetch(`/api/events?${new URLSearchParams({ to: weekTo.toISOString() })}`),
		fetch(
			`/api/events?${new URLSearchParams({ from: from.toISOString(), to: to.toISOString() })}`,
		),
	]);
	if (!upcoming.ok || !month.ok) error(500, "間の一覧を取得できませんでした");
	return {
		events: (await upcoming.json()) as EventSummary[],
		calendar: {
			...ym,
			grid: monthGrid(ym.year, ym.month),
			events: (await month.json()) as EventSummary[],
		},
	};
};
