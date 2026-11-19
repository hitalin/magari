import { describe, expect, it, vi } from "vitest";
import { checkFlyer, putFlyer } from "./flyer-upload";

const file = (type: string, size = 3) =>
	new File([new Uint8Array(size)], "a", { type });

describe("checkFlyer", () => {
	it("JPEG / PNG / WebP は通す", () => {
		expect(checkFlyer(file("image/png"))).toBeNull();
		expect(checkFlyer(file("image/jpeg"))).toBeNull();
		expect(checkFlyer(file("image/webp"))).toBeNull();
	});
	it("ほかの形式と 10MB 超は断る", () => {
		expect(checkFlyer(file("image/gif"))).toBe("JPEG / PNG / WebP だけ");
		expect(checkFlyer(file("image/png", 10 * 1024 * 1024 + 1))).toBe(
			"10MB までにしてください",
		);
	});
});

describe("putFlyer", () => {
	it("flyers/{会の ID}/ の下に、上げるたびに違う名前で置く", async () => {
		const put = vi.fn(async () => null);
		const media = { put } as unknown as R2Bucket;
		const a = await putFlyer(media, "ev1", file("image/png"));
		const b = await putFlyer(media, "ev1", file("image/jpeg"));
		expect(a).toMatch(/^flyers\/ev1\/[^/]+\.png$/);
		expect(b).toMatch(/^flyers\/ev1\/[^/]+\.jpg$/);
		expect(a.split(".")[0]).not.toBe(b.split(".")[0]);
		expect(put).toHaveBeenCalledWith(a, expect.any(ArrayBuffer), {
			httpMetadata: { contentType: "image/png" },
		});
	});
});
