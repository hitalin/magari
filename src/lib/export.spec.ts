import { describe, expect, it } from "vitest";
import { toExport } from "./export";

const at = new Date("2026-12-01T10:00:00Z");

describe("toExport", () => {
	const doc = toExport({
		origin: "https://magari.cc",
		exportedAt: at,
		logins: [{ providerId: "miauth", accountId: "taro@example.com" }],
		pages: [
			{
				handle: "taro",
				kind: "person",
				name: "太郎",
				headerKey: "actors/a/b.jpg",
				createdAt: at,
				updatedAt: at,
				id: "internal",
				userId: "u1",
				hiddenAt: null,
			},
		],
		events: [
			{
				id: "abc123",
				title: "カレーの日",
				startsAt: at,
				endsAt: null,
				coverKey: "flyers/abc123/x.png",
				spaceHandle: "curry_shop",
				room: "カウンター",
				repeat: "FREQ=WEEKLY",
				hosts: ["taro"],
				createdAt: at,
				updatedAt: at,
				createdByUserId: "u1",
				spaceActorId: "s1",
				seriesId: "se1",
				source: null,
				sourceUid: null,
				hiddenAt: null,
			},
		],
	});

	it("日時は ISO、画像と場所は URL にする", () => {
		expect(doc.exportedAt).toBe("2026-12-01T10:00:00.000Z");
		expect(doc.pages[0].url).toBe("https://magari.cc/@taro");
		expect(doc.pages[0].header).toBe("https://magari.cc/i/actors/a/b.jpg");
		expect(doc.events[0].url).toBe("https://magari.cc/e/abc123");
		expect(doc.events[0].startsAt).toBe("2026-12-01T10:00:00.000Z");
		expect(doc.events[0].endsAt).toBeNull();
		expect(doc.events[0].flyer).toBe("https://magari.cc/i/flyers/abc123/x.png");
		expect(doc.events[0].space).toBe("curry_shop");
		expect(doc.events[0].room).toBe("カウンター");
		expect(doc.events[0].repeat).toBe("FREQ=WEEKLY");
		expect(doc.events[0].hosts).toEqual(["taro"]);
	});
	it("ハコが載せたほかの人の会かどうかを出す（無ければ本人の会）", () => {
		expect(doc.events[0].postedBySpace).toBe(false);
		const others = toExport({
			origin: "https://magari.cc",
			exportedAt: at,
			logins: [],
			pages: [],
			events: [{ id: "x", title: "借りる人の会", postedBySpace: true }],
		});
		expect(others.events[0].postedBySpace).toBe(true);
	});
	it("ログイン方法は種類と ID だけ", () => {
		expect(doc.logins).toEqual([
			{ provider: "miauth", id: "taro@example.com" },
		]);
	});
	it("内部の ID と運営の印は出さない", () => {
		const text = JSON.stringify(doc);
		for (const key of [
			"userId",
			"createdByUserId",
			"spaceActorId",
			"seriesId",
			"hiddenAt",
			"headerKey",
			"coverKey",
			"sourceUid",
			"internal",
		])
			expect(text).not.toContain(key);
	});
});
