import type { EventFormValues } from "#lib/event-form.ts";

const pad2 = (n: number) => String(n).padStart(2, "0");
function jstParts(d: Date) {
	const t = new Date(d.getTime() + 9 * 3_600_000);
	return {
		date: `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`,
		time: `${pad2(t.getUTCHours())}:${pad2(t.getUTCMinutes())}`,
	};
}

// 既存の会からフォーム値を作る（複製・編集）
export function toFormValues(e: {
	title: string;
	startsAt: Date;
	endsAt: Date | null;
	allDay: boolean;
	spaceHandle?: string | null;
	locationName: string | null;
	locationAddress: string | null;
	locationVisibility: "public" | "attendees";
	onlineUrl: string | null;
	description: string | null;
	tags: string[];
	capacity: number | null;
	feeText: string | null;
	url: string | null;
	visibility: EventFormValues["visibility"];
	status: string;
}): EventFormValues {
	const s = jstParts(e.startsAt);
	return {
		title: e.title,
		date: s.date,
		allDay: e.allDay,
		startTime: e.allDay ? "19:00" : s.time,
		endTime: e.allDay || !e.endsAt ? "" : jstParts(e.endsAt).time,
		space: e.spaceHandle ?? "",
		locationName: e.locationName ?? "",
		locationAddress: e.locationAddress ?? "",
		locationVisibility: e.locationVisibility,
		onlineUrl: e.onlineUrl ?? "",
		description: e.description ?? "",
		tags: e.tags.join(", "),
		capacity: e.capacity ? String(e.capacity) : "",
		feeText: e.feeText ?? "",
		url: e.url ?? "",
		visibility: e.visibility,
		status: e.status === "draft" ? "draft" : "published",
	};
}
