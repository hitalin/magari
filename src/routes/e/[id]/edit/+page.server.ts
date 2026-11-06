import { error, fail, redirect } from "@sveltejs/kit";
import { parseEventForm, readEventForm } from "#lib/event-form.ts";
import { toFormValues } from "#lib/server/event-values.ts";
import {
	deleteEvent,
	getEditableEvent,
	listManagedActorIds,
	requireActor,
	setEventStatus,
	toEventValues,
	updateEvent,
} from "#lib/server/me.ts";
import type { Actions, PageServerLoad } from "./$types";

async function editable(locals: App.Locals, id: string) {
	const { session, actor } = requireActor(locals);
	const actorIds = await listManagedActorIds(locals.db, session.user.id, actor);
	const ev = await getEditableEvent(locals.db, id, session.user.id, actorIds);
	if (!ev) error(404, "その間は見つからないか、編集できません");
	return ev;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const ev = await editable(locals, params.id);
	return { id: ev.id, status: ev.status, values: toFormValues(ev) };
};

export const actions: Actions = {
	save: async ({ request, locals, params }) => {
		await editable(locals, params.id);
		const form = await request.formData();
		const values = readEventForm((k) => (form.get(k) as string | null) ?? null);
		const parsed = parseEventForm(values);
		if (!parsed.ok) return fail(400, { error: parsed.error, values });
		const ev = await toEventValues(locals.db, parsed.event);
		if ("error" in ev) return fail(400, { error: ev.error, values });
		await updateEvent(locals.db, params.id, ev);
		redirect(303, parsed.event.status === "draft" ? "/me" : `/e/${params.id}`);
	},
	cancel: async ({ locals, params }) => {
		await editable(locals, params.id);
		await setEventStatus(locals.db, params.id, "cancelled");
		redirect(303, `/e/${params.id}`);
	},
	reopen: async ({ locals, params }) => {
		await editable(locals, params.id);
		await setEventStatus(locals.db, params.id, "published");
		redirect(303, `/e/${params.id}`);
	},
	delete: async ({ locals, params }) => {
		await editable(locals, params.id);
		await deleteEvent(locals.db, params.id);
		redirect(303, "/me");
	},
};
