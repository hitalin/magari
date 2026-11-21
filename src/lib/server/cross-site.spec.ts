import { describe, expect, it } from "vitest";
import { isCrossSite } from "./cross-site";

const SITE = "https://magari.cc";
const req = (method: string, origin?: string) =>
	new Request(`${SITE}/logout`, {
		method,
		headers: origin === undefined ? {} : { origin },
	});

describe("isCrossSite", () => {
	it("読むだけの要求は、どこからでも通す", () => {
		for (const method of ["GET", "HEAD", "OPTIONS"])
			expect(isCrossSite(req(method, "https://evil.example"), SITE)).toBe(
				false,
			);
	});

	it("書き込みは、同じサイトからなら通す", () => {
		for (const method of ["POST", "PUT", "PATCH", "DELETE"])
			expect(isCrossSite(req(method, SITE), SITE)).toBe(false);
	});

	it("書き込みは、別のサイトからなら断る（本文の種類を問わない）", () => {
		for (const method of ["POST", "PUT", "PATCH", "DELETE"])
			expect(isCrossSite(req(method, "https://evil.example"), SITE)).toBe(true);
		// 似た名前、http、砂場の iframe（Origin: null）
		expect(
			isCrossSite(req("POST", "https://magari.cc.evil.example"), SITE),
		).toBe(true);
		expect(isCrossSite(req("POST", "http://magari.cc"), SITE)).toBe(true);
		expect(isCrossSite(req("POST", "null"), SITE)).toBe(true);
	});

	it("Origin を付けない要求（curl や Cron からの呼び出し）は通す", () => {
		expect(isCrossSite(req("POST"), SITE)).toBe(false);
	});
});
