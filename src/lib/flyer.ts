import { dayKey, formatTime } from "./date";

// 自動のビラ（画像を上げていない会のフライヤー）の見た目。
// まがりの貼り紙として、アプリと同じ材料（アスファルト・段ボール・ガムテープ・紙）だけで作る。
// 型と差し色は開ける人が選べる。選んでいない会（取り込んだ会、まとめのビラ）は ID から決まり、同じ会はいつも同じ見た目になる。
// 選んでいない会にはどの題がどの型に当たるか分からないので、題には演出をかけない（1 字だけ大きくする、傾ける、寝かせる、をしない）。

// danbo: 段ボールにマジック、日付はガムテープ / gumtape: 黒い紙に、題をガムテープに書いて貼る
// gariban: わら半紙のおたより / harigami: 白い紙の貼り紙（日付が主役）
export const FLYER_VARIANTS = [
	"danbo",
	"gumtape",
	"gariban",
	"harigami",
] as const;
export type FlyerVariant = (typeof FLYER_VARIANTS)[number];
export const FLYER_VARIANT_LABEL: Record<FlyerVariant, string> = {
	danbo: "段ボール",
	gumtape: "ガムテ",
	gariban: "わら半紙",
	harigami: "貼り紙",
};

// 差し色。1 枚に 1 色だけ使う
export const FLYER_COLORS = ["red", "blue", "green", "pink", "mono"] as const;
export type FlyerColor = (typeof FLYER_COLORS)[number];
export const FLYER_COLOR_LABEL: Record<FlyerColor, string> = {
	red: "赤",
	blue: "紫",
	green: "黄緑",
	pink: "ピンク",
	mono: "色なし",
};

// 開ける人が選んだ型と差し色（events.flyer_variant / flyer_color）
export type FlyerLook = { variant: FlyerVariant; color: FlyerColor };

export function parseFlyerLook(
	variant: string | null,
	color: string | null,
): FlyerLook | null {
	const v = FLYER_VARIANTS.find((x) => x === variant);
	const c = FLYER_COLORS.find((x) => x === color);
	return v && c ? { variant: v, color: c } : null;
}

// 明るい紙に載せる濃い色（マジック、インク）と、黒い紙に載せる明るい色（蛍光のペンやスプレー）。
// ライブハウスの壁やミニコミの刷り色に寄せる: 血の赤、謄写版の紫、毒々しい黄緑、ショッキングピンク。
// 鍵（red / blue / green / pink）は保存してあるので変えず、色みだけ差し替えている
const DEEP: Record<FlyerColor, string> = {
	red: "#b0141e",
	blue: "#4a1f9c",
	green: "#3f5a0c",
	pink: "#c4126e",
	mono: "#1f1d1a",
};
const BRIGHT: Record<FlyerColor, string> = {
	red: "#ff2d2d",
	blue: "#a86bff",
	green: "#b8f02a",
	pink: "#ff3d9a",
	mono: "#edeae3",
};
// おたよりを色なしで刷るときのインク。墨は訃報の黒枠に寄るので焦げ茶にする
const SEPIA = "#4a2f1a";

// FNV-1a（32bit）
export function hash(s: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h;
}

// 紙・墨（字の色）・差し色。紙は型ごとに 1 つで、アプリの色から取る（段ボール、アスファルト、生成り）
function colors(
	variant: FlyerVariant,
	color: FlyerColor,
): { paper: string; ink: string; spot: string } {
	switch (variant) {
		case "danbo":
			// 色なしは白のペンキ
			return {
				paper: "#c9a67a",
				ink: "#2a1e13",
				spot: color === "mono" ? "#f1efe9" : DEEP[color],
			};
		case "gumtape":
			return { paper: "#17181a", ink: "#f1efe9", spot: BRIGHT[color] };
		case "gariban": {
			// 一色刷り。字も罫も同じインク
			const ink = color === "mono" ? SEPIA : DEEP[color];
			return { paper: "#e6dcbd", ink, spot: ink };
		}
		case "harigami":
			return { paper: "#f1efe9", ink: "#1f1d1a", spot: DEEP[color] };
	}
}

export function flyerStyle(
	id: string,
	look?: FlyerLook | null,
): FlyerLook & {
	paper: string;
	ink: string;
	spot: string;
	tilt: number;
} {
	const h = hash(id);
	const variant = look?.variant ?? FLYER_VARIANTS[h % FLYER_VARIANTS.length];
	const color = look?.color ?? FLYER_COLORS[(h >>> 4) % FLYER_COLORS.length];
	return {
		variant,
		color,
		...colors(variant, color),
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
