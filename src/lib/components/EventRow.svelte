<script lang="ts">
import { formatTime } from "#lib/date.ts";
import type { EventSummary } from "#lib/types.ts";

let { event }: { event: EventSummary } = $props();
const hostNames = $derived(event.hosts.map((h) => h.name));
const faces = $derived(event.hosts.filter((h) => h.avatarUrl));
// 主催と場が同じ（場が自分で開く会）なら場所は繰り返さない
const place = $derived.by(() => {
	const name =
		event.space?.name ??
		event.locationName ??
		(event.onlineUrl ? "オンライン" : null);
	return name && hostNames.includes(name) ? null : name;
});
</script>

<!-- 主語は人。「誰が」を先に、ひとことと場所はその下 -->
<a href="/e/{event.id}" class="row group">
	<span class="font-mono text-sm leading-snug tabular-nums text-muted">
		{#if event.allDay}終日{:else}{formatTime(event.startsAt)}{#if event.endsAt && event.endsAt !== event.startsAt}<br /><span class="text-dim">〜{formatTime(event.endsAt)}</span>{/if}{/if}
	</span>
	<span class="min-w-0">
		{#if hostNames.length}
			<span class="flex items-center gap-2 font-serif text-[1.1rem] font-bold leading-snug group-hover:text-accent-ink">
				{#each faces as h (h.handle)}<img src={h.avatarUrl} alt="" loading="lazy" class="h-6 w-6 shrink-0 rounded-full object-cover" />{/each}
				<span class="min-w-0">{hostNames.join('、')}</span>
			</span>
			<span class="mt-0.5 block">{event.title}</span>
		{:else}
			<span class="block font-serif text-[1.1rem] font-bold leading-snug group-hover:text-accent-ink">{event.title}</span>
		{/if}
		{#if place}<span class="mt-0.5 block text-sm text-muted">{place}</span>{/if}
		{#if event.tags.length}
			<span class="mt-1.5 flex flex-wrap gap-1">
				{#each event.tags.slice(0, 3) as tag (tag)}
					<span class="chip chip-plain">{tag}</span>
				{/each}
			</span>
		{/if}
	</span>
</a>
