// Service Worker（src/service-worker/index.ts）の決め事。純粋関数にして、ここだけテストする。
// 回線があれば、いつも回線の応答を出す（中止や変更を、古い中身より先に見せる）。回線が切れているときだけ、前に見たものを出す。

export type Strategy = "network-first" | "cache-first";

// 触らない所。ログインと運営の口、落書き（描くそばから変わる）、画像（大きい。ブラウザ自身のキャッシュに任せる）、Service Worker 自身
const SKIP = [
	/^\/api\/(auth|admin|graffiti)(\/|$)/,
	/^\/i\//,
	/\/og\.png$/,
	/^\/service-worker\.js$/,
];

// この要求をどう扱うか。null なら Service Worker は手を出さず、ブラウザに任せる
export function strategy(
	method: string,
	url: URL,
	origin: string,
): Strategy | null {
	if (method !== "GET" || url.origin !== origin) return null;
	if (SKIP.some((re) => re.test(url.pathname))) return null;
	// 名前に中身のハッシュが入っていて、同じ URL なら中身は変わらない
	if (url.pathname.startsWith("/_app/immutable/")) return "cache-first";
	return "network-first";
}

// 取っておいてよい応答か。サーバーが「公開」と書いたもの（src/lib/server/cache.ts）だけ。
// 本人だけの応答（/me、下書き）は端末に残さない
export function keepable(status: number, cacheControl: string | null): boolean {
	return status === 200 && !!cacheControl?.includes("public");
}

// 取っておいた数が上限を超えたら捨てるもの。keys は古い順（Cache の keys() の並び）
export function trimmed<T>(keys: readonly T[], max: number): T[] {
	return keys.slice(0, Math.max(0, keys.length - max));
}
