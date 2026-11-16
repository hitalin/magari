// 運営への連絡（掲載の取り下げ、ページの引き取りなど）のフォーム検証。
export const REPORT_KINDS = ["takedown", "claim", "other"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];
export const REPORT_KIND_LABEL: Record<ReportKind, string> = {
	takedown: "掲載の取り下げ",
	claim: "ページの管理を引き取りたい",
	other: "その他",
};

export type ReportFormValues = {
	kind: string;
	about: string;
	name: string;
	email: string;
	body: string;
	website: string; // ハニーポット。人は入力しない
};
export type ParsedReport = {
	kind: ReportKind;
	// 対象のページや会（@handle や URL）。自由記述
	about: string | null;
	name: string;
	email: string;
	body: string;
};

export function parseReportForm(
	v: ReportFormValues,
): { ok: true; values: ParsedReport } | { ok: false; error: string } {
	if (v.website.trim()) return { ok: false, error: "bot" };
	const about = v.about.trim();
	const name = v.name.trim();
	const email = v.email.trim();
	const body = v.body.trim();
	if (!name) return { ok: false, error: "お名前を入れてください" };
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
		return { ok: false, error: "メールアドレスが正しくありません" };
	if (!body) return { ok: false, error: "内容を入れてください" };
	if (about.length > 200)
		return { ok: false, error: "対象は 200 文字までです" };
	if (name.length > 50) return { ok: false, error: "お名前は 50 文字までです" };
	if (email.length > 200)
		return { ok: false, error: "メールアドレスは 200 文字までです" };
	if (body.length > 5000)
		return { ok: false, error: "内容は 5000 文字までです" };
	const kind = (REPORT_KINDS as readonly string[]).includes(v.kind)
		? (v.kind as ReportKind)
		: "other";
	return {
		ok: true,
		values: { kind, about: about || null, name, email, body },
	};
}
