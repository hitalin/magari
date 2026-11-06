<script lang="ts">
import { monthKey } from "#lib/calendar.ts";
import AreaFilter from "#lib/components/AreaFilter.svelte";
import DayList from "#lib/components/DayList.svelte";
import Empty from "#lib/components/Empty.svelte";
import MonthGrid from "#lib/components/MonthGrid.svelte";
import { dayKey } from "#lib/date.ts";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
let area = $state<string[]>([]);
const events = $derived(
	area.length
		? data.events.filter((e) => e.area !== null && area.includes(e.area))
		: data.events,
);
// スマホではグリッドの題が読めないので、この月の間を下に並べる
const monthEvents = $derived(
	events.filter((e) =>
		dayKey(e.startsAt).startsWith(monthKey(data.year, data.month)),
	),
);
</script>

<svelte:head>
	<title>{data.year}年{data.month}月 | まがり</title>
</svelte:head>

<section class="mt-4 mb-6">
	<p class="label mb-2">エリアで絞る</p>
	<AreaFilter events={data.events} bind:value={area} />
</section>

<MonthGrid year={data.year} month={data.month} grid={data.grid} {events} />

<section class="mt-10 sm:hidden">
	<h2 class="section-title text-[1.2rem]">この月の間</h2>
	{#if monthEvents.length === 0}
		<div class="mt-6"><Empty title="この月の間はまだありません。" hint="前後の月を見てみてください。" /></div>
	{/if}
	<div class="mt-6">
		<DayList events={monthEvents} />
	</div>
</section>
