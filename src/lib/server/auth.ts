import { passkey } from '@better-auth/passkey';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { Db } from './db';
import * as schema from './db/schema';
import { miauth } from './miauth.ts';

export type AuthEnv = {
	PUBLIC_ORIGIN: string;
	BETTER_AUTH_SECRET: string;
	X_CLIENT_ID?: string;
	X_CLIENT_SECRET?: string;
};

// ログインは X と Misskey（MiAuth）だけ。メールは使わない（確認メールの配送が要るため）。
export function createAuth(db: Db, env: AuthEnv) {
	const origin = new URL(env.PUBLIC_ORIGIN);
	return betterAuth({
		baseURL: env.PUBLIC_ORIGIN,
		secret: env.BETTER_AUTH_SECRET,
		database: drizzleAdapter(db, { provider: 'sqlite', schema }),
		emailAndPassword: { enabled: false },
		// 本人によるアカウント削除（メール確認なしで即時）
		user: { deleteUser: { enabled: true } },
		// ログイン中の本人が X / Misskey をつなぐ。メールは使っていないので、メール不一致を理由に拒まない
		account: {
			accountLinking: {
				enabled: true,
				allowDifferentEmails: true,
				trustedProviders: ['twitter', 'miauth']
			}
		},
		socialProviders:
			env.X_CLIENT_ID && env.X_CLIENT_SECRET
				? {
						twitter: {
							clientId: env.X_CLIENT_ID,
							clientSecret: env.X_CLIENT_SECRET,
							// 既定の users.email は Free プランのアプリでは許可されず、X が「アプリにアクセスを許可できません」を返す。
							// メールは使わないので要求しない（無ければ better-auth がダミーを入れる）。
							disableDefaultScope: true,
							scope: ['tweet.read', 'users.read', 'offline.access'],
							// X のアイコンは 48px の _normal で来るので 400px に差し替える
							mapProfileToUser: (profile) => ({
								image: profile.data.profile_image_url?.replace('_normal.', '_400x400.')
							})
						}
					}
				: {},
		plugins: [
			passkey({ rpID: origin.hostname, rpName: 'まがり', origin: env.PUBLIC_ORIGIN }),
			miauth({ appName: 'まがり' })
		]
	});
}

export type Auth = ReturnType<typeof createAuth>;
