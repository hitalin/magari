import { error } from '@sveltejs/kit';
import { currentMonth, gridRange, monthGrid, parseMonth } from '#lib/calendar.ts';
import type { EventSummary } from '#lib/types.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
	const ym = params.ym ? parseMonth(params.ym) : currentMonth();
	if (!ym) error(404, 'その月はありません');
	const { from, to } = gridRange(ym.year, ym.month);
	const res = await fetch(
		`/api/events?${new URLSearchParams({ from: from.toISOString(), to: to.toISOString() })}`
	);
	if (!res.ok) error(res.status, '間の一覧を取得できませんでした');
	return {
		...ym,
		grid: monthGrid(ym.year, ym.month),
		events: (await res.json()) as EventSummary[]
	};
};
