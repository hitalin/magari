<script lang="ts">
import { onMount } from 'svelte';
import { PRIMARY_AREAS } from '#lib/area.ts';
import type { EventSummary } from '#lib/types.ts';

let { events, value = $bindable(null) }: { events: EventSummary[]; value: string | null } =
	$props();

const STORAGE_KEY = 'magari-area';

// 件数のあるエリアだけ。主要都市を先に、残りは件数順。
const areas = $derived.by(() => {
	const counts = new Map<string, number>();
	for (const e of events) if (e.area) counts.set(e.area, (counts.get(e.area) ?? 0) + 1);
	const primary = PRIMARY_AREAS.filter((a) => counts.has(a)).map((a) => ({
		area: a,
		count: counts.get(a) as number
	}));
	const rest = [...counts.entries()]
		.filter(([a]) => !PRIMARY_AREAS.includes(a))
		.sort((a, b) => b[1] - a[1])
		.map(([area, count]) => ({ area, count }));
	return [...primary, ...rest];
});

// 主要都市と件数の多いエリアだけ出し、残りは開いて見る
let expanded = $state(false);
const visible = $derived(
	expanded
		? areas
		: areas.filter((a) => PRIMARY_AREAS.includes(a.area) || a.count >= 10 || a.area === value)
);
const hiddenCount = $derived(areas.length - visible.length);

onMount(() => {
	if (value === null) {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved && areas.some((a) => a.area === saved)) value = saved;
	}
});

function choose(area: string | null) {
	value = area;
	if (area) localStorage.setItem(STORAGE_KEY, area);
	else localStorage.removeItem(STORAGE_KEY);
}
</script>

{#if areas.length > 1}
	<div class="flex flex-wrap gap-2" role="group" aria-label="エリアで絞る">
		<button type="button" class="chip {value === null ? 'chip-tape' : 'chip-plain'}" onclick={() => choose(null)}>すべて</button>
		{#each visible as a (a.area)}
			<button type="button" class="chip {value === a.area ? 'chip-tape' : 'chip-plain'}" onclick={() => choose(a.area)}>
				{a.area} <span class="ml-1 opacity-70">{a.count}</span>
			</button>
		{/each}
		{#if hiddenCount > 0 || expanded}
			<button type="button" class="chip chip-plain" onclick={() => (expanded = !expanded)}>
				{expanded ? '閉じる' : `ほか ${hiddenCount} エリア ›`}
			</button>
		{/if}
	</div>
{/if}
