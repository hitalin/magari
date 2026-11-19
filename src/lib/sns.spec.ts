import { describe, expect, it } from "vitest";
import { actorSns, snsOf } from "./sns";

describe("snsOf", () => {
	it("知っている SNS は種類と ID を取り出す", () => {
		expect(snsOf("https://x.com/magari_cc")).toEqual({
			kind: "x",
			label: "@magari_cc",
			url: "https://x.com/magari_cc",
		});
		expect(snsOf("https://twitter.com/magari_cc?s=20")?.kind).toBe("x");
		expect(snsOf("https://www.instagram.com/magari.cc/")).toMatchObject({
			kind: "instagram",
			label: "@magari.cc",
		});
		expect(snsOf("https://www.threads.net/@magari")).toMatchObject({
			kind: "threads",
			label: "@magari",
		});
		expect(snsOf("https://bsky.app/profile/magari.bsky.social")).toMatchObject({
			kind: "bluesky",
			label: "@magari.bsky.social",
		});
		expect(snsOf("https://www.youtube.com/@magari")).toMatchObject({
			kind: "youtube",
			label: "@magari",
		});
		expect(snsOf("https://www.tiktok.com/@magari")).toMatchObject({
			kind: "tiktok",
			label: "@magari",
		});
		expect(snsOf("https://github.com/hitalin")).toMatchObject({
			kind: "github",
			label: "hitalin",
		});
		expect(snsOf("https://note.com/magari")).toMatchObject({
			kind: "note",
			label: "magari",
		});
		expect(snsOf("https://www.twitch.tv/magari")).toMatchObject({
			kind: "twitch",
			label: "magari",
		});
	});
	it("知らないサーバーの /@name は Fediverse（Misskey や Mastodon）", () => {
		expect(snsOf("https://yami.ski/@taka")).toEqual({
			kind: "fediverse",
			label: "@taka@yami.ski",
			url: "https://yami.ski/@taka",
		});
	});
	it("プロフィールでないページや、ふつうのサイトは null", () => {
		expect(snsOf("https://x.com/magari_cc/status/123")).toBeNull();
		expect(snsOf("https://github.com/hitalin/magari")).toBeNull();
		expect(snsOf("https://www.youtube.com/watch?v=abc")).toBeNull();
		expect(snsOf("https://example.com/about")).toBeNull();
		expect(snsOf("https://x.com/")).toBeNull();
		expect(snsOf("not a url")).toBeNull();
	});
});

describe("actorSns", () => {
	it("X・Misskey と、リンクの中の SNS をまとめ、残りを分ける", () => {
		expect(
			actorSns({
				xHandle: "magari_cc",
				misskey: ["taka@yami.ski"],
				instagram: null,
				links: [
					{ label: "Misskey", url: "https://yami.ski/@taka" },
					{ label: "Mastodon", url: "https://mstdn.jp/@taka" },
					{ label: "X", url: "https://x.com/magari_cc" },
					{ label: "系列店", url: "https://example.com/" },
				],
			}),
		).toEqual({
			sns: [
				{ kind: "x", label: "@magari_cc", url: "https://x.com/magari_cc" },
				{
					kind: "misskey",
					label: "@taka@yami.ski",
					url: "https://yami.ski/@taka",
				},
				{
					kind: "fediverse",
					label: "@taka@mstdn.jp",
					url: "https://mstdn.jp/@taka",
				},
			],
			rest: [{ label: "系列店", url: "https://example.com/" }],
		});
	});
});
