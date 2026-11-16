import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/svelte";

// ブラウザ側の認証クライアント（X ログイン、パスキー）。
export const authClient = createAuthClient({ plugins: [passkeyClient()] });
