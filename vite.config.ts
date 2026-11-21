import adapter from "@sveltejs/adapter-cloudflare";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
			},
			// adapter には別の設定を渡す。wrangler.jsonc の main は手書きの worker.ts（scheduled 付き）
			// dev の bindings（D1・R2）は本物の wrangler.jsonc から読む。adapter 用の設定には無いため
			adapter: adapter({
				config: "wrangler.adapter.jsonc",
				platformProxy: { configPath: "wrangler.jsonc" },
			}),
			// 読み込んでよい先を縛る。スクリプトは自サイトのファイルと、SvelteKit が吐くインライン（ハッシュで許す）だけ。
			// nonce にしないのは、公開ページを CDN に載せても同じ HTML を配れるようにするため。
			// 外部のスクリプトや接続先を足すときは、ここを直す
			csp: {
				mode: "hash",
				directives: {
					"default-src": ["self"],
					// Cloudflare Web Analytics の計測スクリプト。Cloudflare がブラウザ向けの HTML にだけ差し込む
					// （ローカルや curl では出ない）
					"script-src": ["self", "https://static.cloudflareinsights.com"],
					// style 属性（ビラの傾きや色）を使うので inline を許す
					"style-src": ["self", "unsafe-inline"],
					// 顔の画像は X と、任意の Misskey サーバーから来る
					"img-src": ["self", "data:", "blob:", "https:"],
					// 計測の送り先
					"connect-src": ["self", "https://cloudflareinsights.com"],
					"object-src": ["none"],
					"base-uri": ["self"],
					"frame-ancestors": ["none"],
				},
			},
		}),
	],
	// rrule は CJS が main なので SSR では vite にバンドルさせて ESM 側を使う
	ssr: { noExternal: ["rrule"] },
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: "./vite.config.ts",
				test: {
					name: "server",
					environment: "node",
					include: ["src/**/*.{test,spec}.{js,ts}"],
					exclude: ["src/**/*.svelte.{test,spec}.{js,ts}"],
				},
			},
		],
	},
});
