// 別のサイトから送られた書き込みか。ブラウザは、別のサイトからの POST などに必ず Origin を付ける。
// SvelteKit が自前で確かめるのはフォームの送信だけ（本文の種類が無い要求や JSON は素通りする）なので、
// 書き込みは種類を問わずここで見る。Cookie を持たない呼び出し（curl、Cron）は Origin を付けないので通す。
const READ_ONLY = new Set(["GET", "HEAD", "OPTIONS"]);

export function isCrossSite(request: Request, siteOrigin: string): boolean {
	if (READ_ONLY.has(request.method)) return false;
	const origin = request.headers.get("origin");
	return origin !== null && origin !== siteOrigin;
}
