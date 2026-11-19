<script lang="ts">
import {
	type FlyerLook,
	flyerDate,
	flyerStyle,
	flyerTitleChunks,
	flyerTitleSize,
} from "#lib/flyer.ts";

// 自動のビラ。まがりの貼り紙として、アプリと同じ材料（段ボール・ガムテープ・アスファルト・紙）で、会の情報だけで描く。
// 型と差し色は開けた人が選んだもの（look）、無ければ会の ID から決まる（flyerStyle）。文字の大きさは紙の幅に合わせる（cqw）。
let {
	id,
	title,
	startsAt,
	endsAt,
	allDay,
	place = null,
	host = null,
	count = null,
	look = null,
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
	look?: FlyerLook | null;
} = $props();

const style = $derived(flyerStyle(id, look));
const size = $derived(flyerTitleSize(title));
const d = $derived(flyerDate({ startsAt, endsAt, allDay }));
// 折ってよい所ごとに <wbr> を挟む（語の途中で折らない）
const chunks = $derived(flyerTitleChunks(title));
const time = $derived(count ? `この日の間 ${count} 件` : d.time);
</script>

{#snippet words()}{#each chunks as c, i (i)}{#if i}<wbr />{/if}{c}{/each}{/snippet}
{#snippet meta()}
	<div class="f-meta">
		<p class="f-time">{time}</p>
		{#if place}<p class="f-place">{place}</p>{/if}
		{#if host && host !== place}<p class="f-host">{host}</p>{/if}
	</div>
{/snippet}

<!-- 外の箱を寸法の基準（container）にし、余白や文字の大きさは中で cqw を使う -->
<div class="flyer-box" aria-hidden="true">
	<div class="flyer v-{style.variant} t-{size}" style="--paper: {style.paper}; --ink: {style.ink}; --spot: {style.spot}">
		{#if style.variant === 'danbo'}
			<div class="f-tape"><b>{d.date}</b><i>{d.dow}</i></div>
			<!-- 箱に刷ってあった「天地無用」の矢印 -->
			<svg class="f-mark" viewBox="0 0 30 24"><path d="M7 19V6M2.5 10.5 7 5l4.500 5.500M23 19V6M18.500 10.500 23 5l4.500 5.500M1 23h28" /></svg>
			<div class="f-head">
				<p class="f-title">{@render words()}</p>
				<svg class="f-stroke" viewBox="0 0 100 6" preserveAspectRatio="none"><path d="M1 4C18 1.500 30 5.500 52 3S84 2 99 3.500" /></svg>
			</div>
			{@render meta()}
		{:else if style.variant === 'gumtape'}
			<div class="f-date"><span class="f-md">{d.date}</span><span class="f-dow">{d.dow}</span></div>
			<p class="f-title"><span>{@render words()}</span></p>
			{@render meta()}
		{:else if style.variant === 'gariban'}
			<span class="f-wave"></span>
			<p class="f-j">{d.month}月{d.day}日（{d.dowJa}）</p>
			<p class="f-title">{@render words()}</p>
			{@render meta()}
		{:else}
			<div class="f-date">
				<span class="f-month">{d.month}月</span>
				<span class="f-seal">{d.dowJa}</span>
				<span class="f-day">{d.day}</span>
			</div>
			<span class="f-rule"></span>
			<p class="f-title">{@render words()}</p>
			{@render meta()}
		{/if}
	</div>
</div>

<style>
	.flyer-box {
		aspect-ratio: 1 / 1.414;
		container-type: inline-size;
	}
	.flyer {
		/* 布ガムテープ（layout.css の .tape と同じ織り目） */
		--tape:
			repeating-linear-gradient(0deg, rgb(0 0 0 / 0.09) 0 1px, transparent 1px 3px),
			repeating-linear-gradient(90deg, rgb(255 255 255 / 0.1) 0 1px, transparent 1px 4px),
			linear-gradient(100deg, rgb(255 255 255 / 0.14), transparent 45%, rgb(0 0 0 / 0.1)),
			var(--color-accent);
		--tape-ink: #1b1510;
		position: relative;
		display: grid;
		height: 100%;
		box-sizing: border-box;
		overflow: hidden;
		background-color: var(--paper);
		color: var(--ink);
		font-family: var(--font-sans);
		line-height: 1.2;
		isolation: isolate;
	}
	.flyer > * {
		position: relative;
		min-width: 0;
		min-height: 0;
	}
	/* 紙のざらつき */
	.flyer::after {
		content: "";
		position: absolute;
		inset: 0;
		pointer-events: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.2 -0.45'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.5'/%3E%3C/svg%3E");
		mix-blend-mode: multiply;
		opacity: 0.4;
	}

	.f-title {
		margin: 0;
		font-weight: 900;
		letter-spacing: 0.01em;
		line-height: 1.16;
		/* 折る所は <wbr> で渡す。長すぎる語だけ途中で折る */
		word-break: keep-all;
		line-break: strict;
		overflow-wrap: anywhere;
		text-wrap: balance;
		overflow: hidden;
		/* 最後の行の「_」が切れないように */
		padding-bottom: 0.14em;
	}
	.t-xl .f-title {
		font-size: 19cqw;
	}
	.t-l .f-title {
		font-size: 13.5cqw;
	}
	.t-m .f-title {
		font-size: 9.4cqw;
	}
	.t-s .f-title {
		font-size: 7cqw;
	}

	.f-meta {
		display: grid;
		gap: 1cqw;
		font-size: 5cqw;
		font-weight: 700;
	}
	.f-meta p {
		margin: 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.f-time {
		font-size: 7cqw;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
	}

	/* 段ボール: 箱を切った札にマジックで題を書き、日付はガムテープに書いて端から貼る。差し色はマジックの下線だけ */
	.v-danbo {
		grid-template-rows: auto 1fr auto;
		padding: 9cqw 8cqw 6.5cqw;
		gap: 3cqw;
		/* 繊維のざらつき、透けて見える中芯の縦縞、斜めの光（layout.css の .cardboard と同じ作り） */
		background-image:
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='s'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='2' seed='4' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.24  0 0 0 0 0.15  0 0 0 0 0.07  0 0 0 0.9 -0.35'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23s)' opacity='0.22'/%3E%3C/svg%3E"),
			repeating-linear-gradient(90deg, transparent 0 2.4cqw, rgb(70 42 14 / 0.05) 2.4cqw 3cqw),
			linear-gradient(170deg, rgb(255 248 230 / 0.16), transparent 55%);
		box-shadow:
			inset 0 0 0 0.3cqw rgb(90 58 26 / 0.25),
			inset 0 0 7cqw rgb(70 42 14 / 0.16);
	}
	.v-danbo::after {
		opacity: 0.22;
	}
	.f-tape {
		justify-self: start;
		display: flex;
		align-items: baseline;
		gap: 2.2cqw;
		margin-left: -8cqw;
		padding: 1.5cqw 6cqw 1.7cqw 8cqw;
		background: var(--tape);
		color: var(--tape-ink);
		font-family: var(--font-serif);
		font-variant-numeric: tabular-nums;
		clip-path: polygon(0 0, 98.6% 0, 100% 16%, 98.4% 34%, 99.6% 52%, 98.2% 70%, 100% 86%, 98.8% 100%, 0 100%);
		transform: rotate(-2deg);
		transform-origin: 0 50%;
	}
	.f-tape b {
		font-size: 11.5cqw;
		font-weight: 900;
		line-height: 1;
		letter-spacing: -0.01em;
	}
	.f-tape i {
		font-family: var(--font-sans);
		font-size: 4.2cqw;
		font-style: normal;
		font-weight: 900;
		letter-spacing: 0.14em;
	}
	.f-mark {
		position: absolute;
		top: 8cqw;
		right: 7cqw;
		width: 11cqw;
		fill: none;
		stroke: rgb(90 58 26 / 0.32);
		stroke-width: 2.4;
	}
	.f-head {
		display: flex;
		flex-direction: column;
		justify-content: center;
	}
	.v-danbo.t-xl .f-title {
		font-size: 20cqw;
	}
	.v-danbo.t-m .f-title {
		font-size: 10.4cqw;
	}
	.v-danbo.t-s .f-title {
		font-size: 7.6cqw;
	}
	.v-danbo .f-title {
		/* マジックのにじみ */
		text-shadow: 0 0 0.35cqw color-mix(in srgb, var(--ink) 55%, transparent);
	}
	.f-stroke {
		flex: none;
		width: 58%;
		height: 3cqw;
		margin-top: 2cqw;
		overflow: visible;
		fill: none;
		stroke: var(--spot);
		stroke-width: 1.5cqw;
		stroke-linecap: round;
	}
	.f-stroke path {
		vector-effect: non-scaling-stroke;
	}
	/* 箱の折り目（罫線）の下に日時と場所 */
	.v-danbo .f-meta {
		margin-inline: -8cqw;
		padding: 4.5cqw 8cqw 0;
		box-shadow:
			inset 0 0.35cqw 0 rgb(70 42 14 / 0.28),
			inset 0 0.8cqw 0 rgb(255 248 230 / 0.22);
	}

	.v-danbo .f-time {
		font-size: 8.4cqw;
	}

	/* ガムテ: アスファルトと同じ黒い紙。題はガムテープに書いて 1 行ずつ貼り、日付は地面の落書きと同じ色で大きく書く */
	.v-gumtape {
		grid-template-rows: auto 1fr auto;
		padding: 7cqw 8cqw 7cqw;
		gap: 3cqw;
		box-shadow: inset 0 0 0 0.3cqw rgb(241 239 233 / 0.13);
	}
	/* 砂粒（明るい粒を散らす）。上に載るので、字はチョークのようにかすれる */
	.v-gumtape::after {
		background-image:
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='d'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.7' numOctaves='2' seed='19' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.04  0 0 0 0 0.04  0 0 0 0 0.05  0 0 0 1 0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='discrete' tableValues='0.9 0.5 0.15 0 0 0 0 0 0 0'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23d)'/%3E%3C/svg%3E"),
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.6' numOctaves='2' seed='7' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.9  0 0 0 0 0.92  0 0 0 0 0.95  0 0 0 1 0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='discrete' tableValues='0 0 0 0 0 0 0 0 0.3 0.8'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.3'/%3E%3C/svg%3E");
		mix-blend-mode: normal;
		opacity: 0.5;
	}
	.v-gumtape .f-date {
		display: flex;
		align-items: baseline;
		gap: 2.5cqw;
		color: var(--spot);
	}
	.v-gumtape .f-md {
		font-family: var(--font-serif);
		font-size: 29cqw;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		line-height: 0.9;
		letter-spacing: -0.045em;
	}
	.v-gumtape .f-dow {
		color: var(--ink);
		font-size: 4.6cqw;
		font-weight: 900;
		letter-spacing: 0.14em;
		writing-mode: vertical-rl;
	}
	.v-gumtape .f-title {
		align-self: center;
		margin-inline: -8cqw 0;
		padding-block: 0.1em 0.2em;
		color: var(--tape-ink);
		font-family: var(--font-serif);
		line-height: 1.6;
		transform: rotate(-1deg);
		transform-origin: 0 50%;
	}
	.v-gumtape.t-xl .f-title {
		font-size: 16cqw;
	}
	.v-gumtape.t-l .f-title {
		font-size: 12.5cqw;
	}
	/* 1 行がテープ 1 本。左は紙の端まで伸ばす */
	.v-gumtape .f-title span {
		padding: 0.1em 0.3em 0.12em 8cqw;
		/* 右の端は手でちぎった形 */
		border-right: 0.24em solid transparent;
		border-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='20' preserveAspectRatio='none'%3E%3Cpath d='M0 0h23l6 2.500-4 4 5 4-5.500 3.500L30 17l-5 3H0z' fill='%23b47b43'/%3E%3C/svg%3E")
			0 10 0 0 / 0 0.24em 0 0 stretch;
		background: var(--tape);
		background-clip: padding-box;
		-webkit-box-decoration-break: clone;
		box-decoration-break: clone;
	}
	.v-gumtape .f-meta {
		padding-top: 3cqw;
		border-top: 0.3cqw solid rgb(241 239 233 / 0.22);
	}
	.v-gumtape .f-host {
		color: #a9a49c;
	}

	/* わら半紙: 一色刷りのおたより。「とき」「ところ」、主催は右下に名前だけ */
	.v-gariban {
		grid-template-rows: auto auto 1fr auto;
		padding: 5cqw 8cqw 8cqw;
		gap: 4cqw;
	}
	.f-wave {
		height: 2cqw;
		margin-inline: -2cqw;
		background: radial-gradient(
				circle at 50% 0,
				transparent 1.1cqw,
				var(--ink) 1.1cqw 1.5cqw,
				transparent 1.5cqw
			)
			0 0 / 4cqw 2cqw repeat-x;
	}
	.f-j {
		margin: 0;
		text-align: right;
		font-size: 6.4cqw;
		font-weight: 900;
	}
	.v-gariban .f-title {
		align-self: center;
		margin: 1.3cqw;
		padding: 7cqw 3cqw;
		border: 0.7cqw solid var(--ink);
		outline: 0.3cqw solid var(--ink);
		outline-offset: 1cqw;
		text-align: center;
		/* インクのにじみ */
		text-shadow: 0 0 0.3cqw color-mix(in srgb, var(--ink) 70%, transparent);
	}
	.v-gariban.t-xl .f-title {
		font-size: 17cqw;
	}
	.v-gariban.t-l .f-title {
		font-size: 12.5cqw;
	}
	.v-gariban .f-meta {
		align-self: end;
		gap: 0;
	}
	.v-gariban .f-meta p {
		padding: 1.6cqw 0;
		border-bottom: 0.4cqw dashed var(--ink);
		font-size: 5.4cqw;
		font-weight: 900;
	}
	.v-gariban .f-time::before,
	.v-gariban .f-place::before {
		display: inline-block;
		width: 4em;
	}
	.v-gariban .f-time::before {
		content: "とき";
	}
	.v-gariban .f-place::before {
		content: "ところ";
	}
	.v-gariban .f-meta .f-host {
		border-bottom: 0;
		text-align: right;
	}

	/* 貼り紙: 四つ折りの跡がある白い紙。日付が主役で、曜日は差し色の丸シール */
	.v-harigami {
		grid-template-rows: auto auto 1fr auto;
		padding: 8cqw 8cqw 7cqw;
		font-family: var(--font-serif);
		background-image:
			linear-gradient(90deg, transparent 49.6%, rgb(0 0 0 / 0.07) 50%, rgb(255 255 255 / 0.7) 50.4%, transparent 51%),
			linear-gradient(0deg, transparent 49.7%, rgb(255 255 255 / 0.7) 50%, rgb(0 0 0 / 0.07) 50.3%, transparent 50.7%);
	}
	.v-harigami .f-date {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: start;
	}
	.f-month {
		font-size: 8cqw;
		font-weight: 900;
		line-height: 1;
	}
	.f-seal {
		display: grid;
		place-items: center;
		width: 15cqw;
		height: 15cqw;
		margin: -1.5cqw -1cqw 0 0;
		border-radius: 50%;
		background: var(--spot);
		color: var(--paper);
		font-size: 8cqw;
		font-weight: 900;
		line-height: 1;
		box-shadow: 0 0.3cqw 0.5cqw rgb(0 0 0 / 0.16);
		transform: rotate(7deg);
	}
	.f-day {
		grid-column: 1 / -1;
		margin: -3cqw 0 0 -1.6cqw;
		font-size: 44cqw;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		line-height: 0.84;
		letter-spacing: -0.05em;
	}
	.f-rule {
		height: 1.6cqw;
		margin-block: 5cqw 4.5cqw;
		background: var(--spot);
	}
	.v-harigami .f-title {
		align-self: start;
	}
	.v-harigami.t-xl .f-title {
		font-size: 17cqw;
	}
	.v-harigami.t-l .f-title {
		font-size: 12.5cqw;
	}
	.v-harigami .f-meta {
		padding-top: 2.5cqw;
		border-top: 0.4cqw solid var(--ink);
		font-family: var(--font-sans);
	}
</style>
