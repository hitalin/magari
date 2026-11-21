// ヘッダーの顔と「編集」リンクの出し分けに使う、表示専用の Cookie。
// 公開ページの HTML は全員に同じものをキャッシュから配るので、だれが見ているかは HTML に入れず、ブラウザがこの Cookie から読む。
// サーバーはこの Cookie を信じない（書き換えても出るのはリンクだけで、編集できるかはセッションで確かめる）。

export const VIEWER_COOKIE = "me";

export type Viewer = {
	loggedIn: boolean;
	// 本人のページ。まだ作っていなければ null
	me: { handle: string; name: string; avatarUrl: string | null } | null;
	// 編集できるページの handle（本人 + 管理しているハコ・団体）
	managed: string[];
};

export const ANONYMOUS: Viewer = { loggedIn: false, me: null, managed: [] };

export function encodeViewer(v: Viewer): string {
	return encodeURIComponent(JSON.stringify({ me: v.me, managed: v.managed }));
}

const str = (v: unknown): v is string => typeof v === "string";

// document.cookie（か Cookie ヘッダー）から読む。無い・壊れている・形が違うときは、黙ってログインしていない側に倒す
export function parseViewer(cookie: string): Viewer {
	const raw = cookie
		.split(/;\s*/)
		.find((c) => c.startsWith(`${VIEWER_COOKIE}=`))
		?.slice(VIEWER_COOKIE.length + 1);
	if (!raw) return ANONYMOUS;
	try {
		const v = JSON.parse(decodeURIComponent(raw));
		if (!v || typeof v !== "object" || Array.isArray(v)) return ANONYMOUS;
		const me = v.me;
		return {
			loggedIn: true,
			me:
				me && str(me.handle) && str(me.name)
					? {
							handle: me.handle,
							name: me.name,
							avatarUrl: str(me.avatarUrl) ? me.avatarUrl : null,
						}
					: null,
			managed: Array.isArray(v.managed) ? v.managed.filter(str) : [],
		};
	} catch {
		return ANONYMOUS;
	}
}
