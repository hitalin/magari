import { env } from "cloudflare:workers";
import { error, fail, redirect } from "@sveltejs/kit";
import { shortId } from "#lib/id.ts";
import { requireActor } from "#lib/server/me.ts";
import {
	createPlan,
	createPost,
	deleteInquiry,
	deletePlan,
	deletePost,
	getManagedActor,
	listInquiries,
	listPlans,
	listPosts,
	setHeaderKey,
	updateActorPage,
	updatePlan,
} from "#lib/server/spaces.ts";
import {
	parsePlanForm,
	parsePostForm,
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
	const [plans, posts, inquiries] = await Promise.all([
		actor.kind === "space" ? listPlans(locals.db, actor.id) : [],
		listPosts(locals.db, actor.id, 50),
		actor.kind === "person" ? [] : listInquiries(locals.db, actor.id),
	]);
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
		values,
		plans,
		posts,
		inquiries: inquiries.map((i) => ({
			...i,
			createdAt: i.createdAt.toISOString(),
		})),
	};
};

const IMAGE_TYPES: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
};
const MAX_IMAGE = 5 * 1024 * 1024;

export const actions: Actions = {
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
	savePlan: async ({ request, locals, params }) => {
		const actor = await managed(locals, params.handle);
		if (actor.kind !== "space") error(400, "プランは場だけ");
		const form = await request.formData();
		const parsed = parsePlanForm({
			name: str(form, "name"),
			kind: str(form, "kind"),
			priceText: str(form, "priceText"),
			description: str(form, "description"),
		});
		const id = str(form, "id");
		if (!parsed.ok)
			return fail(400, { section: "plan", planId: id, error: parsed.error });
		if (id) await updatePlan(locals.db, actor.id, id, parsed.values);
		else await createPlan(locals.db, actor.id, parsed.values);
		return { section: "plan", ok: true };
	},
	deletePlan: async ({ request, locals, params }) => {
		const actor = await managed(locals, params.handle);
		const form = await request.formData();
		await deletePlan(locals.db, actor.id, str(form, "id"));
		return { section: "plan", ok: true };
	},
	addPost: async ({ request, locals, params }) => {
		const actor = await managed(locals, params.handle);
		const form = await request.formData();
		const parsed = parsePostForm({
			title: str(form, "title"),
			body: str(form, "body"),
		});
		if (!parsed.ok) return fail(400, { section: "post", error: parsed.error });
		await createPost(locals.db, actor.id, parsed.values);
		return { section: "post", ok: true };
	},
	deletePost: async ({ request, locals, params }) => {
		const actor = await managed(locals, params.handle);
		const form = await request.formData();
		await deletePost(locals.db, actor.id, str(form, "id"));
		return { section: "post", ok: true };
	},
	deleteInquiry: async ({ request, locals, params }) => {
		const actor = await managed(locals, params.handle);
		const form = await request.formData();
		await deleteInquiry(locals.db, actor.id, str(form, "id"));
		return { section: "inquiry", ok: true };
	},
};
