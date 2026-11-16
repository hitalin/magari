import { env } from "cloudflare:workers";
import { listManagedActors } from "#lib/server/spaces.ts";
import type { LayoutServerLoad } from "./$types";

// ヘッダーのログイン状態。公開ページを CDN に載せる段階で、ここはクライアント取得に切り替える。
export const load: LayoutServerLoad = async ({ locals }) => ({
	loggedIn: !!locals.session,
	me: locals.actor
		? {
				handle: locals.actor.handle,
				name: locals.actor.name,
				avatarUrl: locals.actor.avatarUrl,
			}
		: null,
	// 運営者（ADMIN_HANDLE の本人）か。落書きを消す道具の出し分けに使う（消す側の API でも確かめる）
	admin: !!env.ADMIN_HANDLE && locals.actor?.handle === env.ADMIN_HANDLE,
	// 編集できるページの handle（本人 + 管理している場・団体）。「編集」リンクの出し分けに使う
	managed: locals.session
		? [
				...(locals.actor ? [locals.actor.handle] : []),
				...(await listManagedActors(locals.db, locals.session.user.id)).map(
					(a) => a.handle,
				),
			]
		: [],
});
