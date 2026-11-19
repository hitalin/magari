<script lang="ts">
import { flyerStyle } from "#lib/flyer.ts";
import type { ActorRef } from "#lib/types.ts";

// 一覧の左に出す顔。画像が（相手にもハコにも）無ければ、種別の印を、handle から決まる貼り紙の色（自動のビラと同じ紙と差し色）で出す。
// 同じ相手はいつも同じ色になるので、頭文字が同じ店（エデン各店）も色で見分けられる
// fallbackUrl: 相手に画像が無いときに代わりに出す画像（会のハコのアイコン）
let {
	actor,
	seed = "",
	fallbackUrl = null,
}: {
	actor: ActorRef | null;
	seed?: string;
	fallbackUrl?: string | null;
} = $props();
const src = $derived(actor?.avatarUrl ?? fallbackUrl);

const GLYPH = {
	person: "M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10",
	// ナビの「ハコ」と同じ
	space: "M3 10l2-6h14l2 6M3 10h18M5 10v10h14V10M10 20v-6h4v6",
	group:
		"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.870M16 3.130a4 4 0 0 1 0 7.750",
	// 主催も場も無い会。ナビの「イベント」と同じ
	none: "M3 9a3 3 0 0 0 0 6v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2a3 3 0 0 0 0-6V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2zM14 5v2M14 11v2M14 17v2",
};
const style = $derived(flyerStyle(actor?.handle ?? seed));
</script>

<span class="face" style="background: {style.paper}; color: {style.spot}" aria-hidden="true">
	{#if src}
		<img {src} alt="" loading="lazy" />
	{:else}
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d={GLYPH[actor?.kind ?? 'none']} /></svg>
	{/if}
</span>

<style>
	.face {
		position: absolute;
		top: 0;
		left: 0;
		display: grid;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		overflow: hidden;
		border-radius: 9999px;
	}
	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	svg {
		width: 55%;
		height: 55%;
	}
</style>
