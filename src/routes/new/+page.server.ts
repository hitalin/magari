import { fail, redirect } from "@sveltejs/kit";
import {
	EMPTY_EVENT_FORM,
	type EventFormValues,
	parseEventForm,
	readEventForm,
} from "#lib/event-form.ts";
import { isShortId, shortId } from "#lib/id.ts";
import { toFormValues } from "#lib/server/event-values.ts";
import {
	createEvent,
	getEditableEvent,
	listManagedActorIds,
	requireActor,
	toEventValues,
} from "#lib/server/me.ts";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session, actor } = requireActor(locals);
	const from = url.searchParams.get("from");
	// ハコのページの「ここでまがりする」から来たら、ハコを入れておく
	let values: EventFormValues = {
		...EMPTY_EVENT_FORM,
		space: url.searchParams.get("space") ?? "",
	};
	if (from) {
		const actorIds = await listManagedActorIds(
			locals.db,
			session.user.id,
			actor,
		);
		const src = await getEditableEvent(
			locals.db,
			from,
			session.user.id,
			actorIds,
		);
		if (src) values = { ...toFormValues(src), date: "" };
	}
	// ビラの見た目は ID から決まるので、先に ID を決めて画面のビラと保存後のビラを同じにする
	return { values, id: shortId() };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const { session, actor } = requireActor(locals);
		const form = await request.formData();
		const values = readEventForm((k) => (form.get(k) as string | null) ?? null);
		const parsed = parseEventForm(values);
		if (!parsed.ok) return fail(400, { error: parsed.error, values });
		const ev = await toEventValues(locals.db, parsed.event);
		if ("error" in ev) return fail(400, { error: ev.error, values });
		const wanted = (form.get("id") as string | null) ?? "";
		const id = await createEvent(
			locals.db,
			ev,
			actor.id,
			session.user.id,
			isShortId(wanted) ? wanted : undefined,
		);
		if (!id)
			return fail(400, {
				error: "保存できませんでした。ビラを刷り直して、もう一度お試しください",
				values,
			});
		// 開けた直後は「貼る」（共有）を先頭に出す
		redirect(303, parsed.event.status === "draft" ? "/me" : `/e/${id}?opened`);
	},
};
