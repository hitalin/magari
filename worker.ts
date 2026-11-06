// Worker の入口。adapter-cloudflare が生成した Worker（fetch）に Cron の scheduled を足す。
// 生成物は wrangler.adapter.jsonc の main に書かれる（adapter は main の場所を毎回消して書き直すので、この手書きの入口とは分けている）。
// @ts-ignore pnpm build の後にできる生成物
import kit from './.svelte-kit/cloudflare-tmp/_worker.js';

const generated = kit as ExportedHandler<Env>;

export default {
	fetch: generated.fetch,
	// 毎時の取り込み（wrangler.jsonc の triggers.crons）。手動用の POST /api/admin/import と同じ処理を、
	// Worker 内で自分の fetch に投げて走らせる。
	async scheduled(_controller, env, ctx) {
		if (!generated.fetch) return;
		const request = new Request(`${env.PUBLIC_ORIGIN}/api/admin/import`, {
			method: 'POST',
			// SvelteKit の CSRF 検査（フォーム POST の origin 照合）を通すため origin と JSON を明示
			headers: {
				authorization: `Bearer ${env.IMPORT_TOKEN}`,
				origin: env.PUBLIC_ORIGIN,
				'content-type': 'application/json'
			}
		});
		const res = await generated.fetch(
			request as unknown as Parameters<NonNullable<typeof generated.fetch>>[0],
			env,
			ctx
		);
		if (!res.ok) throw new Error(`import failed: ${res.status} ${await res.text()}`);
	}
} satisfies ExportedHandler<Env>;
