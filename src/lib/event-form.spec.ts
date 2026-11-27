import { describe, expect, it } from "vitest";
import {
	EMPTY_EVENT_FORM,
	isSameSubmission,
	parseEventForm,
	parseWelcomeForm,
	pickRoom,
	readEventForm,
	statusAfterEdit,
} from "./event-form";

const base = { ...EMPTY_EVENT_FORM, title: "テスト会", date: "2026-11-08" };

describe("parseEventForm", () => {
	it("JST の日付と時刻を UTC にする", () => {
		const r = parseEventForm({ ...base, startTime: "19:00", endTime: "22:00" });
		expect(r.ok && r.event.startsAt.toISOString()).toBe(
			"2026-11-08T10:00:00.000Z",
		);
		expect(r.ok && r.event.endsAt?.toISOString()).toBe(
			"2026-11-08T13:00:00.000Z",
		);
	});
	it("終了が開始以前なら翌日（深夜営業）", () => {
		const r = parseEventForm({ ...base, startTime: "20:00", endTime: "02:00" });
		expect(r.ok && r.event.endsAt?.toISOString()).toBe(
			"2026-11-08T17:00:00.000Z",
		);
	});
	it("終日は JST 0 時から翌 0 時", () => {
		const r = parseEventForm({ ...base, allDay: true });
		expect(r.ok && r.event.allDay).toBe(true);
		expect(r.ok && r.event.startsAt.toISOString()).toBe(
			"2026-11-07T15:00:00.000Z",
		);
		expect(r.ok && r.event.endsAt?.toISOString()).toBe(
			"2026-11-08T15:00:00.000Z",
		);
	});
	it("ハコは @ を外して小文字にし、形が変ならエラー", () => {
		const r = parseEventForm({ ...base, space: "@Curry_Shop" });
		expect(r.ok && r.event.spaceHandle).toBe("curry_shop");
		expect(parseEventForm({ ...base, space: "" }).ok && null).toBeNull();
		expect(parseEventForm({ ...base, space: "a b" }).ok).toBe(false);
	});
	it("題が無い・日付が変・URL が変ならエラー", () => {
		expect(parseEventForm({ ...base, title: "" }).ok).toBe(false);
		expect(parseEventForm({ ...base, date: "2026-13-01" }).ok).toBe(false);
		expect(parseEventForm({ ...base, url: "example.com" }).ok).toBe(false);
	});
});

describe("区画", () => {
	it("区画は前後の空白を落として持ち、空なら null", () => {
		const r = parseEventForm({ ...base, space: "hako", room: "2階" });
		expect(r.ok && r.event.room).toBe("2階");
		const none = parseEventForm(base);
		expect(none.ok && none.event.room).toBeNull();
	});
	it("ハコを書かずに区画だけ書くとエラー", () => {
		expect(parseEventForm({ ...base, room: "2階" }).ok).toBe(false);
	});
	it("ハコの間取りにある区画はそのまま通す。区画を書かなければ null", () => {
		const space = { handle: "hako", rooms: ["カウンター", "2階"] };
		expect(pickRoom(space, "2階")).toEqual({ room: "2階" });
		expect(pickRoom(space, null)).toEqual({ room: null });
	});
	it("間取りに無い区画は、選べる区画を添えて断る", () => {
		expect(
			pickRoom({ handle: "hako", rooms: ["カウンター", "2階"] }, "屋上"),
		).toEqual({
			error: "@hako の区画は「カウンター」「2階」です",
		});
	});
	it("ハコが間取りを直したあとも、この間が前から持っている区画はそのまま通す", () => {
		const space = { handle: "hako", rooms: ["カウンター", "二階"] };
		expect(pickRoom(space, "2階", "2階")).toEqual({ room: "2階" });
		expect(pickRoom({ handle: "hako", rooms: [] }, "2階", "2階")).toEqual({
			room: "2階",
		});
		// 持っていたのと違う区画に書き換えるなら、いまの間取りと照らす
		expect("error" in pickRoom(space, "屋上", "2階")).toBe(true);
	});
	it("間取りを分けていないハコに区画を書くと断る", () => {
		expect(pickRoom({ handle: "hako", rooms: [] }, "屋上")).toEqual({
			error: "@hako は間取りを分けていません。区画は空欄にしてください",
		});
	});
});

