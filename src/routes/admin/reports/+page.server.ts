import { env } from "cloudflare:workers";
import { error, fail } from "@sveltejs/kit";
import { parseHandleInput } from "#lib/id.ts";
import { parseModerationTarget } from "#lib/report-form.ts";
import { purgeHostModerations } from "#lib/server/host-moderations.ts";
import {
	blockHandle,
	blockTitle,
	deleteReport,
	listBlockedHandles,
	listBlockedTitles,
	listHidden,
	listReports,
	markReportHandled,
	setHidden,
	unblockHandle,
	unblockTitle,
} from "#lib/server/moderation.ts";
import { addMember } from "#lib/server/spaces.ts";
import type { Actions, PageServerLoad } from "./$types";

// 運営者（ADMIN_HANDLE の本人）だけ。ほかの人には無いページに見せる
function requireAdmin(locals: App.Locals) {
	if (!env.ADMIN_HANDLE || locals.actor?.handle !== env.ADMIN_HANDLE)
		error(404, "見つかりません");
}

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals);
	const [reports, blocked, hidden, blockedTitles] = await Promise.all([
		listReports(locals.db),
		listBlockedHandles(locals.db),
		listHidden(locals.db),
		listBlockedTitles(locals.db),
	]);
	return {
		// 連絡の対象が非表示にできる形（@handle か会の URL）なら、その場で非表示にするボタンを出す
		reports: reports.map((r) => ({
			...r,
			canHide: r.about !== null && parseModerationTarget(r.about) !== null,
		})),
		blocked,
		hidden,
		blockedTitles,
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
	// ページの引き取り。申し出た人だと確かめてから、その人をハコ・団体のページの管理者に加える
	handover: async ({ request, locals }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const page = parseHandleInput(String(form.get("page") ?? ""));
		const person = parseHandleInput(String(form.get("person") ?? ""));
		if (!page || !person)
			return fail(400, { handoverError: "ページと人の @ID を入れてください" });
		const result = await addMember(locals.db, page, person);
		if ("error" in result) return fail(400, { handoverError: result.error });
		return {
			handoverDone: `${result.person} を ${result.page} の管理者に加えました。`,
		};
	},
	// 主催どうしの関係のメモを消してほしいと言われたとき。運営は中身を読めず、そのページのぶんをまとめて消すだけ
	purgeModerations: async ({ request, locals }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const handle = parseHandleInput(String(form.get("handle") ?? ""));
		const removed = handle
			? await purgeHostModerations(locals.db, handle)
			: null;
		if (removed === null)
			return fail(400, { moderationsError: "そのページはありません" });
		return { moderationsDone: `@${handle} のメモを ${removed} 件消しました。` };
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
	// 載せないでと言われた主催の名前。題にこの語が入った会は、次の取り込みから写さない
	blockTitle: async ({ request, locals }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const phrase = String(form.get("phrase") ?? "").trim();
		// 1 文字の語は関係のない会まで巻き込む
		if (phrase.replace(/\s+/g, "").length < 2 || phrase.length > 50)
			return fail(400, { titleError: "2〜50 文字で入れてください" });
		const note = String(form.get("note") ?? "").trim();
		await blockTitle(locals.db, phrase, note ? note.slice(0, 200) : null);
	},
	unblockTitle: async ({ request, locals }) => {
		requireAdmin(locals);
		const form = await request.formData();
		await unblockTitle(locals.db, String(form.get("phrase") ?? ""));
	},
};
