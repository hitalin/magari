// 会を iCal（RFC 5545）で出す。カレンダーアプリに入れる・購読するための出口。
import { dayKey } from "./date";
import type { EventDetail, EventSummary } from "./types";

// 一覧（EventSummary）でも詳細（EventDetail）でも渡せる。詳細にしか無い項目は、あれば書く
export type IcsSource = Pick<
	EventSummary,
	| "id"
	| "title"
	| "startsAt"
	| "endsAt"
	| "allDay"
	| "locationName"
	| "onlineUrl"
	| "space"
> &
	Partial<Pick<EventSummary, "room">> &
	Partial<
		Pick<
			EventDetail,
			"description" | "locationAddress" | "locationVisibility" | "status"
		>
	>;

const DAY_MS = 86_400_000;

const escapeText = (v: string) =>
	v
		.replace(/\\/g, "\\\\")
		.replace(/;/g, "\\;")
		.replace(/,/g, "\\,")
		.replace(/\r?\n/g, "\\n");

// 20261108T100000Z
const utcStamp = (d: Date) =>
	`${d.toISOString().slice(0, 19).replace(/[-:]/g, "")}Z`;

// JST の日付（20261108）
const jstDate = (d: Date) => dayKey(d).replace(/-/g, "");

// 1 行は 75 オクテットまで。越える分は、字の途中で切らずに「改行 + 空白」で折る
function fold(line: string): string {
	const enc = new TextEncoder();
	if (enc.encode(line).length <= 75) return line;
	const out: string[] = [];
	let cur = "";
	let size = 0;
	for (const ch of line) {
		const n = enc.encode(ch).length;
		if (size + n > 75) {
			out.push(cur);
			// 続きの行は先頭の空白で 1 オクテット使う
			cur = " ";
			size = 1;
		}
		cur += ch;
		size += n;
	}
	out.push(cur);
	return out.join("\r\n");
}

function place(e: IcsSource): string | null {
	const name = e.space?.name ?? e.locationName;
	// 「主催に聞いてください」の会は住所を出さない
	const address =
		e.locationVisibility === "attendees" ? null : e.locationAddress;
	return (
		[name, e.space && e.room, address].filter(Boolean).join(" ") || e.onlineUrl
	);
}

function vevent(e: IcsSource, origin: string, stamp: string): string[] {
	const start = new Date(e.startsAt);
	const end = e.endsAt ? new Date(e.endsAt) : null;
	const url = `${origin}/e/${e.id}`;
	const cancelled = e.status === "cancelled";
	const where = place(e);
	const times = e.allDay
		? [
				`DTSTART;VALUE=DATE:${jstDate(start)}`,
				// 終了は含まない日。無ければ 1 日ぶん
				`DTEND;VALUE=DATE:${jstDate(end && end > start ? end : new Date(start.getTime() + DAY_MS))}`,
			]
		: [
				`DTSTART:${utcStamp(start)}`,
				// 終了が無ければ書かない（長さをこちらで決めない）
				...(end && end > start ? [`DTEND:${utcStamp(end)}`] : []),
			];
	return [
		"BEGIN:VEVENT",
		`UID:${e.id}@${new URL(origin).host}`,
		`DTSTAMP:${stamp}`,
		...times,
		`SUMMARY:${escapeText(cancelled ? `【中止】${e.title}` : e.title)}`,
		...(where ? [`LOCATION:${escapeText(where)}`] : []),
		// URL を出さないアプリが多いので、説明の末尾にも会のページを書く
		`DESCRIPTION:${escapeText([e.description, url].filter(Boolean).join("\n\n"))}`,
		`URL:${url}`,
		...(cancelled ? ["STATUS:CANCELLED"] : []),
		"END:VEVENT",
	];
}

export function toIcs(
	events: IcsSource[],
	opts: { origin: string; name?: string; now?: Date },
): string {
	const stamp = utcStamp(opts.now ?? new Date());
	return [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//magari.cc//magari//JA",
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		...(opts.name ? [`X-WR-CALNAME:${escapeText(opts.name)}`] : []),
		...events.flatMap((e) => vevent(e, opts.origin, stamp)),
		"END:VCALENDAR",
		"",
	]
		.map(fold)
		.join("\r\n");
}
