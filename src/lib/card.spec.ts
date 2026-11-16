import { describe, expect, it } from "vitest";
import { cardImagePath, cardVersion } from "./card";

const base = {
	id: "abc123",
	title: "こーじろーさん",
	startsAt: "2026-11-09T08:00:00.000Z",
	endsAt: "2026-11-09T14:00:00.000Z",
	allDay: false,
	space: null,
	locationName: null,
	onlineUrl: null,
	hosts: [{ handle: "kojiro", name: "こーじろー", kind: "person" as const }],
	flyerUrl: null,
	status: "published" as const,
};

describe("cardVersion", () => {
	it("同じ会なら同じ版", () => {
		expect(cardVersion(base)).toBe(cardVersion({ ...base }));
		expect(cardVersion(base)).toMatch(/^[0-9a-z]+$/);
	});

	it("カードに出るものが変わると版も変わる", () => {
		const v = cardVersion(base);
		expect(cardVersion({ ...base, title: "別の題" })).not.toBe(v);
		expect(
			cardVersion({ ...base, startsAt: "2026-11-10T08:00:00.000Z" }),
		).not.toBe(v);
		expect(cardVersion({ ...base, endsAt: null })).not.toBe(v);
		expect(cardVersion({ ...base, allDay: true })).not.toBe(v);
		expect(cardVersion({ ...base, locationName: "神田" })).not.toBe(v);
		expect(
			cardVersion({ ...base, flyerUrl: "/i/flyers/abc123/x.png" }),
		).not.toBe(v);
		expect(cardVersion({ ...base, status: "cancelled" })).not.toBe(v);
		expect(
			cardVersion({
				...base,
				hosts: [{ handle: "kojiro", name: "改名", kind: "person" }],
			}),
		).not.toBe(v);
	});
});

describe("cardImagePath", () => {
	it("版を付けたパス（編集すると X が取り直す）", () => {
		expect(cardImagePath(base)).toBe(`/e/abc123/og.png?v=${cardVersion(base)}`);
	});
});
