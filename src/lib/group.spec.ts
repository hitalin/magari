import { describe, expect, it } from "vitest";
import { collapseByActor, primaryActor } from "./group";
import type { EventSummary } from "./types";

const ev = (
	id: string,
	host: string | null,
	space: string | null = null,
): EventSummary => ({
	id,
	title: `会${id}`,
	startsAt: "2026-11-08T10:00:00Z",
	endsAt: null,
	allDay: false,
	area: null,
	locationName: null,
	onlineUrl: null,
	tags: [],
	space: space ? { handle: space, name: space, kind: "space" } : null,
	hosts: host ? [{ handle: host, name: host, kind: "group" }] : [],
});

describe("primaryActor", () => {
	it("主催があれば主催、なければ場", () => {
		expect(primaryActor(ev("1", "g", "s"))?.handle).toBe("g");
		expect(primaryActor(ev("2", null, "s"))?.handle).toBe("s");
		expect(primaryActor(ev("3", null))).toBeNull();
	});
});

describe("collapseByActor", () => {
	it("同じ主催が閾値以上なら 1 つにまとめ、最初の位置に置く", () => {
		const list = [
			ev("a", "x"),
			ev("b", "big"),
			ev("c", "y"),
			ev("d", "big"),
			ev("e", "big"),
			ev("f", "big"),
		];
		const out = collapseByActor(list, 4);
		expect(
			out.map((i) =>
				i.kind === "event"
					? i.event.id
					: `group:${i.actor.handle}:${i.events.length}`,
			),
		).toEqual(["a", "group:big:4", "c"]);
	});
	it("閾値未満はそのまま", () => {
		const out = collapseByActor([ev("a", "x"), ev("b", "x")], 4);
		expect(out.every((i) => i.kind === "event")).toBe(true);
	});
});
