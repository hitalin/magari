import { describe, expect, it } from "vitest";
import { sortSpaces } from "./space-sort";

const s = (
	name: string,
	upcoming: number,
	nextAt: string | null,
	createdAt: string,
) => ({ name, upcoming, nextAt, createdAt });

const spaces = [
	s("あ", 2, "2026-11-25T18:00:00.000Z", "2026-10-01T00:00:00.000Z"),
	s("い", 9, "2026-11-30T18:00:00.000Z", "2026-11-10T00:00:00.000Z"),
	s("う", 0, null, "2026-11-01T00:00:00.000Z"),
	s("え", 2, "2026-11-20T18:00:00.000Z", "2026-09-01T00:00:00.000Z"),
];
const names = (key: Parameters<typeof sortSpaces>[1]) =>
	sortSpaces(spaces, key).map((x) => x.name);

describe("sortSpaces", () => {
	it("間が多い順。同じ数なら名前順", () => {
		expect(names("many")).toEqual(["い", "あ", "え", "う"]);
	});
	it("次の間が近い順。予定の無いハコは最後", () => {
		expect(names("soon")).toEqual(["え", "あ", "い", "う"]);
	});
	it("新着順", () => {
		expect(names("new")).toEqual(["い", "う", "あ", "え"]);
	});
	it("元の配列は並べ替えない", () => {
		sortSpaces(spaces, "new");
		expect(spaces[0].name).toBe("あ");
	});
});
