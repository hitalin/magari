import { env } from "cloudflare:workers";
import { fail, redirect } from "@sveltejs/kit";
import {
	EMPTY_EVENT_FORM,
	type EventFormValues,
	isSameSubmission,
	parseEventForm,
	readEventForm,
} from "#lib/event-form.ts";
import { type FlyerLook, parseFlyerLook } from "#lib/flyer.ts";
import { isShortId, shortId } from "#lib/id.ts";
import { parseRepeat, parseUntil, repeatRule } from "#lib/repeat.ts";
import { warmCard } from "#lib/server/card.ts";
import { toFormValues } from "#lib/server/event-values.ts";
import { checkFlyer, putFlyer } from "#lib/server/flyer-upload.ts";
import {
	createEvent,
	getEditableEvent,
	listManagedActorIds,
	requireActor,
	setEventFlyer,
	toEventValues,
} from "#lib/server/me.ts";
import { imageSize } from "#lib/server/media.ts";
import { startSeries } from "#lib/server/series.ts";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session, actor } = requireActor(locals, url.pathname + url.search);
	const from = url.searchParams.get("from");
	// ハコのページの「ここでまがりする」から来たら、ハコを入れておく
	let values: EventFormValues = {
		...EMPTY_EVENT_FORM,
		space: url.searchParams.get("space") ?? "",
	};
	let look: FlyerLook | null = null;
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
		if (src) {
			values = { ...toFormValues(src), date: "" };
			look = parseFlyerLook(src.flyerVariant, src.flyerColor);
		}
	}
	// ビラの傾きと、型と差し色の最初の組は ID から決まるので、先に ID を決めて画面のビラと保存後のビラを同じにする
	return { values, look, id: shortId(), host: actor.name };
};

export const actions: Actions = {
	save: async ({ request, locals, url }) => {
		const { session, actor } = requireActor(locals);
		const form = await request.formData();
		const values = readEventForm((k) => (form.get(k) as string | null) ?? null);
		const look = parseFlyerLook(
			form.get("flyerVariant") as string | null,
			form.get("flyerColor") as string | null,
		);
		const repeat = parseRepeat(form.get("repeat") as string | null);
		const repeatUntil = String(form.get("repeatUntil") ?? "");
		// 送り直しで、打った内容を欄に戻す
		const again = { values, look, repeat, repeatUntil };
		const parsed = parseEventForm(values);
		if (!parsed.ok) return fail(400, { error: parsed.error, ...again });
		const until = parseUntil(repeat ? repeatUntil : "", parsed.event.startsAt);
		if (!until.ok) return fail(400, { error: until.error, ...again });
		// 自分のフライヤー（任意）。会を作る前に確かめ、だめな画像で会だけ出来ないようにする
		const flyer = form.get("flyer");
		const file = flyer instanceof File && flyer.size > 0 ? flyer : null;
		const flyerError = file && checkFlyer(file);
		if (flyerError)
			return fail(400, { error: `フライヤー: ${flyerError}`, ...again });
		const ev = await toEventValues(locals.db, parsed.event);
		if ("error" in ev) return fail(400, { error: ev.error, ...again });
		const wanted = (form.get("id") as string | null) ?? "";
		const id = await createEvent(
			locals.db,
			{ ...ev, flyerVariant: look?.variant, flyerColor: look?.color },
			actor.id,
			session.user.id,
			isShortId(wanted) ? wanted : undefined,
		);
		const done = (id: string) =>
			// 開けた直後は「貼る」（共有）を先頭に出す
			redirect(
				303,
				parsed.event.status === "draft" ? "/me" : `/e/${id}?opened`,
			);
		if (id) {
			if (file)
				await setEventFlyer(
					locals.db,
					id,
					await putFlyer(
						env.MEDIA,
						id,
						file,
						await imageSize(env.IMAGES, file),
					),
				);
			// 繰り返すなら、先の回もここで作る（フライヤーを付けたあと。先の回は同じ画像を指す）
			if (repeat)
				await startSeries(
					locals.db,
					id,
					repeatRule(repeat, parsed.event.startsAt),
					until.until,
				);
			// 開けた直後に「貼る」を押されても間に合うよう、カード画像を作り始めておく
			if (parsed.event.status !== "draft") warmCard(locals.db, id, url.origin);
			done(id);
		}
		// その ID がもう使われている。二度押しで自分が今作った間なら、そのまま続きへ
		const saved = await getEditableEvent(
			locals.db,
			wanted,
			session.user.id,
			[],
		);
		if (saved && isSameSubmission(saved, parsed.event)) done(saved.id);
		return fail(400, {
			error: "保存できませんでした。もう一度お試しください",
			...again,
		});
	},
};
