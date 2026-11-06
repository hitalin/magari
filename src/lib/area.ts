// 会のエリア。都道府県名（接尾辞なし）か「オンライン」。
export const PREFECTURES = [
	"北海道",
	"青森",
	"岩手",
	"宮城",
	"秋田",
	"山形",
	"福島",
	"茨城",
	"栃木",
	"群馬",
	"埼玉",
	"千葉",
	"東京",
	"神奈川",
	"新潟",
	"富山",
	"石川",
	"福井",
	"山梨",
	"長野",
	"岐阜",
	"静岡",
	"愛知",
	"三重",
	"滋賀",
	"京都",
	"大阪",
	"兵庫",
	"奈良",
	"和歌山",
	"鳥取",
	"島根",
	"岡山",
	"広島",
	"山口",
	"徳島",
	"香川",
	"愛媛",
	"高知",
	"福岡",
	"佐賀",
	"長崎",
	"熊本",
	"大分",
	"宮崎",
	"鹿児島",
	"沖縄",
] as const;

export const ONLINE = "オンライン";

const ONLINE_RE = /オンライン|zoom|discord|meet|teams|配信/i;

export function detectArea(text: string | null | undefined): string | null {
	if (!text) return null;
	if (ONLINE_RE.test(text)) return ONLINE;
	let best: { name: string; index: number } | null = null;
	for (const p of PREFECTURES) {
		const i = text.indexOf(p);
		if (i >= 0 && (!best || i < best.index)) best = { name: p, index: i };
	}
	return best?.name ?? null;
}

// 絞り込みピルの並び順。主要都市を先に、残りは件数順。
export const PRIMARY_AREAS = [
	"東京",
	"神奈川",
	"愛知",
	"京都",
	"大阪",
	"兵庫",
	"福岡",
	ONLINE,
];

// 並び順: 主要都市 → 残りの都道府県を北から → 分からないもの
const areaRank = (area: string | null): number => {
	if (area === null) return Number.POSITIVE_INFINITY;
	const primary = PRIMARY_AREAS.indexOf(area);
	if (primary >= 0) return primary;
	return (
		PRIMARY_AREAS.length + (PREFECTURES as readonly string[]).indexOf(area)
	);
};

export const compareArea = (a: string | null, b: string | null): number =>
	areaRank(a) - areaRank(b);
