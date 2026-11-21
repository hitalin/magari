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

describe("キャッシュ", () => {
	it("公開ページの HTML に、だれが見ているかを入れない", () => {
		// 公開の応答は Cookie を見ずに全員へ同じものを配る（src/lib/server/cache.ts）。
		// ルートの +layout.server.ts は全ページの HTML にデータを入れるので、置かない。
		// ヘッダーの顔と「編集」リンクは、ブラウザが表示専用の Cookie から読む（src/lib/viewer.ts）
		expect(
			files
				.map(([path]) => path)
				.filter((path) => path === "/src/routes/+layout.server.ts"),
		).toEqual([]);
	});
	it("公開の応答を返す所は、ログインしている人を見ない", () => {
		// CACHE_PUBLIC を付けた応答は全員に配られる。中身を人によって変えるなら、その応答は private にする
		const allowed = [
			// 公開の間は CACHE_PUBLIC、下書きは本人にだけ private, no-store で返す
			"/src/routes/api/events/[id]/+server.ts",
		];
		expect(
			violations(
				/locals\.(session|actor)/,
				(path) =>
					path.startsWith("/src/routes/") &&
					sources[path].includes("CACHE_PUBLIC"),
				allowed,
			),
		).toEqual([]);
	});
});
