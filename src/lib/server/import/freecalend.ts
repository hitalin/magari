// フリカレ（freecalend.com）の公開カレンダーを読む。iCal が無いので、ページの JS が叩く
// POST /open/data を同じ形で呼ぶ。1 日 1 枠（題だけ）で、iCal の終日予定に見立てて返す。
import type { IcsCalendar, IcsEvent } from './ics';

const JST_OFFSET_MS = 9 * 3_600_000;
const DAY_MS = 86_400_000;
// 「変更なし」判定に使う版番号。古い値を送ると現在のデータが set で返る
const STALE_VERSION = '1602144014';

export function freecalendMemNo(url: string): string | null {
	return /freecalend\.com\/open\/mem(\d+)/.exec(url)?.[1] ?? null;
}

// from〜to を含む月（JST）の一覧
export function monthsBetween(from: Date, to: Date): { y: number; m: number }[] {
	const out: { y: number; m: number }[] = [];
	const f = new Date(from.getTime() + JST_OFFSET_MS);
	const t = new Date(to.getTime() + JST_OFFSET_MS);
	let y = f.getUTCFullYear();
	let m = f.getUTCMonth() + 1;
	while (y < t.getUTCFullYear() || (y === t.getUTCFullYear() && m <= t.getUTCMonth() + 1)) {
		out.push({ y, m });
		if (++m > 12) {
			m = 1;
			y++;
		}
	}
	return out;
}

// POST /open/data の本文。keys は JSON を 2 重に URL エンコードしたもの（ページの JS と同じ）
export function buildFreecalendBody(memNo: string, months: { y: number; m: number }[]): string {
	const ok = [[`ok-${memNo}-all-r-cald`, true]];
	const data: unknown[] = [];
	for (const { y, m } of months) {
		data.push([`cald-${memNo}-${y}-${m}`, STALE_VERSION, STALE_VERSION, ok, []]);
		for (let d = 1; d <= 31; d++)
			data.push([`cald-${memNo}-${y}-${m}-${d}`, STALE_VERSION, STALE_VERSION, ok, []]);
	}
	const keys = encodeURIComponent(encodeURIComponent(JSON.stringify({ data })));
	return `target_mem_no=${memNo}&version=3&mem_no=0&keys=${keys}&dokisuru=true&fversion=-1`;
}

// 応答は [["set", "<JSON 文字列>", 版, null, "e"], ["get", key, 版, "noexs"], ["none", ...]] の配列。
// set の中身は ["hda","on","cald-{mem}-{y}-{m}-{d}", [[y, m, d, ...], 題, null, 祝日名, ...]]
export function parseFreecalendResponse(text: string, memNo: string): IcsCalendar {
	const events: IcsEvent[] = [];
	const entries = JSON.parse(text) as unknown[];
	for (const entry of entries) {
		if (!Array.isArray(entry) || entry[0] !== 'set' || typeof entry[1] !== 'string') continue;
		const inner = JSON.parse(entry[1]) as unknown[];
		const key = inner[2];
		const day = inner[3];
		if (typeof key !== 'string' || !Array.isArray(day) || !Array.isArray(day[0])) continue;
		const m = new RegExp(`^cald-${memNo}-(\\d{4})-(\\d{1,2})-(\\d{1,2})$`).exec(key);
		if (!m) continue;
		const summary = typeof day[1] === 'string' ? day[1].trim() : '';
		// 空、休み、仮押さえは会ではない
		if (!summary || /^(休み|休業|定休日|仮予約)$/.test(summary)) continue;
		const start = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]) - JST_OFFSET_MS);
		events.push({
			uid: `freecalend-${memNo}-${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`,
			summary,
			description: null,
			location: null,
			start,
			end: new Date(start.getTime() + DAY_MS),
			allDay: true,
			rrule: null,
			exdates: [],
			recurrenceId: null,
			cancelled: false
		});
	}
	return { name: null, events };
}

export async function fetchFreecalend(url: string, from: Date, to: Date): Promise<IcsCalendar> {
	const memNo = freecalendMemNo(url);
	if (!memNo) throw new Error(`freecalend の URL ではありません: ${url}`);
	const res = await fetch('https://freecalend.com/open/data', {
		method: 'POST',
		headers: {
			'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
			'user-agent': 'magari.cc importer'
		},
		body: buildFreecalendBody(memNo, monthsBetween(from, to))
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return parseFreecalendResponse(await res.text(), memNo);
}
