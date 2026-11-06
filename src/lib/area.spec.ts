import { describe, expect, it } from "vitest";
import { compareArea, detectArea } from "./area";

describe("detectArea", () => {
	it("会場文字列から都道府県を返す（接尾辞なし）", () => {
		expect(detectArea("東京都品川区　Mother Nature's Son")).toBe("東京");
		expect(detectArea("神奈川県横浜市都筑区　いのちの木")).toBe("神奈川");
		expect(detectArea("大阪府大阪市　中央区千日前")).toBe("大阪");
		expect(detectArea("北海道札幌市")).toBe("北海道");
		expect(detectArea("京都市中京区")).toBe("京都");
	});
	it("オンラインを優先する", () => {
		expect(detectArea("オンライン　Zoom")).toBe("オンライン");
		expect(detectArea("Zoom（東京都のグループ）")).toBe("オンライン");
	});
	it("分からなければ null", () => {
		expect(detectArea("どこかの公園")).toBeNull();
		expect(detectArea(null)).toBeNull();
	});
});

describe("compareArea", () => {
	it("主要都市を先に、残りは北から、分からないものは最後に並べる", () => {
		const areas = [null, "沖縄", "大阪", "北海道", "東京", "兵庫"];
		expect(areas.sort(compareArea)).toEqual([
			"東京",
			"大阪",
			"兵庫",
			"北海道",
			"沖縄",
			null,
		]);
	});
});
