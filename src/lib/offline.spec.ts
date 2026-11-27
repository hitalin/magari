import { describe, expect, it } from "vitest";
import { keepable, strategy, trimmed } from "./offline";

const SITE = "https://magari.cc";
const s = (path: string, method = "GET") =>
	strategy(method, new URL(path, SITE), SITE);

describe("strategy", () => {
	it("ページと公開 JSON は、まず回線へ。だめなら前に見たもの", () => {
		for (const path of ["/", "/events", "/e/abc", "/@eden", "/api/events?to=x"])
			expect(s(path)).toBe("network-first");
	});
	it("名前に中身のハッシュが入ったファイルは、持っていればそれを使う", () => {
		expect(s("/_app/immutable/chunks/abc.js")).toBe("cache-first");
	});
	it("書き込みには触らない", () => {
		expect(s("/new?/save", "POST")).toBeNull();
		expect(s("/api/graffiti", "POST")).toBeNull();
	});
	it("ログインと運営の口、落書き、画像には触らない", () => {
		// 画像（/i/…、カード画像）は大きいので持たない。ブラウザ自身のキャッシュに任せる
		for (const path of [
			"/api/auth/get-session",
			"/api/admin/import",
			"/api/graffiti",
			"/api/graffiti/live",
			"/i/flyers/a/b.png",
			"/e/abc/og.png",
			"/service-worker.js",
		])
			expect(s(path)).toBeNull();
	});
	it("ほかのサイトへの要求には触らない", () => {
		expect(
			strategy("GET", new URL("https://pbs.twimg.com/a.png"), SITE),
		).toBeNull();
	});
});

describe("keepable", () => {
	it("取っておくのは、公開と書かれた成功の応答だけ", () => {
		expect(keepable(200, "public, max-age=0, s-maxage=300")).toBe(true);
		expect(keepable(200, "public, immutable, max-age=31536000")).toBe(true);
	});
	it("本人だけの応答・失敗・転送は取っておかない", () => {
		expect(keepable(200, "private, no-store")).toBe(false);
		expect(keepable(200, null)).toBe(false);
		expect(keepable(404, "public, max-age=0")).toBe(false);
		expect(keepable(0, "public")).toBe(false);
	});
});

describe("trimmed", () => {
	it("上限を超えたぶんを、古いほうから捨てる", () => {
		expect(trimmed(["a", "b", "c", "d", "e"], 3)).toEqual(["a", "b"]);
		expect(trimmed(["a", "b"], 3)).toEqual([]);
	});
});
