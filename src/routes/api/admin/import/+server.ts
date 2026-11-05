import { env } from 'cloudflare:workers';
import { error, json } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/index.ts';
import { runImports } from '#lib/server/import/run.ts';
import type { RequestHandler } from './$types';

// 手動で取り込みを走らせる（Cron と同じ処理）。Authorization: Bearer <IMPORT_TOKEN>
export const POST: RequestHandler = async ({ request }) => {
	const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
	if (!env.IMPORT_TOKEN || token !== env.IMPORT_TOKEN) error(401, 'unauthorized');
	// 書き込みは primary へ
	const results = await runImports(getDb(env.DB));
	return json({ ranAt: new Date().toISOString(), results });
};
