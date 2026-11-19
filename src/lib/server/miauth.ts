import type { BetterAuthPlugin } from "better-auth";
import {
	APIError,
	createAuthEndpoint,
	getSessionFromCtx,
} from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { handleOAuthUserInfo } from "better-auth/oauth2";
import { parseMisskeyHost } from "../misskey.ts";
import { safeNext } from "../next.ts";
import { adoptAccount, type IsEmptyUser } from "./link-empty-user.ts";

// Misskey の MiAuth でログインする better-auth プラグイン。
// 事前登録なし。任意のサーバーに「このアプリを許可しますか」を出し、戻ってきたセッション ID を
// サーバー側で照会してユーザーを確定する。X など他のソーシャルログインと同じ仕組みでセッションを発行する。
// ログイン中に呼ばれたときは、新しいユーザーを作らず今のユーザーに Misskey アカウントをつなぐ（いくつでも）。
//
//   POST /sign-in/miauth { host, callbackURL } → { url }   ブラウザはこの URL へ飛ぶ
//   GET  /miauth/callback?session=...            Misskey から戻る。ユーザーを確定して callbackURL へ
//
// account.accountId は "username@host"（Misskey の username は変えられない）。/me でそのまま見せる。
// Misskey のトークンは使わないので保存しない。

const PROVIDER_ID = "miauth";
const STATE_TTL_MS = 10 * 60_000;

type MiAuthCheck = {
	ok: boolean;
	user?: {
		username: string;
		name: string | null;
		avatarUrl: string | null;
	};
};

// Workers の fetch は User-Agent を付けない。付いていない要求を 403 で断るサーバーがある（yami.ski など）
const USER_AGENT = "magari.cc (MiAuth)";

type State = { host: string; callbackURL: string; linkUserId: string | null };

// MiAuth の画面へ飛ばす前に、Misskey（とその派生）のサーバーか確かめる。違えば飛んだ先で 404 になるだけなので
async function isMisskey(host: string): Promise<boolean> {
	try {
		const res = await fetch(`https://${host}/api/meta`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"user-agent": USER_AGENT,
			},
			body: JSON.stringify({ detail: false }),
			signal: AbortSignal.timeout(5000),
		});
		if (!res.ok) return false;
		const meta = (await res.json()) as { version?: unknown };
		return typeof meta.version === "string";
	} catch {
		return false;
	}
}

