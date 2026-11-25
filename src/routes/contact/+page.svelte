<script lang="ts">
import Field from "#lib/components/Field.svelte";
import { REPORT_KIND_LABEL, REPORT_KINDS } from "#lib/report-form.ts";
import type { PageProps } from "./$types";

let { data, form }: PageProps = $props();
</script>

<svelte:head><title>掲載の取り下げ・連絡 | ◱</title></svelte:head>

<section class="mt-6 max-w-xl">
	<p class="label">運営への連絡</p>
	<h1 class="mt-2 text-2xl">掲載の取り下げ・ページの引き取り</h1>
	<p class="mt-3 text-sm text-muted">
		掲載の取り下げ、ページの引き取り、そのほかの連絡を受け付けます。ログインは要りません。
		取り下げの申し出があった掲載は、まず非表示にしてから確かめます。取り下げたページの ID は、以後だれも使えません（<a href="/policy" class="underline underline-offset-2 hover:text-accent-ink">掲載と削除の方針</a>）。
		なぜ載っているかは、<a href="/owners" class="underline underline-offset-2 hover:text-accent-ink">お店・団体の方へ</a>と<a href="/eventers" class="underline underline-offset-2 hover:text-accent-ink">会を開く方へ</a>に書いています。
	</p>

	{#if form?.sent}
		<p class="panel mt-8 p-6">送信しました。内容を確認して、いただいた返信先にお返事します。</p>
	{:else}
		<form method="POST" class="mt-8 space-y-5 border-t border-line pt-6">
			{#if form?.error}<p class="rounded-sm bg-accent-soft px-4 py-2 text-sm text-accent-ink" role="alert">{form.error}</p>{/if}
			<Field label="種別">
				<select name="kind" class="input">
					{#each REPORT_KINDS as k (k)}
						<option value={k} selected={(form?.values?.kind ?? data.kind) === k}>{REPORT_KIND_LABEL[k]}</option>
					{/each}
				</select>
			</Field>
			<Field label="対象のページや会" hint="任意。@ID かページの URL">
				<input name="about" value={form?.values?.about ?? data.about} maxlength="200" class="input" placeholder="@example または https://magari.cc/e/…" />
			</Field>
			<div class="grid gap-4 sm:grid-cols-2">
				<Field label="お名前"><input name="name" value={form?.values?.name ?? ''} required maxlength="50" class="input" /></Field>
				<Field label="返信先" hint="X か Misskey の ID（@name、@name@server）。メールでも可"><input name="contact" value={form?.values?.contact ?? ''} required maxlength="200" class="input" autocapitalize="off" placeholder="@example" /></Field>
			</div>
			<Field label="内容" hint="運営者ご本人と分かる情報（公式サイトや X のアカウントなど）があると早く対応できます">
				<textarea name="body" rows="6" required class="input">{form?.values?.body ?? ''}</textarea>
			</Field>
			<div class="absolute -left-[9999px]" aria-hidden="true">
				<label>ウェブサイト（入力しないでください）<input name="website" tabindex="-1" autocomplete="off" /></label>
			</div>
			<button type="submit" class="btn btn-primary">送信する</button>
		</form>
	{/if}
</section>
