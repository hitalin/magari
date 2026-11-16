<script lang="ts">
import { flyerDate, flyerStyle, flyerTitleSize } from "#lib/flyer.ts";

// 自動のビラ。リソグラフで刷った二色刷りのイベントフライヤーに見立てて、会の情報だけで描く。
// 型と色の組は会の ID から決まる（flyerStyle）。文字の大きさは紙の幅に合わせる（cqw）。
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
	<div class="flyer v-{style.variant} t-{size}" style="--paper: {style.paper}; --ink: {style.ink}; --spot: {style.spot}">
		<span class="f-shape"></span>
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
		grid-template-rows: auto 1fr auto;
		height: 100%;
		box-sizing: border-box;
		overflow: hidden;
		padding: 8cqw;
		gap: 3cqw;
		background: var(--paper);
		color: var(--ink);
		font-family: var(--font-sans);
		line-height: 1.2;
		isolation: isolate;
	}
	.flyer > :not(.f-shape) {
		position: relative;
		z-index: 1;
		min-width: 0;
		min-height: 0;
	}
	/* 型ごとの図形（丸・色面・縞・網点）。差し色 1 色 */
	.f-shape {
		position: absolute;
		z-index: 0;
		pointer-events: none;
	}
	/* 網点と刷りのざらつき */
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
			color-mix(in srgb, var(--ink) 22%, transparent) 0.9px,
			transparent 1.3px
		);
		background-size: 5px 5px;
		mask-image: linear-gradient(160deg, transparent 55%, #000 100%);
		opacity: 0.4;
	}
	.flyer::after {
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.2 -0.45'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.5'/%3E%3C/svg%3E");
		mix-blend-mode: multiply;
		opacity: 0.42;
	}

	.f-title {
		margin: 0;
		font-weight: 900;
		letter-spacing: 0.01em;
		line-height: 1.14;
		overflow-wrap: anywhere;
		overflow: hidden;
		/* 版ずれ: 差し色の版が少しずれて重なる */
		text-shadow: 0.55cqw 0.45cqw 0 color-mix(in srgb, var(--spot) 60%, transparent);
	}
	.t-xl .f-title {
		font-size: 19cqw;
	}
	.t-l .f-title {
		font-size: 13.5cqw;
	}
	.t-m .f-title {
		font-size: 9.6cqw;
	}
	.t-s .f-title {
		font-size: 7cqw;
	}

	.f-date {
		display: flex;
		align-items: baseline;
		gap: 2cqw;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.01em;
	}
	.f-md {
		font-size: 13cqw;
		line-height: 1;
	}
	.f-dow {
		font-size: 5cqw;
		letter-spacing: 0.1em;
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
		font-size: 5.4cqw;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
	}
	.f-host::before {
		content: "主催 ";
		opacity: 0.7;
	}

	/* 丸: 紙からはみ出す差し色の丸に、ずれた輪が重なる。題は下に大きく */
	.v-sun .f-shape {
		width: 88cqw;
		height: 88cqw;
		right: -27cqw;
		top: -17cqw;
		border-radius: 50%;
		background: var(--spot);
	}
	.v-sun .f-shape::after {
		content: "";
		position: absolute;
		inset: 0;
		translate: -15cqw 13cqw;
		border-radius: 50%;
		border: 1cqw solid var(--ink);
	}
	.v-sun .f-title {
		align-self: end;
	}
	.v-sun .f-meta {
		border-top: 1.4cqw solid var(--ink);
		padding-top: 2.5cqw;
	}

	/* 頭文字: 明朝の題の最初の 1 字だけを差し色で巨大に。日付は右の端に縦で立てる。上辺に斜め縞 */
	.v-initial {
		grid-template-columns: minmax(0, 1fr) auto;
		grid-template-rows: 1fr auto;
		grid-template-areas: "title date" "meta date";
		padding-top: 12cqw;
	}
	.v-initial .f-shape {
		inset: 0 0 auto;
		height: 5cqw;
		background: repeating-linear-gradient(
			-45deg,
			var(--ink) 0 2.2cqw,
			transparent 2.2cqw 4.4cqw
		);
	}
	.v-initial .f-title {
		grid-area: title;
		align-self: center;
		font-family: var(--font-serif);
	}
	.v-initial .f-title::first-letter {
		float: left;
		margin: 0.03em 0.08em 0 0;
		font-size: 3em;
		line-height: 0.9;
		color: var(--spot);
		text-shadow: 0.7cqw 0.6cqw 0 var(--ink);
	}
	.v-initial .f-date {
		grid-area: date;
		writing-mode: vertical-rl;
		padding-left: 3cqw;
		border-left: 1cqw solid var(--ink);
	}
	.v-initial .f-md {
		font-size: 17cqw;
	}
	.v-initial .f-meta {
		grid-area: meta;
	}

	/* 白抜き: 差し色の線だけの巨大な日付を地に敷き、題は墨の札にして少し傾けて貼る */
	.v-outline {
		grid-template-rows: 1fr auto;
	}
	.v-outline .f-shape {
		inset: auto 0 0;
		height: 2.4cqw;
		background: var(--spot);
	}
	.v-outline .f-date {
		position: absolute;
		z-index: 0;
		left: 5cqw;
		top: 6cqw;
		flex-direction: column;
		gap: 1.5cqw;
	}
	.v-outline .f-md {
		font-size: 33cqw;
		letter-spacing: -0.06em;
		line-height: 0.9;
		color: transparent;
		-webkit-text-stroke: 0.8cqw var(--spot);
	}
	.v-outline .f-dow {
		font-size: 6cqw;
	}
	.v-outline .f-title {
		align-self: end;
		justify-self: start;
		max-width: 100%;
		margin-bottom: 6cqw;
		padding: 2.5cqw 3.5cqw;
		background: var(--ink);
		color: var(--paper);
		box-shadow: 1.5cqw 1.5cqw 0 var(--spot);
		text-shadow: none;
		transform: rotate(-5deg);
		transform-origin: left bottom;
	}

	/* 網点: 右下からはみ出す網点の円盤。題は上に大きく、日付は傾けた墨の札 */
	.v-dots .f-shape {
		width: 100cqw;
		height: 100cqw;
		right: -32cqw;
		bottom: -24cqw;
		border-radius: 50%;
		background-image: radial-gradient(var(--spot) 40%, transparent 43%);
		background-size: 4.4cqw 4.4cqw;
	}
	.v-dots .f-date {
		justify-self: start;
		padding: 1.4cqw 3.2cqw;
		background: var(--ink);
		color: var(--paper);
		transform: rotate(-3deg);
	}
	.v-dots .f-md {
		font-size: 11cqw;
	}
	.v-dots .f-title {
		align-self: start;
		margin-top: 4cqw;
	}
	.v-dots .f-meta {
		justify-self: start;
		max-width: 100%;
		padding: 2.5cqw 3.5cqw;
		background: var(--paper);
		border: 0.7cqw solid var(--ink);
	}

	/* 楔（構成主義）: 差し色の楔が墨の円に刺さる。題は紙の色の札にして斜めに貼る */
	.v-wedge .f-shape {
		inset: 0;
		background: radial-gradient(
			circle 31cqw at 87% 52%,
			var(--ink) 99.5%,
			transparent 100%
		);
	}
	.v-wedge .f-shape::after {
		content: "";
		position: absolute;
		inset: 0;
		background: var(--spot);
		clip-path: polygon(0 12%, 78% 50%, 0 74%);
	}
	.v-wedge .f-date {
		justify-self: end;
	}
	.v-wedge .f-title {
		align-self: center;
		justify-self: start;
		max-width: 92%;
		padding: 2cqw 3.5cqw;
		background: var(--paper);
		outline: 0.6cqw solid var(--ink);
		box-shadow: 1.4cqw 1.4cqw 0 var(--ink);
		text-shadow: none;
		transform: rotate(-11deg);
	}
	.v-wedge .f-meta {
		justify-self: start;
		max-width: 100%;
		padding: 2cqw 3cqw;
		background: var(--paper);
		border-left: 2cqw solid var(--ink);
	}

	/* 立て看板: 太い枠に、角ばって傾いた縦書きの大きな字。頭の 1 字だけ差し色。下に差し色の帯で日付 */
	.v-kanban {
		grid-template-rows: 1fr auto auto;
		padding: 9cqw 8cqw 6cqw;
		box-shadow: inset 0 0 0 2.2cqw var(--ink);
	}
	.v-kanban .f-shape {
		display: none;
	}
	.v-kanban .f-title {
		grid-row: 1;
		writing-mode: vertical-rl;
		justify-self: center;
		max-height: 100%;
		line-height: 1.28;
		letter-spacing: 0.04em;
		text-shadow: none;
		transform: skewY(-7deg);
	}
	.v-kanban .f-title::first-letter {
		color: var(--spot);
	}
	.v-kanban.t-xl .f-title {
		font-size: 23cqw;
	}
	.v-kanban.t-l .f-title {
		font-size: 16cqw;
	}
	.v-kanban.t-m .f-title {
		font-size: 11cqw;
	}
	.v-kanban.t-s .f-title {
		font-size: 7.8cqw;
	}
	.v-kanban .f-date {
		grid-row: 2;
		justify-content: space-between;
		margin-inline: -8cqw;
		padding: 1.5cqw 8cqw;
		background: var(--spot);
	}
	.v-kanban .f-meta {
		grid-row: 3;
	}

	/* 同心円（アングラ演劇のポスター）: 差し色の輪が広がって消える。題は明朝の縦書きの短冊 */
	.v-rings {
		grid-template-columns: minmax(0, 1fr) auto;
		grid-template-areas: "date title" ". title" "meta title";
	}
	.v-rings .f-shape {
		inset: 0;
		background: repeating-radial-gradient(
			circle at 36% 56%,
			var(--spot) 0 4.5cqw,
			transparent 4.5cqw 9cqw
		);
		mask-image: radial-gradient(
			circle at 36% 56%,
			#000 52cqw,
			transparent 86cqw
		);
	}
	.v-rings .f-date {
		grid-area: date;
		justify-self: start;
		padding: 1.5cqw 3cqw;
		background: var(--ink);
		color: var(--paper);
	}
	.v-rings .f-md {
		font-size: 11cqw;
	}
	.v-rings .f-title {
		grid-area: title;
		writing-mode: vertical-rl;
		font-family: var(--font-serif);
		justify-self: end;
		max-height: 100%;
		padding: 3cqw 2cqw;
		background: var(--paper);
		border: 1cqw solid var(--ink);
		line-height: 1.2;
		text-shadow: none;
	}
	.v-rings .f-meta {
		grid-area: meta;
		justify-self: start;
		max-width: 100%;
		padding: 2cqw 3cqw;
		background: var(--paper);
		border: 0.6cqw solid var(--ink);
	}

	/* 一色刷り（シルクスクリーン）: 墨 1 色だけ。手で切った版の歪んだ枠、中央に詰めた大きな字、差し色は下線だけ */
	.v-stencil {
		padding: 12cqw 10cqw 11cqw;
		text-align: center;
	}
	.v-stencil .f-shape {
		inset: 4cqw;
		border: 2.2cqw solid var(--ink);
		border-radius: 3cqw 1cqw 4cqw 1.5cqw / 1.5cqw 4cqw 1cqw 3cqw;
	}
	.v-stencil .f-date {
		justify-self: center;
		padding: 1cqw 4.5cqw;
		background: var(--ink);
		color: var(--paper);
		border-radius: 1cqw 2.5cqw 1cqw 2cqw / 2cqw 1cqw 2.5cqw 1cqw;
		transform: rotate(2deg);
	}
	.v-stencil .f-md {
		font-size: 11cqw;
	}
	.v-stencil .f-title {
		align-self: center;
		line-height: 1.08;
		letter-spacing: -0.02em;
		transform: rotate(-3deg);
	}
	.v-stencil .f-meta {
		justify-items: center;
		border-top: 1.4cqw solid var(--spot);
		padding-top: 2.5cqw;
	}

	/* ライブ告知: 墨の地に、差し色の巨大な日付。題は紙の色の帯 */
	.v-gig {
		background: var(--ink);
		color: var(--paper);
	}
	.v-gig::before {
		background-image: radial-gradient(
			color-mix(in srgb, var(--paper) 30%, transparent) 0.9px,
			transparent 1.3px
		);
	}
	.v-gig::after {
		mix-blend-mode: normal;
		opacity: 0.16;
	}
	.v-gig .f-shape {
		top: 0;
		bottom: 0;
		right: 5cqw;
		width: 1cqw;
		background: var(--spot);
	}
	.v-gig .f-date {
		margin: -2cqw 0 0 -1cqw;
		color: var(--spot);
	}
	.v-gig .f-md {
		font-size: 31cqw;
		letter-spacing: -0.06em;
		line-height: 0.85;
	}
	.v-gig .f-dow {
		writing-mode: vertical-rl;
		color: var(--paper);
	}
	.v-gig .f-title {
		align-self: end;
		margin-inline: -8cqw;
		padding: 3cqw 12cqw 3cqw 8cqw;
		background: var(--paper);
		color: var(--ink);
		text-shadow: none;
	}
	.v-gig .f-meta {
		padding-right: 8cqw;
	}
</style>
