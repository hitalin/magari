import { RRule, RRuleSet } from 'rrule';
import type { IcsEvent } from './ics';

const JST_OFFSET_MS = 9 * 3_600_000;
const DAY_MS = 86_400_000;

export type Occurrence = { start: Date; end: Date | null; occurrenceKey: string };

// rrule は UTC で計算するので、JST の壁時計を UTC に見立てた「浮動」時刻で展開し、最後に戻す。
const toFloating = (d: Date) => new Date(d.getTime() + JST_OFFSET_MS);
const fromFloating = (d: Date) => new Date(d.getTime() - JST_OFFSET_MS);

export function expandOccurrences(ev: IcsEvent, from: Date, to: Date): Occurrence[] {
	const duration = ev.end ? ev.end.getTime() - ev.start.getTime() : null;
	if (!ev.rrule) {
		if (ev.start < from || ev.start >= to) return [];
		return [{ start: ev.start, end: ev.end, occurrenceKey: ev.recurrenceId?.toISOString() ?? '' }];
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
			occurrenceKey: start.toISOString()
		};
	});
}

// エデンの予定表は終日予定で、題に「13-17」「19:30〜24」「20時-2時」「17:30~」「11-16時」のように時刻が書かれている。
const T = '(\\d{1,2})(?:[:：](\\d{2}))?';
const SEP = '\\s*[-〜~ー–−]\\s*';
const PREFIX_RANGE = new RegExp(`^[\\s(（]*${T}時?${SEP}${T}時?\\s*[)）]?\\s*`);
const PREFIX_OPEN = new RegExp(`^[\\s(（]*${T}時?${SEP}[)）]?\\s*`);
const SUFFIX_RANGE = new RegExp(`\\s*[(（]?${T}時?${SEP}${T}時\\s*[)）]?\\s*$`);

export function parseEdenTitle(
	summary: string,
	dayStartJst: Date
): { title: string; start: Date | null; end: Date | null } {
	const at = (h: string, mi: string | undefined) =>
		new Date(dayStartJst.getTime() + (+h * 60 + +(mi ?? 0)) * 60_000);
	const range = (m: RegExpExecArray, title: string) => {
		const start = at(m[1], m[2]);
		let end = at(m[3], m[4]);
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
			start: at(m[1], m[2]),
			end: null
		};
	return { title: summary, start: null, end: null };
}

// 説明文の <a href="..."> から告知ページの URL を取り出す。Google のリダイレクトは剥がす。
export function unwrapUrl(description: string | null): string | null {
	if (!description) return null;
	const m = /href="([^"]+)"/.exec(description) ?? /(https?:\/\/\S+)/.exec(description);
	if (!m) return null;
	const raw = m[1].replace(/&amp;/g, '&');
	try {
		const u = new URL(raw);
		if (u.hostname === 'www.google.com' && u.pathname === '/url')
			return u.searchParams.get('q') ?? raw;
		return u.toString();
	} catch {
		return null;
	}
}
