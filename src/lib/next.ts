// ログインや初回登録のあとに戻る先。サイト内のパスだけ通す（外のサイトへ飛ばす踏み台にしない）。
const FALLBACK = "/me";

export function safeNext(next: string | null | undefined): string {
	return next && /^\/(?![/\\])/.test(next) ? next : FALLBACK;
}

export function withNext(path: string, next?: string | null): string {
	const to = safeNext(next);
	return to === FALLBACK ? path : `${path}?next=${encodeURIComponent(to)}`;
}
