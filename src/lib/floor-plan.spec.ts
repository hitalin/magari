import { describe, expect, it } from "vitest";
import { PLAN, parsePlan, planBox, planOutline, planRooms } from "./floor-plan";

const rooms = (text: string) => {
	const r = parsePlan(text);
	if (!r.ok) throw new Error(r.error);
	return r.rooms;
};
const error = (text: string) => {
	const r = parsePlan(text);
	return r.ok ? null : r.error;
};

describe("parsePlan", () => {
	it("同じ名前の並んだ升が 1 つの区画になる（縦にも横にもまたがれる）", () => {
		expect(
			rooms(`
				カウンター カウンター 厨房
				カウンター カウンター 個室
				入口       入口       個室
			`),
		).toEqual([
			{ name: "カウンター", x: 0, y: 0, w: 2, h: 2 },
			{ name: "厨房", x: 2, y: 0, w: 1, h: 1 },
			{ name: "個室", x: 2, y: 1, w: 1, h: 2 },
			{ name: "入口", x: 0, y: 2, w: 2, h: 1 },
		]);
	});
	it("「.」は何も無い升。全角の空白でも区切れる", () => {
		expect(rooms("土間　. 縁側\n土間 . 縁側")).toEqual([
			{ name: "土間", x: 0, y: 0, w: 1, h: 2 },
			{ name: "縁側", x: 2, y: 0, w: 1, h: 2 },
		]);
	});
	it("記号で書いて、「記号 = 名前」の行で名前を付けられる", () => {
		expect(
			rooms(`
				A A B
				A A B

				A = カウンター 席
				B = 厨房
			`),
		).toEqual([
			{ name: "カウンター 席", x: 0, y: 0, w: 2, h: 2 },
			{ name: "厨房", x: 2, y: 0, w: 1, h: 2 },
		]);
	});
	it("空なら見取り図なし", () => {
		expect(parsePlan("")).toEqual({ ok: true, rooms: [] });
		expect(parsePlan(" \n ")).toEqual({ ok: true, rooms: [] });
	});
	it("行ごとの升の数が違えば、何行目かを添えて断る", () => {
		expect(error("A A B\nA B")).toMatch(/2 行目/);
	});
	it("四角になっていない区画、離れた所にある同じ名前は断る", () => {
		expect(error("A A\nA B")).toMatch(/「A」/);
		expect(error("A B A")).toMatch(/「A」/);
	});
	it("方眼・区画の数・名前の長さの上限を超えたら断る", () => {
		const row = (n: number) =>
			Array.from({ length: n }, (_, i) => `r${i}`).join(" ");
		expect(error(row(PLAN.max + 1))).not.toBeNull();
		expect(
			error(
				Array(PLAN.cols + 1)
					.fill("A")
					.join(" "),
			),
		).not.toBeNull();
		expect(
			error(
				Array(PLAN.rows + 1)
					.fill("A")
					.join("\n"),
			),
		).not.toBeNull();
		expect(error("あ".repeat(PLAN.nameMax + 1))).not.toBeNull();
		expect(error(row(PLAN.max))).toBeNull();
	});
});

describe("planRooms", () => {
	it("保存してある記法から区画を出す。無い・読めないなら空", () => {
		expect(planRooms("A A\nB B")).toHaveLength(2);
		expect(planRooms(null)).toEqual([]);
		expect(planRooms("A A\nA B")).toEqual([]);
	});
});

describe("planBox", () => {
	it("区画ぜんぶを囲む範囲を返す（図はここだけを描く）", () => {
		expect(planBox(rooms(". A A\nB B ."))).toEqual({ x: 0, y: 0, w: 3, h: 2 });
	});
});

describe("planOutline", () => {
	it("ハコの外まわりの壁だけを返す（区画どうしの仕切りは含めない）", () => {
		// 2 升が横に並ぶ: 外まわりは 6 辺、あいだの仕切り 1 本は入らない
		const d = planOutline(rooms("A B"));
		expect(d.match(/M/g)).toHaveLength(6);
		expect(d).not.toContain("M1 0V1");
	});
	it("くぼんだ形（L 字）も外まわりをなぞる", () => {
		// 3 升の L 字: 外まわりは 8 辺
		expect(planOutline(rooms("A .\nB C")).match(/M/g)).toHaveLength(8);
	});
});
