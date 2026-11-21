import { shortId } from "#lib/id.ts";
import { sizedName } from "#lib/media.ts";

const IMAGE_TYPES: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
};
// A4 のスキャンなども上げられるよう、ハコの写真（5MB）より大きめ
const MAX_FLYER = 10 * 1024 * 1024;

// 上げられたフライヤーを受け取れなければ、その理由
export function checkFlyer(file: File): string | null {
	if (!IMAGE_TYPES[file.type]) return "JPEG / PNG / WebP だけ";
	if (file.size > MAX_FLYER) return "10MB までにしてください";
	return null;
}

// R2 に置いてキーを返す。上げるたびにキーが変わるので、カード画像（cardVersion）も作り直される
export async function putFlyer(
	media: R2Bucket,
	eventId: string,
	file: File,
	// 画像の大きさ（imageSize）。分かれば名前に入れる
	size: { width: number; height: number } | null = null,
): Promise<string> {
	const key = `flyers/${eventId}/${sizedName(shortId(), IMAGE_TYPES[file.type], size)}`;
	await media.put(key, await file.arrayBuffer(), {
		httpMetadata: { contentType: file.type },
	});
	return key;
}
