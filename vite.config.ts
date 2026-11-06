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
