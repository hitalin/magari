import type { EventSummary, SpaceSummary } from "./types.ts";

// 一覧の文字列検索。全角半角・大文字小文字・ひらがなカタカナを揃えてから、部分一致で比べる
const fold = (s: string): string =>
	s
		.normalize("NFKC")
		.toLowerCase()
		.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

// 空白で区切った語をすべて含めば合う（語ごとに別の項目でもよい）
export function matchesQuery(
	query: string,
	parts: (string | null | undefined)[],
): boolean {
	const words = fold(query).split(/\s+/).filter(Boolean);
	if (words.length === 0) return true;
	const text = fold(parts.filter(Boolean).join("\n"));
	return words.every((w) => text.includes(w));
}

// 検索にかける項目。会は題・場所・ハコ・主催、ハコは名前と紹介
export const eventText = (e: EventSummary) => [
	e.title,
	e.area,
	e.locationName,
	e.space?.name,
	e.space?.handle,
	...e.hosts.flatMap((h) => [h.name, h.handle]),
];
export const spaceText = (s: SpaceSummary) => [
	s.name,
	s.handle,
	s.area,
	s.catch,
	s.summary,
];
