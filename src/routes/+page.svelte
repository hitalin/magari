<script lang="ts">
import logo from '#lib/assets/logo.svg';
import AreaFilter from '#lib/components/AreaFilter.svelte';
import DayList from '#lib/components/DayList.svelte';
import MonthGrid from '#lib/components/MonthGrid.svelte';
import type { PageProps } from './$types';

let { data }: PageProps = $props();
let area = $state<string | null>(null);
const byArea = <T extends { area: string | null }>(list: T[]) =>
	area ? list.filter((e) => e.area === area) : list;
const monthEvents = $derived(byArea(data.calendar.events));
const weekEvents = $derived(byArea(data.events));
</script>

<svelte:head>
	<title>これからの間 | まがり</title>
	<meta name="description" content="間借り店舗・日替わり店長・レンタル○○・プロ○○ヤー・自助会・オフ会の間を一箇所で。" />
</svelte:head>

<section class="dots -mx-4 px-4 pt-10 pb-16 text-center">
	<img src={logo} alt="まがり" class="mx-auto mb-6 h-32 w-32 drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)] sm:h-40 sm:w-40" />
	<h1 class="text-[clamp(1.9rem,6vw,3.4rem)] leading-[1.25]">
		誰でも、<br />その日の<span class="tape mx-1 px-3 leading-[1.15]">主催者</span>に。
	</h1>
	<p class="mt-6 text-[0.95rem] leading-loose tracking-[0.12em] text-muted">
		{#each ['間借り店舗', '日替わり店長', 'レンタル○○', 'プロ○○ヤー', '自助会', 'オフ会'] as word, i (word)}<span class="whitespace-nowrap">{word}{i < 5 ? '、' : '。'}</span>{/each}<br />
		ハコを持たない人の間と、<br class="sm:hidden" />ハコを貸す人の空き枠を、<br />ここに集める。
	</p>
</section>

<section class="mb-8">
	<p class="label mb-2">エリアで絞る</p>
	<AreaFilter events={data.calendar.events} bind:value={area} />
</section>

<section class="mb-12">
	<MonthGrid year={data.calendar.year} month={data.calendar.month} grid={data.calendar.grid} events={monthEvents} compact />
	<p class="mt-3 text-right text-sm"><a href="/calendar" class="more">カレンダーで見る ›</a></p>
</section>

<div class="section-head">
	<h2 class="section-title">これから7日の間</h2>
	<a href="/calendar" class="more">その先はカレンダーで ›</a>
</div>

{#if weekEvents.length === 0}
	<p class="text-muted">{area ? `${area}では、この7日はまだ誰もくねくねしていません。` : 'まだ誰もくねくねしていません。'}</p>
{/if}
<DayList events={weekEvents} />
