const TZ = "Asia/Tokyo";
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const EN_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const fmt = new Intl.DateTimeFormat("en-US", {
	timeZone: TZ,
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
	hourCycle: "h23",
	weekday: "short",
});

function jst(input: Date | string) {
	const d = typeof input === "string" ? new Date(input) : input;
	const p: Record<string, string> = {};
	for (const part of fmt.formatToParts(d)) p[part.type] = part.value;
	return {
		year: Number(p.year),
		month: Number(p.month),
		day: Number(p.day),
		hour: p.hour,
		minute: p.minute,
		weekday: EN_WEEKDAYS.indexOf(p.weekday),
	};
}

const pad2 = (n: number) => String(n).padStart(2, "0");

export function dayKey(input: Date | string): string {
	const { year, month, day } = jst(input);
	return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function formatDay(input: Date | string): string {
	const { month, day, weekday } = jst(input);
	return `${month}月${day}日(${WEEKDAYS[weekday]})`;
}

export function formatTime(input: Date | string): string {
	const { hour, minute } = jst(input);
	return `${hour}:${minute}`;
}

export function formatTimeRange(
	start: Date | string,
	end: Date | string | null | undefined,
): string {
	return end ? `${formatTime(start)}〜${formatTime(end)}` : formatTime(start);
}

// 「11月8日(日) 19:00〜22:00」「11月6日(金) 終日」。共有文やページ見出しで使う。
export function formatWhen(e: {
	startsAt: Date | string;
	endsAt: Date | string | null;
	allDay: boolean;
}): string {
	if (e.allDay) return `${formatDay(e.startsAt)} 終日`;
	const sameTime =
		e.endsAt && new Date(e.endsAt).getTime() === new Date(e.startsAt).getTime();
	return `${formatDay(e.startsAt)} ${formatTimeRange(e.startsAt, sameTime ? null : e.endsAt)}`;
}
