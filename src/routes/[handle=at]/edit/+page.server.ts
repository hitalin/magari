import { env } from "cloudflare:workers";
import { error, fail, redirect } from "@sveltejs/kit";
import { shortId } from "#lib/id.ts";
import { requireActor } from "#lib/server/me.ts";
import {
	getManagedActor,
	listMembers,
	removeMember,
	setHeaderKey,
	updateActorPage,
} from "#lib/server/spaces.ts";
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

const str = (form: FormData, k: string) => String(form.get(k) ?? "");

export const load: PageServerLoad = async ({ locals, params }) => {
	const actor = await managed(locals, params.handle);
	const members =
		actor.kind === "person" ? [] : await listMembers(locals.db, actor.id);
	const values: SpaceFormValues = {
		name: actor.name,
		catch: actor.catch ?? "",
		summary: actor.summary ?? "",
		body: actor.body ?? "",
		facilities: actor.facilities.join(", "),
		address: actor.address ?? "",
		region: actor.region ?? "",
		access: actor.access ?? "",
		hours: actor.hours ?? "",
		closedDays: actor.closedDays ?? "",
		operator: actor.operator ?? "",
		url: actor.url ?? "",
		xHandle: actor.xHandle ?? "",
		instagram: actor.instagram ?? "",
		links: actor.links.map((l) => `${l.label} ${l.url}`).join("\n"),
	};
	return {
		handle: actor.handle,
		kind: actor.kind,
		headerUrl: mediaUrl(actor.headerKey),
		// 運営が非表示にしている（公開のページは出ていない）
		hidden: actor.hiddenAt !== null,
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
	profile: async ({ request, locals, params }) => {
		const actor = await managed(locals, params.handle);
		const form = await request.formData();
		const values = readSpaceForm((k) => (form.get(k) as string | null) ?? null);
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
		if (actor.headerKey) await env.MEDIA.delete(actor.headerKey);
		return { section: "header", ok: true };
	},
	removeHeader: async ({ locals, params }) => {
		const actor = await managed(locals, params.handle);
		if (actor.headerKey) {
			await setHeaderKey(locals.db, actor.id, null);
			await env.MEDIA.delete(actor.headerKey);
		}
		return { section: "header", ok: true };
	},
};
