<script lang="ts">
import DayList from "#lib/components/DayList.svelte";
import Empty from "#lib/components/Empty.svelte";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
</script>

<svelte:head><title>{data.actor.name} のこれまでの間 | ◱</title></svelte:head>

<div class="mt-4 mb-8">
	<p class="label"><a href="/@{data.actor.handle}" class="hover:text-accent-ink">‹ {data.actor.name} · @{data.actor.handle}</a></p>
	<h1 class="mt-2 text-2xl">これまでの間</h1>
</div>

{#if data.events.length === 0}
	<Empty title="これまでの間はまだありません。" />
{/if}
<DayList events={data.events} collapse={false} />

<nav class="mt-4 mb-12 flex flex-wrap gap-2" aria-label="ページ送り">
	{#if !data.first}<a href="/@{data.actor.handle}/past" class="btn">‹ 新しいほうへ戻る</a>{/if}
	{#if data.next}<a href="/@{data.actor.handle}/past?before={encodeURIComponent(data.next)}" class="btn">さらに前 ›</a>{/if}
</nav>
