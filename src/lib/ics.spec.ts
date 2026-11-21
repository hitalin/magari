import { describe, expect, it } from "vitest";
import { type IcsSource, toIcs } from "./ics";
import { parseIcs } from "./server/import/ics";

const base: IcsSource = {
	id: "abc123defg",
	title: "なんもしない会",
	startsAt: "2026-11-08T10:00:00.000Z",
	endsAt: "2026-11-08T13:00:00.000Z",
	allDay: false,
	locationName: null,
	onlineUrl: null,
	space: null,
};
const opts = {
	origin: "https://magari.cc",
	now: new Date("2026-11-01T00:00:00Z"),
};

const lines = (ics: string) => ics.split("\r\n");

describe("toIcs", () => {
	it("時刻のある会は UTC の瞬間で書く", () => {
		const out = lines(toIcs([base], opts));
		expect(out[0]).toBe("BEGIN:VCALENDAR");
		expect(out).toContain("UID:abc123defg@magari.cc");
		expect(out).toContain("DTSTAMP:20261101T000000Z");
		expect(out).toContain("DTSTART:20261108T100000Z");
		expect(out).toContain("DTEND:20261108T130000Z");
		expect(out).toContain("URL:https://magari.cc/e/abc123defg");
		expect(out.at(-2)).toBe("END:VCALENDAR");
		expect(out.at(-1)).toBe("");
	});

	it("終了が無いか開始以前なら、長さを決めずに DTEND を書かない", () => {
		for (const endsAt of [null, base.startsAt, "2026-11-08T09:00:00.000Z"]) {
			const out = toIcs([{ ...base, endsAt }], opts);
			expect(out).not.toContain("DTEND");
		}
	});

	it("終日は JST の日付で書き、終了は翌日（含まない）", () => {
		const out = lines(
			toIcs(
				[
					{
						...base,
						allDay: true,
						// JST 11/8 0:00 〜 11/9 0:00
						startsAt: "2026-11-07T15:00:00.000Z",
						endsAt: "2026-11-08T15:00:00.000Z",
					},
				],
				opts,
			),
		);
		expect(out).toContain("DTSTART;VALUE=DATE:20261108");
		expect(out).toContain("DTEND;VALUE=DATE:20261109");
	});

	it("終日で終了が無ければ 1 日ぶんにする", () => {
		const out = lines(
			toIcs(
				[
					{
						...base,
						allDay: true,
						startsAt: "2026-12-30T15:00:00.000Z",
						endsAt: null,
					},
				],
				opts,
			),
		);
		expect(out).toContain("DTSTART;VALUE=DATE:20261231");
		expect(out).toContain("DTEND;VALUE=DATE:20270101");
	});

	it("場所はハコ > 場所の名前。住所は公開のときだけ添える", () => {
		const place = (e: Partial<IcsSource>) =>
			parseIcs(toIcs([{ ...base, ...e }], opts)).events[0].location;
		expect(
			place({
				space: { handle: "hako", name: "ハコ", kind: "space" },
				locationName: "二階",
			}),
		).toBe("ハコ");
		expect(place({ locationName: "公園", locationAddress: "東京都 1-2" })).toBe(
			"公園 東京都 1-2",
		);
		expect(
			place({
				locationName: "公園",
				locationAddress: "東京都 1-2",
				locationVisibility: "attendees",
			}),
		).toBe("公園");
		expect(place({ onlineUrl: "https://example.com/room" })).toBe(
			"https://example.com/room",
		);
		expect(place({})).toBeNull();
	});

	it("中止は題の頭と STATUS に出す", () => {
		const out = toIcs([{ ...base, status: "cancelled" }], opts);
		expect(lines(out)).toContain("STATUS:CANCELLED");
		const [e] = parseIcs(out).events;
		expect(e.cancelled).toBe(true);
		expect(e.summary).toBe("【中止】なんもしない会");
	});

	it("区切りの字と改行を逃がし、読み戻すと元に戻る", () => {
		const title = "a,b;c\\d";
		const description = "一行目\n二行目, まだ続く; おわり";
		const out = toIcs([{ ...base, title, description }], opts);
		const [e] = parseIcs(out).events;
		expect(e.summary).toBe(title);
		expect(e.description).toBe(
			`${description}\n\nhttps://magari.cc/e/abc123defg`,
		);
		expect(e.start.toISOString()).toBe(base.startsAt);
	});

	it("説明が無ければ、会のページの URL だけを説明に書く", () => {
		const [e] = parseIcs(toIcs([base], opts)).events;
		expect(e.description).toBe("https://magari.cc/e/abc123defg");
	});

	it("長い行は 75 オクテット以内で折り、字の途中で切らない", () => {
		const title = "間".repeat(200);
		const out = toIcs([{ ...base, title }], opts);
		const enc = new TextEncoder();
		for (const line of lines(out))
			expect(enc.encode(line).length).toBeLessThanOrEqual(75);
		expect(out).not.toContain("�");
		expect(parseIcs(out).events[0].summary).toBe(title);
	});

	it("名前を渡すと予定表の名前になる", () => {
		const out = toIcs([base, { ...base, id: "zzz" }], {
			...opts,
			name: "ハコ, 本店",
		});
		const cal = parseIcs(out);
		expect(cal.name).toBe("ハコ, 本店");
		expect(cal.events).toHaveLength(2);
	});
});
