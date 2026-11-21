import { describe, expect, it } from "vitest";
import {
	moveToDay,
	parseRepeat,
	parseUntil,
	repeatRule,
	ruleLabel,
	untilDay,
} from "./repeat";

// 2026-12-01 は火曜。JST 19:00 = UTC 10:00
const tue = (day: number, time = "19:00") =>
	new Date(`2026-12-${String(day).padStart(2, "0")}T${time}:00+09:00`);

describe("parseRepeat", () => {
	it("知っている種類だけ通す", () => {
		expect(parseRepeat("weekly")).toBe("weekly");
		expect(parseRepeat("biweekly")).toBe("biweekly");
		expect(parseRepeat("monthly")).toBe("monthly");
		expect(parseRepeat("")).toBeNull();
		expect(parseRepeat("daily")).toBeNull();
		expect(parseRepeat(null)).toBeNull();
	});
});

describe("repeatRule", () => {
	it("毎週と隔週", () => {
		expect(repeatRule("weekly", tue(1))).toBe("FREQ=WEEKLY");
		expect(repeatRule("biweekly", tue(1))).toBe("FREQ=WEEKLY;INTERVAL=2");
	});
	it("毎月は、その日が第何の何曜かで決める", () => {
		expect(repeatRule("monthly", tue(8))).toBe("FREQ=MONTHLY;BYDAY=2TU");
		expect(repeatRule("monthly", tue(22))).toBe("FREQ=MONTHLY;BYDAY=4TU");
	});
	it("第5は毎月あるとは限らないので、最終にする", () => {
		expect(repeatRule("monthly", tue(29))).toBe("FREQ=MONTHLY;BYDAY=-1TU");
	});
	it("曜日は JST で読む（UTC ではまだ月曜の深夜 1 時）", () => {
		expect(repeatRule("monthly", tue(8, "01:00"))).toBe(
			"FREQ=MONTHLY;BYDAY=2TU",
		);
	});
});

describe("ruleLabel", () => {
	it("人に読める形にする", () => {
		expect(ruleLabel("FREQ=WEEKLY", tue(1))).toBe("毎週火曜");
		expect(ruleLabel("FREQ=WEEKLY;INTERVAL=2", tue(1))).toBe("隔週火曜");
		expect(ruleLabel("FREQ=MONTHLY;BYDAY=2TU", tue(8))).toBe("毎月 第2火曜");
		expect(ruleLabel("FREQ=MONTHLY;BYDAY=-1TU", tue(29))).toBe("毎月 最終火曜");
	});
	it("知らない決まりは、繰り返しとだけ言う", () => {
		expect(ruleLabel("FREQ=DAILY", tue(1))).toBe("繰り返し");
	});
});

describe("moveToDay", () => {
	it("時刻と長さを保って、別の回の日へ移す", () => {
		const moved = moveToDay(tue(15), tue(1, "20:00"), tue(1, "22:00"));
		expect(moved.startsAt).toEqual(tue(15, "20:00"));
		expect(moved.endsAt).toEqual(tue(15, "22:00"));
	});
	it("日をまたぐ終了もそのまま", () => {
		const end = new Date("2026-12-02T02:00:00+09:00");
		const moved = moveToDay(tue(15), tue(1, "23:00"), end);
		expect(moved.endsAt).toEqual(new Date("2026-12-16T02:00:00+09:00"));
	});
	it("終了が無ければ無いまま", () => {
		expect(moveToDay(tue(15), tue(1), null).endsAt).toBeNull();
	});
});

describe("parseUntil", () => {
	it("空なら終わりを決めない", () => {
		expect(parseUntil("", tue(1))).toEqual({ ok: true, until: null });
		expect(parseUntil(null, tue(1))).toEqual({ ok: true, until: null });
	});
	it("その日の回までを含む（次の日の JST 0 時で切る）", () => {
		expect(parseUntil("2026-12-15", tue(1))).toEqual({
			ok: true,
			until: new Date("2026-12-16T00:00:00+09:00"),
		});
	});
	it("最初の回と同じ日でもよい（その 1 回で終わる）", () => {
		expect(parseUntil("2026-12-01", tue(1)).ok).toBe(true);
	});
	it("最初の回より前の日と、日付でない値は断る", () => {
		expect(parseUntil("2026-11-30", tue(1)).ok).toBe(false);
		expect(parseUntil("来月", tue(1)).ok).toBe(false);
		expect(parseUntil("2026-13-40", tue(1)).ok).toBe(false);
	});
});

describe("untilDay", () => {
	it("欄に出す日付へ戻す（切る時刻の前の日）", () => {
		expect(untilDay(new Date("2026-12-16T00:00:00+09:00"))).toBe("2026-12-15");
		expect(untilDay(null)).toBe("");
	});
});
