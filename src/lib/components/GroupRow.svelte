<script lang="ts">
import ActorFace from "#lib/components/ActorFace.svelte";
import { dayKey } from "#lib/date.ts";
import type { ActorRef, EventSummary } from "#lib/types.ts";

let { actor, events }: { actor: ActorRef; events: EventSummary[] } = $props();
const day = $derived(dayKey(events[0].startsAt));
const preview = $derived(events.slice(0, 3).map((e) => e.title));
</script>

<a href="/@{actor.handle}#d-{day}" class="row group">
	<span class="text-sm text-muted">まとめ</span>
	<span class="relative block min-h-9 min-w-0 pl-12">
		<ActorFace {actor} />
		<span class="flex flex-wrap items-baseline gap-x-2 font-serif text-[1.1rem] font-bold leading-snug group-hover:text-accent-ink">
			<span class="min-w-0">{actor.name}</span>
			<span class="truncate font-sans text-sm font-normal text-muted">@{actor.handle}</span>
			<span class="font-sans text-sm font-normal text-muted">{events.length} 件</span>
		</span>
		<span class="mt-0.5 block truncate text-sm text-muted">{preview.join('、')}{events.length > 3 ? '、…' : ''}</span>
	</span>
</a>
