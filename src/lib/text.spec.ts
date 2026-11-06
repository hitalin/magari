import { describe, expect, it } from "vitest";
import { parseBlocks } from "./text";

describe("parseBlocks", () => {
	it("空行で段落を分け、## を見出し、- を箇条書きにする", () => {
		const blocks = parseBlocks(
			"## 使い方\n昼はカフェ。\n夜はバー。\n\n- Wi-Fi\n- 電源\n\n相談ください。",
		);
		expect(blocks).toEqual([
			{ type: "h2", text: "使い方" },
			{ type: "p", lines: ["昼はカフェ。", "夜はバー。"] },
			{ type: "ul", items: ["Wi-Fi", "電源"] },
			{ type: "p", lines: ["相談ください。"] },
		]);
	});

	it("空や null は空配列", () => {
		expect(parseBlocks(null)).toEqual([]);
		expect(parseBlocks("  \n\n")).toEqual([]);
	});
});
