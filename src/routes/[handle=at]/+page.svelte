<script lang="ts">
import DayList from '#lib/components/DayList.svelte';
import Empty from '#lib/components/Empty.svelte';
import MonthGrid from '#lib/components/MonthGrid.svelte';
import { filterTags } from '#lib/group.ts';
import { KIND_LABEL } from '#lib/types.ts';
import type { PageProps } from './$types';

let { data }: PageProps = $props();
const actor = $derived(data.actor);
const tags = $derived(filterTags(data.events));
let activeTag = $state<string | null>(null);
const filtered = $derived(
	activeTag ? data.events.filter((e) => e.tags.includes(activeTag as string)) : data.events
);
const upcoming = $derived.by(() => {
	const now = Date.now();
	return filtered.filter((e) => new Date(e.startsAt).getTime() >= now - 86_400_000);
});
</script>

<svelte:head>
	<title>{actor.name} | まがり</title>
	{#if actor.summary}<meta name="description" content={actor.summary} />{/if}
</svelte:head>

<header class="panel mt-4 mb-10 p-6 sm:p-8">
	<div class="flex items-start gap-5">
		{#if actor.avatarUrl}
			<img src={actor.avatarUrl} alt="" class="h-20 w-20 shrink-0 rounded-full border border-line object-cover sm:h-24 sm:w-24" />
		{/if}
		<div class="min-w-0">
			<p class="label">{KIND_LABEL[actor.kind]} · @{actor.handle}</p>
			<h1 class="mt-2 text-[clamp(1.8rem,3.5vw,2.6rem)]">{actor.name}</h1>
		</div>
	</div>
	{#if actor.summary}<p class="mt-3 max-w-[34em] text-muted">{actor.summary}</p>{/if}
	<div class="pills mt-5">
		{#if actor.address}<span class="chip chip-plain">{actor.address}</span>{/if}
		{#if actor.url}<a href={actor.url} class="chip" rel="noopener">{actor.url.replace(/^https?:\/\//, '')}</a>{/if}
		{#if actor.xHandle}<a href="https://x.com/{actor.xHandle}" class="chip" rel="noopener">X @{actor.xHandle}</a>{/if}
	</div>
</header>

<section class="mb-12">
	<MonthGrid year={data.calendar.year} month={data.calendar.month} grid={data.calendar.grid} events={filtered} compact />
</section>

<div class="section-head">
	<h2 class="section-title">これからの間</h2>
	<span class="chip">{upcoming.length} 間</span>
</div>

{#if tags.length}
	<div class="pills mb-6" role="group" aria-label="タグで絞る">
		<button type="button" class="chip {activeTag === null ? 'chip-tape' : 'chip-plain'}" aria-pressed={activeTag === null} onclick={() => (activeTag = null)}>すべて</button>
		{#each tags as t (t.tag)}
			<button type="button" class="chip {activeTag === t.tag ? 'chip-tape' : 'chip-plain'}" aria-pressed={activeTag === t.tag} onclick={() => (activeTag = t.tag)}>
				{t.tag} <span class="ml-1 opacity-70">{t.count}</span>
			</button>
		{/each}
	</div>
{/if}

{#if upcoming.length === 0}
	<Empty title="これからの間はまだありません。" hint="くねくねし始めたらここに出ます。" />
{/if}
<DayList events={upcoming} collapse={false} />
