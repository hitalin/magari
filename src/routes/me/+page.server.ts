import { env } from 'cloudflare:workers';
import { redirect } from '@sveltejs/kit';
import {
	deleteMyData,
	listManagedActorIds,
	listMyEvents,
	requireActor,
	requireLogin
} from '#lib/server/me.ts';
import type { Actions, PageServerLoad } from './$types';

const PROVIDER_LABEL: Record<string, string> = { twitter: 'X', miauth: 'Misskey' };

export const load: PageServerLoad = async ({ locals, request }) => {
	const { session, actor } = requireActor(locals);
	const [actorIds, accounts] = await Promise.all([
		listManagedActorIds(locals.db, session.user.id, actor),
		locals.auth.api.listUserAccounts({ headers: request.headers })
	]);
	const all = await listMyEvents(locals.db, session.user.id, actorIds);
	const now = Date.now();
	const toItem = (e: (typeof all)[number]) => ({
		id: e.id,
		title: e.title,
		startsAt: e.startsAt.toISOString(),
		endsAt: e.endsAt?.toISOString() ?? null,
		allDay: e.allDay,
		status: e.status,
		visibility: e.visibility
	});
	return {
		actor,
		xEnabled: !!env.X_CLIENT_ID,
		accounts: accounts.map((a) => ({
			providerId: a.providerId,
			accountId: a.accountId,
			label: PROVIDER_LABEL[a.providerId] ?? a.providerId,
			// Misskey は "host:id" で保存しているので host を見せる
			detail: a.providerId === 'miauth' ? a.accountId.split(':')[0] : null
		})),
		drafts: all.filter((e) => e.status === 'draft').map(toItem),
		upcoming: all
			.filter((e) => e.status !== 'draft' && e.startsAt.getTime() >= now - 86_400_000)
			.reverse()
			.map(toItem),
		past: all
			.filter((e) => e.status !== 'draft' && e.startsAt.getTime() < now - 86_400_000)
			.map(toItem)
	};
};

export const actions: Actions = {
	deleteAccount: async ({ request, locals }) => {
		const session = requireLogin(locals);
		await deleteMyData(locals.db, session.user.id, locals.actor);
		await locals.auth.api.deleteUser({ headers: request.headers, body: {} });
		redirect(303, '/');
	}
};
