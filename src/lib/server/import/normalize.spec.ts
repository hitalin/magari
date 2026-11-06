import { describe, expect, it } from 'vitest';
import type { IcsEvent } from './ics';
import { expandOccurrences, parseEdenTitle, storeHoursFor, unwrapUrl } from './normalize';

const base: IcsEvent = {
	uid: 'u',
	summary: 's',
	description: null,
	location: null,
	start: new Date('2026-03-25T10:00:00Z'), // JST 水 19:00
	end: new Date('2026-03-25T12:00:00Z'),
	allDay: false,
	rrule: null,
	exdates: [],
	recurrenceId: null,
	cancelled: false
};

describe('parseEdenTitle', () => {
	it('先頭の「13-17」を時刻にして題から外す', () => {
		const r = parseEdenTitle(
			'13-17 司法試験勉強カフェ(ともしび@x)',
			new Date('2026-11-20T15:00:00Z')
		);
		expect(r.title).toBe('司法試験勉強カフェ(ともしび@x)');
		expect(r.start?.toISOString()).toBe('2026-11-21T04:00:00.000Z');
		expect(r.end?.toISOString()).toBe('2026-11-21T08:00:00.000Z');
	});
	it('「19:30〜24」や「20時-2時」も読み、終了が開始より前なら翌日', () => {
		const r = parseEdenTitle('20時-2時 深夜バー', new Date('2026-11-20T15:00:00Z'));
		expect(r.start?.toISOString()).toBe('2026-11-21T11:00:00.000Z');
		expect(r.end?.toISOString()).toBe('2026-11-21T17:00:00.000Z');
		expect(
			parseEdenTitle('19:30〜24 夜バー', new Date('2026-11-20T15:00:00Z')).end?.toISOString()
		).toBe('2026-11-21T15:00:00.000Z');
	});
	it('「17:30~」は開始だけ、「11-16時」が末尾にあっても読む', () => {
		const day = new Date('2026-11-20T15:00:00Z');
		const open = parseEdenTitle('17:30~ 下世話バー(トミー)', day);
		expect(open.title).toBe('下世話バー(トミー)');
		expect(open.start?.toISOString()).toBe('2026-11-21T08:30:00.000Z');
		expect(open.end).toBeNull();
		const suffix = parseEdenTitle('昼　claude code触るカフェ　ささみ　11-16時', day);
		expect(suffix.title).toBe('昼　claude code触るカフェ　ささみ');
		expect(suffix.start?.toISOString()).toBe('2026-11-21T02:00:00.000Z');
		expect(suffix.end?.toISOString()).toBe('2026-11-21T07:00:00.000Z');
		expect(parseEdenTitle('第88回 オフ会', day).start).toBeNull();
	});
	it('「21時半」は 21:30 として読み、「半」を題に残さない', () => {
		const day = new Date('2026-11-16T15:00:00Z');
		const r = parseEdenTitle('19-21時半 人生のレールから外れちゃったよバー｜よっこい', day);
		expect(r.title).toBe('人生のレールから外れちゃったよバー｜よっこい');
		expect(r.start?.toISOString()).toBe('2026-11-17T10:00:00.000Z');
		expect(r.end?.toISOString()).toBe('2026-11-17T12:30:00.000Z');
		const open = parseEdenTitle('18時半〜 友達マッチングBAR', day);
		expect(open.title).toBe('友達マッチングBAR');
		expect(open.start?.toISOString()).toBe('2026-11-17T09:30:00.000Z');
	});
	it('頭の「昼」に続く時刻も読む', () => {
		const day = new Date('2026-11-20T15:00:00Z');
		const r = parseEdenTitle('昼14-18時　横浜ワークスペース（ゆうこ）', day);
		expect(r.title).toBe('横浜ワークスペース（ゆうこ）');
		expect(r.start?.toISOString()).toBe('2026-11-21T05:00:00.000Z');
		expect(r.end?.toISOString()).toBe('2026-11-21T09:00:00.000Z');
		expect(parseEdenTitle('昼14時~19時　討論バー', day).end?.toISOString()).toBe(
			'2026-11-21T10:00:00.000Z'
		);
	});

	it('時刻が無ければそのまま', () => {
		const r = parseEdenTitle('⚠️夜空いてます', new Date('2026-11-20T15:00:00Z'));
		expect(r.title).toBe('⚠️夜空いてます');
		expect(r.start).toBeNull();
	});
});

