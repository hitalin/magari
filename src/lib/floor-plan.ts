// 間取り（見取り図）。ハコの中を升目に分け、同じ名前の並んだ升を 1 つの区画として書く（CSS の grid-template-areas と同じ書き方）:
//
//   カウンター カウンター 厨房
//   カウンター カウンター 個室
//   入口       入口       個室
//
// 長い名前は記号で書いて、下に「A = カウンター」の行で名前を付けてもよい。「.」は何も無い升。
// 保存するのはこの記法のまま（actors.floor_plan）。画面の描画（FloorPlan.svelte）、編集のプレビュー、保存時の検証で共有する（純粋関数）。

// 区画。位置と大きさは升の数
export type Room = { name: string; x: number; y: number; w: number; h: number };

// 升目の大きさ、区画の数、名前の長さ、記法ぜんたいの長さの上限
export const PLAN = { cols: 24, rows: 16, max: 20, nameMax: 30, textMax: 2000 };

export function parsePlan(
	text: string,
): { ok: true; rooms: Room[] } | { ok: false; error: string } {
	const fail = (error: string) => ({ ok: false as const, error });
	if (text.length > PLAN.textMax)
		return fail(`間取りが長すぎます（${PLAN.textMax} 文字まで）`);
	const names = new Map<string, string>();
	const grid: { cells: string[]; line: number }[] = [];
	text.split("\n").forEach((raw, i) => {
		const line = raw.trim();
		if (!line) return;
		const legend = /^(\S+)\s*=\s*(.+)$/.exec(line);
		if (legend) names.set(legend[1], legend[2].trim());
		else grid.push({ cells: line.split(/[\s　]+/), line: i + 1 });
	});
	if (!grid.length) return { ok: true, rooms: [] };
	const cols = grid[0].cells.length;
	if (cols > PLAN.cols || grid.length > PLAN.rows)
		return fail(`間取りは横 ${PLAN.cols} 升、縦 ${PLAN.rows} 升までです`);
	const uneven = grid.find((r) => r.cells.length !== cols);
	if (uneven)
		return fail(
			`${uneven.line} 行目の升の数が違います（${cols} 個のはずが ${uneven.cells.length} 個）`,
		);

	// 区画ごとに、升を囲む範囲と升の数を集める
	const found = new Map<string, Room & { count: number }>();
	grid.forEach((row, y) => {
		row.cells.forEach((cell, x) => {
			if (cell === ".") return;
			const name = names.get(cell) ?? cell;
			const r = found.get(name);
			if (!r) {
				found.set(name, { name, x, y, w: 1, h: 1, count: 1 });
				return;
			}
			const right = Math.max(r.x + r.w, x + 1);
			const bottom = Math.max(r.y + r.h, y + 1);
			r.x = Math.min(r.x, x);
			r.y = Math.min(r.y, y);
			r.w = right - r.x;
			r.h = bottom - r.y;
			r.count++;
		});
	});
	if (found.size > PLAN.max)
		return fail(`間取りの区画は ${PLAN.max} 個までです`);
	const rooms: Room[] = [];
	for (const { count, ...r } of found.values()) {
		if (r.name.length > PLAN.nameMax)
			return fail(`区画の名前が長すぎます（${PLAN.nameMax} 文字まで）`);
		// 囲む範囲が升で埋まっていなければ、四角でないか、離れた所に同じ名前がある
		if (count !== r.w * r.h)
			return fail(
				`「${r.name}」が四角になっていません。同じ名前の升は、ひとつの四角にまとめてください`,
			);
		rooms.push(r);
	}
	return { ok: true, rooms };
}

// 保存してある記法から区画を出す。無い・読めない（上限を変えた後の古い値など）なら空
export function planRooms(text: string | null): Room[] {
	const r = parsePlan(text ?? "");
	return r.ok ? r.rooms : [];
}

// 区画ぜんぶを囲む範囲。図はここだけを描く
export function planBox(rooms: Room[]): {
	x: number;
	y: number;
	w: number;
	h: number;
} {
	const x = Math.min(...rooms.map((r) => r.x));
	const y = Math.min(...rooms.map((r) => r.y));
	return {
		x,
		y,
		w: Math.max(...rooms.map((r) => r.x + r.w)) - x,
		h: Math.max(...rooms.map((r) => r.y + r.h)) - y,
	};
}

// ハコの外まわりの壁（SVG の path）。区画のある升と無い升の境目を、升の辺ごとに引く。
// ロゴの ◱ と同じく、外枠は仕切りより太く描くために分けて持つ
export function planOutline(rooms: Room[]): string {
	const filled = new Set<string>();
	for (const r of rooms)
		for (let y = r.y; y < r.y + r.h; y++)
			for (let x = r.x; x < r.x + r.w; x++) filled.add(`${x},${y}`);
	const out: string[] = [];
	for (const key of filled) {
		const [x, y] = key.split(",").map(Number);
		if (!filled.has(`${x},${y - 1}`)) out.push(`M${x} ${y}H${x + 1}`);
		if (!filled.has(`${x},${y + 1}`)) out.push(`M${x} ${y + 1}H${x + 1}`);
		if (!filled.has(`${x - 1},${y}`)) out.push(`M${x} ${y}V${y + 1}`);
		if (!filled.has(`${x + 1},${y}`)) out.push(`M${x + 1} ${y}V${y + 1}`);
	}
	return out.join("");
}

// 区画の名前が四角に収まる字の大きさ（升の数）
export function labelSize(r: Room): number {
	return Math.max(
		0.2,
		Math.min(0.5, r.h * 0.45, (r.w * 0.8) / Math.max(1, [...r.name].length)),
	);
}
