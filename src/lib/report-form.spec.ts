import { describe, expect, it } from "vitest";
import { parseModerationTarget, parseReportForm } from "./report-form";

describe("parseReportForm", () => {
	const v = {
		kind: "takedown",
		about: "@some_space",
		name: "山田",
		contact: "@yamada@misskey.example",
		body: "掲載を取り下げてください",
		website: "",
	};
	it("必須項目を見る。返信先はメールでなくてよい（X や Misskey の ID）", () => {
		expect(parseReportForm(v)).toEqual({
			ok: true,
			values: {
				kind: "takedown",
				about: "@some_space",
				name: "山田",
				contact: "@yamada@misskey.example",
				body: "掲載を取り下げてください",
			},
		});
		expect(parseReportForm({ ...v, name: " " }).ok).toBe(false);
		expect(parseReportForm({ ...v, contact: " " }).ok).toBe(false);
		expect(parseReportForm({ ...v, body: "" }).ok).toBe(false);
	});
	it("対象は空でもよく、知らない種別はその他にする", () => {
		const r = parseReportForm({ ...v, about: " ", kind: "???" });
		expect(r.ok && r.values).toMatchObject({ about: null, kind: "other" });
	});
	it("長すぎる入力を弾く", () => {
		expect(parseReportForm({ ...v, about: "a".repeat(201) }).ok).toBe(false);
		expect(parseReportForm({ ...v, body: "a".repeat(5001) }).ok).toBe(false);
		expect(parseReportForm({ ...v, contact: "a".repeat(201) }).ok).toBe(false);
	});
	it("ハニーポットに入力があれば bot として弾く", () => {
		const r = parseReportForm({ ...v, website: "http://spam" });
		expect(!r.ok && r.error).toBe("bot");
	});
});

describe("parseModerationTarget", () => {
	it("@handle はページ", () => {
		expect(parseModerationTarget(" @Some_Space ")).toEqual({
			type: "actor",
			handle: "some_space",
		});
		expect(parseModerationTarget("https://magari.cc/@some_space")).toEqual({
			type: "actor",
			handle: "some_space",
		});
	});
	it("会の URL か ID は会", () => {
		expect(parseModerationTarget("https://magari.cc/e/qrwbmyrndf")).toEqual({
			type: "event",
			id: "qrwbmyrndf",
		});
		expect(parseModerationTarget("/e/qrwbmyrndf/edit")).toEqual({
			type: "event",
			id: "qrwbmyrndf",
		});
		expect(parseModerationTarget("qrwbmyrndf")).toEqual({
			type: "event",
			id: "qrwbmyrndf",
		});
	});
	it("どちらでもなければ null", () => {
		expect(parseModerationTarget("")).toBeNull();
		expect(parseModerationTarget("あのページ")).toBeNull();
		expect(parseModerationTarget("@a")).toBeNull();
	});
});
