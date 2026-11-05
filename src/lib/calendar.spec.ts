import { describe, expect, it } from 'vitest';
import { gridRange, monthGrid, parseMonth, shiftMonth } from './calendar';

describe('monthGrid', () => {
	it('日曜始まりで、前後の月の日も埋めて週ごとに返す', () => {
		// 2026-11-01 は日曜、30 日まで → 5 週
		const g = monthGrid(2026, 11);
		expect(g).toHaveLength(5);
		expect(g[0][0]).toBe('2026-11-01');
		expect(g[4][6]).toBe('2026-12-05');
		expect(g.every((w) => w.length === 7)).toBe(true);
	});

	it('月初が火曜なら前月の日曜から始まる', () => {
		const g = monthGrid(2026, 12);
		expect(g[0]).toEqual([
			'2026-11-29',
			'2026-11-30',
			'2026-12-01',
			'2026-12-02',
			'2026-12-03',
			'2026-12-04',
			'2026-12-05'
		]);
		expect(g.at(-1)?.at(-1)).toBe('2027-01-02');
	});
});

describe('shiftMonth', () => {
	it('年をまたいで前後する', () => {
		expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
		expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
	});
});

describe('parseMonth', () => {
	it('YYYY-MM を読む。不正なら null', () => {
		expect(parseMonth('2026-11')).toEqual({ year: 2026, month: 11 });
		expect(parseMonth('2026-13')).toBeNull();
		expect(parseMonth('abc')).toBeNull();
	});
});

describe('gridRange', () => {
	it('グリッド先頭の JST 0 時から、末尾の翌日 JST 0 時まで', () => {
		const { from, to } = gridRange(2026, 12);
		expect(from.toISOString()).toBe('2026-11-28T15:00:00.000Z');
		expect(to.toISOString()).toBe('2027-01-02T15:00:00.000Z');
	});
});
