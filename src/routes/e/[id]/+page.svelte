<script lang="ts">
import Flyer from "#lib/components/Flyer.svelte";
import { formatWhen } from "#lib/date.ts";
import { flyerStyle } from "#lib/flyer.ts";
import { eventPlace, eventShareText, xShareUrl } from "#lib/share.ts";
import { page } from "$app/state";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
const event = $derived(data.event);
const shareUrl = $derived(xShareUrl(eventShareText(event), page.url.href));
// 主催（本人か、管理しているハコ・団体）なら編集できる。取り込んだ会は元のカレンダーが正なので編集しない
const canEdit = $derived(
	!event.source && event.hosts.some((h) => data.managed.includes(h.handle)),
);
// リンクカードの説明: 日時と場所を先頭に、続けて説明文
const cardDescription = $derived(
	[
		[formatWhen(event), eventPlace(event)].filter(Boolean).join(" · "),
		event.description?.slice(0, 100),
	]
		.filter(Boolean)
		.join(" — "),
);
</script>

<svelte:head>
	<title>{event.title} | まがり</title>
	<meta property="og:title" content={event.title} />
	<meta property="og:type" content="article" />
	<meta name="description" content={cardDescription} />
	<meta property="og:description" content={cardDescription} />
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
		{#if canEdit}
			<a href="/e/{event.id}/edit" class="btn mt-6 px-4 py-1.5 text-sm">この間を編集</a>
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

	<!-- ページのいちばん下に、壁に貼ったフライヤー（上げた画像が無ければ自動のビラ） -->
	<div class="flyer-pin mx-auto mt-16 w-full max-w-[17rem]" style="--tilt: {flyerStyle(event.id).tilt / 2}deg">
		{#if event.flyerUrl}
			<img src={event.flyerUrl} alt="{event.title} のフライヤー" />
		{:else}
			<Flyer id={event.id} title={event.title} startsAt={event.startsAt} endsAt={event.endsAt} allDay={event.allDay} place={event.space?.name ?? event.locationName} host={event.hosts[0]?.name ?? null} />
		{/if}
	</div>

</article>
