import { describe, expect, it } from "vitest";
import { compareArea, detectArea, eventArea, fullAddress } from "./area";

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

describe("fullAddress", () => {
	it("住所の頭に都道府県を付ける", () => {
		expect(fullAddress("大阪府", "大阪市都島区都島本通2-8-10")).toBe(
			"大阪府大阪市都島区都島本通2-8-10",
		);
	});
	it("住所がすでに都道府県から始まっていれば重ねない", () => {
		expect(fullAddress("大阪府", "大阪府大阪市都島区")).toBe(
			"大阪府大阪市都島区",
		);
	});
	it("都道府県が無ければ住所のまま、住所が無ければ null", () => {
		expect(fullAddress(null, "大阪市都島区")).toBe("大阪市都島区");
		expect(fullAddress("大阪府", null)).toBeNull();
	});
});

describe("eventArea", () => {
	const none = { locationName: null, locationAddress: null, onlineUrl: null };
	it("ハコがあればハコの都道府県", () => {
		expect(
			eventArea({ ...none, spaceRegion: "大阪府", locationName: "東京駅" }),
		).toBe("大阪");
	});
	it("ハコが無ければ会場の住所、次に会場の名前", () => {
		expect(
			eventArea({
				...none,
				spaceRegion: null,
				locationAddress: "東京都品川区",
				locationName: "大阪の店",
			}),
		).toBe("東京");
		expect(
			eventArea({ ...none, spaceRegion: null, locationName: "京都市の公園" }),
		).toBe("京都");
	});
	it("場所が分からずオンラインの URL があればオンライン、何も無ければ null", () => {
		expect(
			eventArea({
				...none,
				spaceRegion: null,
				onlineUrl: "https://example.com/live",
			}),
		).toBe("オンライン");
		expect(eventArea({ ...none, spaceRegion: null })).toBeNull();
	});
});
