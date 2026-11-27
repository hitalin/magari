<script lang="ts">
import { monthKey, previewPosition, shiftMonth } from "#lib/calendar.ts";
import Flyer from "#lib/components/Flyer.svelte";
import Picture from "#lib/components/Picture.svelte";
import { dayKey, formatTime, formatWhen } from "#lib/date.ts";
import { flyerStyle } from "#lib/flyer.ts";
import { collapseByActor } from "#lib/group.ts";
import type { EventSummary } from "#lib/types.ts";

let {
	year,
	month,
	grid,
	events,
	compact = false,
	anchorDays,
}: {
	year: number;
	month: number;
	grid: string[][];
	events: EventSummary[];
	compact?: boolean;
	// 同じページの一覧（DayList）に出ている日。狭い画面では、その日の升を押すと一覧のその日へ飛ぶ
	anchorDays?: Set<string>;
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

// マウスを載せた会のプレビュー（壁と同じビラ）。タッチの端末では出さず、押せば会のページへ
let preview = $state<{ event: EventSummary; anchor: DOMRect } | null>(null);
let popup = $state<HTMLElement>();
let timer: ReturnType<typeof setTimeout> | undefined;
function showPreview(e: PointerEvent, event: EventSummary) {
	if (e.pointerType !== "mouse") return;
	const anchor = (e.currentTarget as HTMLElement).getBoundingClientRect();
	clearTimeout(timer);
	// 升の上を通り過ぎただけでは出さない。もう出ていれば、すぐ差し替える
	timer = setTimeout(() => (preview = { event, anchor }), preview ? 0 : 250);
}
function hidePreview() {
	clearTimeout(timer);
	preview = null;
}
// 出してから大きさを測り、画面に収まる位置に置く（升の箱は overflow-hidden なので、画面に対して置く）
$effect(() => {
	if (!preview || !popup) return;
	const { left, top } = previewPosition(
		preview.anchor,
		{ width: popup.offsetWidth, height: popup.offsetHeight },
		{ width: window.innerWidth, height: window.innerHeight },
	);
	popup.style.left = `${left}px`;
	popup.style.top = `${top}px`;
});
</script>

<svelte:window onscroll={hidePreview} onresize={hidePreview} />

<div class="section-head">
	<h2 class="section-title {compact ? 'text-[1.3rem]' : ''}">{year}年{month}月</h2>
	<nav class="flex items-center gap-2 text-sm">
		<a href="/calendar/{monthKey(prev.year, prev.month)}" class="btn px-3 py-1.5" aria-label="前の月">‹</a>
		<a href="/calendar" class="btn px-3 py-1.5">今日</a>
		<a href="/calendar/{monthKey(next.year, next.month)}" class="btn px-3 py-1.5" aria-label="次の月">›</a>
	</nav>
</div>

<div class="overflow-hidden rounded-md border border-line bg-surface/60">
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
				{@const count = byDay.get(day)?.length ?? 0}
				<div
					class="relative min-h-[3.5rem] border-r border-line p-1 last:border-r-0 sm:p-1.5 {compact ? 'sm:min-h-[5.5rem]' : 'sm:min-h-[7rem]'} {inMonth ? '' : 'opacity-40'}"
				>
					<p class="mb-1 text-xs {i === 0 ? 'text-accent-ink' : 'text-muted'}">
						<span
							class="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 tabular-nums {day === today ? 'tape rounded-none px-1.5 font-bold' : ''}"
							>{Number(day.slice(-2))}</span
						>
					</p>
					<!-- 狭い画面の升には題が 2〜3 文字しか入らないので、件数だけを出す。押すと下の一覧のその日へ -->
					{#if count > 0}
						{#if inMonth && anchorDays?.has(day)}
							<a href="#d-{day}" class="day-tap" aria-label="{Number(day.slice(5, 7))}月{Number(day.slice(-2))}日の間 {count} 件"><span>{count}</span></a>
						{:else}
							<span class="day-tap"><span>{count}</span><span class="sr-only">件</span></span>
						{/if}
					{/if}
					<div class="hidden sm:block">
					{#each items.slice(0, MAX_VISIBLE) as item, j (item.kind === 'event' ? item.event.id : `g-${item.actor.handle}-${j}`)}
						{#if item.kind === 'event'}
							{@const event = item.event}
							<a
								href="/e/{event.id}"
								class="mb-0.5 block truncate rounded-[3px] px-1 py-0.5 text-[0.7rem] leading-tight text-text hover:bg-accent-soft sm:text-xs"
								onpointerenter={(e) => showPreview(e, event)}
								onpointerleave={hidePreview}
								onclick={hidePreview}
							>
								{#if !item.event.allDay}<span class="hidden font-mono text-muted sm:inline">{formatTime(item.event.startsAt)}</span>{/if}
								{item.event.title}
							</a>
						{:else}
							<a
								href="/@{item.actor.handle}#d-{day}"
								class="mb-0.5 block truncate rounded-[3px] px-1 py-0.5 text-[0.7rem] leading-tight font-semibold text-accent-ink hover:bg-accent-soft sm:text-xs"
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
				</div>
			{/each}
		</div>
	{/each}
</div>

<!-- ビラに題・日時・場所・主催が刷ってあるので、それだけを見せる。上げた画像は読めるとは限らないので、題と日時・場所を添える -->
{#if preview}
	{@const e = preview.event}
	{@const place = e.space?.name ?? e.locationName}
	<div bind:this={popup} class="cal-preview" style="left: -9999px; top: 0" aria-hidden="true">
		<div class="flyer-pin" style="--tilt: {flyerStyle(e.id).tilt / 2}deg">
			{#if e.flyerUrl}
				<Picture src={e.flyerUrl} alt="" sizes="15rem" />
			{:else}
				<Flyer id={e.id} title={e.title} startsAt={e.startsAt} endsAt={e.endsAt} allDay={e.allDay} {place} host={e.hosts[0]?.name ?? null} look={e.flyerLook} />
			{/if}
		</div>
		{#if e.flyerUrl}
			<p class="mt-4 font-serif font-bold leading-snug">{e.title}</p>
			<p class="mt-1 text-xs text-muted">{formatWhen(e)}{#if place} · {place}{/if}</p>
		{/if}
	</div>
{/if}

<style>
	.cal-preview {
		position: fixed;
		z-index: 40;
		width: 15rem;
		padding: 1.25rem 1rem 1rem;
		background: var(--color-surface);
		border: 1px solid var(--color-line);
		border-radius: var(--radius-md);
		/* 見せるだけ。下の升の操作を妨げない */
		pointer-events: none;
	}
	/* 升いっぱいを押せる面にして、件数は下に小さなテープの切れ端で出す */
	.day-tap {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding-bottom: 0.4rem;
	}
	.day-tap > span:first-child {
		min-width: 1.5rem;
		padding: 0.05rem 0.3rem;
		border-radius: 2px;
		background: var(--color-accent-soft);
		color: var(--color-accent-ink);
		font-size: 0.7rem;
		font-weight: 700;
		line-height: 1.4;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}
	a.day-tap:active {
		background: var(--color-accent-soft);
	}
	@media (min-width: 40rem) {
		.day-tap {
			display: none;
		}
	}
</style>
