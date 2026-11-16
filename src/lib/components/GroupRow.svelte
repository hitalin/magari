<script lang="ts">
import { dayKey } from "#lib/date.ts";
import type { ActorRef, EventSummary } from "#lib/types.ts";

let { actor, events }: { actor: ActorRef; events: EventSummary[] } = $props();
const day = $derived(dayKey(events[0].startsAt));
const preview = $derived(events.slice(0, 3).map((e) => e.title));
</script>

<a href="/@{actor.handle}#d-{day}" class="row group">
	<span class="font-mono text-sm text-muted">まとめ</span>
	<span class="min-w-0">
		<span class="block font-serif text-[1.1rem] font-bold leading-snug group-hover:text-accent-ink">{actor.name}<span class="ml-2 font-sans text-sm font-normal text-muted">{events.length} 件</span></span>
		<span class="mt-0.5 block truncate text-sm text-muted">{preview.join('、')}{events.length > 3 ? '、…' : ''}</span>
	</span>
</a>
