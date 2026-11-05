import { dayKey } from './date';

const pad2 = (n: number) => String(n).padStart(2, '0');
const key = (y: number, m: number, d: number) => `${y}-${pad2(m)}-${pad2(d)}`;

// JST の暦日を UTC の Date として扱う（日付計算は UTC メソッドで行い、タイムゾーンの影響を受けない）
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

export function parseMonth(ym: string): { year: number; month: number } | null {
	const m = /^(\d{4})-(\d{2})$/.exec(ym);
	if (!m) return null;
	const year = Number(m[1]);
	const month = Number(m[2]);
	return month >= 1 && month <= 12 ? { year, month } : null;
}

export function currentMonth(now = new Date()): { year: number; month: number } {
	const [y, m] = dayKey(now).split('-').map(Number);
	return { year: y, month: m };
}

export function shiftMonth(
	year: number,
	month: number,
	delta: number
): { year: number; month: number } {
	const d = utc(year, month + delta, 1);
	return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

export const monthKey = (year: number, month: number) => `${year}-${pad2(month)}`;

// 日曜始まり。前後の月の日で 7 の倍数に揃える。
export function monthGrid(year: number, month: number): string[][] {
	const first = utc(year, month, 1);
	const start = utc(year, month, 1 - first.getUTCDay());
	const daysInMonth = utc(year, month + 1, 0).getUTCDate();
	const last = utc(year, month, daysInMonth);
	const end = utc(year, month, daysInMonth + (6 - last.getUTCDay()));

	const weeks: string[][] = [];
	for (let t = start.getTime(); t <= end.getTime(); ) {
		const week: string[] = [];
		for (let i = 0; i < 7; i++, t += 86_400_000) {
			const d = new Date(t);
			week.push(key(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()));
		}
		weeks.push(week);
	}
	return weeks;
}

// グリッドが覆う範囲を JST 0 時基準の瞬間で返す（from 以上 to 未満）
export function gridRange(year: number, month: number): { from: Date; to: Date } {
	const grid = monthGrid(year, month);
	const jstMidnight = (k: string) => new Date(`${k}T00:00:00+09:00`);
	const lastKey = grid.at(-1)?.at(-1) as string;
	const to = new Date(jstMidnight(lastKey).getTime() + 86_400_000);
	return { from: jstMidnight(grid[0][0]), to };
}
