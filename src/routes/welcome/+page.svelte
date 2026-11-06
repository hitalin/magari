<script lang="ts">
import { authClient } from "#lib/auth-client.ts";
import Field from "#lib/components/Field.svelte";
import type { PageProps } from "./$types";

let { data, form }: PageProps = $props();
let passkeyMsg = $state<string | null>(null);

async function addPasskey() {
	const res = await authClient.passkey.addPasskey({ name: "まがり" });
	passkeyMsg = res?.error
		? "パスキーを作れませんでした。あとで「自分」のページからも作れます。"
		: "パスキーを作りました。次回からパスキーで入れます。";
}
</script>

<svelte:head><title>はじめまして | まがり</title></svelte:head>

<section class="mx-auto mt-6 max-w-md">
	<p class="label">はじめまして</p>
	<h1 class="mt-2 text-2xl">あなたのページを作る</h1>
	<p class="mt-3 text-sm text-muted">ID と表示名を決めると <code>/@ID</code> があなたのページになり、まがりできます。</p>

	<form method="POST" class="panel mt-8 space-y-5 p-6">
		{#if form?.error}<p class="text-sm text-accent-ink">{form.error}</p>{/if}
		{#if data.image}
			<div class="flex items-center gap-3">
				<img src={data.image} alt="" class="h-14 w-14 rounded-full border border-line object-cover" />
				<p class="text-sm text-muted">アイコンはログインしたアカウントのものを使います。</p>
			</div>
		{/if}
		<Field label="ID" hint="小文字の英数字と _ で 3〜20 文字。あとから変えられません">
			<div class="flex items-center gap-1"><span class="text-muted">@</span><input name="handle" value={form?.handle ?? ''} required pattern={'[a-z0-9_]{3,20}'} class="input" autocapitalize="off" /></div>
		</Field>
		<Field label="表示名">
			<input name="name" value={form?.name ?? data.suggestedName} required maxlength="50" class="input" />
		</Field>
		<button type="submit" class="btn btn-primary">これで始める</button>
	</form>

	<div class="panel mt-6 p-6">
		<p class="label">ついでに</p>
		<p class="mt-2 text-sm text-muted">パスキーを作っておくと、次回から X や Misskey を経由せず、指紋や顔でログインできます。</p>
		<button type="button" class="btn mt-3" onclick={addPasskey}>パスキーを作る</button>
		{#if passkeyMsg}<p class="mt-3 text-sm text-accent-ink">{passkeyMsg}</p>{/if}
	</div>
</section>
