import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/svelte";

// ブラウザ側の認証クライアント（X ログイン、パスキー）。MiAuth は $fetch で開始 URL をもらって飛ぶ。
export const authClient = createAuthClient({ plugins: [passkeyClient()] });

// Misskey の許可画面の URL をもらう。ログイン中に呼ぶと、今のユーザーにつなぐ動きになる
export async function startMiAuth(
	host: string,
	callbackURL: string,
): Promise<{ url: string; host: string } | { error: string }> {
	const res = await authClient.$fetch<{ url: string; host: string }>(
		"/sign-in/miauth",
		{ method: "POST", body: { host, callbackURL } },
	);
	return (
		res.data ?? {
			error: res.error?.message ?? "Misskey につなげませんでした。",
		}
	);
}
