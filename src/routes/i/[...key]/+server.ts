import { env } from "cloudflare:workers";
import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

// R2（MEDIA）の画像を返す。キーは乱数なので長くキャッシュしてよい
export const GET: RequestHandler = async ({ params }) => {
	const obj = await env.MEDIA.get(params.key);
	if (!obj) error(404, "見つかりません");
	const headers = new Headers();
	obj.writeHttpMetadata(headers);
	headers.set("etag", obj.httpEtag);
	headers.set("cache-control", "public, max-age=31536000, immutable");
	return new Response(obj.body, { headers });
};
