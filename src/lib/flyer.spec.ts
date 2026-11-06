import { describe, expect, it } from "vitest";
import { FLYER_VARIANTS, flyerDate, flyerStyle, flyerTitleSize } from "./flyer";

describe("flyerStyle", () => {
	it("同じ会はいつも同じ見た目になる", () => {
		expect(flyerStyle("ytk7da2hnt")).toEqual(flyerStyle("ytk7da2hnt"));
	});
	it("会によって型が散らばり、傾きは ±2.5 度に収まる", () => {
		const styles = Array.from({ length: 60 }, (_, i) => flyerStyle(`ev${i}x`));
		expect(new Set(styles.map((s) => s.variant)).size).toBe(
			FLYER_VARIANTS.length,
		);
		for (const s of styles) {
			expect(Math.abs(s.tilt)).toBeLessThanOrEqual(2.5);
		}
	});
});

describe("flyerTitleSize", () => {
	it("題が長いほど小さくする", () => {
		expect(flyerTitleSize("朝カフェ")).toBe("xl");
		expect(flyerTitleSize("ゆうがな朝カフェ")).toBe("l");
		expect(flyerTitleSize("大人の発達障害アートカフェバー金輝")).toBe("m");
		expect(
			flyerTitleSize("心が疲れた人の交流会『ヤミトモ』《累計100回》オンライン"),
		).toBe("s");
	});
});

describe("flyerDate", () => {
	it("JST の「11.08」「SUN」「09:00–10:30」にする", () => {
		expect(
			flyerDate({
				startsAt: "2026-11-08T00:00:00Z",
				endsAt: "2026-11-08T01:30:00Z",
				allDay: false,
			}),
		).toEqual({ date: "11.08", dow: "SUN", time: "09:00–10:30" });
	});
	it("終日なら時刻の代わりに「終日」", () => {
		expect(
			flyerDate({
				startsAt: "2026-11-06T15:00:00Z",
				endsAt: null,
				allDay: true,
			}),
		).toEqual({ date: "11.07", dow: "SAT", time: "終日" });
	});
});
