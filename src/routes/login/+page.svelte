<script lang="ts">
import { authClient, startMiAuth } from "#lib/auth-client.ts";
import { goto } from "$app/navigation";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
let busy = $state(false);
let error = $state<string | null>(null);
let host = $state("");

const ERRORS: Record<string, string> = {
	miauth_state:
		"Misskey からの戻りが確認できませんでした。もう一度お試しください。",
	miauth_denied: "Misskey 側で許可されませんでした。",
	miauth_user: "Misskey のアカウント情報を取れませんでした。",
	miauth_linked_elsewhere:
		"その Misskey アカウントは別のユーザーにつながっています。",
};

async function x() {
	busy = true;
	await authClient.signIn.social({ provider: "twitter", callbackURL: "/me" });
}
async function misskey(e: SubmitEvent) {
	e.preventDefault();
	busy = true;
	error = null;
	const url = await startMiAuth(host);
	if (url) location.href = url;
	else {
		busy = false;
		error =
			"サーバー名が正しくありません。example.com のようなドメインを入れてください";
	}
}
async function passkey() {
	busy = true;
	error = null;
	const res = await authClient.signIn.passkey();
	busy = false;
	if (res?.error)
		error =
			"パスキーでのログインに失敗しました。まだ作っていなければ、X か Misskey で入ってから作ってください。";
	else await goto("/me");
}
</script>

<svelte:head><title>ログイン | まがり</title></svelte:head>

<section class="mx-auto mt-6 max-w-md">
	<p class="label">ログイン</p>
	<h1 class="mt-2 text-2xl">主催者になる</h1>
	<p class="mt-3 text-sm text-muted">閲覧にログインは要りません。まがりする（間を開いて管理する）人だけ。メールアドレスは使いません。</p>

	<div class="panel mt-8 space-y-6 p-6">
		{#if data.error && ERRORS[data.error]}<p class="rounded-sm bg-accent-soft px-4 py-2 text-sm text-accent-ink">{ERRORS[data.error]}</p>{/if}

		{#if data.xEnabled}
			<button type="button" class="btn btn-primary w-full justify-center" onclick={x} disabled={busy}>X でログイン</button>
		{:else}
			<p class="text-sm text-dim">X ログインは準備中です（Developer Portal の鍵を設定すると使えます）。</p>
		{/if}

		<form class="border-t border-line pt-6" onsubmit={misskey}>
			<p class="label mb-2">Misskey でログイン</p>
			<div class="flex gap-2">
				<input bind:value={host} class="input" placeholder="自分のサーバーのドメイン" autocapitalize="off" autocomplete="off" inputmode="url" required />
				<button type="submit" class="btn shrink-0" disabled={busy}>ログイン</button>
			</div>
			<p class="mt-2 text-xs text-dim">どのサーバーでも可。サーバー側で「まがり」を許可すると戻ってきます。</p>
		</form>

		<div class="border-t border-line pt-6">
			<button type="button" class="btn" onclick={passkey} disabled={busy}>パスキーでログイン</button>
			<p class="mt-3 text-xs text-dim">パスキーは、X か Misskey で一度入ったあとに作れます。以後は指紋や顔で入れます。</p>
		</div>
		{#if error}<p class="text-sm text-accent-ink">{error}</p>{/if}
	</div>
</section>
