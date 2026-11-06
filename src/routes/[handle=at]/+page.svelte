<script lang="ts">
import Blocks from "#lib/components/Blocks.svelte";
import DayList from "#lib/components/DayList.svelte";
import Empty from "#lib/components/Empty.svelte";
import Field from "#lib/components/Field.svelte";
import MonthGrid from "#lib/components/MonthGrid.svelte";
import { formatDay } from "#lib/date.ts";
import { filterTags } from "#lib/group.ts";
import {
	INQUIRY_KIND_LABEL,
	INQUIRY_KINDS,
	PLAN_KIND_LABEL,
} from "#lib/space-form.ts";
import { KIND_LABEL } from "#lib/types.ts";
import { page } from "$app/state";
import type { PageProps } from "./$types";

let { data, form }: PageProps = $props();
const actor = $derived(data.actor);
const tags = $derived(filterTags(data.events));
// 選んだタグのどれかを持つ間を出す（複数は OR）
let activeTags = $state<string[]>([]);
const filtered = $derived(
	activeTags.length
		? data.events.filter((e) => e.tags.some((t) => activeTags.includes(t)))
		: data.events,
);
function toggleTag(tag: string) {
	activeTags = activeTags.includes(tag)
		? activeTags.filter((t) => t !== tag)
		: [...activeTags, tag];
}
const upcoming = $derived.by(() => {
	const now = Date.now();
	return filtered.filter(
		(e) => new Date(e.startsAt).getTime() >= now - 86_400_000,
	);
});
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
const canInquire = $derived(actor.kind !== "person");
const mapUrl = $derived(
	actor.address
		? `https://www.openstreetmap.org/search?query=${encodeURIComponent(actor.address)}`
		: null,
);
const sections = $derived(
	[
		data.posts.length && { id: "news", label: "お知らせ" },
		actor.body && { id: "about", label: "紹介" },
		data.plans.length && { id: "plans", label: "出店プラン" },
		{ id: "events", label: "これからの間" },
		hasAccess && { id: "access", label: "アクセス" },
		canInquire && { id: "contact", label: "お問い合わせ" },
	].filter((s): s is { id: string; label: string } => !!s),
);
const description = $derived(actor.catch ?? actor.summary ?? undefined);
</script>

