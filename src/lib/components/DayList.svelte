<script lang="ts">
import EventRow from "#lib/components/EventRow.svelte";
import GroupRow from "#lib/components/GroupRow.svelte";
import { dayKey, formatDay } from "#lib/date.ts";
import { collapseByActor } from "#lib/group.ts";
import type { EventSummary } from "#lib/types.ts";

let {
	events,
	collapse = true,
}: { events: EventSummary[]; collapse?: boolean } = $props();

const days = $derived.by(() => {
	const map = new Map<string, EventSummary[]>();
	for (const e of events) {
		const k = dayKey(e.startsAt);
		map.set(k, [...(map.get(k) ?? []), e]);
	}
	return [...map.entries()].map(([key, list]) => ({
		key,
		list,
		items: collapse
			? collapseByActor(list)
			: list.map((event) => ({ kind: "event" as const, event })),
	}));
});
</script>

{#each days as day (day.key)}
	<section class="mb-10" id="d-{day.key}">
		<h3 class="day-rule mb-3">{formatDay(day.list[0].startsAt)}</h3>
		<div class="rule-list">
			{#each day.items as item, i (item.kind === 'event' ? item.event.id : `g-${item.actor.handle}-${i}`)}
				{#if item.kind === 'event'}
					<EventRow event={item.event} />
				{:else}
					<GroupRow actor={item.actor} events={item.events} />
				{/if}
			{/each}
		</div>
	</section>
{/each}
