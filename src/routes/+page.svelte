<script lang="ts">
import { onMount } from "svelte";
import logo from "#lib/assets/logo.svg";
import AreaFilter from "#lib/components/AreaFilter.svelte";
import DayList from "#lib/components/DayList.svelte";
import Empty from "#lib/components/Empty.svelte";
import FlyerWall from "#lib/components/FlyerWall.svelte";
import MonthGrid from "#lib/components/MonthGrid.svelte";
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
const byArea = <T extends { area: string | null }>(list: T[]) =>
	area.length
		? list.filter((e) => e.area !== null && area.includes(e.area))
		: list;
const monthEvents = $derived(byArea(data.calendar.events));
const weekEvents = $derived(byArea(data.events));
const areaCount = $derived(
	new Set(data.calendar.events.map((e) => e.area).filter(Boolean)).size,
);
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
	<title>これからの間 | まがり</title>
	<meta name="description" content="間借り店舗・日替わり店長・レンタル○○・プロ○○ヤー・ライブ・自助会・オフ会の間を一箇所で。" />
</svelte:head>

<section class="dots hero -mx-4 px-4 pt-6">
	<div class="ticker" aria-hidden="true">
		<span class="chip chip-tape ticker-label">こんな間</span>
		<span class="ticker-items">
			<span class="ticker-track">
				{#each [...WORDS, ...WORDS] as word, i (i)}<span>{word}</span>{/each}
			</span>
		</span>
	</div>
	<p class="sr-only">{WORDS.join('、')}。</p>
	<div class="mt-10 text-center sm:mt-12">
		<img src={logo} alt="まがり" class="mx-auto mb-6 h-32 w-32 drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)] sm:h-40 sm:w-40" />
		<h1 class="text-[clamp(1.9rem,6vw,3.4rem)] leading-[1.25]">
			誰でも、<br />その日の<span class="tape mx-1 px-3 leading-[1.15]">主催者</span>に。
		</h1>
		<p class="mt-6 text-[0.95rem] leading-loose tracking-[0.12em] text-muted">
			ハコを持たない人の間と、<br class="sm:hidden" />ハコを貸す人の空き枠を、<br />ここに集める。
		</p>
		<div class="stats mt-8 justify-center">
			<div><span class="stat-num">{data.events.length}</span><span class="label">7日の間</span></div>
			<div><span class="stat-num">{data.calendar.events.length}</span><span class="label">今月の間</span></div>
			<div><span class="stat-num">{areaCount}</span><span class="label">エリア</span></div>
		</div>
	</div>
	<div class="mt-8">
		<AreaFilter events={data.calendar.events} bind:value={area} center />
	</div>
</section>

<section class="lift mb-12">
	<MonthGrid year={data.calendar.year} month={data.calendar.month} grid={data.calendar.grid} events={monthEvents} compact />
	<p class="mt-3 text-right text-sm"><a href="/calendar" class="more">カレンダーで見る ›</a></p>
</section>

<div class="section-head">
	<h2 class="section-title">これから7日の間</h2>
	<div class="flex flex-wrap items-center gap-4">
		<div class="pills" role="group" aria-label="見せ方">
			<button type="button" class="chip {view === 'list' ? 'chip-tape' : 'chip-plain'}" aria-pressed={view === 'list'} onclick={() => setView('list')}>一覧</button>
			<button type="button" class="chip {view === 'wall' ? 'chip-tape' : 'chip-plain'}" aria-pressed={view === 'wall'} onclick={() => setView('wall')}>壁</button>
		</div>
		<a href="/calendar" class="more">その先はカレンダーで ›</a>
	</div>
</div>

{#if weekEvents.length === 0}
	<Empty title={area.length ? `${area.join('・')}では、この7日はまだ誰もくねくねしていません。` : 'まだ誰もくねくねしていません。'} hint="エリアを変えるか、カレンダーで先を見てみてください。" />
{/if}
{#if view === 'wall'}
	<FlyerWall events={weekEvents} />
{:else}
	<DayList events={weekEvents} />
{/if}