export const miauth = (opts: {
	appName: string;
	// まだ何も作っていないユーザーか（ページも会も無い）。
	// 間違えて別の Misskey アカウントで入って出来た空のユーザーは、つなぐときに今のユーザーへ寄せる
	isEmptyUser: IsEmptyUser;
}) =>
	({
		id: PROVIDER_ID,
		endpoints: {
			signInMiAuth: createAuthEndpoint(
				"/sign-in/miauth",
				{ method: "POST" },
				async (ctx) => {
					const body = (ctx.body ?? {}) as {
						host?: string;
						callbackURL?: string;
					};
					const host = parseMisskeyHost(body.host ?? "");
					if (!host)
						throw new APIError("BAD_REQUEST", {
							message:
								"サーバー名が正しくありません。misskey.io のようなドメインか、@you@misskey.io を入れてください。",
						});
					if (!(await isMisskey(host)))
						throw new APIError("BAD_REQUEST", {
							message: `${host} は Misskey のサーバーとして応答しませんでした。綴りを確かめてください。`,
						});
					const current = await getSessionFromCtx(ctx);
					const state: State = {
						host,
						callbackURL: safeNext(body.callbackURL),
						linkUserId: current?.user.id ?? null,
					};

					const session = crypto.randomUUID();
					await ctx.context.internalAdapter.createVerificationValue({
						identifier: `${PROVIDER_ID}:${session}`,
						value: JSON.stringify(state),
						expiresAt: new Date(Date.now() + STATE_TTL_MS),
					});

					const url = new URL(`https://${host}/miauth/${session}`);
					url.searchParams.set("name", opts.appName);
					// Misskey の許可画面に出すアプリのアイコン
					url.searchParams.set(
						"icon",
						`${ctx.context.baseURL.replace(/\/api\/auth$/, "")}/icon-512.png`,
					);
					url.searchParams.set(
						"callback",
						`${ctx.context.baseURL}/miauth/callback`,
					);
					url.searchParams.set("permission", "read:account");
					return ctx.json({ url: url.toString(), host });
				},
			),

			miAuthCallback: createAuthEndpoint(
				"/miauth/callback",
				{ method: "GET" },
				async (ctx) => {
					const site = ctx.context.baseURL.replace(/\/api\/auth$/, "");
					// 失敗は元の画面で伝える（つなぐ途中なら /me、ログインなら /login）
					let back = `${site}/login?`;
					const fail = (reason: string): never => {
						throw ctx.redirect(`${back}error=${reason}`);
					};

					const session = String(
						(ctx.query as { session?: string } | undefined)?.session ?? "",
					);
					if (!/^[0-9a-f-]{36}$/.test(session)) return fail("miauth_state");

					const identifier = `${PROVIDER_ID}:${session}`;
					const stored =
						await ctx.context.internalAdapter.findVerificationValue(identifier);
					if (!stored || stored.expiresAt < new Date())
						return fail("miauth_state");
					await ctx.context.internalAdapter.deleteVerificationByIdentifier(
						identifier,
					);
					const { host, callbackURL, linkUserId } = JSON.parse(
						stored.value,
					) as State;
					back = linkUserId
						? `${site}/me?`
						: `${site}/login?next=${encodeURIComponent(callbackURL)}&`;

					const res = await fetch(
						`https://${host}/api/miauth/${session}/check`,
						{ method: "POST", headers: { "user-agent": USER_AGENT } },
					).catch(() => null);
					const check = (
						res?.ok ? await res.json() : { ok: false }
					) as MiAuthCheck;
					const me = check.ok ? check.user : undefined;
					if (!me) return fail("miauth_denied");
					if (!/^\w{1,64}$/.test(me.username)) return fail("miauth_user");
					const accountId = `${me.username.toLowerCase()}@${host}`;
					const key = { providerId: PROVIDER_ID, accountId };
					const adapter = ctx.context.internalAdapter;
					const existing = await adapter.findAccountByKey(key);

					if (linkUserId) {
						if (existing && existing.userId !== linkUserId) {
							const adopted = await adoptAccount(
								adapter,
								existing,
								linkUserId,
								opts.isEmptyUser,
							);
							if (!adopted) return fail("miauth_linked_elsewhere");
						} else if (!existing) {
							await adapter.linkAccount({ ...key, userId: linkUserId });
						}
						throw ctx.redirect(`${site}${callbackURL}`);
					}

					// Misskey はメールを返さない。内部用の識別子（送信には使わない）
					const email = accountId;
					// 同じ識別子のユーザーがいるのにつながっていない: 前にこの Misskey で始めた人。
					// ログイン方法が 1 つも残っていなければ本人に戻す。残っていれば、本人が外したものなので通さない
					const former = existing
						? null
						: await adapter.findUserByEmail(email, { includeAccounts: true });
					if (former && former.accounts.length > 0)
						return fail("miauth_unlinked");

					const result = await handleOAuthUserInfo(ctx, {
						userInfo: {
							id: accountId,
							name: me.name || me.username,
							email,
							emailVerified: false,
							image: me.avatarUrl ?? undefined,
						},
						account: key,
						callbackURL,
						...(former
							? {
									selectedUser: { userId: former.user.id, profile: "preserve" },
								}
							: {}),
					});
					if (result.error || !result.data) return fail("miauth_user");
					await setSessionCookie(ctx, result.data);
					throw ctx.redirect(`${site}${callbackURL}`);
				},
			),
		},
	}) satisfies BetterAuthPlugin;
