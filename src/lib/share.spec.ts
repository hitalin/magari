import { describe, expect, it } from "vitest";
import { eventPlace, eventShareText, xShareUrl } from "./share";

const base = {
	title: "こーじろーさん",
	startsAt: "2026-11-09T08:00:00.000Z",
	endsAt: "2026-11-09T14:00:00.000Z",
	allDay: false,
	space: null,
	locationName: null,
	onlineUrl: null,
};
const space = {
	handle: "eden_kanda",
	name: "イベントバーエデン神田",
	kind: "space" as const,
};

describe("eventPlace", () => {
	it("ハコ > 場所の名前 > オンライン の順", () => {
		expect(eventPlace({ ...base, space, locationName: "神田" })).toBe(
			"イベントバーエデン神田",
		);
		expect(eventPlace({ ...base, locationName: "代々木公園" })).toBe(
			"代々木公園",
		);
		expect(eventPlace({ ...base, onlineUrl: "https://zoom.us/x" })).toBe(
			"オンライン",
		);
		expect(eventPlace(base)).toBeNull();
	});
});

describe("eventShareText", () => {
	it("題・日時・場所を行に分ける", () => {
		expect(eventShareText({ ...base, space })).toBe(
			"こーじろーさん\n11月9日(月) 17:00〜23:00\n📍イベントバーエデン神田",
		);
	});
	it("場所が無ければ 2 行", () => {
		expect(eventShareText(base)).toBe(
			"こーじろーさん\n11月9日(月) 17:00〜23:00",
		);
	});
});

describe("xShareUrl", () => {
	it("空白は + ではなく %20、改行は %0A で符号化する", () => {
		const url = xShareUrl("a b\nc", "https://magari.cc/e/x");
		expect(url).toBe(
			"https://x.com/intent/post?text=a%20b%0Ac&url=https%3A%2F%2Fmagari.cc%2Fe%2Fx",
		);
	});
});
