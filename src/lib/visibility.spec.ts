import { describe, expect, it } from "vitest";
import { reach, VISIBILITIES, visibilitiesWhere } from "./visibility";

describe("reach", () => {
	it("公開は、一覧にもページにも出て、共有も検索もできる", () => {
		expect(reach("public")).toEqual({
			lists: true,
			pages: true,
			share: true,
			index: true,
		});
	});
	it("ページだけは、一覧に出ず、主催とハコのページにだけ出る。共有はできる", () => {
		expect(reach("home")).toEqual({
			lists: false,
			pages: true,
			share: true,
			index: true,
		});
	});
	it("URL を知っている人だけは、どこにも出ず、共有ボタンもカードも検索も無い", () => {
		expect(reach("unlisted")).toEqual({
			lists: false,
			pages: false,
			share: false,
			index: false,
		});
	});
});

describe("visibilitiesWhere", () => {
	it("その出口に出る公開範囲を、広い順に返す（SQL の絞り込みに使う）", () => {
		expect(visibilitiesWhere("lists")).toEqual(["public"]);
		expect(visibilitiesWhere("pages")).toEqual(["public", "home"]);
		expect(VISIBILITIES).toEqual(["public", "home", "unlisted"]);
	});
});
