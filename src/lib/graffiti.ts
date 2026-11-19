// 地面（アスファルト）の落書き。どのページでも同じ 1 枚の地面に描く。
// 線は地面の座標（px の整数）で持つ。横は画面の中央（本文より狭い画面では、本文の中央にあたる所）が ORIGIN_X、縦はページの上端が 0。
// 保存する形は「道具 1 文字 + 色の番号 + 太さ（中なら書かない） + 点の列」を ; でつないだ文字列
// （例: "c0 10,20 15,40;s32 100,200"）。

export const WALL_W = 2000;
export const WALL_H = 6000;
export const ORIGIN_X = WALL_W / 2;
// 見える落書きの数。これより古いものは擦れて消える
export const VISIBLE = 500;
// 1 回に送れる量
export const MAX_STROKES = 60;
export const MAX_POINTS = 2000;

// 道具: チョーク（細くかすれる）、マーカー（平芯。引く向きで太さが変わる）、ペンキ（刷毛の幅）、
// スプレー（縁が霧になり、速く動かすと細く、止めると垂れる。止めていた所は同じ点の繰り返しで持つ）、
// 消しゴム（それより前に描かれた線を、なぞった所だけ消す。これも 1 本の線として残す）
export type Tool = "chalk" | "marker" | "paint" | "spray" | "eraser";
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
// 太さは番号（SIZES の何番目か。細い・中・太い）で持ち、道具ごとの太さに掛ける
export const SIZES = [0.6, 1, 2] as const;
export type Stroke = {
	tool: Tool;
	color: number;
	size: number;
	points: [number, number][];
};
// 1 回ぶんの落書き（保存した 1 行）
export type Scribble = { id: string; d: string };

const LETTER: Record<Tool, string> = {
	chalk: "c",
	marker: "m",
	paint: "p",
	spray: "s",
	eraser: "e",
};
const TOOL: Record<string, Tool> = {
	c: "chalk",
	m: "marker",
	p: "paint",
	s: "spray",
	e: "eraser",
};

const clamp = (n: number, max: number) =>
	Math.min(max, Math.max(0, Math.round(n)));

export function encodeStrokes(strokes: Stroke[]): string {
	return strokes
		.filter((s) => s.points.length > 0)
		.map(
			(s) =>
				`${LETTER[s.tool]}${s.color}${s.size === 1 ? "" : s.size} ${s.points
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
		if (!tool || !/^.\d\d?$/.test(head) || rest.length === 0) return null;
		const color = Number(head[1]);
		const size = head[2] === undefined ? 1 : Number(head[2]);
		if (color >= COLORS.length || size >= SIZES.length) return null;
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
		strokes.push({ tool, color, size, points });
	}
	return strokes;
}

type Point = [number, number];

// 太さの変わる線の輪郭。中心線の点ごとに半分の太さ（half）を与えると、左側を行って右側を戻る多角形を返す。
// 両端は丸める。線の内側はいつも同じ回り方になるので、いくつ重ねても 1 回の fill（nonzero）で穴が開かない
export function outline(points: Point[], half: number[]): Point[] {
	const n = points.length;
	if (n === 1) {
		const [x, y] = points[0];
		return Array.from({ length: 12 }, (_, k) => {
			const a = (k * Math.PI) / 6;
			return [x + half[0] * Math.cos(a), y + half[0] * Math.sin(a)];
		});
	}
	// 各点での進む向き（前後の点を結ぶ。行って戻る所では手前の点から）
	const dirs = points.map(([x, y], i): Point => {
		const a = points[Math.max(0, i - 1)];
		const b = points[Math.min(n - 1, i + 1)];
		let dx = b[0] - a[0];
		let dy = b[1] - a[1];
		if (dx === 0 && dy === 0) {
			dx = x - a[0];
			dy = y - a[1];
		}
		const len = Math.hypot(dx, dy) || 1;
		return [dx / len, dy / len];
	});
	// 点 i から、進む向きに対して角度 a の方向へ half だけ離れた点（a = 90° が左、-90° が右）
	const off = (i: number, a: number): Point => {
		const [tx, ty] = dirs[i];
		const c = Math.cos(a) * half[i];
		const s = Math.sin(a) * half[i];
		return [points[i][0] + tx * c + ty * s, points[i][1] + ty * c - tx * s];
	};
	const Q = Math.PI / 4;
	const poly: Point[] = [];
	for (let i = 0; i < n; i++) poly.push(off(i, 2 * Q));
	poly.push(off(n - 1, Q), off(n - 1, 0), off(n - 1, -Q));
	for (let i = n - 1; i >= 0; i--) poly.push(off(i, -2 * Q));
	poly.push(off(0, -3 * Q), off(0, 4 * Q), off(0, 3 * Q));
	return poly;
}

// 平芯のマーカー。芯は右上がりに傾いていて、芯の向きに引くと細く、横切る向きに引くと太い（w は芯の幅）
const NIB = -Math.PI / 4;
export function markerHalf(points: Point[], w: number): number[] {
	const n = points.length;
	return points.map((_, i) => {
		// 手の震えで太さが波打たないよう、向きは 2 つ離れた点どうしで見る
		const a = points[Math.max(0, i - 2)];
		const b = points[Math.min(n - 1, i + 2)];
		if (a[0] === b[0] && a[1] === b[1]) return w / 2;
		const d = Math.atan2(b[1] - a[1], b[0] - a[0]);
		return (w / 2) * Math.max(0.25, Math.abs(Math.sin(d - NIB)));
	});
}

// スプレー。速く動かした所（点の間が広い）ほど塗料が乗らずに細い（w はゆっくり引いたときの太さ）
export function sprayHalf(points: Point[], w: number): number[] {
	const n = points.length;
	const gap = (i: number) =>
		Math.hypot(
			points[i + 1][0] - points[i][0],
			points[i + 1][1] - points[i][1],
		);
	return points.map((_, i) => {
		if (n === 1) return w / 2;
		const g = (gap(Math.max(0, i - 1)) + gap(Math.min(n - 2, i))) / 2;
		return (w / 2) * Math.min(1, Math.max(0.45, 1.15 - g / 45));
	});
}

// スプレーの垂れ。止めていた所（同じ点の繰り返し）から下へ流れ、長く止めるほど長い
export function sprayDrips(
	points: Point[],
	w: number,
): { x: number; y: number; length: number }[] {
	const drips: { x: number; y: number; length: number }[] = [];
	for (let i = 1; i < points.length; i++) {
		const [x, y] = points[i];
		if (points[i - 1][0] !== x || points[i - 1][1] !== y) continue;
		const last = drips[drips.length - 1];
		if (last && last.x === x && last.y === y) last.length += w * 0.5;
		// 最初の長さは場所ごとに少しばらつかせる（同じ絵はいつも同じに垂れる）
		else drips.push({ x, y, length: w * (1 + ((x * 7 + y * 13) % 10) / 10) });
	}
	return drips;
}
