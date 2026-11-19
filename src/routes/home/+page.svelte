<script lang="ts">
import {
	areaFilter,
	emptyTitle,
	inArea,
	inQuery,
} from "#lib/area-filter.svelte.ts";
import DayList from "#lib/components/DayList.svelte";
import Empty from "#lib/components/Empty.svelte";
import EventViews from "#lib/components/EventViews.svelte";
import { eventText } from "#lib/search.ts";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
const area = $derived(areaFilter.value);
const weekEvents = $derived(inQuery(inArea(data.events), eventText));
</script>

<svelte:head>
	<title>これからの間 | ◱</title>
	<meta name="description" content="これから 7 日のあいだに開く間。間借り店舗・日替わり店長・ライブ・自助会・オフ会を一箇所で。" />
</svelte:head>

<EventViews />
<div class="section-head">
	<h1 class="section-title">これから7日の間</h1>
</div>

{#if weekEvents.length === 0}
	<Empty title={emptyTitle(area.length ? `${area.join('・')}では、この7日はまだ誰もくねくねしていません。` : 'まだ誰もくねくねしていません。')} hint="エリアを変えるか、カレンダーで先を見てみてください。" />
{/if}
<DayList events={weekEvents} />
