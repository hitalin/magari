<script lang="ts">
import type { PageProps } from "./$types";

let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.name} のページを引き取る | ◱</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="mx-auto mt-6 max-w-md">
	<p class="label"><a href="/@{data.handle}" class="hover:text-accent-ink">‹ {data.name} · @{data.handle}</a></p>
	<h1 class="mt-2 text-2xl">ページを引き取る</h1>
	<p class="mt-3 text-sm text-muted">
		店の X（<a href="https://x.com/{data.x}" class="underline underline-offset-2 hover:text-accent-ink" rel="noopener">@{data.x}</a>）でログインしている人に、このページの管理をその場でお渡しします。確かめるために、いまの ID を X に問い合わせます。投稿はしません。
	</p>

	<div class="panel mt-8 space-y-4 p-6">
		{#if form?.error}<p class="rounded-sm bg-accent-soft px-4 py-2 text-sm text-accent-ink" role="alert">{form.error}</p>{/if}
		{#if data.loggedIn}
			<form method="POST"><button type="submit" class="btn btn-primary w-full justify-center">@{data.x} として引き取る</button></form>
		{:else}
			<a href="/login?next={encodeURIComponent(`/claim/${data.handle}`)}" class="btn btn-primary w-full justify-center">@{data.x} でログインする</a>
		{/if}
		<p class="text-xs text-dim">引き取ると「非公式」の表示が外れ、紹介文や写真を自分で書けます。予定はいまのカレンダーから写し続けます。</p>
	</div>

	<p class="mt-6 text-sm text-muted">
		店の X を使えない方は<a href="/contact?kind=claim&about=@{data.handle}" class="underline underline-offset-2 hover:text-accent-ink">運営への連絡</a>から。載せたくない方は<a href="/contact?kind=takedown&about=@{data.handle}" class="underline underline-offset-2 hover:text-accent-ink">掲載の取り下げ</a>を。
	</p>
</section>
