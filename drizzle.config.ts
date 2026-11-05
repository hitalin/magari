import { defineConfig } from 'drizzle-kit';

// マイグレーション SQL の生成のみ。適用は wrangler d1 migrations apply で行う。
export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'sqlite',
	driver: 'd1-http',
	verbose: true,
	strict: true
});
