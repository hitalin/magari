<script lang="ts">
import Field from '#lib/components/Field.svelte';
import type { PageProps } from './$types';

let { form }: PageProps = $props();
</script>

<svelte:head><title>ハコを登録する | まがり</title></svelte:head>

<section class="mx-auto mt-6 max-w-md">
	<p class="label">ハコを登録する</p>
	<h1 class="mt-2 text-2xl">場所を貸す側のページを作る</h1>
	<p class="mt-3 text-sm text-muted">
		店や会場（ハコ）、団体のページを作ります。<code>/@ID</code> がそのページになり、紹介・出店プラン・アクセス・お知らせ・問い合わせフォームを載せられます。
		そのハコで開かれる間は自動でカレンダーに並びます。
	</p>

	<form method="POST" class="panel mt-8 space-y-5 p-6">
		{#if form?.error}<p class="text-sm text-accent-ink">{form.error}</p>{/if}
		<Field label="種類">
			<select name="kind" class="input">
				<option value="space" selected={(form?.kind ?? 'space') === 'space'}>場（店・会場・スペース）</option>
				<option value="group" selected={form?.kind === 'group'}>団体（自助会・サークルなど）</option>
			</select>
		</Field>
		<Field label="ID" hint="小文字の英数字と _ で 3〜20 文字。あとから変えられません">
			<div class="flex items-center gap-1"><span class="text-muted">@</span><input name="handle" value={form?.handle ?? ''} required pattern={'[a-z0-9_]{3,20}'} class="input" autocapitalize="off" placeholder="curry_shop" /></div>
		</Field>
		<Field label="名前">
			<input name="name" value={form?.name ?? ''} required maxlength="50" class="input" placeholder="例: カレー屋○○" />
		</Field>
		<button type="submit" class="btn btn-primary">作る</button>
	</form>
</section>
