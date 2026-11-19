// 選んでいるエリア。絞り込みはナビのすぐ下（+layout.svelte）に 1 つだけ置き、イベントの各ページとハコで同じ選択を使う。
// 書き換えるのはブラウザだけ（サーバーでは空のまま）
export const areaFilter = $state({ value: [] as string[] });

export const inArea = <T extends { area: string | null }>(items: T[]): T[] =>
	areaFilter.value.length
		? items.filter((i) => i.area !== null && areaFilter.value.includes(i.area))
		: items;
