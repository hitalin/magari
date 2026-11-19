import { describe, expect, it } from "vitest";
import { matchesQuery } from "./search";

describe("matchesQuery", () => {
	const parts = [
		"死にたいバー",
		"イベントバーエデン本店",
		"eden",
		null,
		"東京",
	];
	it("空の検索語は何にでも合う", () => {
		expect(matchesQuery("", parts)).toBe(true);
		expect(matchesQuery("  　", parts)).toBe(true);
	});
	it("どれかの項目に含まれていれば合う", () => {
		expect(matchesQuery("本店", parts)).toBe(true);
		expect(matchesQuery("難波", parts)).toBe(false);
	});
	it("大文字小文字、全角半角、ひらがなカタカナを区別しない", () => {
		expect(matchesQuery("EDEN", parts)).toBe(true);
		expect(matchesQuery("ｅｄｅｎ", parts)).toBe(true);
		expect(matchesQuery("えでん", parts)).toBe(true);
		expect(matchesQuery("ニタイば", parts)).toBe(true);
	});
	it("空白で区切った語は、すべて含むものだけ（項目をまたいでよい）", () => {
		expect(matchesQuery("エデン　東京", parts)).toBe(true);
		expect(matchesQuery("エデン 大阪", parts)).toBe(false);
	});
});
