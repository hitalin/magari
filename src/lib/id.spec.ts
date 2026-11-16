import { describe, expect, it } from "vitest";
import { isShortId, isValidHandle, parseHandleInput, shortId } from "./id";

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

describe("isShortId", () => {
	it("shortId が作った 10 文字の ID を通す", () => {
		expect(isShortId(shortId())).toBe(true);
	});
	it("長さや文字が違えば通さない", () => {
		expect(isShortId("")).toBe(false);
		expect(isShortId("abc")).toBe(false);
		expect(isShortId("0000000000")).toBe(false);
		expect(isShortId(`${shortId()}a`)).toBe(false);
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

describe("parseHandleInput", () => {
	it("先頭の @ と前後の空白を外し、小文字にする", () => {
		expect(parseHandleInput(" @Hitalin ")).toBe("hitalin");
		expect(parseHandleInput("kyobashi_ura")).toBe("kyobashi_ura");
	});
	it("handle として正しくなければ null", () => {
		expect(parseHandleInput("")).toBeNull();
		expect(parseHandleInput("@a")).toBeNull();
		expect(parseHandleInput("@ひたりん")).toBeNull();
	});
});
