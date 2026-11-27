import { describe, expect, it } from "vitest";
import {
	type EventFormValues,
	type ParsedEvent,
	parseEventForm,
	readEventForm,
} from "../event-form";
import { toFormValues } from "./event-values";

// 編集は「会 → フォームの値 → 送信 → 保存する値」と 1 往復して、全体を上書きする。
// 途中で 1 項目でも落ちると、開いて保存しただけでその項目が消える。
// ParsedEvent に項目を足すと、下の見本が型で落ちる（往復に載せるまで通らない）。

// ブラウザが送る形にする（チェックの無いチェックボックスは送られない）
function submit(values: EventFormValues): (name: string) => string | null {
	const sent = new Map<string, string>();
	for (const [k, v] of Object.entries(values)) {
		if (typeof v === "boolean") {
			if (v) sent.set(k, "on");
		} else sent.set(k, v);
	}
	return (name) => sent.get(name) ?? null;
}

function roundTrip(event: ParsedEvent) {
	const parsed = parseEventForm(readEventForm(submit(toFormValues(event))));
	if (!parsed.ok) throw new Error(parsed.error);
	return parsed.event;
}

// 空の値は往復しても空で通ってしまうので、全部埋める
const full: ParsedEvent = {
	title: "なんもしない会",
	startsAt: new Date("2026-11-08T19:30:00+09:00"),
	endsAt: new Date("2026-11-08T22:15:00+09:00"),
	allDay: false,
	spaceHandle: "hako_1",
	room: "カウンター",
	locationName: "二階の奥",
	locationAddress: "東京都どこか 1-2-3",
	locationVisibility: "attendees",
	onlineUrl: "https://example.com/room",
	description: "一行目\n二行目",
	feeText: "ワンドリンク",
	url: "https://example.com/post/1",
	visibility: "unlisted",
	postedBySpace: false,
	status: "draft",
};

describe("編集の往復", () => {
	it("全項目を埋めた会は、開いて保存しても何も変わらない", () => {
		expect(roundTrip(full)).toEqual(full);
	});

	it("終了の無い会は、終了の無いまま", () => {
		const event = { ...full, endsAt: null };
		expect(roundTrip(event)).toEqual(event);
	});

	it("日をまたぐ会（深夜営業）は、終了が翌日のまま", () => {
		const event = {
			...full,
			startsAt: new Date("2026-11-08T22:00:00+09:00"),
			endsAt: new Date("2026-11-09T02:00:00+09:00"),
		};
		expect(roundTrip(event)).toEqual(event);
	});

	it("ハコが載せたほかの人の会は、ハコのページだけのまま", () => {
		const event: ParsedEvent = {
			...full,
			locationName: null,
			locationAddress: null,
			locationVisibility: "public",
			onlineUrl: null,
			description: null,
			feeText: null,
			visibility: "space",
			postedBySpace: true,
		};
		expect(roundTrip(event)).toEqual(event);
	});

	it("終日の会は、終日のまま", () => {
		const event = {
			...full,
			allDay: true,
			startsAt: new Date("2026-11-08T00:00:00+09:00"),
			endsAt: new Date("2026-11-09T00:00:00+09:00"),
		};
		expect(roundTrip(event)).toEqual(event);
	});
});
