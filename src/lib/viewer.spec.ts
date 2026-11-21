import { describe, expect, it } from "vitest";
import { ANONYMOUS, encodeViewer, parseViewer, VIEWER_COOKIE } from "./viewer";

const taro = {
	loggedIn: true,
	me: {
		handle: "taro",
		name: "太郎; =山田",
		avatarUrl: "https://x.test/a.png",
	},
	managed: ["taro", "curry_shop"],
};

describe("表示専用の Cookie", () => {
	it("書いたものを、ほかの Cookie に混ざっていても読み戻せる", () => {
		const cookie = `d1b=abc; ${VIEWER_COOKIE}=${encodeViewer(taro)}; other=1`;
		expect(parseViewer(cookie)).toEqual(taro);
	});
	it("値に ; や = や空白を残さない（Cookie を壊さない）", () => {
		expect(encodeViewer(taro)).not.toMatch(/[;=\s,]/);
	});
	it("無ければログインしていない扱い", () => {
		expect(parseViewer("")).toEqual(ANONYMOUS);
		expect(parseViewer("d1b=abc")).toEqual(ANONYMOUS);
	});
	it("壊れた値や形の違う値は、ログインしていない扱い", () => {
		expect(parseViewer(`${VIEWER_COOKIE}=%7Bbroken`)).toEqual(ANONYMOUS);
		expect(parseViewer(`${VIEWER_COOKIE}=%5B1%5D`)).toEqual(ANONYMOUS);
		expect(
			parseViewer(
				`${VIEWER_COOKIE}=${encodeURIComponent('{"me":{"handle":1},"managed":"x"}')}`,
			),
		).toEqual({ loggedIn: true, me: null, managed: [] });
	});
	it("ページをまだ作っていない人も、ログインはしている", () => {
		const fresh = { loggedIn: true, me: null, managed: [] };
		expect(parseViewer(`${VIEWER_COOKIE}=${encodeViewer(fresh)}`)).toEqual(
			fresh,
		);
	});
});
