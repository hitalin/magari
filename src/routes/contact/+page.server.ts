import { fail } from "@sveltejs/kit";
import { parseReportForm } from "#lib/report-form.ts";
import { createReport } from "#lib/server/moderation.ts";
import type { Actions, PageServerLoad } from "./$types";

// 非公式ページの「引き取り」「取り下げ」リンクから来たときは、種別と対象を入れておく
export const load: PageServerLoad = ({ url }) => ({
	kind: url.searchParams.get("kind") ?? "takedown",
	about: (url.searchParams.get("about") ?? "").slice(0, 200),
});

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const values = {
			kind: String(form.get("kind") ?? ""),
			about: String(form.get("about") ?? ""),
			name: String(form.get("name") ?? ""),
			email: String(form.get("email") ?? ""),
			body: String(form.get("body") ?? ""),
			website: String(form.get("website") ?? ""),
		};
		const parsed = parseReportForm(values);
		// bot（ハニーポットに入力あり）は送ったふりをして捨てる
		if (!parsed.ok && parsed.error === "bot") return { sent: true };
		if (!parsed.ok) return fail(400, { error: parsed.error, values });
		await createReport(locals.db, parsed.values);
		return { sent: true };
	},
};
