import { dayKey, formatTime } from "./date";

// 自動のビラ（画像を上げていない会のフライヤー）の見た目。
// 会の ID から決まるので、同じ会はいつも同じ見た目になる。
// 手本は二つ。二色刷りのイベントフライヤー（リソグラフ、ライブハウスの壁）と、
// 街に実際に貼ってある紙もの（日めくり、戸口の札、会報、掲示板の貼り紙）。
// どの題がどの型に当たるかは選べないので、題には演出をかけない（1 字だけ大きくする、傾ける、寝かせる、をしない）。

// sun: はみ出す丸と輪 / wedge: 円に刺さる楔と斜めの札（構成主義） / kanban: 太い枠に傾いた縦書き（立て看板）
// outline: 白抜きの巨大な日付に題の札 / dots: 網点の円盤 / stencil: 一色刷りの歪んだ枠 / gig: 墨の地に巨大な日付（ライブ告知）
// himekuri: 日めくり / fuda: 戸口にねじで留めた札 / gariban: わら半紙のおたより
// tearoff: ちぎり札つきの貼り紙 / riso: 同じ色の版を二枚ずらして重ねる
export const FLYER_VARIANTS = [
	"sun",
	"wedge",
	"kanban",
	"outline",
	"dots",
	"stencil",
	"gig",
	"himekuri",
	"fuda",
	"gariban",
	"tearoff",
	"riso",
] as const;
export type FlyerVariant = (typeof FLYER_VARIANTS)[number];

// 出る割合。どの題でも無事な日めくり・札・おたよりを多めに、評価の割れたちぎり札とリソは少なめに
const WEIGHTS: Record<FlyerVariant, number> = {
	sun: 2,
	wedge: 2,
	kanban: 2,
	outline: 2,
	dots: 2,
	stencil: 2,
	gig: 2,
	himekuri: 3,
	fuda: 3,
	gariban: 3,
	tearoff: 1,
	riso: 1,
};
const DECK = FLYER_VARIANTS.flatMap((v) =>
	Array<FlyerVariant>(WEIGHTS[v]).fill(v),
);

// 二色刷りの組。紙・墨（字の色）・差し色（図形の色）。先の 6 つが優しい色の紙、後の 3 つが黄・赤・黒の強い紙。
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
const SOFT_PAPERS = 6;
// 強い紙を使わない型（赤は警告札、黒は訃報、黄に墨は立入禁止に寄る）
const SOFT_ONLY: readonly FlyerVariant[] = ["fuda", "tearoff", "riso"];
// おたよりのインク。墨は訃報の黒枠に寄るので置かない
const GARIBAN_INKS = ["#262a78", "#7a2230", "#1c543b", "#5b3a1e"];

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
	// 型の中の振り分け（おたよりのインク、リソの色面の形）
	k: number;
	tilt: number;
} {
	const h = hash(id);
	const variant = DECK[h % DECK.length];
	const k = (h >>> 9) % 4;
	const palettes = SOFT_ONLY.includes(variant) ? SOFT_PAPERS : PALETTES.length;
	let { paper, ink, spot } = PALETTES[(h >>> 4) % palettes];
	if (variant === "himekuri") {
		paper = "#f5f2ea";
		ink = "#1f1d1a";
	} else if (variant === "gariban") {
		paper = "#e9e1c6";
		ink = GARIBAN_INKS[k];
	}
	return {
		variant,
		paper,
		ink,
		spot,
		k,
		// 壁に貼ったときの傾き。-2.5〜2.5 度を 0.5 度刻み
		tilt: (((h >>> 13) % 11) - 5) / 2,
	};
}

// 題の見た目の幅で文字の大きさを決める（狭い紙に収める）。半角は 0.55 字と数える
export function flyerTitleSize(title: string): "xl" | "l" | "m" | "s" {
	let w = 0;
	for (const c of title) w += c.charCodeAt(0) < 0x2000 ? 0.55 : 1;
	if (w <= 4) return "xl";
	if (w <= 6.5) return "l";
	if (w <= 18) return "m";
	return "s";
}

const KANJI = "\\u4e00-\\u9fff";
const HIRAGANA_ONLY = /^[\u3040-\u309fー]+$/;
const CLOSING = /^[)\]）」』】〉》、。,.!?！？♪・:：;〜~_\-―—]+$/;
const ASCII_ONLY = /^[\x21-\x7e]+$/;
const ONE_KANJI = new RegExp(`^[${KANJI}]$`);
const ENDS_KANJI_OR_KATAKANA = new RegExp(`[${KANJI}\\u30a0-\\u30ff]$`);
// 「飲み」+「会」のような、短い語に付く 1 字
const SHORT_KANJI_WORD = new RegExp(`^[${KANJI}][\\u3040-\\u309f]?$`);
const LONE_PREFIX = new RegExp(`^[【(（「『]*[${KANJI}]$`);
const segmenter = new Intl.Segmenter("ja", { granularity: "word" });

// 題を「折ってよい所」で区切る（つなげると元の題に戻る）。
// 語に分けてから、助詞・閉じ括弧・数字の後ろ・1 字の接頭や接尾を隣の語に付けて、語の途中や行頭の「、」で折れないようにする
export function flyerTitleChunks(title: string): string[] {
	const out: string[] = [];
	for (const { segment: s } of segmenter.segment(title)) {
		const prev = out[out.length - 1];
		if (
			prev !== undefined &&
			!/\s$/.test(prev) &&
			(HIRAGANA_ONLY.test(s) ||
				CLOSING.test(s) ||
				(ONE_KANJI.test(s) &&
					(ENDS_KANJI_OR_KATAKANA.test(prev) || SHORT_KANJI_WORD.test(prev))) ||
				/^\p{Extended_Pictographic}/u.test(s) ||
				LONE_PREFIX.test(prev) ||
				(ASCII_ONLY.test(s) && /[\x21-\x7e]$/.test(prev)) ||
				/[0-9([（「『【〈《@#_]$/.test(prev))
		)
			out[out.length - 1] = prev + s;
		else out.push(s);
	}
	return out;
}

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DOW_JA = ["日", "月", "火", "水", "木", "金", "土"];

// 「11.08」「SUN」「09:00–10:30」（JST）。紙ものの型には月・日・曜（日本語）・始まる時刻も渡す
export function flyerDate(e: {
	startsAt: string;
	endsAt: string | null;
	allDay: boolean;
}): {
	date: string;
	dow: string;
	time: string;
	month: number;
	day: number;
	dowJa: string;
	start: string;
} {
	const key = dayKey(e.startsAt);
	const [, month, day] = key.split("-");
	const n = new Date(`${key}T00:00:00Z`).getUTCDay();
	const start = e.allDay ? "終日" : formatTime(e.startsAt);
	const end =
		!e.allDay && e.endsAt && e.endsAt !== e.startsAt
			? formatTime(e.endsAt)
			: null;
	return {
		date: `${month}.${day}`,
		dow: DOW[n],
		time: end ? `${start}–${end}` : start,
		month: Number(month),
		day: Number(day),
		dowJa: DOW_JA[n],
		start,
	};
}
