// 運営への連絡（掲載の取り下げ、ページの引き取りなど）のフォーム検証。
import { isShortId, parseHandleInput } from "./id";

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
	// 返信先。X の ID（メールアドレスでもよい）
	contact: string;
	body: string;
	website: string; // ハニーポット。人は入力しない
};
export type ParsedReport = {
	kind: ReportKind;
	// 対象のページや会（@handle や URL）。自由記述
	about: string | null;
	name: string;
	contact: string;
	body: string;
};

export function parseReportForm(
	v: ReportFormValues,
): { ok: true; values: ParsedReport } | { ok: false; error: string } {
	if (v.website.trim()) return { ok: false, error: "bot" };
	const about = v.about.trim();
	const name = v.name.trim();
	const contact = v.contact.trim();
	const body = v.body.trim();
	if (!name) return { ok: false, error: "お名前を入れてください" };
	if (!contact) return { ok: false, error: "返信先を入れてください" };
	if (!body) return { ok: false, error: "内容を入れてください" };
	if (about.length > 200)
		return { ok: false, error: "対象は 200 文字までです" };
	if (name.length > 50) return { ok: false, error: "お名前は 50 文字までです" };
	if (contact.length > 200)
		return { ok: false, error: "返信先は 200 文字までです" };
	if (body.length > 5000)
		return { ok: false, error: "内容は 5000 文字までです" };
	const kind = (REPORT_KINDS as readonly string[]).includes(v.kind)
		? (v.kind as ReportKind)
		: "other";
	return {
		ok: true,
		values: { kind, about: about || null, name, contact, body },
	};
}

// 運営が非表示にする対象。「@handle」やページの URL ならページ、会の URL か ID なら会
export type ModerationTarget =
	| { type: "actor"; handle: string }
	| { type: "event"; id: string };

export function parseModerationTarget(input: string): ModerationTarget | null {
	const s = input.trim();
	const event = s.match(/\/e\/([^/?#\s]+)/);
	if (event)
		return isShortId(event[1]) ? { type: "event", id: event[1] } : null;
	const at = s.match(/(?:^|\/)@([^/?#\s@]+)/);
	if (at) {
		const handle = parseHandleInput(at[1]);
		return handle ? { type: "actor", handle } : null;
	}
	return isShortId(s) ? { type: "event", id: s } : null;
}
