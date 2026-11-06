import { describe, expect, it } from "vitest";
import { parseIcs } from "./ics";

const ICS = `BEGIN:VCALENDAR
X-WR-CALNAME:テスト予定表
BEGIN:VEVENT
DTSTART;VALUE=DATE:20261108
DTEND;VALUE=DATE:20261109
UID:a@google.com
SUMMARY:12-16 発達カフェ(れん)
END:VEVENT
BEGIN:VEVENT
DTSTART:20261115T123000Z
DTEND:20261115T140000Z
UID:b@google.com
SUMMARY:長い題名は折り返され
 ます\\, カンマ付き\\; セミコロン付き
LOCATION:オンライン　Zoom
DESCRIPTION:<a href="https://example.com/x">イベント概要</a>
STATUS:CONFIRMED
END:VEVENT
BEGIN:VEVENT
DTSTART;TZID=Asia/Tokyo:20260325T190000
DTEND;TZID=Asia/Tokyo:20260325T210000
RRULE:FREQ=MONTHLY;WKST=SU;INTERVAL=1;BYDAY=4WE
EXDATE;TZID=Asia/Tokyo:20260422T190000
UID:c@google.com
SUMMARY:毎月第4水曜
END:VEVENT
BEGIN:VEVENT
DTSTART;TZID=Asia/Tokyo:20260527T200000
DTEND;TZID=Asia/Tokyo:20260527T220000
RECURRENCE-ID;TZID=Asia/Tokyo:20260527T190000
UID:c@google.com
SUMMARY:毎月第4水曜（5月は1時間遅れ）
END:VEVENT
END:VCALENDAR
`;

describe("parseIcs", () => {
	const cal = parseIcs(ICS);

	it("カレンダー名と件数", () => {
		expect(cal.name).toBe("テスト予定表");
		expect(cal.events).toHaveLength(4);
	});

	it("終日は JST の日付として読む", () => {
		const e = cal.events[0];
		expect(e.allDay).toBe(true);
		expect(e.start.toISOString()).toBe("2026-11-07T15:00:00.000Z");
		expect(e.end?.toISOString()).toBe("2026-11-08T15:00:00.000Z");
	});

	it("折り返しとエスケープを解く。Z は UTC", () => {
		const e = cal.events[1];
		expect(e.summary).toBe(
			"長い題名は折り返されます, カンマ付き; セミコロン付き",
		);
		expect(e.location).toBe("オンライン　Zoom");
		expect(e.description).toContain("https://example.com/x");
		expect(e.start.toISOString()).toBe("2026-11-15T12:30:00.000Z");
	});

	it("TZID=Asia/Tokyo は +09:00。RRULE と EXDATE を保持", () => {
		const e = cal.events[2];
		expect(e.start.toISOString()).toBe("2026-03-25T10:00:00.000Z");
		expect(e.rrule).toBe("FREQ=MONTHLY;WKST=SU;INTERVAL=1;BYDAY=4WE");
		expect(e.exdates.map((d) => d.toISOString())).toEqual([
			"2026-04-22T10:00:00.000Z",
		]);
	});

	it("RECURRENCE-ID を読む", () => {
		expect(cal.events[3].recurrenceId?.toISOString()).toBe(
			"2026-05-27T10:00:00.000Z",
		);
	});
});
