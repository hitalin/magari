<script lang="ts">
import Flyer from "#lib/components/Flyer.svelte";
import { formatWhen } from "#lib/date.ts";
import { flyerStyle } from "#lib/flyer.ts";
import {
	eventPlace,
	eventShareText,
	mentionParts,
	misskeyShareText,
	misskeyShareUrl,
	xShareText,
	xShareUrl,
} from "#lib/share.ts";
import { MISSKEY_ICON, SNS_ICON } from "#lib/sns.ts";
import { page } from "$app/state";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
const event = $derived(data.event);
// ?opened を付けずに貼る
const cleanUrl = $derived(page.url.origin + page.url.pathname);
const shareUrl = $derived(
	xShareUrl(xShareText(eventShareText(event), event.mentions), cleanUrl),
);
const misskeyUrl = $derived(
	misskeyShareUrl(
		misskeyShareText(eventShareText(event), event.mentions),
		cleanUrl,
	),
);
// 主催（本人か、管理しているハコ・団体）なら編集できる。取り込んだ会は元のカレンダーが正なので編集しない
const canEdit = $derived(
	!event.source && event.hosts.some((h) => data.managed.includes(h.handle)),
);
// 開けた直後（/new からの ?opened）。あとは貼るだけ、を先頭に出す
const opened = $derived(
	page.url.searchParams.has("opened") && event.status === "published",
);
// 共有する前にカード画像を作らせておく（撮るのに数秒かかり、X のクローラは待ってくれない）。
// 同じタブで X へ移るので、keepalive で取りに行かせたままにする
function warmCard() {
	if (data.ogImage) fetch(data.ogImage, { keepalive: true });
}
let copied = $state(false);
async function copyLink() {
	warmCard();
	await navigator.clipboard.writeText(cleanUrl);
	copied = true;
}
// 中止は題の頭に出す（X のカードや検索結果でも分かるように）
const cardTitle = $derived(
	event.status === "cancelled" ? `【中止】${event.title}` : event.title,
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
	<title>{cardTitle} | ◱</title>
	<meta property="og:title" content={cardTitle} />
	<meta property="og:type" content="article" />
	<meta name="description" content={cardDescription} />
	<meta property="og:description" content={cardDescription} />
	<meta name="twitter:card" content="summary_large_image" />
	<!-- 写した会は元の告知が正。検索には元を出してもらう -->
	{#if event.source}<meta name="robots" content="noindex" />{/if}
</svelte:head>

<article class="mt-4">
	{#if opened}
		<div class="panel mt-4 p-5">
			<p class="font-serif text-lg font-bold">開けました。あとは貼るだけ。</p>
			<div class="mt-3 flex flex-wrap gap-3">
				<a href={shareUrl} class="btn btn-primary" rel="noopener" onclick={warmCard} aria-label="X に貼る"><svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true"><path d={SNS_ICON.x} /></svg>に貼る</a>
				<a href={misskeyUrl} class="btn" rel="noopener" onclick={warmCard} aria-label="Misskey に貼る"><svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true"><path d={MISSKEY_ICON} /></svg>に貼る</a>
				<button type="button" class="btn" onclick={copyLink}>{copied ? 'コピーしました' : 'リンクをコピー'}</button>
			</div>
		</div>
	{/if}

	{#if event.hidden}
		<p class="mt-4 rounded-sm bg-accent-soft px-4 py-2 text-sm text-accent-ink">運営が非表示にしています。あなたにだけ見えています。心当たりが無ければ<a href="/contact?kind=other&about=/e/{event.id}" class="ml-1 underline">運営に連絡</a>してください。</p>
	{/if}
	{#if event.status === 'cancelled'}
		<p class="mt-4 rounded-sm bg-accent-soft px-4 py-2 text-sm text-accent-ink">中止になりました。</p>
	{:else if event.status === 'draft'}
		<p class="mt-4 rounded-sm bg-accent-soft px-4 py-2 text-sm text-accent-ink">下書きです。あなたにだけ見えています。</p>
	{/if}

	<!-- 左にフライヤー（上げた画像が無ければ自動のビラ）、右に会の情報 -->
	<div class="detail-cols mt-8">
		<div class="detail-flyer">
			<div class="flyer-pin mx-auto w-full max-w-[20rem] md:max-w-none" style="--tilt: {flyerStyle(event.id).tilt / 2}deg">
				{#if event.flyerUrl}
					<img src={event.flyerUrl} alt="{event.title} のフライヤー" />
				{:else}
					<Flyer id={event.id} title={event.title} startsAt={event.startsAt} endsAt={event.endsAt} allDay={event.allDay} place={event.space?.name ?? event.locationName} host={event.hosts[0]?.name ?? null} look={event.flyerLook} />
				{/if}
			</div>
		</div>
		<div class="min-w-0">
			<p class="font-serif text-lg text-muted">{formatWhen(event)}</p>
			<h1 class="mt-2 text-[clamp(1.7rem,3.5vw,2.4rem)]">{#each mentionParts(event.title, event.mentions) as part, i (i)}{#if part.href}<a href={part.href} class="text-accent-ink hover:underline" rel="noopener">{part.text}</a>{:else}{part.text}{/if}{/each}</h1>
			{#if canEdit}
				<a href="/e/{event.id}/edit" class="btn mt-5 px-4 py-1.5 text-sm">この間を編集</a>
			{/if}
			<dl class="defs mt-8">
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
					<dd>{event.locationName ?? ''}<span class="ml-2 text-sm text-muted">詳しい場所は主催に聞いてください</span></dd>
				{:else if event.locationName || event.locationAddress}
					<dt>場所</dt>
					<dd>{event.locationName}{#if event.locationAddress}<span class="ml-2 text-sm text-muted">{event.locationAddress}</span>{/if}</dd>
				{/if}
				{#if event.url}
					<dt>告知</dt>
					<dd><a href={event.url} class="block truncate text-accent-ink hover:underline" rel="noopener">{event.url.replace(/^https?:\/\//, '').slice(0, 60)}</a></dd>
				{/if}
				{#if event.onlineUrl}
					<dt>URL</dt>
					<dd class="break-all"><a href={event.onlineUrl} class="text-accent-ink hover:underline" rel="noopener">{event.onlineUrl}</a></dd>
				{/if}
				{#if event.feeText}
					<dt>料金</dt>
					<dd>{event.feeText}</dd>
				{/if}
			</dl>
			{#if event.description}
				<div class="mt-8 whitespace-pre-line text-[1.05rem] leading-[2]">{event.description}</div>
			{/if}
			<!-- まがりは載せる場所で、内容を確かめてはいない。行く前の確認先を必ず出す -->
			<p class="mt-8 text-xs leading-relaxed text-dim">
				{#if event.source}{event.space?.name ?? event.hosts[0]?.name ?? '主催'}が公開している予定表から、まがりが写した情報です（ご本人が載せたものではありません）。{:else}載せた人が書いた内容です。{/if}日時や場所は変わることがあるので、行く前に{#if event.url}<a href={event.url} class="underline underline-offset-2 hover:text-accent-ink" rel="noopener">主催の告知</a>{:else}主催の告知{/if}で確かめてください。
				この掲載に問題があれば<a href="/contact?kind=takedown&about=/e/{event.id}" class="underline underline-offset-2 hover:text-accent-ink">運営に連絡</a>できます。
			</p>
			<!-- 開けた直後は、上の「あとは貼るだけ」が同じ役目なので出さない -->
			{#if !opened}
				<div class="mt-4 flex flex-wrap gap-3">
					<a href={shareUrl} class="btn btn-primary" rel="noopener" onclick={warmCard} aria-label="X で共有"><svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true"><path d={SNS_ICON.x} /></svg>で共有</a>
					<a href={misskeyUrl} class="btn" rel="noopener" onclick={warmCard} aria-label="Misskey で共有"><svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true"><path d={MISSKEY_ICON} /></svg>で共有</a>
				</div>
			{/if}
		</div>
	</div>
</article>
