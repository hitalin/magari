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
import { wallKey } from "#lib/graffiti.ts";
import { parseHandleInput } from "#lib/id.ts";
import {
	parseRepeat,
	parseUntil,
	repeatRule,
	ruleLabel,
	untilDay,
} from "#lib/repeat.ts";
import { warmCard } from "#lib/server/card.ts";
import { eventSeries } from "#lib/server/db/schema.ts";
import { toFormValues } from "#lib/server/event-values.ts";
import { checkFlyer, putFlyer } from "#lib/server/flyer-upload.ts";
import { overpaint, setWallOpen } from "#lib/server/graffiti.ts";
import {
	addEventHost,
	deleteEvent,
	getEditableEvent,
	listEventHosts,
	listManagedActorIds,
	removeEventHost,
	requireActor,
	setEventStatus,
	toEventValues,
	updateEvent,
} from "#lib/server/me.ts";
import { deleteMedia, imageSize } from "#lib/server/media.ts";
import {
	deleteFollowing,
	flyerInUse,
	flyerTargets,
	leaveSeries,
	setFlyerFor,
	setLookFor,
	setSeriesUntil,
	startSeries,
	updateFollowing,
} from "#lib/server/series.ts";
import { resolveSpace } from "#lib/server/spaces.ts";
import { mediaUrl } from "#lib/types.ts";
import type { Actions, PageServerLoad } from "./$types";

async function editable(locals: App.Locals, id: string) {
	const { session, actor } = requireActor(locals);
	const actorIds = await listManagedActorIds(locals.db, session.user.id, actor);
	const ev = await getEditableEvent(locals.db, id, session.user.id, actorIds);
	if (!ev) error(404, "その間は見つからないか、編集できません");
	return ev;
}

// フライヤーやビラの型を替える先。繰り返しの中の回は、「この先の回にも」の印があればこの回から先の回すべて、
// 無ければこの回だけを替えて、繰り返しから外す
async function scope(
	locals: App.Locals,
	ev: Awaited<ReturnType<typeof editable>>,
	form: FormData,
) {
	const withFollowing = form.get("following") !== null;
	if (ev.seriesId && !withFollowing) await leaveSeries(locals.db, ev.id);
	return flyerTargets(locals.db, ev, withFollowing);
}

