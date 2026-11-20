<script lang="ts">
import { fullAddress } from "#lib/area.ts";
import Blocks from "#lib/components/Blocks.svelte";
import DayList from "#lib/components/DayList.svelte";
import Empty from "#lib/components/Empty.svelte";
import MonthGrid from "#lib/components/MonthGrid.svelte";
import { dayKey } from "#lib/date.ts";
import { actorSns, SNS_ICON, SNS_NAME } from "#lib/sns.ts";
import { KIND_LABEL } from "#lib/types.ts";
import { page } from "$app/state";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
const actor = $derived(data.actor);
const upcoming = $derived.by(() => {
	const now = Date.now();
	return data.events.filter(
		(e) => new Date(e.startsAt).getTime() >= now - 86_400_000,
	);
});
// 下の一覧に出ている日（カレンダーの升から飛べる日）
const anchorDays = $derived(
	new Set([...upcoming, ...data.past].map((e) => dayKey(e.startsAt))),
);
const canEdit = $derived(data.managed.includes(actor.handle));
const hasAccess = $derived(
	!!(
		actor.address ||
		actor.access ||
		actor.hours ||
		actor.closedDays ||
		actor.operator
	),
);
// 管理者のいないハコ・団体は、店や団体の公式ページではない。名前とリンクと店の写真だけを出す（アイコンと紹介文はサーバーが落とす）
const unofficial = $derived(actor.kind !== "person" && !actor.hasManager);
// ハコはバナーを出さず、人のプロフィールと同じく丸いアイコンにする。X アイコンが無ければ写真を丸く切り抜く
const icon = $derived(
	actor.avatarUrl ?? (actor.kind === "space" ? actor.headerUrl : null),
);
// 都道府県から書いた住所。Google マップで場所を特定しやすくする
const address = $derived(fullAddress(actor.region, actor.address));
const mapUrl = $derived(
	address
		? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
		: null,
);
// 地図と口コミは Google マップに任せる（API は使わずリンクだけ）
const reviewsUrl = $derived(
	`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
		[actor.name, address].filter(Boolean).join(" "),
	)}`,
);
const sections = $derived(
	[
		actor.body && { id: "about", label: "紹介" },
		{ id: "events", label: "これからの間" },
		data.past.length > 0 && { id: "past", label: "これまでの間" },
		hasAccess && { id: "access", label: "アクセス" },
	].filter((s): s is { id: string; label: string } => !!s),
);
// SNS はアイコン付きのバッジで上に、それ以外のリンクは下に
const social = $derived(actorSns(actor));
const description = $derived(actor.catch ?? actor.summary ?? undefined);
</script>

