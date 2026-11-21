import { describe, expect, it } from "vitest";

// 決め事をソースの走査で守る。破ってもテスト・型・lint は通ってしまい、本番でだけ困るもの。

const sources = import.meta.glob<string>("/src/**/*.{ts,svelte}", {
	query: "?raw",
	import: "default",
	eager: true,
});
const files = Object.entries(sources).filter(
	([path]) => !/\.spec\.ts$/.test(path),
);
const violations = (
	re: RegExp,
	only: (path: string) => boolean,
	allowed: string[],
) =>
	files
		.filter(([path]) => only(path) && !allowed.includes(path))
		.filter(([, code]) => re.test(code))
		.map(([path]) => path);

describe("サーバーからの通信", () => {
	it("素の fetch を書いてよいのは、宛先を運営が決めている所だけ", () => {
		// 利用者が入れたホスト（Misskey のサーバー）へは remoteJson を通す（src/lib/server/remote-fetch.ts）。
		// 宛先が固定か、運営が設定したものなら、ここに足す
		const allowed = [
			"/src/lib/server/remote-fetch.ts",
			// 取り込み元（sources.ts に運営が書いた公開カレンダー）
			"/src/lib/server/import/run.ts",
			"/src/lib/server/import/freecalend.ts",
			// 運営への知らせ（REPORT_WEBHOOK_URL）
			"/src/lib/server/moderation.ts",
		];
		const server = (path: string) =>
			path.startsWith("/src/lib/server/") ||
			/\/(\+server|\+page\.server|\+layout\.server|hooks\.server)\.ts$/.test(
				path,
			);
		// メソッドの定義（async fetch(…)）と、バインディングの呼び出し（env.ASSETS.fetch(…)）は数えない
		expect(violations(/(?<![.\w])(?<!async )fetch\(/, server, allowed)).toEqual(
			[],
		);
	});
});

describe("日時", () => {
	it("端末やサーバーの時刻帯で読まない（表示は JST。本番の Worker は UTC）", () => {
		// 整形は src/lib/date.ts を通す。Intl を直に使うなら timeZone を書く
		const all = () => true;
		expect(
			violations(
				/\.toLocale(Date|Time)?String\(|\.get(FullYear|Month|Date|Day|Hours|Minutes)\(/,
				all,
				[],
			),
		).toEqual([]);
		const untimed = files
			.filter(([, code]) => code.includes("Intl.DateTimeFormat("))
			.filter(([, code]) => !/timeZone:/.test(code))
			.map(([path]) => path);
		expect(untimed).toEqual([]);
	});
});
