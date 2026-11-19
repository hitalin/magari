import { fail, redirect } from "@sveltejs/kit";
import { parseWelcomeForm } from "#lib/event-form.ts";
import { safeNext } from "#lib/next.ts";
import { createPersonActor, requireLogin } from "#lib/server/me.ts";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ locals, url }) => {
	const session = requireLogin(locals);
	if (locals.actor) redirect(303, safeNext(url.searchParams.get("next")));
	return {
		suggestedName: session.user.name || "",
		image: session.user.image ?? null,
	};
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const session = requireLogin(locals);
		const form = await request.formData();
		const parsed = parseWelcomeForm(
			String(form.get("handle") ?? ""),
			String(form.get("name") ?? ""),
		);
		if (!parsed.ok)
			return fail(400, {
				error: parsed.error,
				handle: String(form.get("handle") ?? ""),
				name: String(form.get("name") ?? ""),
			});
		const result = await createPersonActor(locals.db, {
			userId: session.user.id,
			handle: parsed.handle,
			name: parsed.name,
			avatarUrl: session.user.image ?? null,
			xHandle: session.user.xUsername ?? null,
		});
		if ("error" in result)
			return fail(400, {
				error: result.error,
				handle: parsed.handle,
				name: parsed.name,
			});
		// form は action を指定しないので、?next= は POST の URL にも残っている
		redirect(303, safeNext(url.searchParams.get("next")));
	},
};
