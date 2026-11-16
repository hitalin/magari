<script lang="ts">
import {
	flyerDate,
	flyerStyle,
	flyerTitleChunks,
	flyerTitleSize,
} from "#lib/flyer.ts";

// 自動のビラ。二色刷りのイベントフライヤーや、街に貼ってある紙もの（日めくり、戸口の札、会報、貼り紙）に見立てて、会の情報だけで描く。
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
// 折ってよい所ごとに <wbr> を挟む（語の途中で折らない）
const chunks = $derived(flyerTitleChunks(title));
</script>

<!-- 外の箱を寸法の基準（container）にし、余白や文字の大きさは中で cqw を使う -->
<div class="flyer-box" aria-hidden="true">
	<div class="flyer v-{style.variant} t-{size} k-{style.k}" class:dow-sat={d.dow === 'SAT'} class:dow-sun={d.dow === 'SUN'} style="--paper: {style.paper}; --ink: {style.ink}; --spot: {style.spot}">
		<span class="f-shape"></span>
		<div class="f-date">
			<span class="f-md" data-m={d.month} data-d={d.day}>{d.date}</span><span class="f-dow" data-j={d.dowJa}>{d.dow}</span>
			<span class="f-j">{d.month}月{d.day}日（{d.dowJa}）</span>
		</div>
		<p class="f-title">{#each chunks as c, i (i)}{#if i}<wbr />{/if}{c}{/each}</p>
		<div class="f-meta">
			<p class="f-time">{count ? `この日の間 ${count} 件` : d.time}</p>
			{#if place}<p class="f-place">{place}</p>{/if}
			{#if host && host !== place}<p class="f-host">{host}</p>{/if}
		</div>
		{#if style.variant === 'tearoff'}
			<div class="f-tabs">
				{#each [0, 1, 2, 3] as n (n)}<span><b>{d.date}</b>{d.dowJa} {d.start}</span>{/each}
			</div>
		{/if}
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
		/* 折る所は <wbr> で渡す。長すぎる語だけ途中で折る */
		word-break: keep-all;
		line-break: strict;
		overflow-wrap: anywhere;
		text-wrap: balance;
		overflow: hidden;
		/* 最後の行の「_」が切れないように */
		padding-bottom: 0.14em;
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
		font-size: 9.2cqw;
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
	/* 紙ものの型だけが使う日本語の日付 */
	.f-j {
		display: none;
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

	/* ここから下は街の紙ものの型。題には演出をかけず、まっすぐ同じ大きさで置く */

	/* 日めくり: 日付が主役。土曜は青、日曜は赤。数字の大きさは題の長さで変えない */
	.v-himekuri {
		--num: var(--ink);
		padding: 0 7cqw 6cqw;
		gap: 2.5cqw;
	}
	.v-himekuri.dow-sat {
		--num: #23408e;
	}
	.v-himekuri.dow-sun {
		--num: #d3261f;
	}
	.v-himekuri .f-shape {
		inset: 0 0 auto;
		height: 8cqw;
		background:
			radial-gradient(circle at 28% 50%, var(--paper) 1.3cqw, transparent 1.4cqw),
			radial-gradient(circle at 72% 50%, var(--paper) 1.3cqw, transparent 1.4cqw),
			var(--ink);
	}
	.v-himekuri .f-date {
		margin-top: 10.5cqw;
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0;
		padding-bottom: 2cqw;
		border-bottom: 0.8cqw solid var(--ink);
		color: var(--num);
	}
	.v-himekuri .f-md {
		display: contents;
		font-size: 0;
	}
	.v-himekuri .f-md::before {
		content: attr(data-m) "月";
		font-size: 8cqw;
		color: var(--ink);
	}
	.v-himekuri .f-md::after {
		content: attr(data-d);
		grid-column: 1 / -1;
		grid-row: 2;
		text-align: center;
		font-size: 36cqw;
		line-height: 0.86;
		letter-spacing: -0.05em;
	}
	.v-himekuri .f-dow {
		font-size: 0;
	}
	.v-himekuri .f-dow::after {
		content: attr(data-j) "曜日";
		font-size: 6.5cqw;
		letter-spacing: 0;
	}
	.v-himekuri .f-title {
		align-self: center;
		text-shadow: none;
	}
	.v-himekuri.t-xl .f-title {
		font-size: 17cqw;
	}
	.v-himekuri.t-l .f-title {
		font-size: 12.5cqw;
	}
	.v-himekuri.t-s .f-title {
		font-size: 6.4cqw;
	}
	.v-himekuri .f-meta {
		padding-top: 1.5cqw;
	}

	/* 札: 戸口にねじで留めた営業時間の札。枠は差し色で角を丸め（黒い枠は忌中札に寄る）、時刻は罫で囲む（塗りの帯は警告札に寄る） */
	.v-fuda {
		padding: 14cqw 10cqw 10cqw;
		gap: 3cqw;
		text-align: center;
		background:
			radial-gradient(circle at 9cqw 9cqw, var(--ink) 1.5cqw, transparent 1.7cqw),
			radial-gradient(
				circle at calc(100% - 9cqw) 9cqw,
				var(--ink) 1.5cqw,
				transparent 1.7cqw
			),
			radial-gradient(
				circle at 9cqw calc(100% - 9cqw),
				var(--ink) 1.5cqw,
				transparent 1.7cqw
			),
			radial-gradient(
				circle at calc(100% - 9cqw) calc(100% - 9cqw),
				var(--ink) 1.5cqw,
				transparent 1.7cqw
			),
			var(--paper);
	}
	.v-fuda .f-shape {
		inset: 3.5cqw;
		border: 1.3cqw solid var(--spot);
		border-radius: 6cqw;
	}
	.v-fuda .f-date {
		justify-self: center;
	}
	.v-fuda .f-md,
	.v-fuda .f-dow,
	.v-gariban .f-md,
	.v-gariban .f-dow {
		display: none;
	}
	.v-fuda .f-j {
		display: block;
		font-size: 8cqw;
	}
	.v-fuda .f-title {
		align-self: center;
		text-shadow: none;
	}
	.v-fuda.t-l .f-title {
		font-size: 12cqw;
	}
	.v-fuda .f-meta {
		justify-items: center;
	}
	.v-fuda .f-meta p {
		max-width: 100%;
		box-sizing: border-box;
	}
	.v-fuda .f-time {
		justify-self: stretch;
		margin-bottom: 1.5cqw;
		padding: 1.4cqw 0;
		border: 0.9cqw solid var(--spot);
		border-radius: 1.5cqw;
		font-size: 8.6cqw;
	}

	/* おたより: わら半紙に一色刷りの会報。「とき」「ところ」、主催は右下に名前だけ */
	.v-gariban {
		grid-template-rows: auto auto 1fr;
		padding: 10cqw 8cqw 8cqw;
		gap: 4cqw;
	}
	.v-gariban .f-shape {
		inset: 4cqw 6cqw auto;
		height: 2cqw;
		background: radial-gradient(
				circle at 50% 0,
				transparent 1.1cqw,
				var(--ink) 1.1cqw 1.5cqw,
				transparent 1.5cqw
			)
			0 0 / 4cqw 2cqw repeat-x;
	}
	.v-gariban .f-date {
		justify-self: end;
	}
	.v-gariban .f-j {
		display: block;
		font-size: 6.4cqw;
	}
	.v-gariban .f-title {
		align-self: start;
		margin-top: 3cqw;
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
		font-size: 5cqw;
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

	/* ちぎり札: 掲示板の貼り紙。下の短冊に日時を書いて、ちぎって持って帰る。札は傾けず、欠けも作らない */
	.v-tearoff {
		grid-template-rows: auto 1fr auto auto;
		padding: 7cqw 8cqw 0;
		box-shadow: inset 0 3cqw 0 var(--spot);
	}
	.v-tearoff .f-shape {
		display: none;
	}
	.v-tearoff .f-title {
		align-self: center;
		text-shadow: none;
	}
	.f-tabs {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		height: 30cqw;
		margin-inline: -8cqw;
		border-top: 0.4cqw dashed var(--ink);
	}
	.f-tabs span {
		padding-top: 2cqw;
		border-left: 0.3cqw dashed var(--ink);
		text-align: center;
		font-size: 4cqw;
		font-weight: 700;
		line-height: 1.5;
		font-variant-numeric: tabular-nums;
	}
	.f-tabs span:first-child {
		border-left: 0;
	}
	.f-tabs b {
		display: block;
		font-size: 6.6cqw;
		font-weight: 900;
	}

	/* リソ: 同じ差し色の版を二枚ずらして重ね、重なりだけ濃くなる。色面の形は 3 つを回す。題は紙の色で抜く */
	.v-riso .f-shape {
		inset: 10cqw -6cqw 34cqw 16cqw;
		background: var(--spot);
		rotate: -5deg;
	}
	.v-riso .f-shape::after {
		content: "";
		position: absolute;
		inset: -8cqw 34cqw 44cqw -26cqw;
		background: var(--spot);
		opacity: 0.4;
		mix-blend-mode: multiply;
		rotate: 9deg;
	}
	.v-riso.k-1 .f-shape {
		inset: 24cqw 16cqw 20cqw -8cqw;
		rotate: 4deg;
	}
	.v-riso.k-1 .f-shape::after {
		inset: 30cqw -24cqw -12cqw 40cqw;
	}
	.v-riso.k-2 .f-shape {
		inset: 4cqw 10cqw 62cqw -6cqw;
		rotate: -3deg;
	}
	.v-riso.k-2 .f-shape::after {
		inset: 34cqw -18cqw -50cqw 34cqw;
	}
	.v-riso .f-title,
	.v-riso .f-date,
	.v-riso .f-meta {
		justify-self: start;
		max-width: 100%;
		box-sizing: border-box;
		background: var(--paper);
	}
	.v-riso .f-title {
		align-self: center;
		padding: 3cqw 3.5cqw;
		text-shadow: none;
	}
	.v-riso.t-l .f-title {
		font-size: 11.5cqw;
	}
	.v-riso .f-date {
		padding: 1cqw 2.5cqw;
	}
	.v-riso .f-meta {
		padding: 2cqw 2.5cqw;
	}
</style>