// フライヤーの画像を R2 から消す。繰り返しのほかの回がまだ同じ画像を使っているなら残す
async function dropFlyer(locals: App.Locals, key: string | null) {
	if (key && !(await flyerInUse(locals.db, key)))
		await deleteMedia(env.MEDIA, key);
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const ev = await editable(locals, params.id);
	const { variant, color } = flyerStyle(
		ev.id,
		parseFlyerLook(ev.flyerVariant, ev.flyerColor),
	);
	const [series] = ev.seriesId
		? await locals.db
				.select({ rrule: eventSeries.rrule, until: eventSeries.until })
				.from(eventSeries)
				.where(eq(eventSeries.id, ev.seriesId))
				.limit(1)
		: [];
	const space = await resolveSpace(locals.db, ev.spaceHandle);
	return {
		id: ev.id,
		// ハコの間取り（区画の候補）
		rooms: "error" in space ? [] : space.rooms,
		status: ev.status,
		// ハコが載せたほかの人の会。フライヤーの画像・主催・壁は持たない
		postedBySpace: ev.postedBySpace,
		wallOpen: ev.wallOpen,
		// 繰り返しの中の回なら、その決まりの言い方（「毎週火曜」）
		series: series ? ruleLabel(series.rrule, ev.startsAt) : null,
		// 繰り返しの終わりの日（YYYY-MM-DD）。決めていなければ空
		seriesUntil: untilDay(series?.until),
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
		// 主催の画像を、主催の許しなく載せない
		if (ev.postedBySpace)
			return fail(400, {
				flyerError: "ほかの人の会には、フライヤーの画像を付けられません",
			});
		const form = await request.formData();
		const file = form.get("flyer");
		if (!(file instanceof File) || file.size === 0)
			return fail(400, { flyerError: "画像を選んでください" });
		const flyerError = checkFlyer(file);
		if (flyerError) return fail(400, { flyerError });
		const targets = await scope(locals, ev, form);
		const key = await putFlyer(
			env.MEDIA,
			ev.id,
			file,
			await imageSize(env.IMAGES, file),
		);
		await setFlyerFor(
			locals.db,
			targets.map((t) => t.id),
			key,
		);
		for (const old of new Set(targets.map((t) => t.coverKey)))
			await dropFlyer(locals, old);
		warmCard(locals.db, ev.id, url.origin);
		return { flyerSaved: true };
	},
	// 自動のビラに戻す
	removeFlyer: async ({ request, locals, params, url }) => {
		const ev = await editable(locals, params.id);
		const targets = await scope(locals, ev, await request.formData());
		await setFlyerFor(
			locals.db,
			targets.map((t) => t.id),
			null,
		);
		for (const old of new Set(targets.map((t) => t.coverKey)))
			await dropFlyer(locals, old);
		warmCard(locals.db, ev.id, url.origin);
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
		const targets = await scope(locals, ev, form);
		await setLookFor(
			locals.db,
			targets.map((t) => t.id),
			look,
		);
		return { flyerSaved: true };
	},
	// 一緒に開く人・ハコ・団体を主催に加える
	addHost: async ({ request, locals, params }) => {
		const ev = await editable(locals, params.id);
		// 承諾なしで本人の会に見せてしまうので、ほかの人の会には主催を足さない
		if (ev.postedBySpace)
			return fail(400, { hostError: "ほかの人の会には、主催を加えられません" });
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
		// ほかの人の会かどうかは、作ったときに決まる
		const values = {
			...readEventForm((k) => (form.get(k) as string | null) ?? null),
			postedBySpace: current.postedBySpace,
		};
		// 単発の間を、繰り返しの最初の回にする（もう繰り返しの中の回と、中止した間には欄を出していない）
		const repeat =
			current.seriesId || current.status === "cancelled"
				? null
				: parseRepeat(form.get("repeat") as string | null);
		const repeatUntil = String(form.get("repeatUntil") ?? "");
		const again = { values, repeat, repeatUntil };
		const parsed = parseEventForm(values);
		if (!parsed.ok) return fail(400, { error: parsed.error, ...again });
		// ほかの人の会は、載せたハコのもの。別のハコへは移せない
		if (
			current.postedBySpace &&
			parsed.event.spaceHandle !== current.spaceHandle
		)
			return fail(400, {
				error: "ほかの人の会は、載せたハコから移せません",
				...again,
			});
		const until = parseUntil(repeat ? repeatUntil : "", parsed.event.startsAt);
		if (!until.ok) return fail(400, { error: until.error, ...again });
		const ev = await toEventValues(locals.db, parsed.event, current);
		if ("error" in ev) return fail(400, { error: ev.error, ...again });
		const status = statusAfterEdit(current.status, parsed.event.status);
		if (current.seriesId && form.get("following") !== null) {
			// この先の回もまとめて直す。回の日付は決まりから来ているので、ここでは動かさない
			if (dayKey(ev.startsAt) !== dayKey(current.startsAt))
				return fail(400, {
					error:
						"日付を変えるときは「この先の回もまとめて直す」の印を外して、この回だけを直してください",
					...again,
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
			// 先の回は、直したあとのこの間を写して作る
			if (repeat)
				await startSeries(
					locals.db,
					params.id,
					repeatRule(repeat, ev.startsAt),
					until.until,
				);
		}
		warmCard(locals.db, params.id, url.origin);
		redirect(303, status === "draft" ? "/me" : `/e/${params.id}`);
	},
	// この会だけの落書きの壁を開ける・閉じる（繰り返しの中の回でも、この回だけ）
	wall: async ({ request, locals, params }) => {
		const ev = await editable(locals, params.id);
		// 落書きの壁は主催が開けるもの。主催のいない、ほかの人の会には開けない
		if (ev.postedBySpace) error(400, "ほかの人の会には、壁を開けられません");
		const form = await request.formData();
		await setWallOpen(
			locals.db,
			{ type: "event", id: ev.id },
			form.get("open") !== null,
		);
		return { wallSaved: true };
	},
	// 壁をまるごと上塗りする
	paint: async ({ locals, params }) => {
		const ev = await editable(locals, params.id);
		await overpaint(locals.db, wallKey("event", ev.id));
		return { wallSaved: true, painted: true };
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
	// 繰り返しの終わりの日を決め直す。手前にすると、その日より後の回は消える
	until: async ({ request, locals, params }) => {
		const ev = await editable(locals, params.id);
		if (!ev.seriesId) error(400, "繰り返しの間ではありません");
		const form = await request.formData();
		const until = parseUntil(String(form.get("until") ?? ""), ev.startsAt);
		if (!until.ok) return fail(400, { untilError: until.error });
		const gone = await setSeriesUntil(locals.db, ev.seriesId, until.until);
		for (const key of new Set(gone.map((g) => g.coverKey)))
			await dropFlyer(locals, key);
		if (gone.length)
			await env.MEDIA.delete(gone.map((g) => `cards/${g.id}.png`));
		return { untilSaved: true };
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
