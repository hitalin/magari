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
		expect(cacheHeaders(null)).toEqual({
			"cache-control": "private, no-store",
		});
		expect(cacheHeaders("no-store")).toEqual({
			"cache-control": "private, no-store",
		});
		expect(cacheHeaders("private, no-store")).toEqual({
			"cache-control": "private, no-store",
		});
	});
	it("公開の応答はそのまま通し、書き込みで消せるよう札を付ける", () => {
		expect(cacheHeaders(CACHE_PUBLIC)).toEqual({
			"cache-control": CACHE_PUBLIC,
			"cache-tag": "data",
		});
	});
	it("中身の変わらない画像には札を付けない（書き込みのたびに消さない）", () => {
		const cc = "public, max-age=31536000, immutable";
		expect(cacheHeaders(cc)).toEqual({
			"cache-control": cc,
		});
	});
	it("落書きにも札を付ける（上塗りしたら、塗る前の線をすぐ配らなくする）", () => {
		expect(cacheHeaders(CACHE_GRAFFITI)).toEqual({
			"cache-control": CACHE_GRAFFITI,
			"cache-tag": "data",
		});
	});
});

describe("shouldPurge", () => {
	it("読むだけの要求では消さない", () => {
		expect(shouldPurge("GET", 200, "/events", true)).toBe(false);
		expect(shouldPurge("HEAD", 200, "/events", true)).toBe(false);
	});
	it("ログイン中の人の書き込みが通ったら消す（form action は 200 か 303）", () => {
		expect(shouldPurge("POST", 303, "/new", true)).toBe(true);
		expect(shouldPurge("POST", 200, "/e/abc/edit", true)).toBe(true);
	});
	it("Cron の取り込みと繰り返しの延長でも消す（合言葉が違えば 401 で、消さない）", () => {
		expect(shouldPurge("POST", 200, "/api/admin/import", false)).toBe(true);
		expect(shouldPurge("POST", 200, "/api/admin/series", false)).toBe(true);
		expect(shouldPurge("POST", 401, "/api/admin/import", false)).toBe(false);
	});
	it("ログインしていない人の POST では消さない（purge の回数を他人に使い切らせない）", () => {
		// ログインの要る action は、未ログインだと /login へ 303 で送る。これを書き込みと数えない
		expect(shouldPurge("POST", 303, "/spaces/new", false)).toBe(false);
		expect(shouldPurge("POST", 200, "/contact", false)).toBe(false);
	});
	it("通らなかった書き込みでは消さない", () => {
		expect(shouldPurge("POST", 400, "/new", true)).toBe(false);
		expect(shouldPurge("POST", 403, "/new", true)).toBe(false);
		expect(shouldPurge("POST", 500, "/new", true)).toBe(false);
	});
	it("公開の中身を変えない書き込みでは消さない", () => {
		expect(shouldPurge("POST", 200, "/api/graffiti", true)).toBe(false);
		expect(shouldPurge("POST", 200, "/api/auth/sign-in/social", true)).toBe(
			false,
		);
		expect(shouldPurge("POST", 303, "/logout", true)).toBe(false);
		expect(shouldPurge("POST", 200, "/contact", true)).toBe(false);
	});
});
