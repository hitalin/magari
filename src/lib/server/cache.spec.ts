import { describe, expect, it } from "vitest";
import {
	CACHE_GRAFFITI,
	CACHE_PUBLIC,
	cacheHeaders,
	shouldPurge,
} from "./cache";

describe("cacheHeaders", () => {
	it("公開と書いていない応答は、キャッシュに載せない", () => {
		// Workers Cache は cache-control の無い 200 を既定で 2 時間持ち、Cookie を見ずに配る
		expect(cacheHeaders(null, "/me")).toEqual({
			"cache-control": "private, no-store",
		});
		expect(cacheHeaders("no-store", "/e/abc/og.png")).toEqual({
			"cache-control": "private, no-store",
		});
		expect(cacheHeaders("private, no-store", "/api/events/abc")).toEqual({
			"cache-control": "private, no-store",
		});
	});
	it("公開の応答はそのまま通し、書き込みで消せるよう札を付ける", () => {
		expect(cacheHeaders(CACHE_PUBLIC, "/home")).toEqual({
			"cache-control": CACHE_PUBLIC,
			"cache-tag": "data",
		});
	});
	it("中身の変わらない画像には札を付けない（書き込みのたびに消さない）", () => {
		const cc = "public, max-age=31536000, immutable";
		expect(cacheHeaders(cc, "/i/flyers/a/b.png")).toEqual({
			"cache-control": cc,
		});
	});
	it("落書きは時間で切れるだけ（描くたびに purge しない）", () => {
		expect(cacheHeaders(CACHE_GRAFFITI, "/api/graffiti")).toEqual({
			"cache-control": CACHE_GRAFFITI,
		});
	});
});

describe("shouldPurge", () => {
	it("読むだけの要求では消さない", () => {
		expect(shouldPurge("GET", 200, "/home")).toBe(false);
		expect(shouldPurge("HEAD", 200, "/home")).toBe(false);
	});
	it("書き込みが通ったら消す（form action は 200 か 303、Cron は POST）", () => {
		expect(shouldPurge("POST", 303, "/new")).toBe(true);
		expect(shouldPurge("POST", 200, "/e/abc/edit")).toBe(true);
		expect(shouldPurge("POST", 200, "/api/admin/import")).toBe(true);
	});
	it("通らなかった書き込みでは消さない", () => {
		expect(shouldPurge("POST", 400, "/new")).toBe(false);
		expect(shouldPurge("POST", 403, "/new")).toBe(false);
		expect(shouldPurge("POST", 500, "/new")).toBe(false);
	});
	it("公開の中身を変えない書き込みでは消さない", () => {
		expect(shouldPurge("POST", 200, "/api/graffiti")).toBe(false);
		expect(shouldPurge("POST", 200, "/api/auth/sign-in/social")).toBe(false);
		expect(shouldPurge("POST", 303, "/logout")).toBe(false);
		expect(shouldPurge("POST", 200, "/contact")).toBe(false);
	});
});
