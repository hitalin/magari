import { env } from "cloudflare:workers";
import { error, fail, redirect } from "@sveltejs/kit";
import { type LinkedSns, shownSns } from "#lib/actor.ts";
import { wallKey } from "#lib/graffiti.ts";
import { parseHandleInput, shortId } from "#lib/id.ts";
import { linkedSns } from "#lib/server/events.ts";
import { overpaint, setWallOpen } from "#lib/server/graffiti.ts";
import { requireActor } from "#lib/server/me.ts";
import { deleteMedia } from "#lib/server/media.ts";
import {
	addMember,
	getManagedActor,
	listMembers,
	type ManagedActor,
	removeMember,
	setHeaderKey,
	updateActorPage,
} from "#lib/server/spaces.ts";
import { actorSns } from "#lib/sns.ts";
import {
	parseSpaceForm,
	readSpaceForm,
	type SpaceFormValues,
} from "#lib/space-form.ts";
import { mediaUrl } from "#lib/types.ts";
import type { Actions, PageServerLoad } from "./$types";

async function managed(locals: App.Locals, handle: string) {
	const { session } = requireActor(locals);
	const actor = await getManagedActor(locals.db, handle, session.user.id);
	if (!actor) error(404, "そのページは見つからないか、編集できません");
	return actor;
}

// いまの値をフォームの形に
function formValues(actor: ManagedActor, linked?: LinkedSns): SpaceFormValues {
	// 人の X の欄はやめた。つないでいない人が前に手で書いた値は、リンクの 1 行にして見せる（保存するとリンクへ移る）
	const moveX = actor.kind === "person" && !linked?.hasX;
	const oldX = moveX ? shownSns(actor, linked).xHandle : null;
	return {
		name: actor.name,
		catch: actor.catch ?? "",
		summary: actor.summary ?? "",
		body: actor.body ?? "",
		facilities: actor.facilities.join(", "),
		floorPlan: actor.floorPlan ?? "",
		address: actor.address ?? "",
		region: actor.region ?? "",
		access: actor.access ?? "",
		hours: actor.hours ?? "",
		closedDays: actor.closedDays ?? "",
		operator: actor.operator ?? "",
		url: actor.url ?? "",
		xHandle: moveX ? "" : (actor.xHandle ?? ""),
		misskey: actor.misskey ?? "",
		// Instagram の欄はやめたので、前の値はリンクの 1 行にして見せる（保存するとリンクへ移る）
		links: [
			...(oldX ? [`https://x.com/${oldX}`] : []),
			...(actor.instagram
				? [`https://www.instagram.com/${actor.instagram}/`]
				: []),
			...actor.links.map((l) => `${l.label} ${l.url}`),
		].join("\n"),
	};
}

async function linkedOf(db: App.Locals["db"], actor: ManagedActor) {
	return actor.kind === "person" && actor.userId
		? (await linkedSns(db, [actor.userId])).get(actor.userId)
		: undefined;
}

const str = (form: FormData, k: string) => String(form.get(k) ?? "");

export const load: PageServerLoad = async ({ locals, params }) => {
	const actor = await managed(locals, params.handle);
	const members =
		actor.kind === "person" ? [] : await listMembers(locals.db, actor.id);
	// 人のページの X と Misskey は、ログインでつないだアカウント。欄は無く、いま出ているものを見せるだけ
	const linked = await linkedOf(locals.db, actor);
	const values = formValues(actor, linked);
	return {
		linked:
			actor.kind === "person" && linked
				? actorSns({
						xHandle: linked.hasX ? shownSns(actor, linked).xHandle : null,
						misskey: linked.misskey,
						instagram: null,
						links: [],
					}).sns
				: [],
		handle: actor.handle,
		kind: actor.kind,
		headerUrl: mediaUrl(actor.headerKey),
		// 運営が非表示にしている（公開のページは出ていない）
		hidden: actor.hiddenAt !== null,
		wallOpen: actor.wallOpen,
		values,
		members,
		myUserId: locals.session?.user.id ?? null,
	};
};

