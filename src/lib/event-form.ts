// 会の作成・編集フォームの検証と変換。サーバー側の form action から使う（純粋関数）。
import { HANDLE_PATTERN, isValidHandle } from './id';

export type EventFormValues = {
	title: string;
	date: string; // YYYY-MM-DD（JST）
	allDay: boolean;
	startTime: string; // HH:MM
	endTime: string; // HH:MM or ''
	space: string; // ハコの handle（@ は省略可）
	locationName: string;
	locationAddress: string;
	locationVisibility: 'public' | 'attendees';
	onlineUrl: string;
	description: string;
	tags: string; // カンマ・読点区切り
	capacity: string;
	feeText: string;
	url: string;
	visibility: 'public' | 'unlisted' | 'private';
	status: 'published' | 'draft';
};

export const EMPTY_EVENT_FORM: EventFormValues = {
	title: '',
	date: '',
	allDay: false,
	startTime: '19:00',
	endTime: '',
	space: '',
	locationName: '',
	locationAddress: '',
	locationVisibility: 'public',
	onlineUrl: '',
	description: '',
	tags: '',
	capacity: '',
	feeText: '',
	url: '',
	visibility: 'public',
	status: 'published'
};

export type ParsedEvent = {
	title: string;
	startsAt: Date;
	endsAt: Date | null;
	allDay: boolean;
	// ハコの handle。保存時に actors.id に解決する
	spaceHandle: string | null;
	locationName: string | null;
	locationAddress: string | null;
	locationVisibility: 'public' | 'attendees';
	onlineUrl: string | null;
	description: string | null;
	tags: string[];
	capacity: number | null;
	feeText: string | null;
	url: string | null;
	visibility: EventFormValues['visibility'];
	status: EventFormValues['status'];
};

const DAY_MS = 86_400_000;
const jst = (date: string, time: string) => new Date(`${date}T${time}:00+09:00`);
const nullable = (s: string) => (s.trim() ? s.trim() : null);

export function readEventForm(get: (name: string) => string | null): EventFormValues {
	const s = (name: string) => (get(name) ?? '').trim();
	const pick = <T extends string>(name: string, allowed: readonly T[], fallback: T): T =>
		(allowed as readonly string[]).includes(s(name)) ? (s(name) as T) : fallback;
	return {
		title: s('title'),
		date: s('date'),
		allDay: get('allDay') !== null,
		startTime: s('startTime'),
		endTime: s('endTime'),
		space: s('space'),
		locationName: s('locationName'),
		locationAddress: s('locationAddress'),
		locationVisibility: pick('locationVisibility', ['public', 'attendees'], 'public'),
		onlineUrl: s('onlineUrl'),
		description: s('description'),
		tags: s('tags'),
		capacity: s('capacity'),
		feeText: s('feeText'),
		url: s('url'),
		visibility: pick('visibility', ['public', 'unlisted', 'private'], 'public'),
		status: pick('status', ['published', 'draft'], 'published')
	};
}

export function parseEventForm(
	v: EventFormValues
): { ok: true; event: ParsedEvent } | { ok: false; error: string } {
	if (!v.title) return { ok: false, error: '題を入れてください' };
	if (v.title.length > 200) return { ok: false, error: '題が長すぎます（200 文字まで）' };
	if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date) || Number.isNaN(jst(v.date, '00:00').getTime()))
		return { ok: false, error: '日付が正しくありません' };

	let startsAt: Date;
	let endsAt: Date | null;
	if (v.allDay) {
		startsAt = jst(v.date, '00:00');
		endsAt = new Date(startsAt.getTime() + DAY_MS);
	} else {
		if (!/^\d{2}:\d{2}$/.test(v.startTime))
			return { ok: false, error: '開始時刻が正しくありません' };
		startsAt = jst(v.date, v.startTime);
		if (v.endTime) {
			if (!/^\d{2}:\d{2}$/.test(v.endTime))
				return { ok: false, error: '終了時刻が正しくありません' };
			endsAt = jst(v.date, v.endTime);
			// 深夜営業: 終了が開始以前なら翌日
			if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + DAY_MS);
		} else {
			endsAt = null;
		}
	}
	for (const [label, value] of [
		['オンライン URL', v.onlineUrl],
		['告知 URL', v.url]
	] as const) {
		if (value && !/^https?:\/\/\S+$/.test(value))
			return { ok: false, error: `${label} は http(s):// から始めてください` };
	}
	const spaceHandle = v.space.replace(/^@/, '').toLowerCase() || null;
	if (spaceHandle && !HANDLE_PATTERN.test(spaceHandle))
		return { ok: false, error: 'ハコの ID は @ に続く小文字の英数字と _' };
	const capacity = v.capacity ? Number(v.capacity) : null;
	if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000))
		return { ok: false, error: '定員は 1 以上の整数で' };
	if (v.description.length > 10000) return { ok: false, error: '説明が長すぎます' };

	const tags = [
		...new Set(
			v.tags
				.split(/[,、\s]+/)
				.map((t) => t.replace(/^#/, '').trim())
				.filter(Boolean)
		)
	].slice(0, 10);

	return {
		ok: true,
		event: {
			title: v.title,
			startsAt,
			endsAt,
			allDay: v.allDay,
			spaceHandle,
			locationName: nullable(v.locationName),
			locationAddress: nullable(v.locationAddress),
			locationVisibility: v.locationVisibility,
			onlineUrl: nullable(v.onlineUrl),
			description: nullable(v.description),
			tags,
			capacity,
			feeText: nullable(v.feeText),
			url: nullable(v.url),
			visibility: v.visibility,
			status: v.status
		}
	};
}

// handle と表示名（はじめての登録）
export function parseWelcomeForm(
	handle: string,
	name: string
): { ok: true; handle: string; name: string } | { ok: false; error: string } {
	const h = handle.trim().toLowerCase();
	const n = name.trim();
	if (!isValidHandle(h))
		return { ok: false, error: 'ID は小文字の英数字と _ で 3〜20 文字。予約語は使えません' };
	if (!n || n.length > 50) return { ok: false, error: '表示名は 1〜50 文字' };
	return { ok: true, handle: h, name: n };
}
