import { variantKeys } from "#lib/media.ts";

// R2 の画像を消す。初めて求められたときに作った縮小版（src/routes/i）も一緒に消す
export async function deleteMedia(media: R2Bucket, key: string): Promise<void> {
	await media.delete([key, ...variantKeys(key)]);
}

// 上げられた画像の大きさ（Cloudflare Images の info。変換の回数には数えられない）。
// 調べられなくても上げるのは止めない: 大きさは <img> の場所取りに使うだけ
export async function imageSize(
	images: ImagesBinding | undefined,
	file: File,
): Promise<{ width: number; height: number } | null> {
	try {
		const info = await images?.info(file.stream());
		return info && "width" in info
			? { width: info.width, height: info.height }
			: null;
	} catch {
		return null;
	}
}
