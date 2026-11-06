import { describe, expect, it } from "vitest";
import { isValidHandle, shortId } from "./id";

describe("shortId", () => {
	it("既定で 10 文字、許可した文字だけを使う", () => {
		const id = shortId();
		expect(id).toHaveLength(10);
		expect(id).toMatch(/^[23456789abcdefghjkmnpqrstuvwxyz]+$/);
	});

	it("呼ぶたびに異なる", () => {
		expect(shortId()).not.toBe(shortId());
	});
});

describe("isValidHandle", () => {
	it("小文字英数とアンダースコア 3〜20 文字を許す", () => {
		expect(isValidHandle("eden")).toBe(true);
		expect(isValidHandle("kyobashi_ura")).toBe(true);
		expect(isValidHandle("a1")).toBe(false);
		expect(isValidHandle("Eden")).toBe(false);
		expect(isValidHandle("a".repeat(21))).toBe(false);
	});

	it("予約語を弾く", () => {
		expect(isValidHandle("me")).toBe(false);
		expect(isValidHandle("api")).toBe(false);
	});
});
