import { env } from "cloudflare:workers";
import { error, fail, redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { dayKey } from "#lib/date.ts";
import {
	parseEventForm,
	readEventForm,
	statusAfterEdit,
} from "#lib/event-form.ts";
import { flyerStyle, parseFlyerLook } from "#lib/flyer.ts";
import { parseHandleInput } from "#lib/id.ts";
import { ruleLabel } from "#lib/repeat.ts";
import { warmCard } from "#lib/server/card.ts";
import { eventSeries } from "#lib/server/db/schema.ts";
import { toFormValues } from "#lib/server/event-values.ts";
import { checkFlyer, putFlyer } from "#lib/server/flyer-upload.ts";
import {
	addEventHost,
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
import {
	deleteFollowing,
	flyerInUse,
	updateFollowing,
} from "#lib/server/series.ts";
import { mediaUrl } from "#lib/types.ts";
import type { Actions, PageServerLoad } from "./$types";

async function editable(locals: App.Locals, id: string) {
	const { session, actor } = requireActor(locals);
	const actorIds = await listManagedActorIds(locals.db, session.user.id, actor);
	const ev = await getEditableEvent(locals.db, id, session.user.id, actorIds);
	if (!ev) error(404, "その間は見つからないか、編集できません");
	return ev;
}

// フライヤーの画像を R2 から消す。繰り返しのほかの回がまだ同じ画像を使っているなら残す
async function dropFlyer(locals: App.Locals, key: string | null) {
	if (key && !(await flyerInUse(locals.db, key))) await env.MEDIA.delete(key);
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const ev = await editable(locals, params.id);
	const { variant, color } = flyerStyle(
		ev.id,
		parseFlyerLook(ev.flyerVariant, ev.flyerColor),
	);
	const [series] = ev.seriesId
		? await locals.db
				.select({ rrule: eventSeries.rrule })
				.from(eventSeries)
				.where(eq(eventSeries.id, ev.seriesId))
				.limit(1)
		: [];
	return {
		id: ev.id,
		status: ev.status,
		// 繰り返しの中の回なら、その決まりの言い方（「毎週火曜」）
		series: series ? ruleLabel(series.rrule, ev.startsAt) : null,
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
		await dropFlyer(locals, ev.coverKey);
		warmCard(locals.db, ev.id, url.origin);
		return { flyerSaved: true };
	},
	// 自動のビラに戻す
	removeFlyer: async ({ locals, params, url }) => {
		const ev = await editable(locals, params.id);
		if (ev.coverKey) {
			await setEventFlyer(locals.db, ev.id, null);
			await dropFlyer(locals, ev.coverKey);
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
	// 一緒に開く人・ハコ・団体を主催に加える
	addHost: async ({ request, locals, params }) => {
		await editable(locals, params.id);
		const form = await request.formData();
		const handle = parseHandleInput(String(form.get("handle") ?? ""));
		if (!handle)
			return fail(400, { hostError: "加える相手の @ID を入れてください" });
		const result = await addEventHost(locals.db, params.id, handle);
		if ("error" in result) return fail(400, { hostError: result.error });
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
	save: async ({ request, locals, params, url }) => {
		const current = await editable(locals, params.id);
		const form = await request.formData();
		const values = readEventForm((k) => (form.get(k) as string | null) ?? null);
		const parsed = parseEventForm(values);
		if (!parsed.ok) return fail(400, { error: parsed.error, values });
		const ev = await toEventValues(locals.db, parsed.event);
		if ("error" in ev) return fail(400, { error: ev.error, values });
		const status = statusAfterEdit(current.status, parsed.event.status);
		if (current.seriesId && form.get("following") !== null) {
			// この先の回もまとめて直す。回の日付は決まりから来ているので、ここでは動かさない
			if (dayKey(ev.startsAt) !== dayKey(current.startsAt))
				return fail(400, {
					error:
						"日付を変えるときは「この先の回もまとめて直す」の印を外して、この回だけを直してください",
					values,
				});
			await updateFollowing(
				locals.db,
				{ seriesId: current.seriesId, startsAt: current.startsAt },
				ev,
			);
		} else {
			// この回だけを直す。繰り返しの中の回は同じ内容という決まりなので、繰り返しから外す
			await updateEvent(locals.db, params.id, {
				...ev,
				status,
				seriesId: null,
			});
		}
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
		await dropFlyer(locals, ev.coverKey);
		await env.MEDIA.delete(`cards/${ev.id}.png`);
		redirect(303, "/me");
	},
	// この回から先の回をすべて消して、繰り返しを終える。前の回は残る
	deleteFollowing: async ({ locals, params }) => {
		const ev = await editable(locals, params.id);
		if (!ev.seriesId) error(400, "繰り返しの間ではありません");
		const gone = await deleteFollowing(locals.db, {
			seriesId: ev.seriesId,
			startsAt: ev.startsAt,
		});
		for (const key of new Set(gone.map((g) => g.coverKey)))
			await dropFlyer(locals, key);
		await env.MEDIA.delete(gone.map((g) => `cards/${g.id}.png`));
		redirect(303, "/me");
	},
};
