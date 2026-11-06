<script lang="ts">
import { formatWhen } from '#lib/date.ts';
import { page } from '$app/state';
import type { PageProps } from './$types';

let { data }: PageProps = $props();
const event = $derived(data.event);
const shareUrl = $derived(
	`https://x.com/intent/post?${new URLSearchParams({
		text: `${event.title} ${formatWhen(event)}`,
		url: page.url.href
	})}`
);
</script>

<svelte:head>
	<title>{event.title} | まがり</title>
	<meta property="og:title" content={event.title} />
	<meta property="og:type" content="article" />
	{#if event.description}<meta property="og:description" content={event.description.slice(0, 120)} />{/if}
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<article class="mt-4">
	<p class="text-sm text-muted"><a href="/" class="hover:text-accent-ink">これからの間</a> › {formatWhen(event).split(' ')[0]}</p>

	{#if event.status === 'cancelled'}
		<p class="mt-4 rounded-sm bg-accent-soft px-4 py-2 text-sm text-accent-ink">この間は中止になりました。</p>
	{:else if event.status === 'draft'}
		<p class="mt-4 rounded-sm bg-accent-soft px-4 py-2 text-sm text-accent-ink">下書きです。あなたにだけ見えています。<a href="/e/{event.id}/edit" class="ml-2 underline">編集 ›</a></p>
	{:else if event.visibility === 'private'}
		<p class="mt-4 rounded-sm bg-accent-soft px-4 py-2 text-sm text-accent-ink">自分だけに見える間です。</p>
	{/if}

	<header class="dots -mx-4 mt-2 px-4 py-10 text-center">
		<p class="font-serif text-lg text-muted">{formatWhen(event)}</p>
		<h1 class="mt-3 text-[clamp(1.8rem,4vw,2.8rem)]">{event.title}</h1>
		{#if event.tags.length}
			<div class="mt-5 flex flex-wrap justify-center gap-1.5">
				{#each event.tags as tag (tag)}
					<span class="chip chip-tape">{tag}</span>
				{/each}
			</div>
		{/if}
	</header>

	<div class={event.description ? 'detail-cols mt-2' : 'mt-2'}>
		{#if event.description}
			<div class="order-1 whitespace-pre-line text-[1.05rem] leading-[2] md:order-0">{event.description}</div>
		{/if}
		<aside class="detail-side">
			<dl class="defs">
				{#if event.hosts.length}
					<dt>主催</dt>
					<dd>{#each event.hosts as h, i (h.handle)}{#if i > 0}、{/if}<a href="/@{h.handle}" class="font-serif font-bold hover:text-accent-ink">{h.name}</a>{/each}</dd>
				{/if}
				{#if event.space}
					<dt>ハコ</dt>
					<dd><a href="/@{event.space.handle}" class="font-serif font-bold hover:text-accent-ink">{event.space.name}</a></dd>
				{/if}
				{#if event.locationVisibility === 'attendees'}
					<dt>場所</dt>
					<dd>{event.locationName ?? ''}<span class="ml-2 text-sm text-muted">詳しい場所は参加者にお知らせします</span></dd>
				{:else if event.locationName || event.locationAddress}
					<dt>場所</dt>
					<dd>{event.locationName}{#if event.locationAddress}<span class="ml-2 text-sm text-muted">{event.locationAddress}</span>{/if}</dd>
				{/if}
				{#if event.url}
					<dt>告知</dt>
					<dd class="break-all"><a href={event.url} class="text-accent-ink hover:underline" rel="noopener">{event.url.replace(/^https?:\/\//, '').slice(0, 60)}</a></dd>
				{/if}
				{#if event.onlineUrl}
					<dt>URL</dt>
					<dd class="break-all"><a href={event.onlineUrl} class="text-accent-ink hover:underline" rel="noopener">{event.onlineUrl}</a></dd>
				{/if}
				{#if event.feeText}
					<dt>料金</dt>
					<dd>{event.feeText}</dd>
				{/if}
				{#if event.capacity}
					<dt>定員</dt>
					<dd>{event.capacity}人</dd>
				{/if}
			</dl>
			<div class="mt-6 flex flex-wrap justify-center gap-3 {event.description ? 'md:justify-start' : ''}">
				<a href={shareUrl} class="btn btn-primary" rel="noopener">X で共有</a>
				{#if event.hosts[0]}<a href="/@{event.hosts[0].handle}" class="btn">{event.hosts[0].name} のページ ›</a>{/if}
			</div>
		</aside>
	</div>

	{#if event.source}
		<p class="mt-10 text-center text-xs text-dim">この間は主催者の Google カレンダー（公開 iCal）から取り込んでいます。内容は元のカレンダーに従います。</p>
	{/if}
</article>
