import { fail, redirect } from '@sveltejs/kit';
import { requireActor } from '#lib/server/me.ts';
import { createManagedActor } from '#lib/server/spaces.ts';
import { parseNewActorForm } from '#lib/space-form.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	requireActor(locals);
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const { session } = requireActor(locals);
		const form = await request.formData();
		const raw = {
			handle: String(form.get('handle') ?? ''),
			name: String(form.get('name') ?? ''),
			kind: String(form.get('kind') ?? 'space')
		};
		const parsed = parseNewActorForm(raw.handle, raw.name, raw.kind);
		if (!parsed.ok) return fail(400, { error: parsed.error, ...raw });
		const result = await createManagedActor(locals.db, { userId: session.user.id, ...parsed });
		if ('error' in result) return fail(400, { error: result.error, ...raw });
		redirect(303, `/@${result.handle}/edit`);
	}
};
