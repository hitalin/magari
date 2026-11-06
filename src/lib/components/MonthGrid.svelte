<script lang="ts">
import { monthKey, shiftMonth } from "#lib/calendar.ts";
import { dayKey, formatTime } from "#lib/date.ts";
import { collapseByActor } from "#lib/group.ts";
import type { EventSummary } from "#lib/types.ts";

let {
	year,
	month,
	grid,
	events,
	compact = false,
}: {
	year: number;
	month: number;
	grid: string[][];
	events: EventSummary[];
	compact?: boolean;
} = $props();

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const MAX_VISIBLE = $derived(compact ? 2 : 3);

const byDay = $derived.by(() => {
	const map = new Map<string, EventSummary[]>();
	for (const e of events) {
		const k = dayKey(e.startsAt);
		map.set(k, [...(map.get(k) ?? []), e]);
	}
	return map;
});
const thisMonth = $derived(monthKey(year, month));
const today = $derived(dayKey(new Date()));
const prev = $derived(shiftMonth(year, month, -1));
const next = $derived(shiftMonth(year, month, 1));
</script>

<div class="section-head">
	<h2 class="section-title {compact ? 'text-[1.3rem]' : ''}">{year}年{month}月</h2>
	<nav class="flex items-center gap-2 text-sm">
		<a href="/calendar/{monthKey(prev.year, prev.month)}" class="btn px-3 py-1.5" aria-label="前の月">‹</a>
		<a href="/calendar" class="btn px-3 py-1.5">今日</a>
		<a href="/calendar/{monthKey(next.year, next.month)}" class="btn px-3 py-1.5" aria-label="次の月">›</a>
	</nav>
</div>

<div class="overflow-hidden rounded-md border border-line bg-surface/85 backdrop-blur-md">
	<div class="grid grid-cols-7 border-b border-line text-center">
		{#each WEEKDAYS as w, i (w)}
			<div class="label py-2 {i === 0 ? 'text-accent-ink' : ''}">{w}</div>
		{/each}
	</div>
	{#each grid as week (week[0])}
		<div class="grid grid-cols-7 border-b border-line last:border-b-0">
			{#each week as day, i (day)}
				{@const items = collapseByActor(byDay.get(day) ?? [], 3)}
				{@const inMonth = day.startsWith(thisMonth)}
				<div
					class="border-r border-line p-1 last:border-r-0 sm:p-1.5 {compact ? 'min-h-[4rem] sm:min-h-[5.5rem]' : 'min-h-[5.5rem] sm:min-h-[7rem]'} {inMonth ? '' : 'opacity-40'}"
				>
					<p class="mb-1 text-xs {i === 0 ? 'text-accent-ink' : 'text-muted'}">
						<span
							class="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 tabular-nums {day === today ? 'tape rounded-none px-1.5 font-bold' : ''}"
							>{Number(day.slice(-2))}</span
						>
					</p>
					{#each items.slice(0, MAX_VISIBLE) as item, j (item.kind === 'event' ? item.event.id : `g-${item.actor.handle}-${j}`)}
						{#if item.kind === 'event'}
							<a
								href="/e/{item.event.id}"
								class="mb-0.5 block truncate rounded-sm bg-accent-soft px-1 py-0.5 text-[0.7rem] leading-tight text-text hover:bg-accent hover:text-bg sm:text-xs"
								title={item.event.title}
							>
								{#if !item.event.allDay}<span class="hidden font-mono text-muted sm:inline">{formatTime(item.event.startsAt)}</span>{/if}
								{item.event.title}
							</a>
						{:else}
							<a
								href="/@{item.actor.handle}#d-{day}"
								class="mb-0.5 block truncate rounded-sm border border-accent-border px-1 py-0.5 text-[0.7rem] leading-tight text-accent-ink hover:bg-accent hover:text-bg sm:text-xs"
								title="{item.actor.name} の間 {item.events.length} 件"
							>
								{item.events.length}件 {item.actor.name}
							</a>
						{/if}
					{/each}
					{#if items.length > MAX_VISIBLE}
						<p class="px-1 text-[0.7rem] text-muted">+{items.length - MAX_VISIBLE}</p>
					{/if}
				</div>
			{/each}
		</div>
	{/each}
</div>
