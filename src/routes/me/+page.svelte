<script lang="ts">
import { authClient, startMiAuth } from '#lib/auth-client.ts';
import Empty from '#lib/components/Empty.svelte';
import { formatWhen } from '#lib/date.ts';
import { invalidateAll } from '$app/navigation';
import type { PageProps } from './$types';

let { data }: PageProps = $props();
let passkeyMsg = $state<string | null>(null);
let linkHost = $state('');
let linkMsg = $state<string | null>(null);

async function addPasskey() {
	const res = await authClient.passkey.addPasskey({ name: 'まがり' });
	passkeyMsg = res?.error
		? 'パスキーの登録に失敗しました'
		: 'パスキーを登録しました。次回からパスキーでログインできます。';
}
async function linkX() {
	await authClient.linkSocial({ provider: 'twitter', callbackURL: '/me' });
}
async function linkMisskey(e: SubmitEvent) {
	e.preventDefault();
	const url = await startMiAuth(linkHost, '/me');
	if (url) location.href = url;
	else linkMsg = 'サーバー名が正しくありません';
}
async function unlink(accountId: string) {
	if (!confirm('このログイン方法を外しますか？')) return;
	const res = await authClient.unlinkAccount({ accountId });
	linkMsg = res?.error ? '外せませんでした。最後のログイン方法は外せません。' : null;
	await invalidateAll();
}

const STATUS: Record<string, string> = { draft: '下書き', published: '公開', cancelled: '中止' };
</script>

<svelte:head><title>自分 | まがり</title></svelte:head>

<header class="panel mt-4 mb-8 p-6 sm:p-8">
	<div class="flex items-start gap-5">
		{#if data.actor.avatarUrl}
			<img src={data.actor.avatarUrl} alt="" class="h-20 w-20 shrink-0 rounded-full border border-line object-cover sm:h-24 sm:w-24" />
		{:else}
			<span class="h-20 w-20 shrink-0 rounded-full bg-accent-soft sm:h-24 sm:w-24"></span>
		{/if}
		<div class="min-w-0">
			<p class="label">自分</p>
			<h1 class="mt-1 text-2xl">{data.actor.name}</h1>
			<p class="text-sm text-muted">@{data.actor.handle}</p>
		</div>
	</div>
	<div class="mt-5 flex flex-wrap gap-2">
		<a href="/new" class="btn btn-primary">まがりする</a>
		<a href="/@{data.actor.handle}" class="btn">自分のページ ›</a>
		<a href="/@{data.actor.handle}/edit" class="btn">ページを編集</a>
		<button type="button" class="btn" onclick={addPasskey}>パスキーを登録</button>
		<form method="POST" action="/logout"><button type="submit" class="btn">ログアウト</button></form>
	</div>
	{#if passkeyMsg}<p class="mt-3 text-sm text-accent-ink">{passkeyMsg}</p>{/if}
</header>

{#snippet list(title: string, items: typeof data.upcoming, empty: string)}
	<section class="mb-10">
		<div class="section-head"><h2 class="section-title text-[1.25rem]">{title}</h2><span class="chip">{items.length} 間</span></div>
		{#if items.length === 0}
			<Empty title={empty} />
		{:else}
			<div class="rule-list">
				{#each items as e (e.id)}
					<div class="row">
						<span class="font-mono text-xs text-muted">{formatWhen(e).replace(' ', '\n')}</span>
						<span class="min-w-0">
							<a href="/e/{e.id}/edit" class="block font-serif text-[1.05rem] font-bold hover:text-accent-ink">{e.title}</a>
							<span class="mt-1 flex flex-wrap gap-2 text-xs text-muted">
								<span class="chip chip-plain">{STATUS[e.status]}</span>
								{#if e.visibility !== 'public'}<span class="chip chip-plain">{e.visibility === 'unlisted' ? 'URL 限定' : '自分だけ'}</span>{/if}
								<a href="/e/{e.id}" class="hover:text-accent-ink">見る ›</a>
								<a href="/new?from={e.id}" class="hover:text-accent-ink">複製 ›</a>
							</span>
						</span>
					</div>
				{/each}
			</div>
		{/if}
	</section>
{/snippet}

{@render list('これからの間', data.upcoming, 'まだくねくねしていません。「まがりする」から。')}
{#if data.drafts.length}{@render list('下書き', data.drafts, '')}{/if}
{#if data.past.length}{@render list('過去の間', data.past, '')}{/if}

<section class="mb-10">
	<div class="section-head">
		<h2 class="section-title text-[1.25rem]">管理しているハコ・団体</h2>
		<a href="/spaces/new" class="btn">ハコを登録する</a>
	</div>
	{#if data.managed.length === 0}
		<p class="text-sm text-muted">店や会場のページを作ると、紹介・出店プラン・アクセス・お知らせ・問い合わせフォームを載せられます。</p>
	{:else}
		<div class="rule-list">
			{#each data.managed as a (a.id)}
				<div class="row items-center">
					<span class="font-mono text-xs text-muted">{a.kind === 'space' ? 'ハコ' : '団体'}</span>
					<span class="flex flex-wrap items-center gap-3">
						<a href="/@{a.handle}/edit" class="font-serif text-[1.05rem] font-bold hover:text-accent-ink">{a.name}</a>
						<span class="text-xs text-muted">@{a.handle}</span>
						<a href="/@{a.handle}" class="text-xs text-muted hover:text-accent-ink">見る ›</a>
					</span>
				</div>
			{/each}
		</div>
	{/if}
</section>

<section class="mb-10">
	<div class="section-head"><h2 class="section-title text-[1.25rem]">ログイン方法</h2></div>
	<p class="mb-3 text-sm text-muted">X と Misskey を両方つないでおくと、どちらからでも同じ ID で入れます。</p>
	<div class="rule-list">
		{#each data.accounts as a (a.providerId + a.accountId)}
			<div class="row items-center">
				<span class="font-mono text-xs text-muted">{a.label}</span>
				<span class="flex flex-wrap items-center gap-3 text-sm">
					<span>{a.detail ?? 'つながっています'}</span>
					{#if data.accounts.length > 1}
						<button type="button" class="text-xs text-muted hover:text-accent-ink" onclick={() => unlink(a.accountId)}>外す</button>
					{/if}
				</span>
			</div>
		{/each}
	</div>
	<div class="mt-4 flex flex-wrap items-center gap-3">
		{#if data.xEnabled && !data.accounts.some((a) => a.providerId === 'twitter')}
			<button type="button" class="btn" onclick={linkX}>X をつなぐ</button>
		{/if}
		<form class="flex gap-2" onsubmit={linkMisskey}>
			<input bind:value={linkHost} class="input" placeholder="Misskey サーバーのドメイン" autocapitalize="off" autocomplete="off" required />
			<button type="submit" class="btn shrink-0">Misskey をつなぐ</button>
		</form>
	</div>
	{#if linkMsg}<p class="mt-3 text-sm text-accent-ink">{linkMsg}</p>{/if}
</section>

<section class="mt-16 border-t border-line pt-8">
	<p class="label">アカウントの削除</p>
	<p class="mt-2 text-sm text-muted">自分で開いた間、自分のページ、ログイン方法をすべて消します。取り込み元（エデンなど）のデータには影響しません。元に戻せません。</p>
	<form
		method="POST"
		action="?/deleteAccount"
		class="mt-3"
		onsubmit={(e) => {
			if (!confirm('本当にアカウントを削除しますか？開いた間もすべて消えます。')) e.preventDefault();
		}}
	>
		<button type="submit" class="btn text-accent-ink">アカウントを削除する</button>
	</form>
</section>
