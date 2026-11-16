<script lang="ts">
import AreaFilter from "#lib/components/AreaFilter.svelte";
import Empty from "#lib/components/Empty.svelte";
import EventViews from "#lib/components/EventViews.svelte";
import FlyerWall from "#lib/components/FlyerWall.svelte";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
let area = $state<string[]>([]);
const events = $derived(
	area.length
		? data.events.filter((e) => e.area !== null && area.includes(e.area))
		: data.events,
);
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
	<p class="mb-6 text-sm text-muted">これからの間を、開かれる順に貼っています。フライヤーの画像が無い間は、自動のビラで貼ります。自分の間のフライヤーは、間の編集画面から上げられます。</p>
	<div class="mb-10">
		<AreaFilter events={data.events} bind:value={area} />
	</div>
	{#if events.length === 0}
		<Empty title={area.length ? `${area.join('・')}では、まだ誰もくねくねしていません。` : 'まだ誰もくねくねしていません。'} />
	{:else}
		<FlyerWall {events} />
	{/if}
</section>
