import { describe, expect, it } from "vitest";
import { nameOnlyIfUnmanaged, shownSns } from "./actor";

describe("nameOnlyIfUnmanaged", () => {
	const a = {
		name: "あるハコ",
		url: "https://example.com",
		avatarUrl: "/i/avatars/x",
		headerUrl: "/i/headers/x",
		summary: "紹介文",
	};
	it("管理者がいればそのまま返す", () => {
		expect(nameOnlyIfUnmanaged({ ...a, hasManager: true })).toEqual({
			...a,
			hasManager: true,
		});
	});
	it("見本を出す環境（開発）では、管理者がいなくてもそのまま返す", () => {
		expect(nameOnlyIfUnmanaged({ ...a, hasManager: false }, true)).toEqual({
			...a,
			hasManager: false,
		});
	});
	it("管理者がいなければ紹介文を落とし、名前・リンク・アイコン・店の写真は残す", () => {
		expect(nameOnlyIfUnmanaged({ ...a, hasManager: false })).toEqual({
			name: "あるハコ",
			url: "https://example.com",
			avatarUrl: "/i/avatars/x",
			headerUrl: "/i/headers/x",
			summary: null,
			hasManager: false,
		});
	});
});

describe("shownSns", () => {
	it("ハコ・団体は欄の値を出す", () => {
		expect(
			shownSns(
				{ kind: "space", xHandle: "curry", misskey: "curry@misskey.io" },
				undefined,
			),
		).toEqual({ xHandle: "curry", misskey: ["curry@misskey.io"] });
	});
	it("人はつないだアカウントを出す", () => {
		const person = { kind: "person" as const, xHandle: "old", misskey: null };
		expect(
			shownSns(person, {
				hasX: true,
				x: "taka",
				misskey: ["taka@yami.ski", "taka@misskey.io"],
			}),
		).toEqual({
			xHandle: "taka",
			misskey: ["taka@yami.ski", "taka@misskey.io"],
		});
		// X の ID を覚える前につないだ人は、ページに写してあった値
		expect(shownSns(person, { hasX: true, x: null, misskey: [] })).toEqual({
			xHandle: "old",
			misskey: [],
		});
	});
	it("X をつないでいない人は、前に手で書いた X を出し続ける。外した X の写しは出さない", () => {
		const person = { kind: "person" as const, xHandle: "old", misskey: null };
		const mk = ["taka@yami.ski"];
		expect(shownSns(person, { hasX: false, x: null, misskey: mk })).toEqual({
			xHandle: "old",
			misskey: mk,
		});
		expect(shownSns(person, { hasX: false, x: "old", misskey: mk })).toEqual({
			xHandle: null,
			misskey: mk,
		});
	});
});
