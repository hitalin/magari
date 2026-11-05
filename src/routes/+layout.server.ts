import type { LayoutServerLoad } from './$types';

// ヘッダーのログイン状態。公開ページを CDN に載せる段階で、ここはクライアント取得に切り替える。
export const load: LayoutServerLoad = ({ locals }) => ({
	loggedIn: !!locals.session,
	me: locals.actor
		? { handle: locals.actor.handle, name: locals.actor.name, avatarUrl: locals.actor.avatarUrl }
		: null
});
