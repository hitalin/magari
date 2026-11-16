import { dayKey, formatTime } from "./date";

// 自動のビラ（画像を上げていない会のフライヤー）の見た目。
// 会の ID から決まるので、同じ会はいつも同じ見た目になる。
// 手本は二色刷りのイベントフライヤー（リソグラフ、ライブハウスの壁、運動や演劇のポスター）。
// オフ会にもライブにも間借りの店にも合うよう、色と字の文法は全部の型で揃え、構図だけを強く変える。

// sun: はみ出す丸と輪 / wedge: 円に刺さる楔と斜めの札（構成主義） / initial: 巨大な頭文字と縦の日付
// kanban: 太い枠に傾いた縦書き（立て看板） / outline: 白抜きの巨大な日付に題の札 / dots: 網点の円盤
// rings: 同心円と縦書きの短冊（アングラ演劇） / stencil: 一色刷りの歪んだ枠 / gig: 墨の地に巨大な日付（ライブ告知）
export const FLYER_VARIANTS = [
	"sun",
	"wedge",
	"initial",
	"kanban",
	"outline",
	"dots",
	"rings",
	"stencil",
	"gig",
] as const;
export type FlyerVariant = (typeof FLYER_VARIANTS)[number];

// 二色刷りの組。紙・墨（字の色）・差し色（図形の色）。優しい色の紙を基本に、黄・赤・黒の強い紙を少し混ぜる。
// 墨は紙の上でも差し色の上でも読める組だけを置く
const PALETTES = [
	{ paper: "#f1eadb", ink: "#1f1d1a", spot: "#e2492f" },
	{ paper: "#f1eadb", ink: "#23408e", spot: "#f0a51e" },
	{ paper: "#f1eadb", ink: "#1f1d1a", spot: "#2a8f83" },
	{ paper: "#f6e7e4", ink: "#23408e", spot: "#ef5d7e" },
	{ paper: "#e8eddc", ink: "#1f1d1a", spot: "#e2492f" },
	{ paper: "#f3e6b8", ink: "#1f1d1a", spot: "#3f66c4" },
	{ paper: "#f2c62e", ink: "#1f1d1a", spot: "#d3261f" },
	{ paper: "#d93a2b", ink: "#1f1d1a", spot: "#f1eadb" },
	{ paper: "#1f1d1a", ink: "#f1eadb", spot: "#e2492f" },
];

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
	spot: string;
	tilt: number;
} {
	const h = hash(id);
	return {
		variant: FLYER_VARIANTS[h % FLYER_VARIANTS.length],
		...PALETTES[(h >>> 4) % PALETTES.length],
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
