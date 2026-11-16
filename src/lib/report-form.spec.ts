import { describe, expect, it } from "vitest";
import { parseReportForm } from "./report-form";

describe("parseReportForm", () => {
	const v = {
		kind: "takedown",
		about: "@some_space",
		name: "山田",
		email: "a@example.com",
		body: "掲載を取り下げてください",
		website: "",
	};
	it("必須項目とメールの形を見る", () => {
		expect(parseReportForm(v)).toEqual({
			ok: true,
			values: {
				kind: "takedown",
				about: "@some_space",
				name: "山田",
				email: "a@example.com",
				body: "掲載を取り下げてください",
			},
		});
		expect(parseReportForm({ ...v, name: " " }).ok).toBe(false);
		expect(parseReportForm({ ...v, email: "nope" }).ok).toBe(false);
		expect(parseReportForm({ ...v, body: "" }).ok).toBe(false);
	});
	it("対象は空でもよく、知らない種別はその他にする", () => {
		const r = parseReportForm({ ...v, about: " ", kind: "???" });
		expect(r.ok && r.values).toMatchObject({ about: null, kind: "other" });
	});
	it("長すぎる入力を弾く", () => {
		expect(parseReportForm({ ...v, about: "a".repeat(201) }).ok).toBe(false);
		expect(parseReportForm({ ...v, body: "a".repeat(5001) }).ok).toBe(false);
	});
	it("ハニーポットに入力があれば bot として弾く", () => {
		const r = parseReportForm({ ...v, website: "http://spam" });
		expect(!r.ok && r.error).toBe("bot");
	});
});
