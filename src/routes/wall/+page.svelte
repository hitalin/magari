<script lang="ts">
import {
	areaFilter,
	emptyTitle,
	inArea,
	inQuery,
} from "#lib/area-filter.svelte.ts";
import Empty from "#lib/components/Empty.svelte";
import EventViews from "#lib/components/EventViews.svelte";
import FlyerWall from "#lib/components/FlyerWall.svelte";
import { eventText } from "#lib/search.ts";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
const area = $derived(areaFilter.value);
const events = $derived(inQuery(inArea(data.events), eventText));
</script>

<svelte:head>
	<title>フライヤー | ◱</title>
	<meta name="description" content="これからの間のフライヤーを貼った壁。" />
</svelte:head>

<EventViews />
<section>
	<div class="section-head">
		<h1 class="section-title">フライヤー</h1>
	</div>
	<p class="mb-10 text-sm text-muted">これからの間を、開かれる順に貼っています。フライヤーの画像が無い間は、自動のビラで貼ります。自分の間のフライヤーは、間の編集画面から上げられます。</p>
	{#if events.length === 0}
		<Empty title={emptyTitle(area.length ? `${area.join('・')}では、まだ誰もくねくねしていません。` : 'まだ誰もくねくねしていません。')} />
	{:else}
		<FlyerWall {events} />
	{/if}
</section>
