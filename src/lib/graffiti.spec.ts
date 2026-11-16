import { describe, expect, it } from "vitest";
import {
	COLORS,
	encodeStrokes,
	MAX_POINTS,
	MAX_STROKES,
	parseStrokes,
	WALL_H,
	WALL_W,
} from "./graffiti.ts";

describe("encodeStrokes / parseStrokes", () => {
	it("往復で同じ線に戻る", () => {
		const strokes = [
			{
				tool: "chalk" as const,
				color: 0,
				points: [
					[10, 20],
					[15, 40],
				] as [number, number][],
			},
			{
				tool: "spray" as const,
				color: 3,
				points: [[100, 200]] as [number, number][],
			},
			{
				tool: "marker" as const,
				color: 7,
				points: [[1, 2]] as [number, number][],
			},
			{
				tool: "paint" as const,
				color: 1,
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
					points: [
						[-5.2, 3.6],
						[WALL_W + 30, WALL_H + 30],
					],
				},
			]),
		).toBe(`c0 0,4 ${WALL_W},${WALL_H}`);
	});

	it("点の無い線は書き出さない", () => {
		expect(encodeStrokes([{ tool: "chalk", color: 0, points: [] }])).toBe("");
	});
});

describe("parseStrokes が受け付けないもの", () => {
	it.each([
		["空", ""],
		["知らない道具", "x0 1,2"],
		["色が無い", "c 1,2"],
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
