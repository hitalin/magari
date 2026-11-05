<script lang="ts">
import { formatTime } from '#lib/date.ts';
import type { EventSummary } from '#lib/types.ts';

let { event }: { event: EventSummary } = $props();
const hostNames = $derived(event.hosts.map((h) => h.name));
// 主催と場が同じ（場が自分で開く会）なら場所は繰り返さない
const place = $derived.by(() => {
	const name = event.space?.name ?? event.locationName ?? (event.onlineUrl ? 'オンライン' : null);
	return name && hostNames.includes(name) ? null : name;
});
const meta = $derived([hostNames.join('、'), place].filter(Boolean).join(' · '));
</script>

<a href="/e/{event.id}" class="row group">
	<span class="font-mono text-sm leading-snug tabular-nums text-muted">
		{#if event.allDay}終日{:else}{formatTime(event.startsAt)}{#if event.endsAt && event.endsAt !== event.startsAt}<br /><span class="text-dim">〜{formatTime(event.endsAt)}</span>{/if}{/if}
	</span>
	<span class="min-w-0">
		<span class="block font-serif text-[1.1rem] font-bold leading-snug group-hover:text-accent-ink">{event.title}</span>
		{#if meta}<span class="mt-0.5 block text-sm text-muted">{meta}</span>{/if}
		{#if event.tags.length}
			<span class="mt-1.5 flex flex-wrap gap-1">
				{#each event.tags.slice(0, 3) as tag (tag)}
					<span class="chip chip-tape">{tag}</span>
				{/each}
			</span>
		{/if}
	</span>
</a>
