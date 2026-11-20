import { describe, expect, it } from "vitest";
import { claimX, sameX } from "./claim";

describe("claimX", () => {
	it("取り込み元のハコなら、運営が控えた店の X の ID を返す", () => {
		expect(claimX("eden_namba")).toBe("eden_namba");
	});
	it("取り込み元でないページは、控えた X の ID が無い", () => {
		expect(claimX("hitalin")).toBeNull();
	});
});

describe("sameX", () => {
	it("X の ID は大文字小文字を区別せずに比べる", () => {
		expect(sameX("EBE_Kyoto", "ebe_kyoto")).toBe(true);
	});
	it("違う ID は通さない", () => {
		expect(sameX("eden_namba", "eden_namba_")).toBe(false);
	});
	it("X から ID が取れなかったときは通さない", () => {
		expect(sameX("eden_namba", undefined)).toBe(false);
	});
});
