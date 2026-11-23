// 主催どうしの関係のメモ（管理者だけが見る）のフォーム検証と表示。
// 持てるのは、もう主催として載っているページどうしの関係だけ。自由記述の欄は置かない（客やスタッフを書き込めないようにするため）
import { parseHandleInput } from "./id";

export const MODERATION_KINDS = ["ng", "mentor", "authority"] as const;
export type ModerationKind = (typeof MODERATION_KINDS)[number];
export const MODERATION_KIND_LABEL: Record<ModerationKind, string> = {
	ng: "共演 NG",
	mentor: "師弟",
	authority: "権威",
};

// a と b は handle。mentor は a が師匠で b が弟子。authority は b を持たない
export type ParsedModeration = {
	kind: ModerationKind;
	a: string;
	b: string | null;
};

export function parseModerationForm(v: {
	kind: string;
	a: string;
	b: string;
}): { ok: true; values: ParsedModeration } | { ok: false; error: string } {
	if (!(MODERATION_KINDS as readonly string[]).includes(v.kind))
		return { ok: false, error: "種別を選んでください" };
	const kind = v.kind as ModerationKind;
	const a = parseHandleInput(v.a);
	if (!a) return { ok: false, error: "1 人目の @ID を入れてください" };
	if (kind === "authority") return { ok: true, values: { kind, a, b: null } };
	const b = parseHandleInput(v.b);
	if (!b) return { ok: false, error: "2 人目の @ID を入れてください" };
	if (a === b) return { ok: false, error: "別々の @ID を入れてください" };
	return { ok: true, values: { kind, a, b } };
}

// 一覧は主催ごとにまとめる。2 人の関係は両方の側に出す。
// role は、その主催から見た相手: mentor は相手が師匠、pupil は相手が弟子
export type ModerationRole = "ng" | "mentor" | "pupil" | "authority";
export const MODERATION_ROLE_LABEL: Record<ModerationRole, string> = {
	ng: "共演 NG",
	mentor: "師匠",
	pupil: "弟子",
	authority: "権威",
};

export function groupModerations<R extends { handle: string }>(
	moderations: { id: string; kind: ModerationKind; a: R; b: R | null }[],
): {
	actor: R;
	items: { id: string; role: ModerationRole; other: R | null }[];
}[] {
	const groups = new Map<
		string,
		{ actor: R; items: { id: string; role: ModerationRole; other: R | null }[] }
	>();
	const put = (actor: R, id: string, role: ModerationRole, other: R | null) => {
		const group = groups.get(actor.handle) ?? { actor, items: [] };
		group.items.push({ id, role, other });
		groups.set(actor.handle, group);
	};
	for (const { id, kind, a, b } of moderations) {
		put(a, id, kind === "mentor" ? "pupil" : kind, b);
		if (b) put(b, id, kind, a);
	}
	return [...groups.values()];
}