<svelte:head>
	<title>{actor.name} | ◱</title>
	{#if description}<meta name="description" content={description} />{/if}
	<meta property="og:title" content={actor.name} />
	{#if description}<meta property="og:description" content={description} />{/if}
	<!-- 非公式のページは、店の名前で検索した人に公式より先に見せない。引き取られたら載る -->
	{#if unofficial}<meta name="robots" content="noindex" />{/if}
</svelte:head>

{#if actor.headerUrl && actor.kind !== 'space'}
	<img src={actor.headerUrl} alt="" class="mt-4 aspect-[21/9] w-full rounded-lg border border-line object-cover sm:aspect-[3/1]" />
{/if}

<!-- ハコ（箱）のページは段ボールの看板 -->
<header class="{actor.kind === 'space' ? 'cardboard mt-8' : 'panel mt-4'} mb-8 p-6 sm:p-8">
	<!-- 名刺は X や Misskey のプロフィールと同じ並び: 左上に顔、右上に編集、その下に名前・@ID・ひとこと・リンク -->
	<div class="flex items-start justify-between gap-4">
		{#if icon}
			<img src={icon} alt="" class="h-20 w-20 shrink-0 rounded-full border border-line object-cover sm:h-24 sm:w-24" />
		{:else}
			<span class="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-line bg-accent-soft font-serif text-3xl text-accent-ink sm:h-24 sm:w-24" aria-hidden="true">{[...actor.name][0]}</span>
		{/if}
		{#if canEdit}<a href="/@{actor.handle}/edit" class="btn px-4 py-2 text-sm">ページを編集</a>{/if}
	</div>
	<h1 class="mt-3 text-[clamp(1.5rem,3vw,2rem)] leading-tight">{actor.name}</h1>
	<p class="mt-1 text-sm text-muted">
		@{actor.handle} · {KIND_LABEL[actor.kind]}{#if unofficial}<span class="badge-unofficial ml-2 align-middle">非公式</span>{/if}
	</p>
	{#if actor.catch}<p class="mt-3 font-serif text-lg text-accent-ink">{actor.catch}</p>{/if}
	{#if actor.summary}<p class="mt-3 max-w-[34em] whitespace-pre-line">{actor.summary}</p>{/if}
	{#if unofficial}
		<p class="mt-3 max-w-[34em] text-xs text-muted">
			運営者がまだいない非公式のページです。運営者の方は、いつでも<a href="/claim/{actor.handle}" class="underline underline-offset-2 hover:text-accent-ink">ページの引き取り</a>と<a href="/contact?kind=takedown&about=@{actor.handle}" class="underline underline-offset-2 hover:text-accent-ink">掲載の取り下げ</a>ができます（<a href="/owners" class="underline underline-offset-2 hover:text-accent-ink">お店・団体の方へ</a>）。
		</p>
	{/if}
	<div class="pills mt-5">
		{#if address}<span class="chip chip-plain">{address}</span>{/if}
		{#if actor.url}<a href={actor.url} class="chip" rel="noopener">{actor.url.replace(/^https?:\/\//, '')}</a>{/if}
		{#each social.sns as s (s.url)}
			<a href={s.url} class="chip gap-1.5" rel="noopener" aria-label="{SNS_NAME[s.kind]} {s.label}" title={SNS_NAME[s.kind]}>
				<svg viewBox="0 0 24 24" class="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden="true"><path d={SNS_ICON[s.kind]} /></svg>
				{s.label}
			</a>
		{/each}
		{#if actor.kind === 'space'}<a href={reviewsUrl} class="chip" rel="noopener">Google マップの口コミ ›</a>{/if}
	</div>
	{#if actor.facilities.length}
		<div class="pills mt-3">
			{#each actor.facilities as f (f)}<span class="chip chip-plain">{f}</span>{/each}
		</div>
	{/if}
	{#if actor.kind === 'space' && !unofficial}
		<!-- 料金表より先に、誰に声をかければいいか -->
		<div class="mt-5 border-t border-line pt-4">
			<p class="text-sm font-semibold">ここで開けたい人は、まず声をかけてみてください。</p>
			<div class="pills mt-3">
				{#if actor.xHandle}<a href="https://x.com/{actor.xHandle}" class="chip chip-tape gap-1.5" rel="noopener" aria-label="X で @{actor.xHandle} に声をかける"><svg viewBox="0 0 24 24" class="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden="true"><path d={SNS_ICON.x} /></svg>で @{actor.xHandle} に声をかける ›</a>{/if}
				<a href="/new?space={actor.handle}" class="chip">日が決まっていたら、ここでまがりする ›</a>
			</div>
		</div>
	{/if}
	<!-- ページ内の目次は、長くなるハコ・団体のページだけ。人のページは短いので出さない -->
	{#if actor.kind !== 'person' && sections.length > 1}
		<nav class="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold" aria-label="このページ">
			{#each sections as s (s.id)}<a href="#{s.id}" class="hover:text-accent-ink">{s.label} ›</a>{/each}
		</nav>
	{/if}
</header>

{#if actor.body}
	<section id="about" class="mb-12 max-w-[40em] scroll-mt-20">
		<div class="section-head"><h2 class="section-title">紹介</h2></div>
		<Blocks text={actor.body} />
	</section>
{/if}

<section id="events" class="mb-12 scroll-mt-20">
	<MonthGrid year={data.calendar.year} month={data.calendar.month} grid={data.calendar.grid} events={data.events} {anchorDays} compact />
</section>

<div class="section-head">
	<h2 class="section-title">これからの間</h2>
	<span class="chip">{upcoming.length} 間</span>
</div>

{#if upcoming.length === 0}
	<Empty title="これからの間はまだありません。" hint="くねくねし始めたらここに出ます。" />
{/if}
<DayList events={upcoming} collapse={false} />

<!-- どんな会を開いてきたか。新しいほうから数件だけ出し、続きは /@handle/past -->
{#if data.past.length}
	<section id="past" class="mt-12 scroll-mt-20">
		<div class="section-head">
			<h2 class="section-title">これまでの間</h2>
			{#if data.morePast}<a href="/@{actor.handle}/past" class="btn">すべて見る ›</a>{/if}
		</div>
		<DayList events={data.past} collapse={false} />
	</section>
{/if}

{#if hasAccess}
	<section id="access" class="mt-12 mb-12 scroll-mt-20">
		<div class="section-head"><h2 class="section-title">アクセス</h2></div>
		<dl class="defs">
			{#if actor.address}
				<dt>住所</dt>
				<dd>{address}{#if mapUrl}<a href={mapUrl} class="ml-3 text-sm text-accent-ink hover:underline" rel="noopener">地図 ›</a>{/if}</dd>
			{/if}
			{#if actor.access}<dt>行き方</dt><dd class="whitespace-pre-line">{actor.access}</dd>{/if}
			{#if actor.hours}<dt>営業時間</dt><dd class="whitespace-pre-line">{actor.hours}</dd>{/if}
			{#if actor.closedDays}<dt>定休日</dt><dd class="whitespace-pre-line">{actor.closedDays}</dd>{/if}
			{#if actor.operator}<dt>運営</dt><dd>{actor.operator}</dd>{/if}
		</dl>
	</section>
{/if}

{#if social.rest.length}
	<section class="mb-12">
		<div class="section-head"><h2 class="section-title text-[1.25rem]">リンク</h2></div>
		<div class="pills">
			{#each social.rest as l (l.url)}<a href={l.url} class="chip" rel="noopener">{l.label} ›</a>{/each}
		</div>
	</section>
{/if}
