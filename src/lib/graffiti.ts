// 地面（アスファルト）の落書き。どのページでも同じ 1 枚の地面に描く。
// 線は地面の座標（px の整数）で持つ。横は画面の中央が ORIGIN_X、縦はページの上端が 0。
// 保存する形は「道具 1 文字 + 色の番号 + 点の列」を ; でつないだ文字列（例: "c0 10,20 15,40;s3 100,200"）。

export const WALL_W = 2000;
export const WALL_H = 6000;
export const ORIGIN_X = WALL_W / 2;
// 見える落書きの数。これより古いものは擦れて消える
export const VISIBLE = 500;
// 1 回に送れる量
export const MAX_STROKES = 60;
export const MAX_POINTS = 2000;

// 道具: チョーク（細くかすれる）、マーカー（くっきり）、ペンキ（刷毛の幅）、スプレー（縁がぼける）
export type Tool = "chalk" | "marker" | "paint" | "spray";
// 色は番号（COLORS の何番目か）で持つ。保存した落書きの色が変わるので、並びは変えずに後ろへ足す
export const COLORS = [
	"#edeae3",
	"#ffd23f",
	"#ff8a1f",
	"#f0433a",
	"#ff5fa2",
	"#a86bff",
	"#2f9bff",
	"#3ecf6b",
] as const;
export type Stroke = { tool: Tool; color: number; points: [number, number][] };
// 1 回ぶんの落書き（保存した 1 行）
export type Scribble = { id: string; d: string };

const LETTER: Record<Tool, string> = {
	chalk: "c",
	marker: "m",
	paint: "p",
	spray: "s",
};
const TOOL: Record<string, Tool> = {
	c: "chalk",
	m: "marker",
	p: "paint",
	s: "spray",
};

const clamp = (n: number, max: number) =>
	Math.min(max, Math.max(0, Math.round(n)));

export function encodeStrokes(strokes: Stroke[]): string {
	return strokes
		.filter((s) => s.points.length > 0)
		.map(
			(s) =>
				`${LETTER[s.tool]}${s.color} ${s.points
					.map(([x, y]) => `${clamp(x, WALL_W)},${clamp(y, WALL_H)}`)
					.join(" ")}`,
		)
		.join(";");
}

// 形か量がおかしければ null（誰でも送れるので、保存の前に必ず通す）
export function parseStrokes(d: string): Stroke[] | null {
	if (d === "") return null;
	const parts = d.split(";");
	if (parts.length > MAX_STROKES) return null;
	const strokes: Stroke[] = [];
	let total = 0;
	for (const part of parts) {
		const [head, ...rest] = part.split(" ");
		const tool = TOOL[head[0]];
		if (!tool || !/^.\d$/.test(head) || rest.length === 0) return null;
		const color = Number(head[1]);
		if (color >= COLORS.length) return null;
		const points: [number, number][] = [];
		for (const p of rest) {
			const m = /^(\d{1,4}),(\d{1,4})$/.exec(p);
			if (!m) return null;
			const x = Number(m[1]);
			const y = Number(m[2]);
			if (x > WALL_W || y > WALL_H) return null;
			points.push([x, y]);
		}
		total += points.length;
		if (total > MAX_POINTS) return null;
		strokes.push({ tool, color, points });
	}
	return strokes;
}
