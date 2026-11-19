import { env } from "cloudflare:workers";
import { error, fail, redirect } from "@sveltejs/kit";
import {
	parseEventForm,
	readEventForm,
	statusAfterEdit,
} from "#lib/event-form.ts";
import { flyerStyle, parseFlyerLook } from "#lib/flyer.ts";
import { warmCard } from "#lib/server/card.ts";
import { toFormValues } from "#lib/server/event-values.ts";
import { checkFlyer, putFlyer } from "#lib/server/flyer-upload.ts";
import {
	deleteEvent,
	getEditableEvent,
	listEventHosts,
	listManagedActorIds,
	removeEventHost,
	requireActor,
	setEventFlyer,
	setEventFlyerLook,
	setEventStatus,
	toEventValues,
	updateEvent,
} from "#lib/server/me.ts";
import { mediaUrl } from "#lib/types.ts";
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
	const { variant, color } = flyerStyle(
		ev.id,
		parseFlyerLook(ev.flyerVariant, ev.flyerColor),
	);
	return {
		id: ev.id,
		status: ev.status,
		values: toFormValues(ev),
		hosts: await listEventHosts(locals.db, ev.id),
		myActorId: locals.actor?.id ?? null,
		// フライヤーの見本（上げた画像か、自動のビラの材料）
		flyer: {
			url: mediaUrl(ev.coverKey),
			look: { variant, color },
			title: ev.title,
			startsAt: ev.startsAt.toISOString(),
			endsAt: ev.endsAt?.toISOString() ?? null,
			allDay: ev.allDay,
			place: ev.spaceName ?? ev.locationName,
		},
	};
};

export const actions: Actions = {
	// フライヤーを上げる。自動のビラと入れ替わり、X で共有したときの画像にもなる
	flyer: async ({ request, locals, params, url }) => {
		const ev = await editable(locals, params.id);
		const form = await request.formData();
		const file = form.get("flyer");
		if (!(file instanceof File) || file.size === 0)
			return fail(400, { flyerError: "画像を選んでください" });
		const flyerError = checkFlyer(file);
		if (flyerError) return fail(400, { flyerError });
		const key = await putFlyer(env.MEDIA, ev.id, file);
		await setEventFlyer(locals.db, ev.id, key);
		if (ev.coverKey) await env.MEDIA.delete(ev.coverKey);
		warmCard(locals.db, ev.id, url.origin);
		return { flyerSaved: true };
	},
	// 自動のビラに戻す
	removeFlyer: async ({ locals, params, url }) => {
		const ev = await editable(locals, params.id);
		if (ev.coverKey) {
			await setEventFlyer(locals.db, ev.id, null);
			await env.MEDIA.delete(ev.coverKey);
			warmCard(locals.db, ev.id, url.origin);
		}
		return { flyerSaved: true };
	},
	// 自動のビラの型と差し色を替える
	look: async ({ request, locals, params }) => {
		const ev = await editable(locals, params.id);
		const form = await request.formData();
		const look = parseFlyerLook(
			form.get("flyerVariant") as string | null,
			form.get("flyerColor") as string | null,
		);
		if (!look) return fail(400, { flyerError: "型と色を選んでください" });
		// 何度も替えて試すものなので、カード画像は作り直さない（共有のときに作る）
		await setEventFlyerLook(locals.db, ev.id, look);
		return { flyerSaved: true };
	},
	removeHost: async ({ request, locals, params }) => {
		await editable(locals, params.id);
		const form = await request.formData();
		const actorId = String(form.get("actorId") ?? "");
		if (!(await removeEventHost(locals.db, params.id, actorId)))
			return fail(400, { hostError: "最後の 1 人は外せません" });
		// 自分を外したら会のページへ（作った人でなければ、もう編集できない）
		if (actorId === locals.actor?.id) redirect(303, `/e/${params.id}`);
		return { hostRemoved: true };
	},
	save: async ({ request, locals, params, url }) => {
		const current = await editable(locals, params.id);
		const form = await request.formData();
		const values = readEventForm((k) => (form.get(k) as string | null) ?? null);
		const parsed = parseEventForm(values);
		if (!parsed.ok) return fail(400, { error: parsed.error, values });
		const ev = await toEventValues(locals.db, parsed.event);
		if ("error" in ev) return fail(400, { error: ev.error, values });
		const status = statusAfterEdit(current.status, parsed.event.status);
		await updateEvent(locals.db, params.id, { ...ev, status });
		warmCard(locals.db, params.id, url.origin);
		redirect(303, status === "draft" ? "/me" : `/e/${params.id}`);
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
		const ev = await editable(locals, params.id);
		await deleteEvent(locals.db, params.id);
		if (ev.coverKey) await env.MEDIA.delete(ev.coverKey);
		await env.MEDIA.delete(`cards/${ev.id}.png`);
		redirect(303, "/me");
	},
};
