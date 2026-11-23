import { describe, expect, it } from "vitest";
import { groupModerations, parseModerationForm } from "./host-moderation";

describe("parseModerationForm", () => {
	it("共演 NG と師弟は、2 人の @ID を取る", () => {
		expect(
			parseModerationForm({ kind: "ng", a: "@Alice_1", b: " bob_2 " }),
		).toEqual({
			ok: true,
			values: { kind: "ng", a: "alice_1", b: "bob_2" },
		});
		expect(
			parseModerationForm({ kind: "mentor", a: "alice_1", b: "bob_2" }),
		).toMatchObject({ ok: true, values: { kind: "mentor" } });
		expect(parseModerationForm({ kind: "ng", a: "alice_1", b: "" }).ok).toBe(
			false,
		);
	});
	it("同じ相手どうしは断る", () => {
		expect(
			parseModerationForm({ kind: "ng", a: "alice_1", b: "@alice_1" }).ok,
		).toBe(false);
	});
	it("権威は 1 人だけで、相手が送られてきても捨てる", () => {
		expect(
			parseModerationForm({ kind: "authority", a: "alice_1", b: "bob_2" }),
		).toEqual({
			ok: true,
			values: { kind: "authority", a: "alice_1", b: null },
		});
	});
	it("知らない種別と、@ID の形でない入力（名前の自由記述）は断る", () => {
		expect(parseModerationForm({ kind: "ban", a: "alice_1", b: "" }).ok).toBe(
			false,
		);
		expect(
			parseModerationForm({ kind: "authority", a: "山田さん", b: "" }).ok,
		).toBe(false);
	});
});

describe("groupModerations", () => {
	const [a, b, c] = ["a", "b", "c"].map((handle) => ({ handle }));
	it("主催ごとにまとめ、2 人の関係は両方の側に出す", () => {
		expect(
			groupModerations([
				{ id: "1", kind: "ng", a, b },
				{ id: "2", kind: "mentor", a, b: c },
				{ id: "3", kind: "authority", a: b, b: null },
			]),
		).toEqual([
			{
				actor: a,
				items: [
					{ id: "1", role: "ng", other: b },
					{ id: "2", role: "pupil", other: c },
				],
			},
			{
				actor: b,
				items: [
					{ id: "1", role: "ng", other: a },
					{ id: "3", role: "authority", other: null },
				],
			},
			{ actor: c, items: [{ id: "2", role: "mentor", other: a }] },
		]);
	});
});
