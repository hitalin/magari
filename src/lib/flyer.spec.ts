import { describe, expect, it } from "vitest";
import {
	FLYER_VARIANTS,
	flyerDate,
	flyerStyle,
	flyerTitleChunks,
	flyerTitleSize,
} from "./flyer";

describe("flyerStyle", () => {
	it("同じ会はいつも同じ見た目になる", () => {
		expect(flyerStyle("ytk7da2hnt")).toEqual(flyerStyle("ytk7da2hnt"));
	});
	it("会によって型が散らばり、傾きは ±2.5 度に収まる", () => {
		const styles = Array.from({ length: 300 }, (_, i) => flyerStyle(`ev${i}x`));
		expect(new Set(styles.map((s) => s.variant)).size).toBe(
			FLYER_VARIANTS.length,
		);
		for (const s of styles) {
			expect(Math.abs(s.tilt)).toBeLessThanOrEqual(2.5);
		}
	});
});

describe("flyerStyle の色", () => {
	it("紙・墨・差し色の 3 色が決まり、互いに違う", () => {
		for (let i = 0; i < 60; i++) {
			const { paper, ink, spot } = flyerStyle(`ev${i}x`);
			for (const c of [paper, ink, spot]) expect(c).toMatch(/^#[0-9a-f]{6}$/);
			expect(new Set([paper, ink, spot]).size).toBe(3);
		}
	});
});

describe("flyerStyle の型ごとの色", () => {
	const styles = Array.from({ length: 300 }, (_, i) => flyerStyle(`ev${i}x`));
	it("札・ちぎり札・リソは強い紙（黄・赤・黒）を使わない", () => {
		for (const s of styles) {
			if (!["fuda", "tearoff", "riso"].includes(s.variant)) continue;
			expect(["#f2c62e", "#d93a2b", "#1f1d1a"]).not.toContain(s.paper);
		}
	});
	it("日めくりは白い紙に墨、おたよりは藁色の紙に墨以外のインク", () => {
		for (const s of styles) {
			if (s.variant === "himekuri") {
				expect([s.paper, s.ink]).toEqual(["#f5f2ea", "#1f1d1a"]);
			}
			if (s.variant === "gariban") {
				expect(s.paper).toBe("#e9e1c6");
				expect(s.ink).not.toBe("#1f1d1a");
			}
		}
	});
	it("型の中の振り分け（k）は 0〜3", () => {
		expect(new Set(styles.map((s) => s.k))).toEqual(new Set([0, 1, 2, 3]));
	});
});

describe("flyerTitleSize", () => {
	it("題が長いほど小さくする（半角は 0.55 字と数える）", () => {
		expect(flyerTitleSize("朝カフェ")).toBe("xl");
		expect(flyerTitleSize("死にたいバー")).toBe("l");
		expect(flyerTitleSize("NISA貧乏BAR")).toBe("l");
		expect(flyerTitleSize("キチゲ解放バー")).toBe("m");
		expect(flyerTitleSize("大人の発達障害アートカフェバー金輝")).toBe("m");
		expect(
			flyerTitleSize("心が疲れた人の交流会『ヤミトモ』《累計100回》オンライン"),
		).toBe("s");
	});
});

describe("flyerTitleChunks", () => {
	const chunks = (t: string) => flyerTitleChunks(t).join("|");
	it("助詞は前の語に付け、語の途中では折らない", () => {
		expect(chunks("死にたいバー")).toBe("死にたい|バー");
		expect(chunks("18時から店にいます")).toBe("18時から|店にいます");
		expect(chunks("キチゲ解放バー")).toBe("キチゲ|解放|バー");
	});
	it("1 字の接頭・接尾は隣の語に付ける", () => {
		expect(chunks("俺主総会inエデン日暮里")).toBe("俺主|総会|in|エデン|日暮里");
		expect(chunks("Remake 発達特性オンライン自助会")).toBe(
			"Remake| |発達|特性|オンライン|自助会",
		);
	});
	it("括弧・@ID・絵文字を隣から離さない", () => {
		expect(chunks("【第7回】発達 ゆる飲み会♪")).toBe(
			"【第7回】|発達| |ゆる|飲み会♪",
		);
		expect(chunks("バー(ごろう@gorokpop)🫖")).toBe("バー|(ごろう|@gorokpop)🫖");
	});
	it("つなげると元の題に戻る", () => {
		const t =
			"バリ層自助会 ― ADHD/ASD特性を活かした成功体験を、話そう・聞こう ―　ゆとりや";
		expect(flyerTitleChunks(t).join("")).toBe(t);
	});
});

describe("flyerDate", () => {
	it("JST の「11.08」「SUN」「09:00–10:30」にする", () => {
		expect(
			flyerDate({
				startsAt: "2026-11-08T00:00:00Z",
				endsAt: "2026-11-08T01:30:00Z",
				allDay: false,
			}),
		).toEqual({
			date: "11.08",
			dow: "SUN",
			time: "09:00–10:30",
			month: 11,
			day: 8,
			dowJa: "日",
			start: "09:00",
		});
	});
	it("終日なら時刻の代わりに「終日」", () => {
		expect(
			flyerDate({
				startsAt: "2026-11-06T15:00:00Z",
				endsAt: null,
				allDay: true,
			}),
		).toEqual({
			date: "11.07",
			dow: "SAT",
			time: "終日",
			month: 11,
			day: 7,
			dowJa: "土",
			start: "終日",
		});
	});
});
