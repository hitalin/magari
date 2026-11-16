<script lang="ts">
import Empty from "#lib/components/Empty.svelte";
import Field from "#lib/components/Field.svelte";
import { REPORT_KIND_LABEL } from "#lib/report-form.ts";
import type { PageProps } from "./$types";

let { data, form }: PageProps = $props();
const fmt = new Intl.DateTimeFormat("ja-JP", {
	dateStyle: "medium",
	timeStyle: "short",
	timeZone: "Asia/Tokyo",
});
</script>

<svelte:head>
	<title>運営への連絡 | まがり</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="mt-6">
	<div class="section-head"><h1 class="section-title">運営への連絡</h1></div>
	{#if data.reports.length === 0}
		<Empty title="連絡はありません。" />
	{:else}
		<div class="space-y-4">
			{#each data.reports as r (r.id)}
				<article class="panel p-5">
					<p class="label">{REPORT_KIND_LABEL[r.kind]} · {fmt.format(r.createdAt)}</p>
					{#if r.about}<p class="mt-2 font-mono text-sm">{r.about}</p>{/if}
					<p class="mt-2 text-sm">{r.name} · <a href="mailto:{r.email}" class="underline underline-offset-2">{r.email}</a></p>
					<p class="mt-3 text-sm whitespace-pre-wrap">{r.body}</p>
					<form method="POST" action="?/deleteReport" class="mt-4">
						<input type="hidden" name="id" value={r.id} />
						<button type="submit" class="btn text-xs">対応済みにして消す</button>
					</form>
				</article>
			{/each}
		</div>
	{/if}
</section>

<section class="mt-12">
	<div class="section-head"><h2 class="section-title">掲載拒否リスト</h2></div>
	<p class="mb-6 text-sm text-muted">ここに入れた ID のページは、だれも作れません（取り込みも飛ばします）。すでにあるページは消えないので、別に消してください。</p>
	<form method="POST" action="?/block" class="panel grid gap-4 p-5 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
		{#if form?.error}<p class="text-sm text-accent-ink sm:col-span-3">{form.error}</p>{/if}
		<Field label="ID"><input name="handle" required class="input" autocapitalize="off" placeholder="@example" /></Field>
		<Field label="メモ"><input name="note" maxlength="200" class="input" placeholder="いつ、だれの依頼か" /></Field>
		<button type="submit" class="btn btn-primary">拒否リストに入れる</button>
	</form>
	{#if data.blocked.length}
		<ul class="mt-6 space-y-2">
			{#each data.blocked as b (b.handle)}
				<li class="panel flex flex-wrap items-center gap-3 p-3 text-sm">
					<span class="font-mono">@{b.handle}</span>
					{#if b.note}<span class="text-muted">{b.note}</span>{/if}
					<form method="POST" action="?/unblock" class="ml-auto">
						<input type="hidden" name="handle" value={b.handle} />
						<button type="submit" class="btn text-xs">外す</button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
</section>
