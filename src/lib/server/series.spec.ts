import { describe, expect, it } from "vitest";
import { occurrencesAfter } from "./series";

const jst = (s: string) => new Date(`${s}:00+09:00`);

describe("occurrencesAfter", () => {
	it("毎週: 元の回より後を、期限まで", () => {
		const start = jst("2026-12-01T19:00");
		expect(
			occurrencesAfter("FREQ=WEEKLY", start, start, jst("2026-12-23T00:00")),
		).toEqual([
			jst("2026-12-08T19:00"),
			jst("2026-12-15T19:00"),
			jst("2026-12-22T19:00"),
		]);
	});
	it("隔週", () => {
		const start = jst("2026-12-01T19:00");
		expect(
			occurrencesAfter(
				"FREQ=WEEKLY;INTERVAL=2",
				start,
				start,
				jst("2027-01-01T00:00"),
			),
		).toEqual([jst("2026-12-15T19:00"), jst("2026-12-29T19:00")]);
	});
	it("毎月 第2火曜", () => {
		const start = jst("2026-12-08T19:00");
		expect(
			occurrencesAfter(
				"FREQ=MONTHLY;BYDAY=2TU",
				start,
				start,
				jst("2027-03-31T00:00"),
			),
		).toEqual([
			jst("2027-01-12T19:00"),
			jst("2027-02-09T19:00"),
			jst("2027-03-09T19:00"),
		]);
	});
	it("曜日は JST で数える（深夜 1 時は UTC では前の日）", () => {
		const start = jst("2026-12-08T01:00");
		expect(
			occurrencesAfter(
				"FREQ=MONTHLY;BYDAY=2TU",
				start,
				start,
				jst("2027-01-31T00:00"),
			),
		).toEqual([jst("2027-01-12T01:00")]);
	});
	it("もう作った所（after）までは返さない", () => {
		const start = jst("2026-12-01T19:00");
		expect(
			occurrencesAfter(
				"FREQ=WEEKLY",
				start,
				jst("2026-12-15T19:00"),
				jst("2026-12-23T00:00"),
			),
		).toEqual([jst("2026-12-22T19:00")]);
	});
});
