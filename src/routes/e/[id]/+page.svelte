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

	<dl class="defs mt-2">
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
			<dd><a href={event.url} class="text-accent-ink hover:underline" rel="noopener">{event.url.replace(/^https?:\/\//, '').slice(0, 60)}</a></dd>
		{/if}
		{#if event.onlineUrl}
			<dt>URL</dt>
			<dd><a href={event.onlineUrl} class="text-accent-ink hover:underline" rel="noopener">{event.onlineUrl}</a></dd>
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

	{#if event.description}
		<div class="mx-auto mt-10 max-w-[44rem] whitespace-pre-line text-[1.05rem] leading-[2]">{event.description}</div>
	{/if}

	{#if event.source}
		<p class="mt-8 text-center text-xs text-dim">この間は主催者の Google カレンダー（公開 iCal）から取り込んでいます。内容は元のカレンダーに従います。</p>
	{/if}

	<div class="mt-12 flex flex-wrap justify-center gap-3">
		<a href={shareUrl} class="btn btn-primary" rel="noopener">X で共有</a>
		{#if event.hosts[0]}<a href="/@{event.hosts[0].handle}" class="btn">{event.hosts[0].name} のページ ›</a>{/if}
	</div>
</article>
