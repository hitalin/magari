import { describe, expect, it } from "vitest";
import {
	EMPTY_EVENT_FORM,
	isSameSubmission,
	parseEventForm,
	parseWelcomeForm,
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
	it("公開範囲は公開か URL 限定だけ（「自分だけ」は下書きで足りる）", () => {
		const read = (visibility: string) =>
			readEventForm((k) => (k === "visibility" ? visibility : null)).visibility;
		expect(read("unlisted")).toBe("unlisted");
		expect(read("private")).toBe("public");
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
