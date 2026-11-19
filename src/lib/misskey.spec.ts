import { describe, expect, it } from "vitest";
import { parseMisskeyHost, rememberHost } from "./misskey";

describe("parseMisskeyHost", () => {
	it("ドメインはそのまま（小文字にする）", () => {
		expect(parseMisskeyHost(" Misskey.IO ")).toBe("misskey.io");
	});
	it("URL はスキームとパスを落とす", () => {
		expect(parseMisskeyHost("https://misskey.io/@taka")).toBe("misskey.io");
	});
	it("@user@host と user@host はサーバーの部分を使う", () => {
		expect(parseMisskeyHost("@taka@yami.ski")).toBe("yami.ski");
		expect(parseMisskeyHost("taka@yami.ski")).toBe("yami.ski");
	});
	it("ドメインの形でなければ null", () => {
		expect(parseMisskeyHost("")).toBeNull();
		expect(parseMisskeyHost("@taka")).toBeNull();
		expect(parseMisskeyHost("localhost")).toBeNull();
		expect(parseMisskeyHost("127.0.0.1")).toBeNull();
		expect(parseMisskeyHost("misskey.io:8080")).toBeNull();
	});
});

describe("rememberHost", () => {
	it("新しいものを先頭に、重複なしで 3 つまで", () => {
		expect(rememberHost(["a.example", "b.example"], "b.example")).toEqual([
			"b.example",
			"a.example",
		]);
		expect(
			rememberHost(["a.example", "b.example", "c.example"], "d.example"),
		).toEqual(["d.example", "a.example", "b.example"]);
	});
});
