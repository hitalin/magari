// 繰り返しの間（毎週・隔週・毎月 第N曜日）。決まりは iCal の RRULE の形で持つ（event_series.rrule）。
// 回の日付の計算は rrule を使うのでサーバー側（src/lib/server/series.ts）。ここは画面からも使う純粋関数だけ。

export const REPEATS = ["weekly", "biweekly", "monthly"] as const;
export type Repeat = (typeof REPEATS)[number];

const DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const JA_DAYS = ["日", "月", "火", "水", "木", "金", "土"];
const JST = 9 * 3_600_000;

export function parseRepeat(value: string | null | undefined): Repeat | null {
	return (REPEATS as readonly string[]).includes(value ?? "")
		? (value as Repeat)
		: null;
}

// 最初の回の日から、決まりを作る
export function repeatRule(kind: Repeat, startsAt: Date): string {
	if (kind === "weekly") return "FREQ=WEEKLY";
	if (kind === "biweekly") return "FREQ=WEEKLY;INTERVAL=2";
	const t = new Date(startsAt.getTime() + JST);
	const nth = Math.ceil(t.getUTCDate() / 7);
	// 第5は無い月があるので「最終」にする
	return `FREQ=MONTHLY;BYDAY=${nth === 5 ? -1 : nth}${DAYS[t.getUTCDay()]}`;
}

// 画面に出す言い方。曜日はその回の日から読む
export function ruleLabel(rrule: string, startsAt: Date): string {
	const day = `${JA_DAYS[new Date(startsAt.getTime() + JST).getUTCDay()]}曜`;
	if (rrule === "FREQ=WEEKLY") return `毎週${day}`;
	if (rrule === "FREQ=WEEKLY;INTERVAL=2") return `隔週${day}`;
	const nth = /^FREQ=MONTHLY;BYDAY=(-1|[1-4])[A-Z]{2}$/.exec(rrule)?.[1];
	if (nth) return `毎月 ${nth === "-1" ? "最終" : `第${nth}`}${day}`;
	return "繰り返し";
}

const dayStart = (d: Date) =>
	Math.floor((d.getTime() + JST) / 86_400_000) * 86_400_000 - JST;

// 直した開始・終了を、時刻と長さを保ったまま、別の回（day）の日へ移す
export function moveToDay(
	day: Date,
	startsAt: Date,
	endsAt: Date | null,
): { startsAt: Date; endsAt: Date | null } {
	const delta = dayStart(day) - dayStart(startsAt);
	return {
		startsAt: new Date(startsAt.getTime() + delta),
		endsAt: endsAt && new Date(endsAt.getTime() + delta),
	};
}

// 繰り返しの終わりの日（YYYY-MM-DD、JST）。その日の回までを含むよう、次の日の JST 0 時を返す。空なら終わりを決めない
export function parseUntil(
	value: string | null | undefined,
	startsAt: Date,
): { ok: true; until: Date | null } | { ok: false; error: string } {
	const v = (value ?? "").trim();
	if (!v) return { ok: true, until: null };
	const day = /^\d{4}-\d{2}-\d{2}$/.test(v)
		? new Date(`${v}T00:00:00+09:00`)
		: new Date(Number.NaN);
	if (Number.isNaN(day.getTime()))
		return { ok: false, error: "繰り返しの終わりの日が正しくありません" };
	const until = new Date(day.getTime() + 86_400_000);
	if (until <= startsAt)
		return {
			ok: false,
			error:
				"繰り返しの終わりは、この回と同じ日か、それより後の日にしてください",
		};
	return { ok: true, until };
}

// 欄に出す日付（YYYY-MM-DD）へ戻す
export function untilDay(until: Date | null | undefined): string {
	return until
		? new Date(until.getTime() - 1 + JST).toISOString().slice(0, 10)
		: "";
}
