import { describe, expect, it } from "vitest";
import {
	COLORS,
	encodeStrokes,
	MAX_POINTS,
	MAX_STROKES,
	markerHalf,
	outline,
	parseStrokes,
	sprayDrips,
	sprayHalf,
	WALL_H,
	WALL_W,
} from "./graffiti.ts";

describe("encodeStrokes / parseStrokes", () => {
	it("往復で同じ線に戻る", () => {
		const strokes = [
			{
				tool: "chalk" as const,
				color: 0,
				size: 1,
				points: [
					[10, 20],
					[15, 40],
				] as [number, number][],
			},
			{
				tool: "spray" as const,
				color: 3,
				size: 1,
				points: [[100, 200]] as [number, number][],
			},
			{
				tool: "marker" as const,
				color: 7,
				size: 1,
				points: [[1, 2]] as [number, number][],
			},
			{
				tool: "paint" as const,
				color: 1,
				size: 1,
				points: [[3, 4]] as [number, number][],
			},
		];
		const d = encodeStrokes(strokes);
		expect(d).toBe("c0 10,20 15,40;s3 100,200;m7 1,2;p1 3,4");
		expect(parseStrokes(d)).toEqual(strokes);
	});

	it("消しゴムも線として往復する", () => {
		const strokes = [
			{
				tool: "eraser" as const,
				color: 0,
				size: 1,
				points: [
					[5, 6],
					[7, 8],
				] as [number, number][],
			},
		];
		expect(encodeStrokes(strokes)).toBe("e0 5,6 7,8");
		expect(parseStrokes("e0 5,6 7,8")).toEqual(strokes);
	});

	it("座標は整数に丸め、壁の中に収める", () => {
		expect(
			encodeStrokes([
				{
					tool: "chalk",
					color: 0,
					size: 1,
					points: [
						[-5.2, 3.6],
						[WALL_W + 30, WALL_H + 30],
					],
				},
			]),
		).toBe(`c0 0,4 ${WALL_W},${WALL_H}`);
	});

	it("太さは中（1）なら書かず、細い・太いだけ色の後ろに付ける", () => {
		const strokes = [
			{ tool: "spray" as const, color: 2, size: 0, points: [[1, 2]] },
			{ tool: "marker" as const, color: 4, size: 2, points: [[3, 4]] },
		] as {
			tool: "spray" | "marker";
			color: number;
			size: number;
			points: [number, number][];
		}[];
		expect(encodeStrokes(strokes)).toBe("s20 1,2;m42 3,4");
		expect(parseStrokes("s20 1,2;m42 3,4")).toEqual(strokes);
	});

	it("同じ点の繰り返し（スプレーを止めていた所）はそのまま往復する", () => {
		expect(parseStrokes("s0 5,5 5,5 5,5 9,9")?.[0].points).toHaveLength(4);
	});

	it("点の無い線は書き出さない", () => {
		expect(
			encodeStrokes([{ tool: "chalk", color: 0, size: 1, points: [] }]),
		).toBe("");
	});
});

describe("parseStrokes が受け付けないもの", () => {
	it.each([
		["空", ""],
		["知らない道具", "x0 1,2"],
		["色が無い", "c 1,2"],
		["無い太さ", "c03 1,2"],
		["太さの後ろに余計な字", "c011 1,2"],
		["パレットに無い色", `c${COLORS.length} 1,2`],
		["点が無い", "c0"],
		["数でない", "c0 1,a"],
		["小数", "c0 1.5,2"],
		["負の数", "c0 -1,2"],
		["壁の外（横）", `c0 ${WALL_W + 1},2`],
		["壁の外（縦）", `c0 1,${WALL_H + 1}`],
		["座標が 3 つ", "c0 1,2,3"],
		["余計な区切り", "c0 1,2;"],
		["スクリプト", "c0 1,2 <script>"],
	])("%s", (_, d) => {
		expect(parseStrokes(d)).toBeNull();
	});

	it("線が多すぎる", () => {
		const d = Array.from({ length: MAX_STROKES + 1 }, () => "c0 1,2").join(";");
		expect(parseStrokes(d)).toBeNull();
	});

	it("点が多すぎる", () => {
		const d = `c0 ${Array.from({ length: MAX_POINTS + 1 }, () => "1,2").join(" ")}`;
		expect(parseStrokes(d)).toBeNull();
	});

	it("上限ちょうどは通る", () => {
		const d = `c0 ${Array.from({ length: MAX_POINTS }, () => "1,2").join(" ")}`;
		expect(parseStrokes(d)?.[0].points).toHaveLength(MAX_POINTS);
	});
});

