import { describe, expect, it } from "vitest";
import {
	parseVariantWidth,
	sizedName,
	sizeOf,
	srcsetOf,
	variantKey,
	variantKeys,
} from "./media";

describe("parseVariantWidth", () => {
	it("決めた幅だけ通す（好きな幅で変換を増やさせない）", () => {
		expect(parseVariantWidth("480")).toBe(480);
		expect(parseVariantWidth("960")).toBe(960);
		expect(parseVariantWidth("1600")).toBe(1600);
		expect(parseVariantWidth("481")).toBeNull();
		expect(parseVariantWidth("abc")).toBeNull();
		expect(parseVariantWidth(null)).toBeNull();
	});
});

describe("variantKey", () => {
	it("縮小版は、元のキーから決まる別の置き場に置く", () => {
		expect(variantKey("flyers/abc/x.jpg", 480)).toBe(
			"variants/flyers/abc/x.jpg@480.avif",
		);
	});
	it("元を消すときに一緒に消すキー", () => {
		expect(variantKeys("flyers/abc/x.jpg")).toEqual([
			"variants/flyers/abc/x.jpg@480.avif",
			"variants/flyers/abc/x.jpg@960.avif",
			"variants/flyers/abc/x.jpg@1600.avif",
		]);
	});
});

describe("srcsetOf", () => {
	it("R2 の画像なら、幅ごとの縮小版を並べる", () => {
		expect(srcsetOf("/i/flyers/abc/x.jpg")).toBe(
			"/i/flyers/abc/x.jpg?w=480 480w, /i/flyers/abc/x.jpg?w=960 960w, /i/flyers/abc/x.jpg?w=1600 1600w",
		);
	});
	it("外の画像（X のアイコンなど）と、blob の見本には付けない", () => {
		expect(srcsetOf("https://pbs.twimg.com/a.jpg")).toBeNull();
		expect(srcsetOf("blob:http://localhost/abc")).toBeNull();
		expect(srcsetOf("/og.png")).toBeNull();
	});
});

describe("画像の大きさ", () => {
	it("上げるときに調べた大きさを、名前に入れる", () => {
		expect(sizedName("k3m9", "jpg", { width: 1200, height: 1700 })).toBe(
			"k3m9-1200x1700.jpg",
		);
	});
	it("調べられなかったら入れない", () => {
		expect(sizedName("k3m9", "jpg", null)).toBe("k3m9.jpg");
		expect(sizedName("k3m9", "png", { width: 0, height: 10 })).toBe("k3m9.png");
	});
	it("名前から読み戻す", () => {
		expect(sizeOf("/i/flyers/abc/k3m9-1200x1700.jpg")).toEqual({
			width: 1200,
			height: 1700,
		});
	});
	it("入っていない名前（前に上げた画像、取り込んだ写真）は null", () => {
		expect(sizeOf("/i/flyers/abc/k3m9.jpg")).toBeNull();
		expect(sizeOf("/i/headers/abc/src-1a2b3c")).toBeNull();
		expect(sizeOf(null)).toBeNull();
	});
});