<svelte:head>
	<title>{actor.name} | まがり</title>
	{#if description}<meta name="description" content={description} />{/if}
	<meta property="og:title" content={actor.name} />
	{#if description}<meta property="og:description" content={description} />{/if}
	{#if actor.headerUrl}<meta property="og:image" content="{page.url.origin}{actor.headerUrl}" />{/if}
</svelte:head>

{#if actor.headerUrl}
	<img src={actor.headerUrl} alt="" class="mt-4 aspect-[21/9] w-full rounded-lg border border-line object-cover sm:aspect-[3/1]" />
{/if}

<!-- ハコ（箱）のページは段ボールの看板 -->
<header class="{actor.kind === 'space' ? 'cardboard mt-8' : 'panel mt-4'} mb-8 p-6 sm:p-8">
	<div class="flex items-start gap-5">
		{#if actor.avatarUrl}
			<img src={actor.avatarUrl} alt="" class="h-20 w-20 shrink-0 rounded-full border border-line object-cover sm:h-24 sm:w-24" />
		{/if}
		<div class="min-w-0">
			<p class="label">{KIND_LABEL[actor.kind]} · @{actor.handle}</p>
			<h1 class="mt-2 text-[clamp(1.8rem,3.5vw,2.6rem)]">{actor.name}</h1>
			{#if actor.catch}<p class="mt-2 font-serif text-lg text-accent-ink">{actor.catch}</p>{/if}
		</div>
	</div>
	{#if actor.summary}<p class="mt-3 max-w-[34em] text-muted">{actor.summary}</p>{/if}
	<div class="pills mt-5">
		{#if actor.address}<span class="chip chip-plain">{actor.address}</span>{/if}
		{#if actor.url}<a href={actor.url} class="chip" rel="noopener">{actor.url.replace(/^https?:\/\//, '')}</a>{/if}
		{#if actor.xHandle}<a href="https://x.com/{actor.xHandle}" class="chip" rel="noopener">X @{actor.xHandle}</a>{/if}
		{#if actor.instagram}<a href="https://www.instagram.com/{actor.instagram}/" class="chip" rel="noopener">Instagram @{actor.instagram}</a>{/if}
		{#if canEdit}<a href="/@{actor.handle}/edit" class="chip chip-tape">ページを編集</a>{/if}
	</div>
	{#if actor.facilities.length}
		<div class="pills mt-3">
			{#each actor.facilities as f (f)}<span class="chip chip-plain">{f}</span>{/each}
		</div>
	{/if}
	{#if sections.length > 1}
		<nav class="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold" aria-label="このページ">
			{#each sections as s (s.id)}<a href="#{s.id}" class="hover:text-accent-ink">{s.label} ›</a>{/each}
		</nav>
	{/if}
</header>

{#if data.posts.length}
	<section id="news" class="mb-12 scroll-mt-20">
		<div class="section-head"><h2 class="section-title">お知らせ</h2></div>
		<div class="rule-list">
			{#each data.posts as post (post.id)}
				<article class="row">
					<span class="font-mono text-xs text-muted">{formatDay(post.publishedAt)}</span>
					<div class="min-w-0">
						<h3 class="font-serif text-[1.1rem] font-bold">{post.title}</h3>
						{#if post.body}<div class="mt-2 text-[0.95rem]"><Blocks text={post.body} /></div>{/if}
					</div>
				</article>
			{/each}
		</div>
	</section>
{/if}

{#if actor.body}
	<section id="about" class="mb-12 max-w-[40em] scroll-mt-20">
		<div class="section-head"><h2 class="section-title">紹介</h2></div>
		<Blocks text={actor.body} />
	</section>
{/if}

{#if data.plans.length}
	<section id="plans" class="mb-12 scroll-mt-20">
		<div class="section-head">
			<h2 class="section-title">出店プラン</h2>
			{#if canInquire}<a href="#contact" class="more">出店の相談をする ›</a>{/if}
		</div>
		<div class="grid gap-4 sm:grid-cols-2">
			{#each data.plans as plan (plan.id)}
				<article class="panel p-5">
					<p class="label">{PLAN_KIND_LABEL[plan.kind]}</p>
					<h3 class="mt-1 font-serif text-[1.25rem] font-bold">{plan.name}</h3>
					{#if plan.priceText}<p class="mt-3 whitespace-pre-line font-serif text-[1.05rem] leading-[1.9]">{plan.priceText}</p>{/if}
					{#if plan.description}<div class="mt-3 text-sm text-muted"><Blocks text={plan.description} /></div>{/if}
				</article>
			{/each}
		</div>
	</section>
{/if}

<section id="events" class="mb-12 scroll-mt-20">
	<MonthGrid year={data.calendar.year} month={data.calendar.month} grid={data.calendar.grid} events={filtered} compact />
</section>

<div class="section-head">
	<h2 class="section-title">これからの間</h2>
	<span class="chip">{upcoming.length} 間</span>
</div>

{#if tags.length}
	<div class="pills mb-6" role="group" aria-label="タグで絞る">
		<button type="button" class="chip {activeTags.length === 0 ? 'chip-tape' : 'chip-plain'}" aria-pressed={activeTags.length === 0} onclick={() => (activeTags = [])}>すべて</button>
		{#each tags as t (t.tag)}
			{@const on = activeTags.includes(t.tag)}
			<button type="button" class="chip {on ? 'chip-tape' : 'chip-plain'}" aria-pressed={on} onclick={() => toggleTag(t.tag)}>
				{t.tag} <span class="ml-1 opacity-70">{t.count}</span>
			</button>
		{/each}
	</div>
{/if}

{#if upcoming.length === 0}
	<Empty title="これからの間はまだありません。" hint="くねくねし始めたらここに出ます。" />
{/if}
<DayList events={upcoming} collapse={false} />

{#if hasAccess}
	<section id="access" class="mt-12 mb-12 scroll-mt-20">
		<div class="section-head"><h2 class="section-title">アクセス</h2></div>
		<dl class="defs">
			{#if actor.address}
				<dt>住所</dt>
				<dd>{actor.address}{#if mapUrl}<a href={mapUrl} class="ml-3 text-sm text-accent-ink hover:underline" rel="noopener">地図 ›</a>{/if}</dd>
			{/if}
			{#if actor.access}<dt>行き方</dt><dd class="whitespace-pre-line">{actor.access}</dd>{/if}
			{#if actor.hours}<dt>営業時間</dt><dd class="whitespace-pre-line">{actor.hours}</dd>{/if}
			{#if actor.closedDays}<dt>定休日</dt><dd class="whitespace-pre-line">{actor.closedDays}</dd>{/if}
			{#if actor.operator}<dt>運営</dt><dd>{actor.operator}</dd>{/if}
		</dl>
	</section>
{/if}

{#if actor.links.length}
	<section class="mb-12">
		<div class="section-head"><h2 class="section-title text-[1.25rem]">リンク</h2></div>
		<div class="pills">
			{#each actor.links as l (l.url)}<a href={l.url} class="chip" rel="noopener">{l.label} ›</a>{/each}
		</div>
	</section>
{/if}

{#if canInquire}
	<section id="contact" class="mt-12 mb-8 max-w-[36em] scroll-mt-20">
		<div class="section-head"><h2 class="section-title">お問い合わせ</h2></div>
		{#if form?.sent}
			<p class="rounded-sm bg-accent-soft px-4 py-3 text-sm text-accent-ink">送信しました。{actor.name} から返事をお待ちください。</p>
		{:else}
			<p class="mb-4 text-sm text-muted">出店・間借りの相談、イベント利用、ご来店、取材など。{actor.name} に直接届きます。</p>
			<form method="POST" action="?/inquire" class="panel space-y-5 p-6">
				{#if form?.error}<p class="text-sm text-accent-ink">{form.error}</p>{/if}
				<Field label="種別">
					<select name="kind" class="input">
						{#each INQUIRY_KINDS as k (k)}
							<option value={k} selected={(form?.values?.kind ?? 'rental') === k}>{INQUIRY_KIND_LABEL[k]}</option>
						{/each}
					</select>
				</Field>
				<div class="grid gap-4 sm:grid-cols-2">
					<Field label="お名前"><input name="name" value={form?.values?.name ?? ''} required maxlength="50" class="input" /></Field>
					<Field label="メールアドレス"><input type="email" name="email" value={form?.values?.email ?? ''} required class="input" /></Field>
				</div>
				<Field label="電話番号" hint="任意"><input type="tel" name="phone" value={form?.values?.phone ?? ''} class="input" /></Field>
				<Field label="内容"><textarea name="body" rows="6" required class="input">{form?.values?.body ?? ''}</textarea></Field>
				<div class="absolute -left-[9999px]" aria-hidden="true">
					<label>ウェブサイト（入力しないでください）<input name="website" tabindex="-1" autocomplete="off" /></label>
				</div>
				<button type="submit" class="btn btn-primary">送信する</button>
			</form>
		{/if}
	</section>
{/if}
