// Google カレンダーの公開 iCal を読むための最小パーサ。必要な項目だけ扱う。

export type IcsEvent = {
	uid: string;
	summary: string;
	description: string | null;
	location: string | null;
	start: Date;
	end: Date | null;
	allDay: boolean;
	rrule: string | null;
	exdates: Date[];
	recurrenceId: Date | null;
	cancelled: boolean;
};

export type IcsCalendar = { name: string | null; events: IcsEvent[] };

const JST_OFFSET_MS = 9 * 3_600_000;

function unescapeText(v: string): string {
	return v.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\;/g, ';').replace(/\\\\/g, '\\');
}

// 20261108 / 20261115T123000Z / 20261115T123000（TZID か floating は JST とみなす）
function parseDate(
	value: string,
	params: Record<string, string>
): { date: Date; allDay: boolean } | null {
	const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value.trim());
	if (!m) return null;
	const [, y, mo, d, h, mi, s, z] = m;
	const allDay = params.VALUE === 'DATE' || h === undefined;
	const utc = Date.UTC(+y, +mo - 1, +d, +(h ?? 0), +(mi ?? 0), +(s ?? 0));
	return { date: new Date(z ? utc : utc - JST_OFFSET_MS), allDay };
}

function parseLine(
	line: string
): { name: string; params: Record<string, string>; value: string } | null {
	const i = line.indexOf(':');
	if (i < 0) return null;
	const [name, ...paramParts] = line.slice(0, i).split(';');
	const params: Record<string, string> = {};
	for (const p of paramParts) {
		const eq = p.indexOf('=');
		if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1);
	}
	return { name: name.toUpperCase(), params, value: line.slice(i + 1) };
}

export function parseIcs(text: string): IcsCalendar {
	const lines = text
		.replace(/\r\n/g, '\n')
		.replace(/\n[ \t]/g, '')
		.split('\n');
	const events: IcsEvent[] = [];
	let name: string | null = null;
	let cur: Partial<IcsEvent> & { exdates: Date[] } = { exdates: [] };
	let inEvent = false;

	for (const line of lines) {
		if (line === 'BEGIN:VEVENT') {
			inEvent = true;
			cur = {
				exdates: [],
				description: null,
				location: null,
				end: null,
				rrule: null,
				recurrenceId: null,
				cancelled: false
			};
			continue;
		}
		if (line === 'END:VEVENT') {
			inEvent = false;
			if (cur.uid && cur.summary !== undefined && cur.start) events.push(cur as IcsEvent);
			continue;
		}
		const p = parseLine(line);
		if (!p) continue;
		if (!inEvent) {
			if (p.name === 'X-WR-CALNAME') name = unescapeText(p.value);
			continue;
		}
		switch (p.name) {
			case 'UID':
				cur.uid = p.value;
				break;
			case 'SUMMARY':
				cur.summary = unescapeText(p.value).trim();
				break;
			case 'DESCRIPTION':
				cur.description = unescapeText(p.value).trim() || null;
				break;
			case 'LOCATION':
				cur.location = unescapeText(p.value).trim() || null;
				break;
			case 'DTSTART': {
				const d = parseDate(p.value, p.params);
				if (d) {
					cur.start = d.date;
					cur.allDay = d.allDay;
				}
				break;
			}
			case 'DTEND':
				cur.end = parseDate(p.value, p.params)?.date ?? null;
				break;
			case 'RRULE':
				cur.rrule = p.value;
				break;
			case 'EXDATE':
				for (const v of p.value.split(',')) {
					const d = parseDate(v, p.params);
					if (d) cur.exdates.push(d.date);
				}
				break;
			case 'RECURRENCE-ID':
				cur.recurrenceId = parseDate(p.value, p.params)?.date ?? null;
				break;
			case 'STATUS':
				cur.cancelled = p.value.toUpperCase() === 'CANCELLED';
				break;
		}
	}
	return { name, events };
}
