<script lang="ts">
import ActorFace from "#lib/components/ActorFace.svelte";
import { formatTime } from "#lib/date.ts";
import { primaryActor } from "#lib/group.ts";
import type { EventSummary } from "#lib/types.ts";

let { event }: { event: EventSummary } = $props();
const hostNames = $derived(event.hosts.map((h) => h.name));
// 顔と @ は先頭の主催（無ければ場）のもの。主催に画像が無ければハコのアイコンを出す
const actor = $derived(primaryActor(event));
const who = $derived(hostNames.length ? hostNames.join("、") : actor?.name);
// 主催と場が同じ（場が自分で開く会）なら場所は繰り返さない
const place = $derived.by(() => {
	const name =
		event.space?.name ??
		event.locationName ??
		(event.onlineUrl ? "オンライン" : null);
	return name && (hostNames.includes(name) || name === who) ? null : name;
});
</script>

<!-- 左に顔、「誰が」を小さく先に、その下にひとこと（会の名前）を大きく、場所はさらに下 -->
<a href="/e/{event.id}" class="row group">
	<span class="font-mono text-sm leading-snug tabular-nums text-muted">
		{#if event.allDay}終日{:else}{formatTime(event.startsAt)}{#if event.endsAt && event.endsAt !== event.startsAt}<br /><span class="text-dim">〜{formatTime(event.endsAt)}</span>{/if}{/if}
	</span>
	<span class="relative block min-h-9 min-w-0 pl-12">
		<ActorFace {actor} seed={event.id} fallbackUrl={event.space?.avatarUrl} />
		{#if actor}
			<span class="flex flex-wrap items-baseline gap-x-2 text-sm leading-snug text-muted">
				<span class="min-w-0 font-bold">{who}</span>
				<span class="truncate text-dim">@{actor.handle}</span>
			</span>
			<span class="mt-0.5 block font-serif text-[1.1rem] font-bold leading-snug group-hover:text-accent-ink">{event.title}</span>
		{:else}
			<span class="block font-serif text-[1.1rem] font-bold leading-snug group-hover:text-accent-ink">{event.title}</span>
		{/if}
		{#if place}<span class="mt-0.5 block text-sm text-muted">{place}</span>{/if}
	</span>
</a>
