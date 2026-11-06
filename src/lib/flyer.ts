import { dayKey, formatTime } from "./date";

// 自動のビラ（画像を上げていない会のフライヤー）の見た目。
// 会の ID から決まるので、同じ会はいつも同じ見た目になる。

// tate: 縦書きの題 / date: 大きな日付 / invert: 黒地に白 / band: 斜めの帯
export const FLYER_VARIANTS = ["tate", "date", "invert", "band"] as const;
export type FlyerVariant = (typeof FLYER_VARIANTS)[number];

// 色上質紙とリソグラフのインク
const PAPERS = [
	"#f2eee3",
	"#f6d3da",
	"#f4e07c",
	"#bfe2e4",
	"#cfe6c2",
	"#f0c49c",
];
const INKS = ["#1d1a17", "#1f3a8a", "#b0201c"];

// FNV-1a（32bit）
function hash(s: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h;
}

export function flyerStyle(id: string): {
	variant: FlyerVariant;
	paper: string;
	ink: string;
	tilt: number;
} {
	const h = hash(id);
	return {
		variant: FLYER_VARIANTS[h % FLYER_VARIANTS.length],
		paper: PAPERS[(h >>> 4) % PAPERS.length],
		ink: INKS[(h >>> 9) % INKS.length],
		// 壁に貼ったときの傾き。-2.5〜2.5 度を 0.5 度刻み
		tilt: (((h >>> 13) % 11) - 5) / 2,
	};
}

// 題の長さで文字の大きさを決める（狭い紙に収める）
export function flyerTitleSize(title: string): "xl" | "l" | "m" | "s" {
	const n = [...title].length;
	if (n <= 6) return "xl";
	if (n <= 12) return "l";
	if (n <= 24) return "m";
	return "s";
}

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// 「11.08」「SUN」「09:00–10:30」（JST）
export function flyerDate(e: {
	startsAt: string;
	endsAt: string | null;
	allDay: boolean;
}): { date: string; dow: string; time: string } {
	const key = dayKey(e.startsAt);
	const [, month, day] = key.split("-");
	const dow = DOW[new Date(`${key}T00:00:00Z`).getUTCDay()];
	if (e.allDay) return { date: `${month}.${day}`, dow, time: "終日" };
	const start = formatTime(e.startsAt);
	const end = e.endsAt && e.endsAt !== e.startsAt ? formatTime(e.endsAt) : null;
	return {
		date: `${month}.${day}`,
		dow,
		time: end ? `${start}–${end}` : start,
	};
}
