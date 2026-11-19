import { matchesQuery } from "./search.ts";

// 選んでいるエリアと検索語。絞り込みはナビのすぐ下（+layout.svelte）に 1 つだけ置き、イベントの各ページとハコで同じ選択を使う。
// 書き換えるのはブラウザだけ（サーバーでは空のまま）
export const areaFilter = $state({ value: [] as string[], query: "" });

export const inArea = <T extends { area: string | null }>(items: T[]): T[] =>
	areaFilter.value.length
		? items.filter((i) => i.area !== null && areaFilter.value.includes(i.area))
		: items;

// text は検索にかける項目（search.ts の eventText / spaceText）
export const inQuery = <T>(
	items: T[],
	text: (item: T) => (string | null | undefined)[],
): T[] =>
	areaFilter.query.trim()
		? items.filter((i) => matchesQuery(areaFilter.query, text(i)))
		: items;

// 絞った結果が空のときの題。検索語があればそれを、無ければ fallback
export const emptyTitle = (fallback: string): string =>
	areaFilter.query.trim()
		? `「${areaFilter.query.trim()}」は見つかりませんでした。`
		: fallback;
