import { describe, expect, it } from "vitest";
import { canEditEvent, largeAvatarUrl, soleHostedEventIds } from "./me";

describe("largeAvatarUrl", () => {
	it("X の _normal を 400x400 にする", () => {
		expect(
			largeAvatarUrl("https://pbs.twimg.com/profile_images/1/abc_normal.jpg"),
		).toBe("https://pbs.twimg.com/profile_images/1/abc_400x400.jpg");
	});
	it("Misskey のプロキシ縮小は元画像にする", () => {
		expect(
			largeAvatarUrl(
				"https://yami.ski/proxy/avatar.webp?url=https%3A%2F%2Ffiles.example%2Fa.png&avatar=1",
			),
		).toBe("https://files.example/a.png");
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

describe("canEditEvent", () => {
	const own = {
		createdByUserId: "u1",
		postedBySpace: false,
		spaceActorId: "shop",
	};
	it("本人の会は、作った人と主催（管理しているページを含む）が編集できる", () => {
		expect(canEditEvent(own, ["me"], "u1", [])).toBe(true);
		expect(canEditEvent(own, ["me"], "u2", ["me"])).toBe(true);
		expect(canEditEvent(own, ["me"], "u2", ["shop"])).toBe(false);
	});
	it("ハコが載せたほかの人の会は、そのハコの管理者が編集できる", () => {
		const others = { ...own, postedBySpace: true };
		expect(canEditEvent(others, [], "u2", ["shop"])).toBe(true);
		// 作った人でも、ハコの管理者から外れたらもう直せない
		expect(canEditEvent(others, [], "u1", ["me"])).toBe(false);
	});
});