describe('storeHoursFor', () => {
	const day = new Date('2026-11-20T15:00:00Z'); // JST 11/21 0:00
	const namba = { hours: ['17:30', '23:00'], dayHours: ['13:00', '17:00'] } as const;

	it('時刻の無い会を店の営業時間に置く', () => {
		const r = storeHoursFor('初見歓迎バー｜ほうた店長', day, namba);
		expect(r?.start.toISOString()).toBe('2026-11-21T08:30:00.000Z');
		expect(r?.end.toISOString()).toBe('2026-11-21T14:00:00.000Z');
	});
	it('「昼」の会は昼の営業時間に置き、昼の営業時間が無い店では置かない', () => {
		const r = storeHoursFor('昼:唐揚げバー　byあずき', day, namba);
		expect(r?.start.toISOString()).toBe('2026-11-21T04:00:00.000Z');
		expect(r?.end.toISOString()).toBe('2026-11-21T08:00:00.000Z');
		expect(
			storeHoursFor('(昼)羊毛フェルト触りたいバー', day, { hours: ['17:00', '23:00'] })
		).toBeNull();
	});
	it('閉店が開店以前なら翌日', () => {
		const r = storeHoursFor('深夜バー', day, { hours: ['20:00', '02:00'] });
		expect(r?.end.toISOString()).toBe('2026-11-21T17:00:00.000Z');
	});
});

describe('unwrapUrl', () => {
	it('<a href> と Google のリダイレクトを剥がす', () => {
		expect(unwrapUrl('<a href="https://www.kokuchpro.com/event/abc/">イベント概要</a>')).toBe(
			'https://www.kokuchpro.com/event/abc/'
		);
		expect(
			unwrapUrl(
				'<a href="https://www.google.com/url?q=https://www.tekutekukai.org/&amp;sa=D&amp;source=calendar">x</a>'
			)
		).toBe('https://www.tekutekukai.org/');
		expect(unwrapUrl('ただの文')).toBeNull();
	});
});

describe('expandOccurrences', () => {
	const from = new Date('2026-04-01T00:00:00Z');
	const to = new Date('2026-07-01T00:00:00Z');

	it('単発は範囲内なら 1 件、外なら 0 件', () => {
		expect(
			expandOccurrences({ ...base, start: new Date('2026-05-01T10:00:00Z') }, from, to)
		).toHaveLength(1);
		expect(expandOccurrences(base, from, to)).toHaveLength(0);
	});

	it('毎月第4水曜を JST の曜日で展開し、EXDATE を除き、所要時間を保つ', () => {
		const occ = expandOccurrences(
			{
				...base,
				rrule: 'FREQ=MONTHLY;WKST=SU;INTERVAL=1;BYDAY=4WE',
				exdates: [new Date('2026-04-22T10:00:00Z')]
			},
			from,
			to
		);
		expect(occ.map((o) => o.start.toISOString())).toEqual([
			'2026-05-27T10:00:00.000Z',
			'2026-06-24T10:00:00.000Z'
		]);
		expect(occ[0].end?.toISOString()).toBe('2026-05-27T12:00:00.000Z');
		expect(occ[0].occurrenceKey).toBe('2026-05-27T10:00:00.000Z');
	});

	it('UNTIL（UTC）を越えない', () => {
		const occ = expandOccurrences(
			{ ...base, rrule: 'FREQ=WEEKLY;WKST=SU;UNTIL=20260415T145959Z;BYDAY=WE' },
			from,
			to
		);
		expect(occ.map((o) => o.start.toISOString())).toEqual([
			'2026-04-01T10:00:00.000Z',
			'2026-04-08T10:00:00.000Z',
			'2026-04-15T10:00:00.000Z'
		]);
	});
});
