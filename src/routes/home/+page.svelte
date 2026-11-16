<script lang="ts">
import AreaFilter from "#lib/components/AreaFilter.svelte";
import DayList from "#lib/components/DayList.svelte";
import Empty from "#lib/components/Empty.svelte";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
let area = $state<string[]>([]);
const weekEvents = $derived(
	area.length
		? data.events.filter((e) => e.area !== null && area.includes(e.area))
		: data.events,
);
</script>

<svelte:head>
	<title>これからの間 | ◱</title>
	<meta name="description" content="これから 7 日のあいだに開く間。間借り店舗・日替わり店長・ライブ・自助会・オフ会を一箇所で。" />
</svelte:head>

<div class="section-head mt-4">
	<h1 class="section-title">これから7日の間</h1>
</div>
<div class="mb-8">
	<AreaFilter events={data.events} bind:value={area} />
</div>

{#if weekEvents.length === 0}
	<Empty title={area.length ? `${area.join('・')}では、この7日はまだ誰もくねくねしていません。` : 'まだ誰もくねくねしていません。'} hint="エリアを変えるか、カレンダーで先を見てみてください。" />
{/if}
<DayList events={weekEvents} />
