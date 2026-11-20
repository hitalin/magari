import { error, fail, redirect } from "@sveltejs/kit";
import { claimX, sameX } from "#lib/server/claim.ts";
import { getActorByHandle } from "#lib/server/events.ts";
import { requireActor } from "#lib/server/me.ts";
import { addMember } from "#lib/server/spaces.ts";
import type { Actions, PageServerLoad } from "./$types";

// 引き取れるのは、取り込み元のハコ・団体で、まだ管理者がいないページ
async function claimable(locals: App.Locals, handle: string) {
	const x = claimX(handle);
	const page = await getActorByHandle(locals.db, handle);
	if (!page) error(404, "見つかりません");
	if (page.hasManager) redirect(303, `/@${handle}`);
	// 店の X を控えていないページは、運営への連絡で引き取る
	if (!x) redirect(303, `/contact?kind=claim&about=@${handle}`);
	return { x, name: page.name };
}

export const load: PageServerLoad = async ({ locals, params }) => ({
	...(await claimable(locals, params.handle)),
	handle: params.handle,
	loggedIn: !!locals.session,
});

export const actions: Actions = {
	default: async ({ locals, params, request }) => {
		const { handle } = params;
		const { actor: me } = requireActor(locals, `/claim/${handle}`);
		const { x } = await claimable(locals, handle);
		const accounts = await locals.auth.api.listUserAccounts({
			headers: request.headers,
		});
		const twitter = accounts.find((a) => a.providerId === "twitter");
		if (!twitter)
			return fail(403, {
				error: `X をつないでいません。「自分」のページで @${x} をつなぐか、@${x} でログインし直してください。`,
			});
		// ユーザーに覚えてある X の ID は本人が書き換えられるので、いまの ID を X に聞く
		let username: unknown;
		try {
			const info = await locals.auth.api.accountInfo({
				query: { accountId: twitter.id },
				headers: request.headers,
			});
			username = (info?.data as { data?: { username?: unknown } })?.data
				?.username;
		} catch (e) {
			// X が応えない・トークンが切れている。下の「確かめられませんでした」へ
			console.error("claim: X に確かめられなかった", e);
		}
		if (typeof username !== "string")
			return fail(502, {
				error:
					"X に確かめられませんでした。X でログインし直してから、もう一度試してください。",
			});
		if (!sameX(x, username))
			return fail(403, {
				error: `いまつないでいる X は @${username} です。@${x} でログインし直してください。`,
			});
		const added = await addMember(locals.db, handle, me.handle);
		if ("error" in added) return fail(400, { error: added.error });
		redirect(303, `/@${handle}/edit`);
	},
};
