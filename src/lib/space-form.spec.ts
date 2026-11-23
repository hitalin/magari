import { describe, expect, it } from "vitest";
import {
	EMPTY_SPACE_FORM,
	parseLinks,
	parseNewActorForm,
	parseSpaceForm,
	readSpaceForm,
} from "./space-form";

describe("parseLinks", () => {
	it("1 行 1 リンク。最後の語が URL、残りがラベル", () => {
		expect(
			parseLinks(
				"板橋シアター咲 https://theater-saki.com/\nhttps://example.com",
			),
		).toEqual([
			{ label: "板橋シアター咲", url: "https://theater-saki.com/" },
			{ label: "example.com", url: "https://example.com" },
		]);
	});
	it("URL でない行はエラー", () => {
		expect(parseLinks("ただの文字")).toBeNull();
	});
});

describe("parseSpaceForm", () => {
	const base = { ...EMPTY_SPACE_FORM, name: "カレー屋" };
	it("設備はカンマ・読点で分け、@ と URL は整える", () => {
		const r = parseSpaceForm({
			...base,
			facilities: "厨房, Wi-Fi、電源",
			xHandle: "@curry_shop",
			misskey: "@Curry@Misskey.io",
			url: "https://curry.example",
		});
		expect(r.ok && r.values.facilities).toEqual(["厨房", "Wi-Fi", "電源"]);
		expect(r.ok && r.values.xHandle).toBe("curry_shop");
		expect(r.ok && r.values.misskey).toBe("Curry@misskey.io");
	});
	it("間取りは書いた記法のまま持ち、四角になっていない見取り図は断る", () => {
		const r = parseSpaceForm({ ...base, floorPlan: "A A B\nC C B" });
		expect(r.ok && r.values.floorPlan).toBe("A A B\nC C B");
		const none = parseSpaceForm(base);
		expect(none.ok && none.values.floorPlan).toBeNull();
		const bad = parseSpaceForm({ ...base, floorPlan: "A A\nA B" });
		expect(bad.ok).toBe(false);
	});
	it("Misskey は @name@host でも URL でもよく、サーバーが無ければエラー", () => {
		const r = parseSpaceForm({ ...base, misskey: "https://yami.ski/@taka" });
		expect(r.ok && r.values.misskey).toBe("taka@yami.ski");
		expect(parseSpaceForm({ ...base, misskey: "" })).toMatchObject({
			ok: true,
			values: { misskey: null },
		});
		expect(parseSpaceForm({ ...base, misskey: "@taka" }).ok).toBe(false);
	});
	it("空欄は null、名前が無ければエラー", () => {
		const r = parseSpaceForm(base);
		expect(r.ok && r.values.catch).toBeNull();
		expect(r.ok && r.values.links).toEqual([]);
		expect(parseSpaceForm({ ...base, name: "" }).ok).toBe(false);
		expect(parseSpaceForm({ ...base, url: "curry.example" }).ok).toBe(false);
	});
	it("readSpaceForm は無い項目を空文字にする", () => {
		expect(readSpaceForm(() => null)).toEqual(EMPTY_SPACE_FORM);
	});
});

describe("parseNewActorForm", () => {
	it("handle と名前と種類", () => {
		const r = parseNewActorForm("Curry_Shop", "カレー屋", "space");
		expect(r.ok && r.handle).toBe("curry_shop");
		expect(r.ok && r.kind).toBe("space");
		expect(parseNewActorForm("me", "x", "space").ok).toBe(false);
		expect(parseNewActorForm("abc", "x", "person").ok).toBe(false);
	});
});
