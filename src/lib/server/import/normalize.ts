import { RRule, RRuleSet } from "rrule";
import type { IcsEvent } from "./ics";

const JST_OFFSET_MS = 9 * 3_600_000;
const DAY_MS = 86_400_000;

export type Occurrence = {
	start: Date;
	end: Date | null;
	occurrenceKey: string;
};

// rrule は UTC で計算するので、JST の壁時計を UTC に見立てた「浮動」時刻で展開し、最後に戻す。
const toFloating = (d: Date) => new Date(d.getTime() + JST_OFFSET_MS);
const fromFloating = (d: Date) => new Date(d.getTime() - JST_OFFSET_MS);

export function expandOccurrences(
	ev: IcsEvent,
	from: Date,
	to: Date,
): Occurrence[] {
	const duration = ev.end ? ev.end.getTime() - ev.start.getTime() : null;
	if (!ev.rrule) {
		if (ev.start < from || ev.start >= to) return [];
		return [
			{
				start: ev.start,
				end: ev.end,
				occurrenceKey: ev.recurrenceId?.toISOString() ?? "",
			},
		];
	}
	const options = RRule.parseString(ev.rrule);
	options.dtstart = toFloating(ev.start);
	if (options.until) options.until = toFloating(options.until);
	const set = new RRuleSet();
	set.rrule(new RRule(options));
	for (const x of ev.exdates) set.exdate(toFloating(x));
	return set.between(toFloating(from), toFloating(to), true).map((f) => {
		const start = fromFloating(f);
		return {
			start,
			end: duration === null ? null : new Date(start.getTime() + duration),
			occurrenceKey: start.toISOString(),
		};
	});
}

// エデンの予定表は終日予定で、題に「13-17」「19:30〜24」「20時-2時」「17:30~」「11-16時」「19-21時半」のように時刻が書かれている。
// 時刻 1 つは 3 グループ（時、分、「時半」の半）。
const T = "(\\d{1,2})(?:[:：](\\d{2})|時(半))?";
const T_HOUR = "(\\d{1,2})(?:[:：](\\d{2}))?時(半)?";
const SEP = "\\s*[-〜~ー–−]\\s*";
// 頭の「昼」（横浜の「昼14-18時」など）は時刻の前置きとして読み捨てる
const LEAD = "^[\\s(（]*(?:昼[\\s:：)）]*)?";
const PREFIX_RANGE = new RegExp(`${LEAD}${T}時?${SEP}${T}時?\\s*[)）]?\\s*`);
const PREFIX_OPEN = new RegExp(`${LEAD}${T}時?${SEP}[)）]?\\s*`);
const SUFFIX_RANGE = new RegExp(
	`\\s*[(（]?${T}時?${SEP}${T_HOUR}\\s*[)）]?\\s*$`,
);

export function parseEdenTitle(
	summary: string,
	dayStartJst: Date,
): { title: string; start: Date | null; end: Date | null } {
	const at = (h: string, mi: string | undefined, half: string | undefined) =>
		new Date(
			dayStartJst.getTime() + (+h * 60 + (mi ? +mi : half ? 30 : 0)) * 60_000,
		);
	const range = (m: RegExpExecArray, title: string) => {
		const start = at(m[1], m[2], m[3]);
		let end = at(m[4], m[5], m[6]);
		if (end <= start) end = new Date(end.getTime() + DAY_MS);
		return { title: title.trim() || summary, start, end };
	};
	let m = PREFIX_RANGE.exec(summary);
	if (m) return range(m, summary.slice(m[0].length));
	m = SUFFIX_RANGE.exec(summary);
	if (m) return range(m, summary.slice(0, m.index));
	m = PREFIX_OPEN.exec(summary);
	if (m)
		return {
			title: summary.slice(m[0].length).trim() || summary,
			start: at(m[1], m[2], m[3]),
			end: null,
		};
	return { title: summary, start: null, end: null };
}

export type StoreHours = {
	hours: readonly [string, string];
	// 昼営業の時間（公式に書かれている店だけ）
	dayHours?: readonly [string, string];
};

// 時刻の無い 1 日の会を店の営業時間に置く。題に「昼」があれば昼の営業時間に置き、無い店では null（終日のまま）。
export function storeHoursFor(
	title: string,
	dayStartJst: Date,
	store: StoreHours,
): { start: Date; end: Date } | null {
	const slot = /昼/.test(title) ? store.dayHours : store.hours;
	if (!slot) return null;
	const at = (hm: string) => {
		const [h, m] = hm.split(":").map(Number);
		return new Date(dayStartJst.getTime() + (h * 60 + m) * 60_000);
	};
	const start = at(slot[0]);
	let end = at(slot[1]);
	if (end <= start) end = new Date(end.getTime() + DAY_MS);
	return { start, end };
}

// 説明文の <a href="..."> から告知ページの URL を取り出す。Google のリダイレクトは剥がす。
export function unwrapUrl(description: string | null): string | null {
	if (!description) return null;
	const m =
		/href="([^"]+)"/.exec(description) ?? /(https?:\/\/\S+)/.exec(description);
	if (!m) return null;
	const raw = m[1].replace(/&amp;/g, "&");
	try {
		const u = new URL(raw);
		if (u.hostname === "www.google.com" && u.pathname === "/url")
			return u.searchParams.get("q") ?? raw;
		return u.toString();
	} catch {
		return null;
	}
}
