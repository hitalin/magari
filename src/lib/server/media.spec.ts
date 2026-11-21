import { describe, expect, it, vi } from "vitest";
import { deleteMedia, imageSize } from "./media";

describe("deleteMedia", () => {
	it("元の画像と一緒に、縮小版も消す", async () => {
		const del = vi.fn(async () => {});
		await deleteMedia({ delete: del } as unknown as R2Bucket, "flyers/a/x.jpg");
		expect(del).toHaveBeenCalledWith([
			"flyers/a/x.jpg",
			"variants/flyers/a/x.jpg@480.avif",
			"variants/flyers/a/x.jpg@960.avif",
			"variants/flyers/a/x.jpg@1600.avif",
		]);
	});
});

describe("imageSize", () => {
	const file = new File([new Uint8Array(3)], "a", { type: "image/png" });
	it("画像の大きさを返す", async () => {
		const images = {
			info: async () => ({
				format: "image/png",
				fileSize: 3,
				width: 1200,
				height: 1700,
			}),
		} as unknown as ImagesBinding;
		expect(await imageSize(images, file)).toEqual({
			width: 1200,
			height: 1700,
		});
	});
	it("調べられなければ null（上げるのは止めない）", async () => {
		const broken = {
			info: async () => {
				throw new Error("9412");
			},
		} as unknown as ImagesBinding;
		expect(await imageSize(broken, file)).toBeNull();
		expect(await imageSize(undefined, file)).toBeNull();
		const svg = {
			info: async () => ({ format: "image/svg+xml" }),
		} as unknown as ImagesBinding;
		expect(await imageSize(svg, file)).toBeNull();
	});
});
