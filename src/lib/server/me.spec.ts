import { describe, expect, it } from "vitest";
import { largeAvatarUrl, soleHostedEventIds } from "./me";

describe("largeAvatarUrl", () => {
	it("X の _normal を 400x400 にする", () => {
		expect(
			largeAvatarUrl("https://pbs.twimg.com/profile_images/1/abc_normal.jpg"),
		).toBe("https://pbs.twimg.com/profile_images/1/abc_400x400.jpg");
	});
	it("それ以外はそのまま。空なら null", () => {
		expect(largeAvatarUrl("https://example.com/x.png")).toBe(
			"https://example.com/x.png",
		);
		expect(largeAvatarUrl(null)).toBeNull();
	});
});

describe("soleHostedEventIds", () => {
	it("主催が自分だけの間を返し、ほかに主催のいる間は返さない", () => {
		const rows = [
			{ eventId: "mine", actorId: "me" },
			{ eventId: "shared", actorId: "me" },
			{ eventId: "shared", actorId: "other" },
			{ eventId: "theirs", actorId: "other" },
		];
		expect(soleHostedEventIds(rows, "me")).toEqual(["mine"]);
	});
});
