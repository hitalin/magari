import { describe, expect, it } from "vitest";
import {
	eventPlace,
	eventShareText,
	mentionHandles,
	misskeyShareText,
	misskeyShareUrl,
	xShareUrl,
} from "./share";

const base = {
	title: "こーじろーさん",
	startsAt: "2026-11-09T08:00:00.000Z",
	endsAt: "2026-11-09T14:00:00.000Z",
	allDay: false,
	space: null,
	locationName: null,
	onlineUrl: null,
};
const space = {
	handle: "eden_kanda",
	name: "イベントバーエデン神田",
	kind: "space" as const,
};

describe("eventPlace", () => {
	it("ハコ > 場所の名前 > オンライン の順", () => {
		expect(eventPlace({ ...base, space, locationName: "神田" })).toBe(
			"イベントバーエデン神田",
		);
		expect(eventPlace({ ...base, locationName: "代々木公園" })).toBe(
			"代々木公園",
		);
		expect(eventPlace({ ...base, onlineUrl: "https://zoom.us/x" })).toBe(
			"オンライン",
		);
		expect(eventPlace(base)).toBeNull();
	});
});

describe("eventShareText", () => {
	it("題・日時・場所を行に分ける", () => {
		expect(eventShareText({ ...base, space })).toBe(
			"こーじろーさん\n11月9日(月) 17:00〜23:00\n📍イベントバーエデン神田",
		);
	});
	it("場所が無ければ 2 行", () => {
		expect(eventShareText(base)).toBe(
			"こーじろーさん\n11月9日(月) 17:00〜23:00",
		);
	});
});

describe("xShareUrl", () => {
	it("空白は + ではなく %20、改行は %0A で符号化する", () => {
		const url = xShareUrl("a b\nc", "https://magari.cc/e/x");
		expect(url).toBe(
			"https://x.com/intent/post?text=a%20b%0Ac&url=https%3A%2F%2Fmagari.cc%2Fe%2Fx",
		);
	});
});

describe("misskeyShareUrl", () => {
	it("Misskey Hub の共有ページへ、X と同じ符号化で渡す", () => {
		const url = misskeyShareUrl("a b\nc", "https://magari.cc/e/x");
		expect(url).toBe(
			"https://misskey-hub.net/share/?text=a%20b%0Ac&url=https%3A%2F%2Fmagari.cc%2Fe%2Fx",
		);
	});
});

describe("mentionHandles", () => {
	it("ホストの無い @name を小文字で、重複なく拾う", () => {
		expect(
			mentionHandles("営業(かほ@03skybar28 ) @Eden_Kanda @eden_kanda"),
		).toEqual(["03skybar28", "eden_kanda"]);
	});
	it("@name@host とメールアドレスは拾わない", () => {
		expect(mentionHandles("@taka@yami.ski a@example.com @ab")).toEqual([]);
	});
});

describe("misskeyShareText", () => {
	const mentions = [
		{ handle: "taka", x: "taka_x", fediverse: "@taka@yami.ski" },
		{ handle: "eden_kanda", x: "eden_kanda", fediverse: null },
		{ handle: "nosns", x: null, fediverse: null },
	];
	it("Fediverse にいる人は、そのサーバーへのメンションにする", () => {
		expect(misskeyShareText("ゲスト @Taka", mentions)).toBe(
			"ゲスト @taka@yami.ski",
		);
	});
	it("X だけの人は X へのリンクにする（@ の後ろはゼロ幅スペース）", () => {
		expect(misskeyShareText("@eden_kanda にて", mentions)).toBe(
			"[@\u200Beden_kanda](https://x.com/eden_kanda) にて",
		);
	});
	it("まがりにいない、または SNS の分からない @name はメンションにしない", () => {
		expect(misskeyShareText("かほ@03skybar28 と @nosns", mentions)).toBe(
			"かほ@\u200B03skybar28 と @\u200Bnosns",
		);
	});
	it("@name@host はそのまま", () => {
		expect(misskeyShareText("@taka@misskey.io", mentions)).toBe(
			"@taka@misskey.io",
		);
	});
});
