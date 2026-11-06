import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/svelte";

// ブラウザ側の認証クライアント（X ログイン、パスキー）。MiAuth は $fetch で開始 URL をもらって飛ぶ。
export const authClient = createAuthClient({ plugins: [passkeyClient()] });

export async function startMiAuth(
	host: string,
	callbackURL = "/me",
): Promise<string | null> {
	const res = await authClient.$fetch<{ url: string }>("/sign-in/miauth", {
		method: "POST",
		body: { host, callbackURL },
	});
	return res.data?.url ?? null;
}
