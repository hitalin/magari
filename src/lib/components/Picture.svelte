<script lang="ts">
import { sizeOf, srcsetOf } from "#lib/media.ts";

// R2 の画像（/i/…）は、縮めた AVIF を先に出す。AVIF を読めないブラウザと、外の画像（X のアイコンなど）は元のまま。
// 名前に大きさが入っていれば（上げるときに調べたもの）width / height を書いて、読み込む前から場所を取る
let {
	src,
	alt,
	// 画面に出る幅（CSS の長さ）。どの縮小版を取るかをブラウザが決める
	sizes,
	lazy = false,
	class: className = "",
}: {
	src: string;
	alt: string;
	sizes: string;
	lazy?: boolean;
	class?: string;
} = $props();
const srcset = $derived(srcsetOf(src));
const size = $derived(sizeOf(src));
</script>

{#snippet img()}
	<img {src} {alt} width={size?.width} height={size?.height} loading={lazy ? 'lazy' : undefined} decoding="async" class={className} />
{/snippet}

{#if srcset}
	<!-- picture は箱を作らせず、中の img だけを今までどおりに並べる -->
	<picture class="contents"><source type="image/avif" {srcset} {sizes} />{@render img()}</picture>
{:else}
	{@render img()}
{/if}
