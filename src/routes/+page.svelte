<script lang="ts">
import Flyer from "#lib/components/Flyer.svelte";
import { dayKey, formatWhen } from "#lib/date.ts";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
// ヒーローの右に貼るビラ。近い順に 3 枚。まだ誰も開けていなければ見本を貼る
const SAMPLES = [
	"18時から店にいます",
	"公園でなんもしない",
	"日替わり店長やります",
];
const sampleAt = `${dayKey(new Date())}T18:00:00+09:00`;
const fan = $derived(data.events.slice(0, 3));
// 上を流れる帯。どんな間が開いているか
const WORDS = [
	"間借り店舗",
	"日替わり店長",
	"レンタル○○",
	"プロ○○ヤー",
	"ライブ",
	"自助会",
	"オフ会",
];
</script>

<svelte:head>
	<title>◱ | 今日も、どこかで誰かが開けている。</title>
	<meta name="description" content="今日もどこかで誰かが開けている。行ってもいいし、自分が開けてもいい。間借り店舗・日替わり店長・ライブ・自助会・オフ会を一箇所で。" />
</svelte:head>

<!-- 左に一文とボタン、右にビラ。それ以外は置かない -->
<div class="ticker mt-2" aria-hidden="true">
	<span class="chip chip-tape ticker-label">こんな間</span>
	<span class="ticker-items">
		<span class="ticker-track">
			{#each [...WORDS, ...WORDS] as word, i (i)}<span>{word}</span>{/each}
		</span>
	</span>
</div>
<p class="sr-only">{WORDS.join('、')}。</p>

<section class="landing">
	<div class="text-center md:text-left">
		<h1 class="text-[clamp(1.9rem,4.2vw,2.75rem)] leading-[1.35] whitespace-nowrap">
			今日も、どこかで<br /><span class="tape mr-1 px-3 leading-[1.15]">誰か</span>が開けている。
		</h1>
		<p class="mt-6 text-[1.05rem] leading-loose text-muted">
			行ってもいいし、自分が開けてもいい。<br />ひとこと書けば、ビラが 1 枚できます。
		</p>
		<div class="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 md:justify-start">
			<a href="/new" class="btn btn-primary">とりあえず開ける</a>
			<a href="/home" class="more">開いている所を見る ›</a>
		</div>
	</div>
	<div class="fan" aria-hidden={fan.length === 0}>
		{#each fan as e (e.id)}
			<a href="/e/{e.id}" class="flyer-pin" aria-label="{e.title}（{formatWhen(e)}）">
				{#if e.flyerUrl}
					<img src={e.flyerUrl} alt="" />
				{:else}
					<Flyer id={e.id} title={e.title} startsAt={e.startsAt} endsAt={e.endsAt} allDay={e.allDay} place={e.space?.name ?? e.locationName} host={e.hosts[0]?.name ?? null} />
				{/if}
			</a>
		{:else}
			{#each SAMPLES as title (title)}
				<div class="flyer-pin"><Flyer id={title} {title} startsAt={sampleAt} endsAt={null} allDay={false} /></div>
			{/each}
		{/each}
	</div>
</section>

<style>
	.landing {
		display: grid;
		gap: 3.5rem;
		align-items: center;
		padding-block: 2.5rem 4.5rem;
	}
	@media (min-width: 48rem) {
		.landing {
			grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
			gap: 3rem;
			min-height: calc(100svh - var(--spacing-header) - 12rem);
		}
	}
	/* ビラ 3 枚を少しずらして重ねる。近い会が手前 */
	.fan {
		position: relative;
		width: min(86%, 23rem);
		aspect-ratio: 1 / 1.1;
		margin-inline: auto;
	}
	.fan > :global(*) {
		position: absolute;
		width: 56%;
	}
	.fan > :global(* img) {
		aspect-ratio: 1 / 1.414;
		object-fit: cover;
	}
	.fan > :global(:nth-child(1)) {
		left: 22%;
		top: 14%;
		z-index: 2;
		--tilt: -1.5deg;
	}
	.fan > :global(:nth-child(2)) {
		left: 0;
		top: 4%;
		--tilt: -8deg;
	}
	.fan > :global(:nth-child(3)) {
		right: 0;
		top: 0;
		--tilt: 7deg;
	}
	.fan > :global(a:hover) {
		z-index: 3;
	}
</style>
