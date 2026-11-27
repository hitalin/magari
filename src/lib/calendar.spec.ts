import { describe, expect, it } from "vitest";
import {
	gridRange,
	monthGrid,
	parseMonth,
	previewPosition,
	shiftMonth,
} from "./calendar";

describe("monthGrid", () => {
	it("日曜始まりで、前後の月の日も埋めて週ごとに返す", () => {
		// 2026-11-01 は日曜、30 日まで → 5 週
		const g = monthGrid(2026, 11);
		expect(g).toHaveLength(5);
		expect(g[0][0]).toBe("2026-11-01");
		expect(g[4][6]).toBe("2026-12-05");
		expect(g.every((w) => w.length === 7)).toBe(true);
	});

	it("月初が火曜なら前月の日曜から始まる", () => {
		const g = monthGrid(2026, 12);
		expect(g[0]).toEqual([
			"2026-11-29",
			"2026-11-30",
			"2026-12-01",
			"2026-12-02",
			"2026-12-03",
			"2026-12-04",
			"2026-12-05",
		]);
		expect(g.at(-1)?.at(-1)).toBe("2027-01-02");
	});
});

describe("shiftMonth", () => {
	it("年をまたいで前後する", () => {
		expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
		expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
	});
});

describe("parseMonth", () => {
	it("YYYY-MM を読む。不正なら null", () => {
		expect(parseMonth("2026-11")).toEqual({ year: 2026, month: 11 });
		expect(parseMonth("2026-13")).toBeNull();
		expect(parseMonth("abc")).toBeNull();
	});
});

describe("gridRange", () => {
	it("グリッド先頭の JST 0 時から、末尾の翌日 JST 0 時まで", () => {
		const { from, to } = gridRange(2026, 12);
		expect(from.toISOString()).toBe("2026-11-28T15:00:00.000Z");
		expect(to.toISOString()).toBe("2027-01-02T15:00:00.000Z");
	});
});

describe("previewPosition", () => {
	const view = { width: 1280, height: 800 };
	const size = { width: 240, height: 360 };
	const at = (left: number, top: number) => ({
		left,
		right: left + 120,
		top,
	});
	it("右に入れば、項目の右に、上端を揃えて出す", () => {
		expect(previewPosition(at(300, 200), size, view)).toEqual({
			left: 428,
			top: 200,
		});
	});
	it("右に入らなければ、項目の左に出す", () => {
		expect(previewPosition(at(1000, 200), size, view)).toEqual({
			left: 752,
			top: 200,
		});
	});
	it("下にはみ出すなら、画面に収まるまで上へずらす", () => {
		expect(previewPosition(at(300, 700), size, view).top).toBe(432);
	});
	it("画面より高ければ、画面の上端に付ける", () => {
		const tall = { width: 240, height: 900 };
		expect(previewPosition(at(300, 200), tall, view).top).toBe(8);
	});
	it("左右どちらにも入らなければ、画面の中に収める", () => {
		const narrow = { width: 400, height: 800 };
		expect(previewPosition(at(100, 200), size, narrow).left).toBe(152);
	});
});
