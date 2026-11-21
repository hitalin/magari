import { env } from "cloudflare:workers";
import { error, json } from "@sveltejs/kit";
import { desc } from "drizzle-orm";
import { parseStrokes, VISIBLE } from "#lib/graffiti.ts";
import { CACHE_GRAFFITI } from "#lib/server/cache.ts";
import { graffiti } from "#lib/server/db/schema.ts";
import type { RequestHandler } from "./$types";

// 点 2000 個ぶん（1 点は最大 10 文字）に余裕を足した長さ
const MAX_LENGTH = 24_000;

// 地面の落書き。古い順（新しいものが上に描かれる）
export const GET: RequestHandler = async ({ locals }) => {
	const rows = await locals.db
		.select({ id: graffiti.id, d: graffiti.d })
		.from(graffiti)
		.orderBy(desc(graffiti.createdAt))
		.limit(VISIBLE);
	return json(rows.reverse(), { headers: { "cache-control": CACHE_GRAFFITI } });
};

// 落書きを残す。ログイン不要。誰が描いたかは残さない
export const POST: RequestHandler = async ({
	locals,
	request,
	getClientAddress,
}) => {
	const { success } = await env.GRAFFITI_LIMIT.limit({
		key: getClientAddress(),
	});
	if (!success) error(429, "少し休んでから、また描いてください");

	const body = (await request.json().catch(() => null)) as {
		d?: unknown;
	} | null;
	const d = body?.d;
	if (typeof d !== "string" || d.length > MAX_LENGTH || !parseStrokes(d))
		error(400, "落書きの形が不正です");

	const [row] = await locals.db
		.insert(graffiti)
		.values({ d })
		.returning({ id: graffiti.id });
	return json(row, { status: 201 });
};
