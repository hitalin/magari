import { describe, expect, it } from "vitest";
import {
	buildFreecalendBody,
	freecalendMemNo,
	monthsBetween,
	parseFreecalendResponse,
} from "./freecalend";

const set = (key: string, title: string) =>
	JSON.stringify([
		"set",
		JSON.stringify([
			"hda",
			"on",
			key,
			[[2026, 12, 3, 0, 0, 0, 3, 0, "木"], title, null, "", "", "", "", ""],
		]),
		"1792117185",
		null,
		"e",
	]);
const RESPONSE = `[${[
	'["get","cald-317765-2026-12","1602144014","noexs"]',
	set("cald-317765-2026-12-3", "初見歓迎バー｜ほうた店長"),
	set("cald-317765-2026-12-4", "仮予約"),
	set("cald-317765-2026-12-28", ""),
	set("cald-317765-2026-12-31", "休み"),
	set("cald-317765-2027-1-7", "16-21時 第4弾 大好きなバー"),
	'["none",[],"cald-317765-2026-12-9","1602144014"]',
].join(",")}]`;

describe("freecalend", () => {
	it("URL から mem 番号を取る", () => {
		expect(freecalendMemNo("https://freecalend.com/open/mem317765")).toBe(
			"317765",
		);
		expect(freecalendMemNo("https://example.com/")).toBeNull();
	});
	it("範囲に含まれる月を JST で列挙する", () => {
		// JST 11/30 23:00 〜 翌年 1/1
		expect(
			monthsBetween(
				new Date("2026-11-30T14:00:00Z"),
				new Date("2027-01-01T00:00:00Z"),
			),
		).toEqual([
			{ y: 2026, m: 11 },
			{ y: 2026, m: 12 },
			{ y: 2027, m: 1 },
		]);
	});
	it("本文は月キーと 31 日分の日キーに ok フラグを付け、2 重に URL エンコードする", () => {
		const body = buildFreecalendBody("317765", [{ y: 2026, m: 12 }]);
		expect(
			body.startsWith("target_mem_no=317765&version=3&mem_no=0&keys="),
		).toBe(true);
		const keys = JSON.parse(
			decodeURIComponent(
				decodeURIComponent(/keys=([^&]+)/.exec(body)?.[1] ?? ""),
			),
		);
		expect(keys.data).toHaveLength(32);
		expect(keys.data[0]).toEqual([
			"cald-317765-2026-12",
			"1602144014",
			"1602144014",
			[["ok-317765-all-r-cald", true]],
			[],
		]);
		expect(keys.data[31][0]).toBe("cald-317765-2026-12-31");
	});
	it("set の日だけを JST 終日の会にし、空・休み・仮予約は飛ばす", () => {
		const cal = parseFreecalendResponse(RESPONSE, "317765");
		expect(cal.events.map((e) => e.summary)).toEqual([
			"初見歓迎バー｜ほうた店長",
			"16-21時 第4弾 大好きなバー",
		]);
		const e = cal.events[0];
		expect(e.uid).toBe("freecalend-317765-2026-12-03");
		expect(e.allDay).toBe(true);
		expect(e.start.toISOString()).toBe("2026-12-02T15:00:00.000Z");
		expect(e.end?.toISOString()).toBe("2026-12-03T15:00:00.000Z");
	});
});
