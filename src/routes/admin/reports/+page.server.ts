import { env } from "cloudflare:workers";
import { error, fail } from "@sveltejs/kit";
import { parseHandleInput } from "#lib/id.ts";
import {
	blockHandle,
	deleteReport,
	listBlockedHandles,
	listReports,
	unblockHandle,
} from "#lib/server/moderation.ts";
import type { Actions, PageServerLoad } from "./$types";

// 運営者（ADMIN_HANDLE の本人）だけ。ほかの人には無いページに見せる
function requireAdmin(locals: App.Locals) {
	if (!env.ADMIN_HANDLE || locals.actor?.handle !== env.ADMIN_HANDLE)
		error(404, "見つかりません");
}

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals);
	const [reports, blocked] = await Promise.all([
		listReports(locals.db),
		listBlockedHandles(locals.db),
	]);
	return { reports, blocked };
};

export const actions: Actions = {
	deleteReport: async ({ request, locals }) => {
		requireAdmin(locals);
		const form = await request.formData();
		await deleteReport(locals.db, String(form.get("id") ?? ""));
	},
	block: async ({ request, locals }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const handle = parseHandleInput(String(form.get("handle") ?? ""));
		if (!handle) return fail(400, { error: "ID が正しくありません" });
		const note = String(form.get("note") ?? "").trim();
		await blockHandle(locals.db, handle, note ? note.slice(0, 200) : null);
	},
	unblock: async ({ request, locals }) => {
		requireAdmin(locals);
		const form = await request.formData();
		await unblockHandle(locals.db, String(form.get("handle") ?? ""));
	},
};
