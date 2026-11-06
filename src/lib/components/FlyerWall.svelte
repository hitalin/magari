<script lang="ts">
import { dayKey, formatDay, formatWhen } from "#lib/date.ts";
import { flyerStyle } from "#lib/flyer.ts";
import { collapseByActor } from "#lib/group.ts";
import type { EventSummary } from "#lib/types.ts";
import Flyer from "./Flyer.svelte";

// フライヤーの壁。上げた画像はそのままの縦横比で、無ければ自動のビラを貼る。
// 日ごとに、同じ主催者の多い会は 1 枚のまとめビラに畳む（一覧と同じ collapseByActor）。
let {
	events,
	collapse = true,
	large = false,
}: {
	events: EventSummary[];
	collapse?: boolean;
	// 大きく貼る（フライヤーのページ）
	large?: boolean;
} = $props();

const items = $derived.by(() => {
	const byDay = new Map<string, EventSummary[]>();
	for (const e of events) {
		const k = dayKey(e.startsAt);
		byDay.set(k, [...(byDay.get(k) ?? []), e]);
	}
	return [...byDay.entries()].flatMap(([key, list]) =>
		(collapse
			? collapseByActor(list)
			: list.map((event) => ({ kind: "event" as const, event }))
		).map((item) => ({ key, item })),
	);
});
const place = (e: EventSummary) => e.space?.name ?? e.locationName ?? null;
</script>

<div class="wall" class:large>
	{#each items as { key, item } (item.kind === 'event' ? item.event.id : `g-${key}-${item.actor.handle}`)}
		{#if item.kind === 'event'}
			{@const e = item.event}
			<a href="/e/{e.id}" class="flyer-pin" style="--tilt: {flyerStyle(e.id).tilt}deg" aria-label="{e.title}（{formatWhen(e)}）">
				{#if e.flyerUrl}
					<img src={e.flyerUrl} alt="" loading="lazy" />
				{:else}
					<Flyer id={e.id} title={e.title} startsAt={e.startsAt} endsAt={e.endsAt} allDay={e.allDay} place={place(e)} host={e.hosts[0]?.name ?? null} />
				{/if}
			</a>
		{:else}
			{@const first = item.events[0]}
			{@const gid = `${key}-${item.actor.handle}`}
			<a href="/@{item.actor.handle}#d-{key}" class="flyer-pin" style="--tilt: {flyerStyle(gid).tilt}deg" aria-label="{item.actor.name}（{formatDay(first.startsAt)}の間 {item.events.length} 件）">
				<Flyer id={gid} title={item.actor.name} startsAt={first.startsAt} endsAt={null} allDay count={item.events.length} />
			</a>
		{/if}
	{/each}
</div>

<style>
	/* 縦横比の違うフライヤーを詰めて貼る（段組み） */
	.wall {
		columns: 150px;
		column-gap: 1.5rem;
	}
	/* 分割されない箱にして、次の列へ送られたときに上へはみ出したテープだけが前の列に残らないようにする */
	.wall > :global(a) {
		display: inline-block;
		width: 100%;
		break-inside: avoid;
		margin-bottom: 2rem;
	}
	@media (min-width: 640px) {
		.wall {
			columns: 180px;
			column-gap: 2rem;
		}
	}
	/* 大きく貼る（前の約 1.5 倍）。スマホは中央に 1 列、PC は 3 列 */
	.wall.large {
		columns: 1;
		max-width: 16rem;
		margin-inline: auto;
	}
	@media (min-width: 640px) {
		.wall.large {
			columns: 3;
			column-gap: 1rem;
			max-width: none;
		}
	}
	.wall.large > :global(a) {
		margin-bottom: 2.5rem;
	}
</style>
