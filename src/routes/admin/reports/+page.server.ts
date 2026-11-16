import { env } from "cloudflare:workers";
import { error, fail } from "@sveltejs/kit";
import { parseHandleInput } from "#lib/id.ts";
import { parseModerationTarget } from "#lib/report-form.ts";
import {
	blockHandle,
	deleteReport,
	listBlockedHandles,
	listHidden,
	listReports,
	markReportHandled,
	setHidden,
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
	const [reports, blocked, hidden] = await Promise.all([
		listReports(locals.db),
		listBlockedHandles(locals.db),
		listHidden(locals.db),
	]);
	return {
		// 連絡の対象が非表示にできる形（@handle か会の URL）なら、その場で非表示にするボタンを出す
		reports: reports.map((r) => ({
			...r,
			canHide: r.about !== null && parseModerationTarget(r.about) !== null,
		})),
		blocked,
		hidden,
	};
};

export const actions: Actions = {
	deleteReport: async ({ request, locals }) => {
		requireAdmin(locals);
		const form = await request.formData();
		await deleteReport(locals.db, String(form.get("id") ?? ""));
	},
	// 対応済みにする。消さずに、いつ何をしたかを残す
	handle: async ({ request, locals }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const note = String(form.get("note") ?? "").trim();
		await markReportHandled(
			locals.db,
			String(form.get("id") ?? ""),
			note ? note.slice(0, 500) : null,
		);
	},
	// まず非表示にする（消さない）。対象は @handle か会の URL / ID
	hide: async ({ request, locals }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const target = parseModerationTarget(String(form.get("target") ?? ""));
		if (!target)
			return fail(400, { hideError: "@ID か会の URL を入れてください" });
		if (!(await setHidden(locals.db, target, true)))
			return fail(400, { hideError: "その対象は見つかりません" });
	},
	unhide: async ({ request, locals }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const target = parseModerationTarget(String(form.get("target") ?? ""));
		if (target) await setHidden(locals.db, target, false);
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
