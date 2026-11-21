<script lang="ts">
import { authClient } from "#lib/auth-client.ts";
import Empty from "#lib/components/Empty.svelte";
import MisskeyForm from "#lib/components/MisskeyForm.svelte";
import { formatWhen } from "#lib/date.ts";
import { MISSKEY_ICON, SNS_ICON } from "#lib/sns.ts";
import { invalidateAll } from "$app/navigation";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
let passkeyMsg = $state<string | null>(null);
let linkMsg = $state<string | null>(null);

const LINK_ERRORS: Record<string, string> = {
	miauth_state:
		"Misskey からの戻りが確認できませんでした。もう一度お試しください。",
	miauth_denied: "Misskey 側で許可されませんでした。",
	miauth_user: "Misskey のアカウント情報を取れませんでした。",
	account_already_linked_to_different_user:
		"その X アカウントは、すでに別の ID で使われています。まとめたいときは運営に連絡してください。",
	miauth_linked_elsewhere:
		"その Misskey アカウントは、すでに別の ID で使われています。まとめたいときは運営に連絡してください。",
};

async function addPasskey() {
	const res = await authClient.passkey.addPasskey({ name: "まがり" });
	passkeyMsg = res?.error
		? "パスキーの登録に失敗しました"
		: "パスキーを登録しました。次回からパスキーでログインできます。";
}
async function linkX() {
	await authClient.linkSocial({
		provider: "twitter",
		callbackURL: "/me?linked",
		errorCallbackURL: "/me",
	});
}
async function unlink(id: string) {
	if (!confirm("このログイン方法を外しますか？")) return;
	const res = await authClient.unlinkAccount({ accountId: id });
	linkMsg = res?.error
		? "外せませんでした。最後のログイン方法は外せません。"
		: null;
	await invalidateAll();
}
</script>

<svelte:head><title>自分 | ◱</title></svelte:head>

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
		<!-- 開ける入口はナビの「まがり」だけ。ログインにまつわるもの（パスキー）は下の「ログイン方法」にまとめる -->
		<a href="/@{data.actor.handle}" class="btn">自分のページ ›</a>
		<a href="/@{data.actor.handle}/edit" class="btn">ページを編集</a>
		{#if data.isAdmin}<a href="/admin/reports" class="btn">運営の画面 ›</a>{/if}
		<form method="POST" action="/logout"><button type="submit" class="btn">ログアウト</button></form>
	</div>
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
								<!-- 下書きは見出しで分かり、公開は既定なので、札は中止だけ -->
								{#if e.status === 'cancelled'}<span class="chip chip-plain">中止</span>{/if}
								{#if e.visibility === 'unlisted'}<span class="chip chip-plain">URL 限定</span>{/if}
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

{@render list('これからの間', data.upcoming, 'まだくねくねしていません。上の「まがり」から開けられます。')}
{#if data.drafts.length}{@render list('下書き', data.drafts, '')}{/if}
{#if data.past.length}{@render list('これまでの間', data.past, '')}{/if}

<section class="mb-10">
	<div class="section-head">
		<h2 class="section-title text-[1.25rem]">管理しているハコ・団体</h2>
		<a href="/spaces/new" class="btn">ハコを登録する</a>
	</div>
	{#if data.managed.length === 0}
		<p class="text-sm text-muted">店や会場のページを作ると、紹介・出店プラン・アクセス・お知らせを載せられます。</p>
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
	<p class="mb-3 text-sm text-muted">X と Misskey のアカウントをいくつでもつなげます。どれで入っても同じ ID（@{data.actor.handle}）です。つないだアカウントは、自分のページの名前の下にも出ます。</p>
	{#if data.linked}<p class="mb-3 rounded-sm bg-accent-soft px-4 py-2 text-sm text-accent-ink" role="status">つなぎました。次からはそのアカウントでも入れます。</p>{/if}
	{#if data.linkError && LINK_ERRORS[data.linkError]}<p class="mb-3 rounded-sm bg-accent-soft px-4 py-2 text-sm text-accent-ink" role="alert">{LINK_ERRORS[data.linkError]}</p>{/if}
	<div class="rule-list">
		{#each data.accounts as a (a.id)}
			<div class="row items-center">
				{#if a.providerId === 'twitter' || a.providerId === 'miauth'}
				<span class="text-muted" role="img" aria-label={a.label}><svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor" aria-hidden="true"><path d={a.providerId === 'twitter' ? SNS_ICON.x : MISSKEY_ICON} /></svg></span>
			{:else}
				<span class="font-mono text-xs text-muted">{a.label}</span>
			{/if}
				<span class="flex flex-wrap items-center gap-3 text-sm">
					<span class="break-all">{a.detail ?? 'つながっています'}</span>
					{#if data.accounts.length > 1}
						<button type="button" class="text-xs text-muted hover:text-accent-ink" onclick={() => unlink(a.id)}>外す</button>
					{/if}
				</span>
			</div>
		{/each}
	</div>
	<div class="mt-4 max-w-md space-y-4">
		{#if data.xEnabled && !data.accounts.some((a) => a.providerId === 'twitter')}
			<button type="button" class="btn" onclick={linkX} aria-label="X をつなぐ"><svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true"><path d={SNS_ICON.x} /></svg>をつなぐ</button>
		{/if}
		<div>
			<p class="label mb-2 flex items-center gap-1.5"><svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true"><path d={MISSKEY_ICON} /></svg><span class="sr-only">Misskey </span>をつなぐ</p>
			<MisskeyForm callbackURL="/me?linked" action="つなぐ" />
		</div>
		<div>
			<button type="button" class="btn" onclick={addPasskey}>パスキーを登録</button>
			<p class="mt-2 text-xs text-dim">登録しておくと、X や Misskey を経由せず、指紋や顔で入れます。</p>
			{#if passkeyMsg}<p class="mt-2 text-sm text-accent-ink" role="status">{passkeyMsg}</p>{/if}
		</div>
	</div>
	{#if linkMsg}<p class="mt-3 text-sm text-accent-ink">{linkMsg}</p>{/if}
</section>

<section class="mt-16 border-t border-line pt-8">
	<p class="label">データの書き出し</p>
	<p class="mt-2 text-sm text-muted">自分のページ、管理しているハコ・団体、自分で開いた間、ログイン方法を、1 つの JSON にして持ち出せます。</p>
	<a href="/me/export.json" download class="btn mt-3">JSON で書き出す</a>
</section>

<section class="mt-8 border-t border-line pt-8">
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