describe("outline", () => {
	it("1 点は、その点を囲む円になる", () => {
		const poly = outline([[10, 20]], [5]);
		expect(poly.length).toBeGreaterThanOrEqual(8);
		for (const [x, y] of poly)
			expect(Math.hypot(x - 10, y - 20)).toBeCloseTo(5, 5);
	});

	it("横の線は、上下に半分の太さずつ広がり、両端は丸く出る", () => {
		const poly = outline(
			[
				[0, 0],
				[10, 0],
				[20, 0],
			],
			[4, 4, 4],
		);
		const xs = poly.map((p) => p[0]);
		const ys = poly.map((p) => p[1]);
		expect(Math.min(...ys)).toBeCloseTo(-4, 5);
		expect(Math.max(...ys)).toBeCloseTo(4, 5);
		expect(Math.min(...xs)).toBeCloseTo(-4, 5);
		expect(Math.max(...xs)).toBeCloseTo(24, 5);
	});

	it("点ごとに太さを変えられる", () => {
		const poly = outline(
			[
				[0, 0],
				[10, 0],
				[20, 0],
			],
			[1, 6, 1],
		);
		expect(Math.max(...poly.map((p) => p[1]))).toBeCloseTo(6, 5);
	});

	it("行って戻る線でも数が壊れない", () => {
		const poly = outline(
			[
				[0, 0],
				[10, 0],
				[0, 0],
			],
			[3, 3, 3],
		);
		expect(poly.flat().every(Number.isFinite)).toBe(true);
	});
});

describe("markerHalf（平芯）", () => {
	const line = (dx: number, dy: number) =>
		Array.from({ length: 8 }, (_, i) => [i * dx, i * dy] as [number, number]);
	it("芯の向き（右上がり）に引くと細く、それを横切る向き（右下がり）で太い", () => {
		const thin = markerHalf(line(5, -5), 10)[4];
		const thick = markerHalf(line(5, 5), 10)[4];
		expect(thick).toBeCloseTo(5, 1);
		expect(thin).toBeLessThan(thick / 2);
		expect(thin).toBeGreaterThan(0);
	});
});

describe("sprayHalf", () => {
	it("速く動かした所（点の間が広い）ほど細い", () => {
		const slow = sprayHalf(
			Array.from({ length: 6 }, (_, i) => [i * 3, 0] as [number, number]),
			16,
		)[3];
		const fast = sprayHalf(
			Array.from({ length: 6 }, (_, i) => [i * 40, 0] as [number, number]),
			16,
		)[3];
		expect(fast).toBeLessThan(slow);
	});
});

describe("sprayDrips", () => {
	it("動かし続けた線は垂れない", () => {
		expect(
			sprayDrips(
				[
					[0, 0],
					[5, 0],
					[10, 0],
				],
				16,
			),
		).toEqual([]);
	});

	it("止めていた所（同じ点の繰り返し）から下へ垂れ、長く止めるほど長い", () => {
		const short = sprayDrips(
			[
				[0, 0],
				[50, 0],
				[50, 0],
				[100, 0],
			],
			16,
		);
		const long = sprayDrips(
			[
				[0, 0],
				[50, 0],
				[50, 0],
				[50, 0],
				[50, 0],
				[100, 0],
			],
			16,
		);
		expect(short).toHaveLength(1);
		expect(short[0].x).toBeCloseTo(50, -1);
		expect(short[0].y).toBe(0);
		expect(short[0].length).toBeGreaterThan(0);
		expect(long[0].length).toBeGreaterThan(short[0].length);
	});
});
