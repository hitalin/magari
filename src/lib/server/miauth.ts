import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthEndpoint, getSessionFromCtx } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { handleOAuthUserInfo } from 'better-auth/oauth2';

// Misskey の MiAuth でログインする better-auth プラグイン。
// 事前登録なし。任意のサーバーに「このアプリを許可しますか」を出し、戻ってきたセッション ID を
// サーバー側で照会してユーザーを確定する。X など他のソーシャルログインと同じ仕組みでセッションを発行する。
// ログイン中に呼ばれたときは、新しいユーザーを作らず今のユーザーに Misskey アカウントをつなぐ。
//
//   POST /sign-in/miauth { host, callbackURL } → { url }   ブラウザはこの URL へ飛ぶ
//   GET  /miauth/callback?session=...            Misskey から戻る。ユーザーを作って callbackURL へ

const PROVIDER_ID = 'miauth';
const STATE_TTL_MS = 10 * 60_000;
const HOST_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

// 利用者が入れたサーバー名。スキームやパスは落とし、公開ドメイン名の形だけ通す
export function normalizeHost(input: string): string | null {
	const h = input
		.trim()
		.toLowerCase()
		.replace(/^https?:\/\//, '')
		.replace(/\/.*$/, '');
	return HOST_RE.test(h) ? h : null;
}

type MiAuthCheck = {
	ok: boolean;
	token?: string;
	user?: { id: string; username: string; name: string | null; avatarUrl: string | null };
};

type State = { host: string; callbackURL: string; linkUserId: string | null };

export const miauth = (opts: { appName: string }) =>
	({
		id: PROVIDER_ID,
		endpoints: {
			signInMiAuth: createAuthEndpoint('/sign-in/miauth', { method: 'POST' }, async (ctx) => {
				const body = (ctx.body ?? {}) as { host?: string; callbackURL?: string };
				const host = normalizeHost(body.host ?? '');
				if (!host) throw new APIError('BAD_REQUEST', { message: 'サーバー名が正しくありません' });
				const callbackURL = body.callbackURL?.startsWith('/') ? body.callbackURL : '/';
				const current = await getSessionFromCtx(ctx);
				const state: State = { host, callbackURL, linkUserId: current?.user.id ?? null };

				const session = crypto.randomUUID();
				await ctx.context.internalAdapter.createVerificationValue({
					identifier: `${PROVIDER_ID}:${session}`,
					value: JSON.stringify(state),
					expiresAt: new Date(Date.now() + STATE_TTL_MS)
				});

				const url = new URL(`https://${host}/miauth/${session}`);
				url.searchParams.set('name', opts.appName);
				// Misskey の許可画面に出すアプリのアイコン
				url.searchParams.set(
					'icon',
					`${ctx.context.baseURL.replace(/\/api\/auth$/, '')}/icon-512.png`
				);
				url.searchParams.set('callback', `${ctx.context.baseURL}/miauth/callback`);
				url.searchParams.set('permission', 'read:account');
				return ctx.json({ url: url.toString(), redirect: true });
			}),

			miAuthCallback: createAuthEndpoint('/miauth/callback', { method: 'GET' }, async (ctx) => {
				const site = ctx.context.baseURL.replace(/\/api\/auth$/, '');
				const fail = (reason: string): never => {
					throw ctx.redirect(`${site}/login?error=${reason}`);
				};

				const session = String((ctx.query as { session?: string } | undefined)?.session ?? '');
				if (!/^[0-9a-f-]{36}$/.test(session)) return fail('miauth_state');

				const identifier = `${PROVIDER_ID}:${session}`;
				const stored = await ctx.context.internalAdapter.findVerificationValue(identifier);
				if (!stored || stored.expiresAt < new Date()) return fail('miauth_state');
				await ctx.context.internalAdapter.deleteVerificationByIdentifier(identifier);
				const { host, callbackURL, linkUserId } = JSON.parse(stored.value) as State;

				const res = await fetch(`https://${host}/api/miauth/${session}/check`, { method: 'POST' });
				const check = (res.ok ? await res.json() : { ok: false }) as MiAuthCheck;
				const me = check.ok ? check.user : undefined;
				if (!me) return fail('miauth_denied');
				const accountId = `${host}:${me.id}`;

				if (linkUserId) {
					const existing = await ctx.context.internalAdapter.findAccountByKey({
						providerId: PROVIDER_ID,
						accountId
					});
					if (existing && existing.userId !== linkUserId) return fail('miauth_linked_elsewhere');
					if (!existing) {
						await ctx.context.internalAdapter.linkAccount({
							userId: linkUserId,
							providerId: PROVIDER_ID,
							accountId,
							accessToken: check.token
						});
					}
					throw ctx.redirect(`${site}${callbackURL}`);
				}

				const result = await handleOAuthUserInfo(ctx, {
					userInfo: {
						id: accountId,
						name: me.name || me.username,
						// Misskey はメールを返さない。内部用の識別子（送信には使わない）
						email: `${me.username}@${host}`,
						emailVerified: false,
						image: me.avatarUrl ?? undefined
					},
					account: { providerId: PROVIDER_ID, accountId, accessToken: check.token },
					callbackURL
				});
				if (result.error || !result.data) return fail('miauth_user');
				await setSessionCookie(ctx, result.data);
				throw ctx.redirect(`${site}${callbackURL}`);
			})
		}
	}) satisfies BetterAuthPlugin;
