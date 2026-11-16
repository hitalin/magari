<script lang="ts">
import Flyer from "#lib/components/Flyer.svelte";
import { formatWhen } from "#lib/date.ts";
import { flyerStyle } from "#lib/flyer.ts";
import { eventPlace } from "#lib/share.ts";
import type { PageProps } from "./$types";

// X で共有したときのカード画像の元（1200×630）。/e/{id}/og.png がこのページを撮る。
// 左にフライヤーを切らずに置き、右に題・日時・場所。
let { data }: PageProps = $props();
const event = $derived(data.event);
const place = $derived(eventPlace(event));
const host = $derived(event.hosts[0]?.name ?? null);
</script>

<svelte:head>
	<title>{event.title} | ◱</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<!-- ヘッダーやフッターごと覆う（撮る窓は 1200×630） -->
<div class="card">
	<div class="card-flyer">
		<div class="flyer-pin" style="--tilt: {flyerStyle(event.id).tilt / 2}deg">
			{#if event.flyerUrl}
				<img src={event.flyerUrl} alt="" />
			{:else}
				<div class="auto"><Flyer id={event.id} title={event.title} startsAt={event.startsAt} endsAt={event.endsAt} allDay={event.allDay} {place} {host} /></div>
			{/if}
		</div>
	</div>
	<div class="card-text">
		<p class="when">{formatWhen(event)}</p>
		<p class="title" class:long={event.title.length > 24}>{#if event.status === 'cancelled'}<span class="cancelled">中止</span>{/if}{event.title}</p>
		{#if place}<p class="place">📍 {place}</p>{/if}
		{#if host && host !== place}<p class="host">{host}</p>{/if}
		<p class="site">◱ magari.cc</p>
	</div>
</div>

<style>
	.card {
		position: fixed;
		z-index: 1000;
		inset: 0 auto auto 0;
		width: 1200px;
		height: 630px;
		display: grid;
		grid-template-columns: 470px 1fr;
		background: var(--color-bg);
		color: var(--color-text);
	}
	.card-flyer {
		display: grid;
		place-items: center;
		padding-left: 30px;
	}
	/* 縦横比は自由。540 の高さと 390 の幅に収めて、切らない */
	.card-flyer img {
		width: auto;
		max-width: 390px;
		max-height: 540px;
	}
	.auto {
		width: 380px;
	}
	.card-text {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 18px;
		min-width: 0;
		padding: 56px 64px 56px 36px;
	}
	.card-text p {
		margin: 0;
	}
	.when {
		font-family: var(--font-serif);
		font-size: 38px;
		font-weight: 700;
		color: var(--color-accent-2);
	}
	.title {
		display: -webkit-box;
		overflow: hidden;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		font-family: var(--font-serif);
		font-size: 64px;
		font-weight: 700;
		line-height: 1.25;
		line-break: strict;
		overflow-wrap: anywhere;
	}
	.title.long {
		font-size: 46px;
		-webkit-line-clamp: 4;
		line-clamp: 4;
	}
	.cancelled {
		margin-right: 0.3em;
		padding: 0 0.25em;
		background: var(--color-accent);
		color: var(--color-bg);
		font-family: var(--font-sans);
		font-size: 0.6em;
		vertical-align: 0.2em;
	}
	.place,
	.host {
		overflow: hidden;
		font-size: 32px;
		font-weight: 700;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.host {
		font-size: 26px;
		color: var(--color-muted);
	}
	.site {
		position: absolute;
		right: 40px;
		bottom: 28px;
		font-size: 24px;
		font-weight: 700;
		color: var(--color-dim);
	}
</style>
