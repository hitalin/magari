// R2 の画像（/i/{key}）の縮小版と大きさ。画面とサーバーの両方から使う純粋関数。

// 縮小版の幅。/i/{key}?w= で求められるのはこの 3 つだけ（好きな幅を受けると、変換と置き場が際限なく増える）
export const VARIANT_WIDTHS = [480, 960, 1600] as const;
export type VariantWidth = (typeof VARIANT_WIDTHS)[number];

export function parseVariantWidth(value: string | null): VariantWidth | null {
	const w = Number(value);
	return (VARIANT_WIDTHS as readonly number[]).includes(w)
		? (w as VariantWidth)
		: null;
}

// 縮小版（AVIF）の R2 のキー。初めて求められたときに作って、ここに置く
export function variantKey(key: string, width: VariantWidth): string {
	return `variants/${key}@${width}.avif`;
}

// 元の画像を消すときに、一緒に消すキー
export function variantKeys(key: string): string[] {
	return VARIANT_WIDTHS.map((w) => variantKey(key, w));
}

// <source type="image/avif"> の srcset。R2 の画像でなければ null（そのまま <img> で出す）
export function srcsetOf(src: string): string | null {
	if (!src.startsWith("/i/")) return null;
	return VARIANT_WIDTHS.map((w) => `${src}?w=${w} ${w}w`).join(", ");
}

type Size = { width: number; height: number };

// 上げるときに調べた大きさを、ファイル名に入れておく（k3m9-1200x1700.jpg）。
// <img> に width / height を書いて、読み込む前から場所を取っておくため。表を足さずに済む
export function sizedName(id: string, ext: string, size: Size | null): string {
	return size && size.width > 0 && size.height > 0
		? `${id}-${size.width}x${size.height}.${ext}`
		: `${id}.${ext}`;
}

export function sizeOf(src: string | null | undefined): Size | null {
	const m = src && /-(\d+)x(\d+)\.[a-z]+$/.exec(src);
	return m ? { width: Number(m[1]), height: Number(m[2]) } : null;
}
