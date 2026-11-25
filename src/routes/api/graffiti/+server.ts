import { env } from "cloudflare:workers";
import { error, json } from "@sveltejs/kit";
import { parseStrokes, parseWallKey } from "#lib/graffiti.ts";
import { CACHE_GRAFFITI } from "#lib/server/cache.ts";
import { graffiti } from "#lib/server/db/schema.ts";
import { isWallOpen, listScribbles } from "#lib/server/graffiti.ts";
import type { RequestHandler } from "./$types";

// 点 2000 個ぶん（1 点は最大 10 文字）に余裕を足した長さ
const MAX_LENGTH = 24_000;

// 落書き。?wall= が無ければ共有の地面、あればその壁
export const GET: RequestHandler = async ({ locals, url }) => {
	const wall = url.searchParams.get("wall") ?? "";
	if (wall && !parseWallKey(wall)) error(400, "壁の指定が不正です");
	return json(await listScribbles(locals.db, wall), {
		headers: { "cache-control": CACHE_GRAFFITI },
	});
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
		wall?: unknown;
	} | null;
	const d = body?.d;
	if (typeof d !== "string" || d.length > MAX_LENGTH || !parseStrokes(d))
		error(400, "落書きの形が不正です");
	const wall = body?.wall ?? "";
	if (typeof wall !== "string") error(400, "壁の指定が不正です");
	// 分けた壁に描けるのは、持ち主が開けている間だけ
	if (wall && !(await isWallOpen(locals.db, wall)))
		error(404, "この壁は閉じています");

	const [row] = await locals.db
		.insert(graffiti)
		.values({ wall, d })
		.returning({ id: graffiti.id });
	return json(row, { status: 201 });
};
