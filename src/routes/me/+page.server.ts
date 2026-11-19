import { env } from "cloudflare:workers";
import { redirect } from "@sveltejs/kit";
import {
	deleteMyData,
	listManagedActorIds,
	listMyEvents,
	requireActor,
	requireLogin,
} from "#lib/server/me.ts";
import { listManagedActors } from "#lib/server/spaces.ts";
import type { Actions, PageServerLoad } from "./$types";

const PROVIDER_LABEL: Record<string, string> = {
	twitter: "X",
	miauth: "Misskey",
};

export const load: PageServerLoad = async ({ locals, request, url }) => {
	const { session, actor } = requireActor(locals);
	const [actorIds, accounts, managed] = await Promise.all([
		listManagedActorIds(locals.db, session.user.id, actor),
		locals.auth.api.listUserAccounts({ headers: request.headers }),
		listManagedActors(locals.db, session.user.id),
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
		visibility: e.visibility,
	});
	return {
		actor,
		managed,
		// 運営者（ADMIN_HANDLE の本人）にだけ、運営の画面への入口を出す
		isAdmin: !!env.ADMIN_HANDLE && actor.handle === env.ADMIN_HANDLE,
		xEnabled: !!env.X_CLIENT_ID,
		linkError: url.searchParams.get("error"),
		linked: url.searchParams.has("linked"),
		accounts: accounts.map((a) => ({
			// better-auth の行 ID。外すときに渡す
			id: a.id,
			providerId: a.providerId,
			label: PROVIDER_LABEL[a.providerId] ?? a.providerId,
			// Misskey は "username@host" で保存しているので、そのまま見せる
			detail: a.providerId === "miauth" ? `@${a.accountId}` : null,
		})),
		drafts: all.filter((e) => e.status === "draft").map(toItem),
		upcoming: all
			.filter(
				(e) => e.status !== "draft" && e.startsAt.getTime() >= now - 86_400_000,
			)
			.reverse()
			.map(toItem),
		past: all
			.filter(
				(e) => e.status !== "draft" && e.startsAt.getTime() < now - 86_400_000,
			)
			.map(toItem),
	};
};

export const actions: Actions = {
	deleteAccount: async ({ request, locals }) => {
		const session = requireLogin(locals);
		await deleteMyData(locals.db, session.user.id, locals.actor);
		await locals.auth.api.deleteUser({ headers: request.headers, body: {} });
		redirect(303, "/");
	},
};
