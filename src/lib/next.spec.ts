import { describe, expect, it } from "vitest";
import { safeNext, withNext } from "./next";

describe("safeNext", () => {
	it("サイト内のパスはそのまま返す", () => {
		expect(safeNext("/new?space=curry_shop")).toBe("/new?space=curry_shop");
		expect(safeNext("/spaces/new")).toBe("/spaces/new");
	});
	it("無い・外のサイトへ出るものは /me にする", () => {
		expect(safeNext(null)).toBe("/me");
		expect(safeNext("")).toBe("/me");
		expect(safeNext("https://evil.example/")).toBe("/me");
		expect(safeNext("//evil.example/")).toBe("/me");
		expect(safeNext("/\\evil.example/")).toBe("/me");
		expect(safeNext("new")).toBe("/me");
	});
});

describe("withNext", () => {
	it("戻り先を next に載せる（? や & を含んでも壊れない）", () => {
		expect(withNext("/login", "/new?space=a&from=b")).toBe(
			"/login?next=%2Fnew%3Fspace%3Da%26from%3Db",
		);
	});
	it("戻り先が無い・/me のときは付けない", () => {
		expect(withNext("/login")).toBe("/login");
		expect(withNext("/welcome", "/me")).toBe("/welcome");
	});
});
