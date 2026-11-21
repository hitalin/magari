import { browser } from "$app/env";

// 公開ページの HTML を、元にした API の応答と同じ扱いでキャッシュに載せる（公開なら公開、下書きなら載せない）。
// 決めるのは API の側だけにして、ページごとに書き分けない。サーバーで HTML を組むときだけ効く
export function cacheLike(
	res: Response,
	setHeaders: (headers: Record<string, string>) => void,
) {
	if (browser) return;
	const cacheControl = res.headers.get("cache-control");
	if (cacheControl) setHeaders({ "cache-control": cacheControl });
}
