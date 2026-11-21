import { env } from "cloudflare:workers";
import { error } from "@sveltejs/kit";
import { parseVariantWidth, variantKey } from "#lib/media.ts";
import type { RequestHandler } from "./$types";

const IMMUTABLE = "public, max-age=31536000, immutable";

function served(obj: R2ObjectBody, cacheControl: string): Response {
	const headers = new Headers();
	obj.writeHttpMetadata(headers);
	headers.set("etag", obj.httpEtag);
	headers.set("cache-control", cacheControl);
	return new Response(obj.body, { headers });
}

// R2（MEDIA）の画像を返す。キーは乱数なので長くキャッシュしてよい。
// ?w=480|960|1600 なら、その幅までに縮めた AVIF を返す（src/lib/media.ts）。
// 縮小版は初めて求められたときに 1 度だけ作って R2 に置くので、同じ画像・同じ幅の変換は 1 回きり
export const GET: RequestHandler = async ({ params, url }) => {
	const width = parseVariantWidth(url.searchParams.get("w"));
	if (width) {
		const made = await env.MEDIA.get(variantKey(params.key, width));
		if (made) return served(made, IMMUTABLE);
	}
	const obj = await env.MEDIA.get(params.key);
	if (!obj) error(404, "見つかりません");
	if (!width) return served(obj, IMMUTABLE);

	// 元と縮小版に同じ本文を流すので、分けておく
	const [toTransform, original] = obj.body.tee();
	try {
		const output = await env.IMAGES.input(toTransform)
			// 元より大きくはしない
			.transform({ width, fit: "scale-down" })
			.output({ format: "image/avif", quality: 65 });
		const type = output.contentType();
		const bytes = await new Response(output.image()).arrayBuffer();
		await original.cancel();
		await env.MEDIA.put(variantKey(params.key, width), bytes, {
			httpMetadata: { contentType: type },
		});
		return new Response(bytes, {
			headers: { "content-type": type, "cache-control": IMMUTABLE },
		});
	} catch (e) {
		// 変換できなかった（月の無料枠を使い切った、大きすぎる、など）。元の画像を返し、しばらくしてからまた試す
		console.error("image variant failed", params.key, width, e);
		const headers = new Headers();
		obj.writeHttpMetadata(headers);
		headers.set("cache-control", "public, max-age=3600");
		return new Response(original, { headers });
	}
};
