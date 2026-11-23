import { env } from "cloudflare:workers";
import { error, fail } from "@sveltejs/kit";
import { parseModerationForm } from "#lib/host-moderation.ts";
import {
	addHostModeration,
	deleteHostModeration,
	listHostModerations,
} from "#lib/server/host-moderations.ts";
import { requireActor } from "#lib/server/me.ts";
import { getManagedActor } from "#lib/server/spaces.ts";
import type { Actions, PageServerLoad } from "./$types";

// ページの管理者だけ。ほかの人には無いページに見せる
async function managed(locals: App.Locals, handle: string) {
	const { session } = requireActor(locals);
	const actor = await getManagedActor(locals.db, handle, session.user.id);
	if (!actor) error(404, "見つかりません");
	return { actor, userId: session.user.id };
}

const str = (form: FormData, k: string) => String(form.get(k) ?? "");

export const load: PageServerLoad = async ({ locals, params }) => {
	const { actor } = await managed(locals, params.handle);
	return {
		handle: actor.handle,
		name: actor.name,
		moderations: await listHostModerations(
			locals.db,
			env.BETTER_AUTH_SECRET,
			actor.id,
		),
	};
};

export const actions: Actions = {
	add: async ({ request, locals, params }) => {
		const { actor, userId } = await managed(locals, params.handle);
		const form = await request.formData();
		const values = {
			kind: str(form, "kind"),
			a: str(form, "a"),
			b: str(form, "b"),
		};
		const parsed = parseModerationForm(values);
		if (!parsed.ok) return fail(400, { error: parsed.error, values });
		const result = await addHostModeration(
			locals.db,
			env.BETTER_AUTH_SECRET,
			actor.id,
			userId,
			parsed.values,
		);
		if ("error" in result) return fail(400, { error: result.error, values });
	},
	remove: async ({ request, locals, params }) => {
		const { actor } = await managed(locals, params.handle);
		const form = await request.formData();
		await deleteHostModeration(locals.db, actor.id, str(form, "id"));
	},
};
