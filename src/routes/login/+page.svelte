<script lang="ts">
import { authClient } from "#lib/auth-client.ts";
import { goto } from "$app/navigation";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
let busy = $state(false);
let error = $state<string | null>(null);

async function x() {
	busy = true;
	await authClient.signIn.social({
		provider: "twitter",
		callbackURL: data.next,
	});
}
async function passkey() {
	busy = true;
	error = null;
	const res = await authClient.signIn.passkey();
	busy = false;
	if (res?.error)
		error =
			"パスキーでのログインに失敗しました。まだ作っていなければ、X で入ってから作ってください。";
	else await goto(data.next);
}
</script>

<svelte:head><title>ログイン | ◱</title></svelte:head>

<section class="mx-auto mt-6 max-w-md">
	<p class="label">ログイン</p>
	<h1 class="mt-2 text-2xl">開ける人はこちら</h1>
	<p class="mt-3 text-sm text-muted">見るだけならログインは要りません。まがりする（自分で開ける）人だけ。メールアドレスは使いません。</p>

	<div class="panel mt-8 space-y-6 p-6">
		{#if data.xEnabled}
			<button type="button" class="btn btn-primary w-full justify-center" onclick={x} disabled={busy}>X でログイン</button>
		{:else}
			<p class="text-sm text-dim">X ログインは準備中です（Developer Portal の鍵を設定すると使えます）。</p>
		{/if}

		<div class="border-t border-line pt-6">
			<button type="button" class="btn" onclick={passkey} disabled={busy}>パスキーでログイン</button>
			<p class="mt-3 text-xs text-dim">パスキーは、X で一度入ったあとに作れます。以後は指紋や顔で入れます。</p>
		</div>
		{#if error}<p class="text-sm text-accent-ink">{error}</p>{/if}
	</div>
</section>
