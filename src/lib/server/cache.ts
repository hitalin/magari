// 公開の応答は、Worker の手前のキャッシュ（Workers Cache。wrangler.jsonc の cache）に載せる。
// キャッシュの鍵は URL だけで、Cookie は見ない。だから載せてよいのは、だれが見ても同じ中身の応答だけ。

// 公開ページと公開 JSON 用。ブラウザには持たせず（max-age=0）、キャッシュには 5 分置く。
// 書き込みがあれば purge で消すので、5 分は「purge が届かなかったときに古い中身が残る上限」と、
// 「いまから先」の一覧が時間で古くなる上限を兼ねる。
// stale-while-revalidate は付けない: 直した直後に、古い内容が先に出てしまう。
export const CACHE_PUBLIC = "public, max-age=0, s-maxage=300";

// 落書き。描くたびに purge すると回数の上限に当たるので、時間で切れるだけにする。
// 描いた本人は、切れるまで別の URL で取り直す（Graffiti.svelte）。ほかの人には WebSocket で届いている
export const CACHE_GRAFFITI = "public, max-age=0, s-maxage=60";

// 書き込みで消す応答に付ける札（Cache-Tag）
export const PURGE_TAG = "data";

// 応答に付けるキャッシュのヘッダー。公開と書いた応答だけを通し、ほかは必ず載せない側に倒す
// （Workers Cache は cache-control の無い 200 を既定で 2 時間持つ）
export function cacheHeaders(
	cacheControl: string | null,
	pathname: string,
): Record<string, string> {
	if (!cacheControl?.includes("public"))
		return { "cache-control": "private, no-store" };
	// 中身の変わらない画像（/i/…、版つきのカード画像）と落書きは、書き込みでは消さない
	if (cacheControl.includes("immutable") || pathname === "/api/graffiti")
		return { "cache-control": cacheControl };
	return { "cache-control": cacheControl, "cache-tag": PURGE_TAG };
}

// 公開の中身を変えない書き込み
const QUIET = [
	/^\/api\/graffiti/,
	/^\/api\/auth\//,
	/^\/logout$/,
	/^\/contact$/,
];

// この要求のあとでキャッシュを消すか。ログイン中の人か Cron（/api/admin/…）の、通った書き込み（GET 以外）なら、どれでも消す。
// 書き込みの種類ごとに呼び分けないのは、呼び忘れた所だけ古い中身が残るのを防ぐため。
// ログインしていない人の POST は数えない（公開の中身を変えられないうえ、purge の回数の上限を使い切られる）
export function shouldPurge(
	method: string,
	status: number,
	pathname: string,
	loggedIn: boolean,
): boolean {
	if (method === "GET" || method === "HEAD" || method === "OPTIONS")
		return false;
	if (!loggedIn && !pathname.startsWith("/api/admin/")) return false;
	return status < 400 && !QUIET.some((re) => re.test(pathname));
}

// purge が世界中に届くまでの待ち。本番で測ると、purge が返ってから 0.3 秒ほどは古い応答がまだ出た（2026-11-22）
export const PURGE_SETTLE_MS = 500;
