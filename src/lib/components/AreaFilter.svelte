<script lang="ts">
import { onMount } from "svelte";
import { PRIMARY_AREAS } from "#lib/area.ts";
import type { EventSummary } from "#lib/types.ts";

// value は選んだエリアの配列。空なら絞らない
let {
	events,
	value = $bindable([]),
	center = false,
}: { events: EventSummary[]; value: string[]; center?: boolean } = $props();

const STORAGE_KEY = "magari-area";

// 件数のあるエリアだけ。主要都市を先に、残りは件数順。
const areas = $derived.by(() => {
	const counts = new Map<string, number>();
	for (const e of events)
		if (e.area) counts.set(e.area, (counts.get(e.area) ?? 0) + 1);
	const primary = PRIMARY_AREAS.filter((a) => counts.has(a)).map((a) => ({
		area: a,
		count: counts.get(a) as number,
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
		: areas.filter(
				(a) =>
					PRIMARY_AREAS.includes(a.area) ||
					a.count >= 10 ||
					value.includes(a.area),
			),
);
const hiddenCount = $derived(areas.length - visible.length);

onMount(() => {
	if (value.length === 0) {
		const saved = restore(localStorage.getItem(STORAGE_KEY)).filter((s) =>
			areas.some((a) => a.area === s),
		);
		if (saved.length) value = saved;
	}
});

// 保存形式は JSON の配列。以前は文字列 1 つだったので、それも読める
function restore(raw: string | null): string[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed)
			? parsed.filter((s) => typeof s === "string")
			: [];
	} catch {
		return [raw];
	}
}

function toggle(area: string) {
	value = value.includes(area)
		? value.filter((a) => a !== area)
		: [...value, area];
	save();
}
function clear() {
	value = [];
	save();
}
function save() {
	if (value.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
	else localStorage.removeItem(STORAGE_KEY);
}
</script>

{#if areas.length > 1}
	<div class="pills {center ? 'pills-center' : ''}" role="group" aria-label="エリアで絞る">
		<button type="button" class="chip {value.length === 0 ? 'chip-tape' : 'chip-plain'}" aria-pressed={value.length === 0} onclick={clear}>すべて</button>
		{#each visible as a (a.area)}
			{@const on = value.includes(a.area)}
			<button type="button" class="chip {on ? 'chip-tape' : 'chip-plain'}" aria-pressed={on} onclick={() => toggle(a.area)}>
				{a.area} <span class="ml-1 opacity-70">{a.count}</span>
			</button>
		{/each}
		{#if hiddenCount > 0 || expanded}
			<button type="button" class="chip chip-plain" aria-expanded={expanded} onclick={() => (expanded = !expanded)}>
				{expanded ? '閉じる' : `ほか ${hiddenCount} エリア ›`}
			</button>
		{/if}
	</div>
{/if}
