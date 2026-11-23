import { describe, expect, it } from "vitest";
import { seal, unseal } from "./seal";

describe("seal / unseal", () => {
	const value = { kind: "ng", a: "actor00001", b: "actor00002" };
	it("封じた値は元に戻り、封じた文字列に中身は出ない", async () => {
		const sealed = await seal("secret-1", "owner1", value);
		expect(sealed).not.toContain("actor00001");
		expect(sealed).not.toContain("ng");
		expect(await unseal("secret-1", "owner1", sealed)).toEqual(value);
	});
	it("同じ値でも、封じるたびに違う文字列になる", async () => {
		expect(await seal("secret-1", "owner1", value)).not.toBe(
			await seal("secret-1", "owner1", value),
		);
	});
	it("鍵が違う・持ち主が違う・壊れているものは null", async () => {
		const sealed = await seal("secret-1", "owner1", value);
		expect(await unseal("secret-2", "owner1", sealed)).toBeNull();
		expect(await unseal("secret-1", "owner2", sealed)).toBeNull();
		expect(await unseal("secret-1", "owner1", "こわれた")).toBeNull();
	});
});