describe("readEventForm", () => {
	it("FormData 相当から値を読み、不正な選択肢は既定値に落とす", () => {
		const data: Record<string, string> = {
			title: " a ",
			date: "2026-11-08",
			allDay: "on",
			visibility: "secret",
			status: "draft",
		};
		const v = readEventForm((k) => data[k] ?? null);
		expect(v.title).toBe("a");
		expect(v.allDay).toBe(true);
		expect(v.visibility).toBe("public");
		expect(v.status).toBe("draft");
	});
	it("公開範囲は公開・ページだけ・URL 限定（「自分だけ」は下書きで足りる）", () => {
		const read = (visibility: string) =>
			readEventForm((k) => (k === "visibility" ? visibility : null)).visibility;
		expect(read("home")).toBe("home");
		expect(read("unlisted")).toBe("unlisted");
		expect(read("space")).toBe("public");
		expect(read("private")).toBe("public");
	});
	it("「ほかの人の会として載せる」は印があるときだけ", () => {
		const read = (data: Record<string, string>) =>
			readEventForm((k) => data[k] ?? null).postedBySpace;
		expect(read({ postedBySpace: "on" })).toBe(true);
		expect(read({})).toBe(false);
	});
});

describe("ページだけ", () => {
	it("ハコが無くても選べる（主催のページに出る）", () => {
		const r = parseEventForm({ ...base, visibility: "home" });
		expect(r.ok && r.event.visibility).toBe("home");
	});
});

describe("ほかの人の会（ハコが載せる）", () => {
	const others = {
		...base,
		space: "curry_shop",
		url: "https://x.com/someone/status/1",
		postedBySpace: true,
	};
	it("ハコと元の告知の URL が要る（もう公開されている会だけ載せる）", () => {
		expect(parseEventForm({ ...others, space: "" }).ok).toBe(false);
		expect(parseEventForm({ ...others, url: "" }).ok).toBe(false);
		const r = parseEventForm(others);
		expect(r.ok && r.event.postedBySpace).toBe(true);
	});
	it("題・日時・区画・元の告知へのリンクのほかは載せない", () => {
		const r = parseEventForm({
			...others,
			room: "カウンター",
			locationName: "店の 2 階",
			locationAddress: "東京都…",
			locationVisibility: "attendees",
			onlineUrl: "https://zoom.us/j/1",
			description: "説明",
			feeText: "500円",
		});
		expect(r.ok && r.event).toMatchObject({
			title: "テスト会",
			spaceHandle: "curry_shop",
			room: "カウンター",
			url: "https://x.com/someone/status/1",
			locationName: null,
			locationAddress: null,
			locationVisibility: "public",
			onlineUrl: null,
			description: null,
			feeText: null,
		});
	});
	it("本人の会は、ほかの人の会にならない", () => {
		const r = parseEventForm(base);
		expect(r.ok && r.event.postedBySpace).toBe(false);
	});
});

describe("isSameSubmission", () => {
	const parsed = parseEventForm({ ...base, startTime: "19:00" });
	if (!parsed.ok) throw new Error("前提の解析に失敗");
	const saved = {
		title: "テスト会",
		startsAt: new Date("2026-11-08T10:00:00.000Z"),
		status: "published" as const,
	};
	it("題・開始・状態が同じなら、同じ送信の二度押し", () => {
		expect(isSameSubmission(saved, parsed.event)).toBe(true);
	});
	it("どれかが違えば別の内容（戻って書き換えた送信を黙って捨てない）", () => {
		expect(isSameSubmission({ ...saved, title: "別の会" }, parsed.event)).toBe(
			false,
		);
		expect(isSameSubmission({ ...saved, status: "draft" }, parsed.event)).toBe(
			false,
		);
		expect(
			isSameSubmission(
				{ ...saved, startsAt: new Date("2026-11-08T11:00:00.000Z") },
				parsed.event,
			),
		).toBe(false);
	});
});

describe("statusAfterEdit", () => {
	it("中止した間は、編集して保存しても中止のまま", () => {
		expect(statusAfterEdit("cancelled", "published")).toBe("cancelled");
		expect(statusAfterEdit("cancelled", "draft")).toBe("cancelled");
	});
	it("中止していなければ、押したボタンの状態になる", () => {
		expect(statusAfterEdit("draft", "published")).toBe("published");
		expect(statusAfterEdit("published", "draft")).toBe("draft");
	});
});

describe("parseWelcomeForm", () => {
	it("handle を小文字にし、予約語や長すぎる名前を弾く", () => {
		expect(parseWelcomeForm("Taka_01", " taka ")).toEqual({
			ok: true,
			handle: "taka_01",
			name: "taka",
		});
		expect(parseWelcomeForm("me", "x").ok).toBe(false);
		expect(parseWelcomeForm("abc", "").ok).toBe(false);
	});
});
