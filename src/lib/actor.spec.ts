import { describe, expect, it } from "vitest";
import { nameOnlyIfUnmanaged } from "./actor";

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
	it("管理者がいなければ画像と紹介文を落とし、名前とリンクは残す", () => {
		expect(nameOnlyIfUnmanaged({ ...a, hasManager: false })).toEqual({
			name: "あるハコ",
			url: "https://example.com",
			avatarUrl: null,
			headerUrl: null,
			summary: null,
			hasManager: false,
		});
	});
});
