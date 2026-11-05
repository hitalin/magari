// @better-auth/cli generate 用。本番の createAuth と同じプラグイン構成でスキーマを生成する。
import { passkey } from '@better-auth/passkey';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import { miauth } from '../src/lib/server/miauth.ts';

export const auth = betterAuth({
	baseURL: 'https://magari.cc',
	secret: 'cli-only',
	database: drizzleAdapter(drizzle({} as D1Database), { provider: 'sqlite' }),
	socialProviders: { twitter: { clientId: 'x', clientSecret: 'x' } },
	plugins: [
		passkey({ rpID: 'magari.cc', rpName: 'magari.cc', origin: 'https://magari.cc' }),
		miauth({ appName: 'まがり' })
	]
});
