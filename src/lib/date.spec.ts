import { describe, expect, it } from "vitest";
import {
	dayKey,
	formatDay,
	formatTime,
	formatTimeRange,
	formatWhen,
} from "./date";

describe("JST 表示", () => {
	// 2026-11-08T10:00Z = JST 11/8(日) 19:00
	const start = "2026-11-08T10:00:00Z";

	it("dayKey は JST の日付で日をまたぐ", () => {
		expect(dayKey("2026-11-08T14:59:00Z")).toBe("2026-11-08");
		expect(dayKey("2026-11-08T15:00:00Z")).toBe("2026-11-09");
	});

	it("formatDay は月日と曜日を出す", () => {
		expect(formatDay(start)).toBe("11月8日(日)");
		expect(formatDay("2026-12-31T00:00:00Z")).toBe("12月31日(木)");
	});

	it("formatTime は 24 時間表記", () => {
		expect(formatTime(start)).toBe("19:00");
		expect(formatTime("2026-11-08T00:05:00Z")).toBe("09:05");
	});

	it("formatTimeRange は終了があれば範囲、なければ開始だけ", () => {
		expect(formatTimeRange(start, "2026-11-08T13:00:00Z")).toBe("19:00〜22:00");
		expect(formatTimeRange(start, null)).toBe("19:00");
	});
});

describe("formatWhen", () => {
	it("終日は「日付 終日」、時刻付きは「日付 時刻〜時刻」、終了が無いか同じなら開始だけ", () => {
		expect(
			formatWhen({
				startsAt: "2026-11-05T15:00:00Z",
				endsAt: "2026-11-06T15:00:00Z",
				allDay: true,
			}),
		).toBe("11月6日(金) 終日");
		expect(
			formatWhen({
				startsAt: "2026-11-08T10:00:00Z",
				endsAt: "2026-11-08T13:00:00Z",
				allDay: false,
			}),
		).toBe("11月8日(日) 19:00〜22:00");
		expect(
			formatWhen({
				startsAt: "2026-11-08T10:00:00Z",
				endsAt: null,
				allDay: false,
			}),
		).toBe("11月8日(日) 19:00");
		expect(
			formatWhen({
				startsAt: "2026-11-08T10:00:00Z",
				endsAt: "2026-11-08T10:00:00Z",
				allDay: false,
			}),
		).toBe("11月8日(日) 19:00");
	});
});
