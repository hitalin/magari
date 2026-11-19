// Misskey のサーバー名。ログイン画面（ブラウザ）と MiAuth プラグイン（サーバー）の両方で使う。

const HOST_RE =
	/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

// 利用者が入れた文字列からサーバーのドメインを取り出す。
// ドメイン、URL、@user@host のどれでもよい。公開ドメイン名の形でなければ null
export function parseMisskeyHost(input: string): string | null {
	const h = input
		.trim()
		.toLowerCase()
		.replace(/^https?:\/\//, "")
		.replace(/\/.*$/, "")
		.replace(/^.*@/, "");
	return HOST_RE.test(h) ? h : null;
}

// 前に使ったサーバー（ブラウザに覚えておく）。新しいものを先頭に 3 つまで
export function rememberHost(hosts: string[], host: string): string[] {
	return [host, ...hosts.filter((h) => h !== host)].slice(0, 3);
}