const IMAGE_TYPES: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
};
const MAX_IMAGE = 5 * 1024 * 1024;

export const actions: Actions = {
	removeMember: async ({ request, locals, params }) => {
		const actor = await managed(locals, params.handle);
		const form = await request.formData();
		const userId = str(form, "userId");
		if (!(await removeMember(locals.db, actor.id, userId)))
			return fail(400, {
				section: "members",
				error: "最後の 1 人は外せません",
			});
		// 自分を外したら、もう編集できないのでページへ
		if (userId === locals.session?.user.id) redirect(303, `/@${actor.handle}`);
		return { section: "members", ok: true };
	},
	// 一緒に営む人を管理者に加える。相手は、まがりに自分のページを持っている人
	addMember: async ({ request, locals, params }) => {
		const actor = await managed(locals, params.handle);
		if (actor.kind === "person") error(404, "見つかりません");
		const form = await request.formData();
		const person = parseHandleInput(str(form, "person"));
		if (!person)
			return fail(400, {
				section: "members",
				error: "加える人の @ID を入れてください",
			});
		const result = await addMember(locals.db, actor.handle, person);
		if ("error" in result)
			return fail(400, { section: "members", error: result.error });
		return { section: "members", ok: true };
	},
	profile: async ({ request, locals, params }) => {
		const actor = await managed(locals, params.handle);
		const form = await request.formData();
		// 人のページの編集画面は、ハコ向けの欄（設備・アクセスなど）を出さない。来なかった欄は今の値を保つ
		const current = formValues(actor, await linkedOf(locals.db, actor));
		const values = readSpaceForm((k) =>
			// 間取りはハコだけのもの。人・団体のページには、送られてきても付けない
			actor.kind !== "space" && k === "floorPlan"
				? ""
				: form.has(k)
					? String(form.get(k))
					: current[k as keyof SpaceFormValues],
		);
		const parsed = parseSpaceForm(values);
		if (!parsed.ok)
			return fail(400, { section: "profile", error: parsed.error, values });
		await updateActorPage(locals.db, actor.id, parsed.values);
		redirect(303, `/@${actor.handle}`);
	},
	header: async ({ request, locals, params }) => {
		const actor = await managed(locals, params.handle);
		const form = await request.formData();
		const file = form.get("header");
		if (!(file instanceof File) || file.size === 0)
			return fail(400, { section: "header", error: "画像を選んでください" });
		const ext = IMAGE_TYPES[file.type];
		if (!ext)
			return fail(400, { section: "header", error: "JPEG / PNG / WebP だけ" });
		if (file.size > MAX_IMAGE)
			return fail(400, { section: "header", error: "5MB までにしてください" });
		const key = `headers/${actor.id}/${shortId()}.${ext}`;
		await env.MEDIA.put(key, await file.arrayBuffer(), {
			httpMetadata: { contentType: file.type },
		});
		await setHeaderKey(locals.db, actor.id, key);
		if (actor.headerKey) await deleteMedia(env.MEDIA, actor.headerKey);
		return { section: "header", ok: true };
	},
	// このページだけの落書きの壁を開ける・閉じる
	wall: async ({ request, locals, params }) => {
		const actor = await managed(locals, params.handle);
		const form = await request.formData();
		await setWallOpen(
			locals.db,
			{ type: "actor", id: actor.id },
			form.get("open") !== null,
		);
		return { section: "wall", ok: true };
	},
	// 壁をまるごと上塗りする
	paint: async ({ locals, params }) => {
		const actor = await managed(locals, params.handle);
		await overpaint(locals.db, wallKey("actor", actor.id));
		return { section: "wall", ok: true, painted: true };
	},
	removeHeader: async ({ locals, params }) => {
		const actor = await managed(locals, params.handle);
		if (actor.headerKey) {
			await setHeaderKey(locals.db, actor.id, null);
			await deleteMedia(env.MEDIA, actor.headerKey);
		}
		return { section: "header", ok: true };
	},
};
