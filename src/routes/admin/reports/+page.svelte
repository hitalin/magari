<script lang="ts">
import Empty from "#lib/components/Empty.svelte";
import Field from "#lib/components/Field.svelte";
import { REPORT_KIND_LABEL } from "#lib/report-form.ts";
import type { PageProps } from "./$types";

let { data, form }: PageProps = $props();
const open = $derived(data.reports.filter((r) => !r.handledAt));
const done = $derived(data.reports.filter((r) => r.handledAt));
const fmt = new Intl.DateTimeFormat("ja-JP", {
	dateStyle: "medium",
	timeStyle: "short",
	timeZone: "Asia/Tokyo",
});
</script>

<svelte:head>
	<title>運営への連絡 | ◱</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<!-- 連絡 1 件。カードに置くのは、押すだけで済む操作（非表示・対応済み・消す）だけ。入力が要る操作は下の節でする -->
{#snippet card(r: (typeof data.reports)[number])}
	<article class="panel p-5">
		<p class="label">{REPORT_KIND_LABEL[r.kind]} · {fmt.format(r.createdAt)}{#if r.handledAt} · 対応済み {fmt.format(r.handledAt)}{/if}</p>
		{#if r.about}<p class="mt-2 font-mono text-sm">{r.about}</p>{/if}
		<p class="mt-2 text-sm">{r.name} · 返信先 <span class="font-mono">{r.contact}</span></p>
		<p class="mt-3 text-sm whitespace-pre-wrap">{r.body}</p>
		{#if r.note}<p class="mt-3 text-sm text-muted">対応: {r.note}</p>{/if}
		<div class="mt-4 flex flex-wrap items-end gap-3">
			{#if !r.handledAt}
				{#if r.canHide}
					<form method="POST" action="?/hide">
						<input type="hidden" name="target" value={r.about} />
						<button type="submit" class="btn btn-primary text-xs">対象を非表示にする</button>
					</form>
				{/if}
				<form method="POST" action="?/handle" class="flex flex-wrap items-end gap-2">
					<input type="hidden" name="id" value={r.id} />
					<input name="note" maxlength="500" class="input max-w-xs text-sm" placeholder="何をしたか" aria-label="何をしたか" />
					<button type="submit" class="btn text-xs">対応済みにする</button>
				</form>
			{/if}
			<form method="POST" action="?/deleteReport" class="ml-auto" onsubmit={(e) => { if (!confirm('この連絡を記録ごと消しますか？')) e.preventDefault(); }}>
				<input type="hidden" name="id" value={r.id} />
				<button type="submit" class="text-xs text-muted hover:text-accent-ink">消す</button>
			</form>
		</div>
	</article>
{/snippet}

<section class="mt-6">
	<div class="section-head"><h1 class="section-title">運営への連絡</h1></div>
	{#if open.length === 0}
		<Empty title="対応待ちの連絡はありません。" />
	{:else}
		<div class="space-y-4">
			{#each open as r (r.id)}{@render card(r)}{/each}
		</div>
	{/if}
	<!-- 済んだものは畳んでおく -->
	{#if done.length}
		<details class="mt-6">
			<summary class="cursor-pointer text-sm text-muted hover:text-accent-ink">対応済み {done.length} 件</summary>
			<div class="mt-4 space-y-4 opacity-70">
				{#each done as r (r.id)}{@render card(r)}{/each}
			</div>
		</details>
	{/if}
</section>

<section class="mt-12">
	<div class="section-head"><h2 class="section-title">非表示</h2></div>
	<p class="mb-6 text-sm text-muted">消さずに隠すので、いつでも戻せます。ページを隠すと、そこで開かれる間と、そこが主催の間も隠れます。</p>
	<form method="POST" action="?/hide" class="panel flex flex-wrap items-end gap-4 p-5">
		{#if form?.hideError}<p class="w-full text-sm text-accent-ink" role="alert">{form.hideError}</p>{/if}
		<div class="min-w-0 flex-1"><Field label="対象"><input name="target" required class="input" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="@ID か、間の URL" /></Field></div>
		<button type="submit" class="btn btn-primary">非表示にする</button>
	</form>
	{#if data.hidden.length}
		<ul class="mt-6 space-y-2">
			{#each data.hidden as h (h.target)}
				<li class="panel flex flex-wrap items-center gap-3 p-3 text-sm">
					<span class="font-mono">{h.target}</span>
					<span>{h.label}</span>
					<span class="text-muted">{fmt.format(h.hiddenAt)} から</span>
					<form method="POST" action="?/unhide" class="ml-auto">
						<input type="hidden" name="target" value={h.target} />
						<button type="submit" class="btn text-xs">戻す</button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<section class="mt-12" id="handover">
	<div class="section-head"><h2 class="section-title">ページの引き取り</h2></div>
	<p class="mb-6 text-sm text-muted">本人だと確かめてから、ハコ・団体のページの管理者に加えます。相手は先にログインして、自分のページを作っている必要があります。</p>
	<form method="POST" action="?/handover" class="panel grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
		{#if form?.handoverError}<p class="text-sm text-accent-ink sm:col-span-3" role="alert">{form.handoverError}</p>{/if}
		{#if form?.handoverDone}<p class="text-sm text-accent-ink sm:col-span-3" role="status">{form.handoverDone}</p>{/if}
		<Field label="ページ"><input name="page" required class="input" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="ハコ・団体の @ID" /></Field>
		<Field label="渡す人"><input name="person" required class="input" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="その人の @ID" /></Field>
		<button type="submit" class="btn btn-primary">管理者に加える</button>
	</form>
</section>

<section class="mt-12">
	<div class="section-head"><h2 class="section-title">掲載拒否リスト</h2></div>
	<p class="mb-6 text-sm text-muted">入れた ID のページは、だれも作れません（取り込みも飛ばします）。すでにあるページは消えません。</p>
	<form method="POST" action="?/block" class="panel grid gap-4 p-5 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
		{#if form?.error}<p class="text-sm text-accent-ink sm:col-span-3" role="alert">{form.error}</p>{/if}
		<Field label="ID"><input name="handle" required class="input" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="@ID" /></Field>
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

<section class="mt-12">
	<div class="section-head"><h2 class="section-title">写さない主催</h2></div>
	<p class="mb-6 text-sm text-muted">題にこの語が入った会は、次の取り込み（毎時）から写しません。すでに写した先の会も消えます。全角半角・大文字小文字・空白の違いは区別しません。</p>
	<form method="POST" action="?/blockTitle" class="panel grid gap-4 p-5 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
		{#if form?.titleError}<p class="text-sm text-accent-ink sm:col-span-3" role="alert">{form.titleError}</p>{/if}
		<Field label="題に入る語"><input name="phrase" required maxlength="50" class="input" placeholder="主催の名前や会の名前" /></Field>
		<Field label="メモ"><input name="note" maxlength="200" class="input" placeholder="いつ、だれの依頼か" /></Field>
		<button type="submit" class="btn btn-primary">写さない</button>
	</form>
	{#if data.blockedTitles.length}
		<ul class="mt-6 space-y-2">
			{#each data.blockedTitles as b (b.phrase)}
				<li class="panel flex flex-wrap items-center gap-3 p-3 text-sm">
					<span>{b.phrase}</span>
					{#if b.note}<span class="text-muted">{b.note}</span>{/if}
					<form method="POST" action="?/unblockTitle" class="ml-auto">
						<input type="hidden" name="phrase" value={b.phrase} />
						<button type="submit" class="btn text-xs">外す</button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
</section>
