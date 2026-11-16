<script lang="ts">
import { onMount } from "svelte";
import AreaFilter from "#lib/components/AreaFilter.svelte";
import DayList from "#lib/components/DayList.svelte";
import Empty from "#lib/components/Empty.svelte";
import FlyerWall from "#lib/components/FlyerWall.svelte";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
let area = $state<string[]>([]);
// これからの間の見せ方。一覧（日ごとの行）か壁（フライヤー）か
const VIEW_KEY = "magari-view";
let view = $state<"list" | "wall">("list");
onMount(() => {
	if (localStorage.getItem(VIEW_KEY) === "wall") view = "wall";
});
function setView(v: "list" | "wall") {
	view = v;
	localStorage.setItem(VIEW_KEY, v);
}
const weekEvents = $derived(
	area.length
		? data.events.filter((e) => e.area !== null && area.includes(e.area))
		: data.events,
);
</script>

<svelte:head>
	<title>これからの間 | まがり</title>
	<meta name="description" content="これから 7 日のあいだに開く間。間借り店舗・日替わり店長・ライブ・自助会・オフ会を一箇所で。" />
</svelte:head>

<div class="section-head mt-4">
	<h1 class="section-title">これから7日の間</h1>
	<div class="flex flex-wrap items-center gap-4">
		<div class="pills" role="group" aria-label="見せ方">
			<button type="button" class="chip {view === 'list' ? 'chip-tape' : 'chip-plain'}" aria-pressed={view === 'list'} onclick={() => setView('list')}>一覧</button>
			<button type="button" class="chip {view === 'wall' ? 'chip-tape' : 'chip-plain'}" aria-pressed={view === 'wall'} onclick={() => setView('wall')}>壁</button>
		</div>
		<a href="/calendar" class="more">その先はカレンダーで ›</a>
	</div>
</div>
<div class="mb-8">
	<AreaFilter events={data.events} bind:value={area} />
</div>

{#if weekEvents.length === 0}
	<Empty title={area.length ? `${area.join('・')}では、この7日はまだ誰もくねくねしていません。` : 'まだ誰もくねくねしていません。'} hint="エリアを変えるか、カレンダーで先を見てみてください。" />
{/if}
{#if view === 'wall'}
	<FlyerWall events={weekEvents} />
{:else}
	<DayList events={weekEvents} />
{/if}
