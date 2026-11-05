import { fail, redirect } from '@sveltejs/kit';
import {
	EMPTY_EVENT_FORM,
	type EventFormValues,
	parseEventForm,
	readEventForm
} from '#lib/event-form.ts';
import { toFormValues } from '#lib/server/event-values.ts';
import {
	createEvent,
	getEditableEvent,
	listManagedActorIds,
	requireActor
} from '#lib/server/me.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session, actor } = requireActor(locals);
	const from = url.searchParams.get('from');
	let values: EventFormValues = { ...EMPTY_EVENT_FORM };
	if (from) {
		const actorIds = await listManagedActorIds(locals.db, session.user.id, actor);
		const src = await getEditableEvent(locals.db, from, session.user.id, actorIds);
		if (src) values = { ...toFormValues(src), date: '' };
	}
	return { values };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const { session, actor } = requireActor(locals);
		const form = await request.formData();
		const values = readEventForm((k) => (form.get(k) as string | null) ?? null);
		const parsed = parseEventForm(values);
		if (!parsed.ok) return fail(400, { error: parsed.error, values });
		const id = await createEvent(locals.db, parsed.event, actor.id, session.user.id);
		redirect(303, parsed.event.status === 'draft' ? '/me' : `/e/${id}`);
	}
};
