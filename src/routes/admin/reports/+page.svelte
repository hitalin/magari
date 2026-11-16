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
	<title>運営への連絡 | ◱</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="mt-6">
	<div class="section-head"><h1 class="section-title">運営への連絡</h1></div>
	{#if data.reports.length === 0}
		<Empty title="連絡はありません。" />
	{:else}
		<div class="space-y-4">
			{#each data.reports as r (r.id)}
				<article class="panel p-5 {r.handledAt ? 'opacity-60' : ''}">
					<p class="label">{REPORT_KIND_LABEL[r.kind]} · {fmt.format(r.createdAt)}{#if r.handledAt} · 対応済み {fmt.format(r.handledAt)}{/if}</p>
					{#if r.about}<p class="mt-2 font-mono text-sm">{r.about}</p>{/if}
					<p class="mt-2 text-sm">{r.name} · 返信先 <span class="font-mono">{r.contact}</span></p>
					<p class="mt-3 text-sm whitespace-pre-wrap">{r.body}</p>
					{#if r.note}<p class="mt-3 text-sm text-muted">対応: {r.note}</p>{/if}
					<div class="mt-4 flex flex-wrap items-end gap-3">
						{#if r.canHide && !r.handledAt}
							<form method="POST" action="?/hide">
								<input type="hidden" name="target" value={r.about} />
								<button type="submit" class="btn btn-primary text-xs">対象をまず非表示にする</button>
							</form>
						{/if}
						{#if !r.handledAt}
							<form method="POST" action="?/handle" class="flex flex-wrap items-end gap-2">
								<input type="hidden" name="id" value={r.id} />
								<input name="note" maxlength="500" class="input max-w-xs text-sm" placeholder="何をしたか（非表示、削除、返信など）" />
								<button type="submit" class="btn text-xs">対応済みにする</button>
							</form>
						{/if}
						<form method="POST" action="?/deleteReport" class="ml-auto" onsubmit={(e) => { if (!confirm('この連絡を記録ごと消しますか？')) e.preventDefault(); }}>
							<input type="hidden" name="id" value={r.id} />
							<button type="submit" class="text-xs text-muted hover:text-accent-ink">消す</button>
						</form>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</section>

<section class="mt-12">
	<div class="section-head"><h2 class="section-title">非表示</h2></div>
	<p class="mb-6 text-sm text-muted">申し出があったら、まずここで隠してから判断します。消さないので、いつでも戻せます。ページを隠すと、そこで開かれる会と、その人・団体が主催の会も出なくなります。本人には「運営が非表示にしています」と出ます。</p>
	<form method="POST" action="?/hide" class="panel flex flex-wrap items-end gap-4 p-5">
		{#if form?.hideError}<p class="w-full text-sm text-accent-ink">{form.hideError}</p>{/if}
		<div class="min-w-0 flex-1"><Field label="対象" hint="@ID か、会の URL"><input name="target" required class="input" autocapitalize="off" placeholder="@example または https://magari.cc/e/…" /></Field></div>
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
