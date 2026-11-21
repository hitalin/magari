// Worker の入口。adapter-cloudflare が生成した Worker（fetch）に、Cron の scheduled と落書きの部屋を足す。
// 生成物は wrangler.adapter.jsonc の main に書かれる（adapter は main の場所を毎回消して書き直すので、この手書きの入口とは分けている）。
// #kit-worker は package.json の imports で生成物に向く。型は kit-worker.d.ts（ビルド前でも型が決まる）
import generated from "#kit-worker";

// いま描いている落書きを配る部屋（Durable Object）。クラスは Worker の入口から export する決まり
export { GraffitiRoom } from "#lib/server/graffiti-room.ts";

export default {
	async fetch(request, env, ctx) {
		// 落書きの WebSocket は SvelteKit を通さず、部屋へ直接渡す（地面は 1 枚なので部屋も 1 つ）
		if (new URL(request.url).pathname === "/api/graffiti/live")
			return env.GRAFFITI_ROOM.getByName("ground").fetch(request);
		if (!generated.fetch) return new Response(null, { status: 500 });
		return generated.fetch(request, env, ctx);
	},
	// 毎時（wrangler.jsonc の triggers.crons）。繰り返しの間の先の回を足し、取り込みが有効なら取り込む。
	// どちらも手動用の POST と同じ処理を、Worker 内で自分の fetch に投げて走らせる。
	async scheduled(_controller, env, ctx) {
		const fetch = generated.fetch;
		if (!fetch) return;
		const paths = ["/api/admin/series"];
		if (env.IMPORT_ENABLED === "1") paths.push("/api/admin/import");
		const failed: string[] = [];
		for (const path of paths) {
			const request = new Request(`${env.PUBLIC_ORIGIN}${path}`, {
				method: "POST",
				// SvelteKit の CSRF 検査（フォーム POST の origin 照合）を通すため origin と JSON を明示
				headers: {
					authorization: `Bearer ${env.IMPORT_TOKEN}`,
					origin: env.PUBLIC_ORIGIN,
					"content-type": "application/json",
				},
			});
			const res = await fetch(
				request as unknown as Parameters<typeof fetch>[0],
				env,
				ctx,
			);
			// 片方がこけても、もう片方は走らせる
			if (!res.ok) failed.push(`${path}: ${res.status} ${await res.text()}`);
		}
		if (failed.length) throw new Error(`cron failed: ${failed.join(" / ")}`);
	},
} satisfies ExportedHandler<Env>;
