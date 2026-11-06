<script lang="ts">
import { flyerDate, flyerStyle, flyerTitleSize } from "#lib/flyer.ts";

// 自動のビラ。コピー機やリソグラフで刷った手作りのチラシに見立てて、会の情報だけで描く。
// 型と紙の色は会の ID から決まる（flyerStyle）。文字の大きさは紙の幅に合わせる（cqw）。
let {
	id,
	title,
	startsAt,
	endsAt,
	allDay,
	place = null,
	host = null,
	count = null,
}: {
	id: string;
	title: string;
	startsAt: string;
	endsAt: string | null;
	allDay: boolean;
	place?: string | null;
	host?: string | null;
	// まとめのビラ（同じ主催者のその日の間の数）
	count?: number | null;
} = $props();

const style = $derived(flyerStyle(id));
const size = $derived(flyerTitleSize(title));
const d = $derived(flyerDate({ startsAt, endsAt, allDay }));
</script>

<!-- 外の箱を寸法の基準（container）にし、余白や文字の大きさは中で cqw を使う -->
<div class="flyer-box" aria-hidden="true">
	<div class="flyer v-{style.variant} t-{size}" style="--paper: {style.paper}; --ink: {style.ink}">
		<div class="f-date"><span class="f-md">{d.date}</span><span class="f-dow">{d.dow}</span></div>
		<p class="f-title">{title}</p>
		<div class="f-meta">
			<p class="f-time">{count ? `この日の間 ${count} 件` : d.time}</p>
			{#if place}<p class="f-place">{place}</p>{/if}
			{#if host}<p class="f-host">{host}</p>{/if}
		</div>
	</div>
</div>

<style>
	.flyer-box {
		aspect-ratio: 1 / 1.414;
		container-type: inline-size;
	}
	.flyer {
		position: relative;
		display: grid;
		height: 100%;
		box-sizing: border-box;
		overflow: hidden;
		padding: 7cqw;
		gap: 3cqw;
		background: var(--paper);
		color: var(--ink);
		font-family: var(--font-sans);
		line-height: 1.15;
		isolation: isolate;
	}
	/* 網点とコピーのざらつき */
	.flyer::before,
	.flyer::after {
		content: "";
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 2;
	}
	.flyer::before {
		background-image: radial-gradient(
			color-mix(in srgb, var(--ink) 30%, transparent) 0.9px,
			transparent 1.3px
		);
		background-size: 5px 5px;
		mask-image: linear-gradient(160deg, transparent 35%, #000 100%);
		opacity: 0.55;
	}
	.flyer::after {
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.2 -0.45'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.5'/%3E%3C/svg%3E");
		mix-blend-mode: multiply;
		opacity: 0.35;
	}

	.f-title {
		margin: 0;
		font-weight: 900;
		letter-spacing: 0.02em;
		overflow-wrap: anywhere;
		overflow: hidden;
		/* 版ずれ */
		text-shadow: 0.7cqw 0.5cqw 0 color-mix(in srgb, var(--ink) 22%, transparent);
	}
	.t-xl .f-title {
		font-size: 17cqw;
	}
	.t-l .f-title {
		font-size: 12.5cqw;
	}
	.t-m .f-title {
		font-size: 9cqw;
	}
	.t-s .f-title {
		font-size: 7cqw;
	}

	.f-date {
		display: flex;
		align-items: baseline;
		gap: 2cqw;
		font-family: var(--font-mono);
		font-weight: 800;
		letter-spacing: -0.03em;
	}
	.f-md {
		font-size: 15cqw;
		line-height: 1;
	}
	.f-dow {
		font-size: 6cqw;
		letter-spacing: 0.08em;
	}
	.f-meta {
		display: grid;
		gap: 1cqw;
		font-size: 4.6cqw;
		font-weight: 700;
	}
	.f-meta p {
		margin: 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.f-time {
		font-family: var(--font-mono);
		font-size: 5.6cqw;
	}
	.f-host::before {
		content: "主催 ";
		opacity: 0.7;
	}

	/* 縦書きの題。右に題、左下に日付 */
	.v-tate {
		grid-template-columns: minmax(0, 1fr) auto;
		grid-template-rows: 1fr auto;
		grid-template-areas: "meta title" "date title";
	}
	.v-tate .f-title {
		grid-area: title;
		writing-mode: vertical-rl;
		font-family: var(--font-serif);
		max-height: 100%;
		justify-self: end;
	}
	.v-tate .f-date {
		grid-area: date;
		flex-direction: column;
		align-items: flex-start;
		gap: 0;
	}
	.v-tate .f-meta {
		grid-area: meta;
		align-content: start;
	}

	/* 大きな日付。上に日付、太いゴシックの題、下に場所 */
	.v-date {
		grid-template-rows: auto 1fr auto;
	}
	.v-date .f-md {
		font-size: 23cqw;
	}
	.v-date .f-title {
		align-self: center;
		border-top: 1.6cqw solid var(--ink);
		padding-top: 3cqw;
	}

	/* 黒地に紙の色の文字。日付は白抜きの判 */
	.v-invert {
		grid-template-rows: auto 1fr auto;
		background: #161514;
		color: var(--paper);
	}
	.v-invert::before {
		background-image: radial-gradient(
			color-mix(in srgb, var(--paper) 35%, transparent) 0.9px,
			transparent 1.3px
		);
	}
	.v-invert::after {
		mix-blend-mode: screen;
		opacity: 0.25;
	}
	.v-invert .f-date {
		justify-self: start;
		padding: 1.5cqw 3cqw;
		background: var(--paper);
		color: #161514;
		transform: rotate(-3deg);
	}
	.v-invert .f-title {
		align-self: center;
		font-family: var(--font-serif);
		text-shadow: 0.7cqw 0.5cqw 0 color-mix(in srgb, var(--paper) 25%, transparent);
	}

	/* 斜めの帯に題 */
	.v-band {
		grid-template-rows: auto 1fr auto;
	}
	.v-band .f-title {
		align-self: center;
		margin-inline: -12cqw;
		padding: 3cqw 14cqw;
		background: var(--ink);
		color: var(--paper);
		transform: rotate(-7deg);
		text-shadow: none;
	}
</style>
