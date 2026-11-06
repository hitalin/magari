// Worker の入口。adapter-cloudflare が生成した Worker（fetch）に Cron の scheduled を足す。
// 生成物は wrangler.adapter.jsonc の main に書かれる（adapter は main の場所を毎回消して書き直すので、この手書きの入口とは分けている）。
// #kit-worker は package.json の imports で生成物に向く。型は kit-worker.d.ts（ビルド前でも型が決まる）
import generated from "#kit-worker";

export default {
	fetch: generated.fetch,
	// 毎時の取り込み（wrangler.jsonc の triggers.crons）。手動用の POST /api/admin/import と同じ処理を、
	// Worker 内で自分の fetch に投げて走らせる。
	async scheduled(_controller, env, ctx) {
		if (!generated.fetch) return;
		const request = new Request(`${env.PUBLIC_ORIGIN}/api/admin/import`, {
			method: "POST",
			// SvelteKit の CSRF 検査（フォーム POST の origin 照合）を通すため origin と JSON を明示
			headers: {
				authorization: `Bearer ${env.IMPORT_TOKEN}`,
				origin: env.PUBLIC_ORIGIN,
				"content-type": "application/json",
			},
		});
		const res = await generated.fetch(
			request as unknown as Parameters<NonNullable<typeof generated.fetch>>[0],
			env,
			ctx,
		);
		if (!res.ok)
			throw new Error(`import failed: ${res.status} ${await res.text()}`);
	},
} satisfies ExportedHandler<Env>;
