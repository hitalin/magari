import { fail, redirect } from '@sveltejs/kit';
import { parseWelcomeForm } from '#lib/event-form.ts';
import { createPersonActor, requireLogin } from '#lib/server/me.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const session = requireLogin(locals);
	if (locals.actor) redirect(303, '/me');
	return { suggestedName: session.user.name || '', image: session.user.image ?? null };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const session = requireLogin(locals);
		const form = await request.formData();
		const parsed = parseWelcomeForm(
			String(form.get('handle') ?? ''),
			String(form.get('name') ?? '')
		);
		if (!parsed.ok)
			return fail(400, {
				error: parsed.error,
				handle: String(form.get('handle') ?? ''),
				name: String(form.get('name') ?? '')
			});
		const result = await createPersonActor(locals.db, {
			userId: session.user.id,
			handle: parsed.handle,
			name: parsed.name,
			avatarUrl: session.user.image ?? null
		});
		if ('error' in result)
			return fail(400, { error: result.error, handle: parsed.handle, name: parsed.name });
		redirect(303, '/me');
	}
};
