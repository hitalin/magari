import { error } from '@sveltejs/kit';
import { currentMonth, monthGrid } from '#lib/calendar.ts';
import type { ActorPage } from '#lib/types.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
	const res = await fetch(`/api/actors/${params.handle}`);
	if (!res.ok) error(res.status, '見つかりません');
	const page = (await res.json()) as ActorPage;
	const ym = currentMonth();
	return { ...page, calendar: { ...ym, grid: monthGrid(ym.year, ym.month) } };
};
