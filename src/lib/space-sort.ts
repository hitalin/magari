// ハコ一覧の並べ替え。日時は ISO 文字列（UTC）なので、文字列のまま比べられる
export const SPACE_SORTS = [
	{ key: "many", label: "間が多い順" },
	{ key: "soon", label: "次の間が近い順" },
	{ key: "new", label: "新着順" },
] as const;
export type SpaceSort = (typeof SPACE_SORTS)[number]["key"];

type Sortable = {
	name: string;
	upcoming: number;
	nextAt: string | null;
	createdAt: string;
};

export function sortSpaces<T extends Sortable>(
	spaces: T[],
	key: SpaceSort,
): T[] {
	const byName = (a: T, b: T) => a.name.localeCompare(b.name, "ja");
	const compare = {
		many: (a: T, b: T) => b.upcoming - a.upcoming,
		// 予定の無いハコ（null）は最後
		soon: (a: T, b: T) =>
			a.nextAt === b.nextAt
				? 0
				: a.nextAt === null
					? 1
					: b.nextAt === null
						? -1
						: a.nextAt < b.nextAt
							? -1
							: 1,
		new: (a: T, b: T) =>
			a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
	}[key];
	return [...spaces].sort((a, b) => compare(a, b) || byName(a, b));
}
