import { env } from "cloudflare:workers";
import { error, fail, redirect } from "@sveltejs/kit";
import { parseEventForm, readEventForm } from "#lib/event-form.ts";
import { parseHandleInput, shortId } from "#lib/id.ts";
import { toFormValues } from "#lib/server/event-values.ts";
import {
	addEventHost,
	deleteEvent,
	findPersonByHandle,
	getEditableEvent,
	listEventHosts,
	listManagedActorIds,
	removeEventHost,
	requireActor,
	setEventFlyer,
	setEventStatus,
	toEventValues,
	updateEvent,
} from "#lib/server/me.ts";
import { mediaUrl } from "#lib/types.ts";
import type { Actions, PageServerLoad } from "./$types";

const IMAGE_TYPES: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
};
// A4 のスキャンなども上げられるよう、ハコの写真（5MB）より大きめ
const MAX_FLYER = 10 * 1024 * 1024;

async function editable(locals: App.Locals, id: string) {
	const { session, actor } = requireActor(locals);
	const actorIds = await listManagedActorIds(locals.db, session.user.id, actor);
	const ev = await getEditableEvent(locals.db, id, session.user.id, actorIds);
	if (!ev) error(404, "その間は見つからないか、編集できません");
	return ev;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const ev = await editable(locals, params.id);
	return {
		id: ev.id,
		status: ev.status,
		values: toFormValues(ev),
		hosts: await listEventHosts(locals.db, ev.id),
		myActorId: locals.actor?.id ?? null,
		// フライヤーの見本（上げた画像か、自動のビラの材料）
		flyer: {
			url: mediaUrl(ev.coverKey),
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
	flyer: async ({ request, locals, params }) => {
		const ev = await editable(locals, params.id);
		const form = await request.formData();
		const file = form.get("flyer");
		if (!(file instanceof File) || file.size === 0)
			return fail(400, { flyerError: "画像を選んでください" });
		const ext = IMAGE_TYPES[file.type];
		if (!ext) return fail(400, { flyerError: "JPEG / PNG / WebP だけ" });
		if (file.size > MAX_FLYER)
			return fail(400, { flyerError: "10MB までにしてください" });
		const key = `flyers/${ev.id}/${shortId()}.${ext}`;
		await env.MEDIA.put(key, await file.arrayBuffer(), {
			httpMetadata: { contentType: file.type },
		});
		await setEventFlyer(locals.db, ev.id, key);
		if (ev.coverKey) await env.MEDIA.delete(ev.coverKey);
		return { flyerSaved: true };
	},
	// 自動のビラに戻す
	removeFlyer: async ({ locals, params }) => {
		const ev = await editable(locals, params.id);
		if (ev.coverKey) {
			await setEventFlyer(locals.db, ev.id, null);
			await env.MEDIA.delete(ev.coverKey);
		}
		return { flyerSaved: true };
	},
	// 共同主催を @handle で足す。主催は全員がこの間を編集できる
	addHost: async ({ request, locals, params }) => {
		await editable(locals, params.id);
		const form = await request.formData();
		const handle = parseHandleInput(String(form.get("handle") ?? ""));
		const person = handle ? await findPersonByHandle(locals.db, handle) : null;
		if (!person)
			return fail(400, {
				hostError:
					"その @handle の人は見つかりません。まがりにログインしたことのある人だけ足せます",
			});
		await addEventHost(locals.db, params.id, person.id);
		return { hostAdded: true };
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
		const ev = await editable(locals, params.id);
		await deleteEvent(locals.db, params.id);
		if (ev.coverKey) await env.MEDIA.delete(ev.coverKey);
		redirect(303, "/me");
	},
};
