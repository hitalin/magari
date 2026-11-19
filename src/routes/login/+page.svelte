<script lang="ts">
import { authClient } from "#lib/auth-client.ts";
import MisskeyForm from "#lib/components/MisskeyForm.svelte";
import { MISSKEY_ICON, SNS_ICON } from "#lib/sns.ts";
import { goto } from "$app/navigation";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
let busy = $state(false);
let error = $state<string | null>(null);

const ERRORS: Record<string, string> = {
	miauth_state:
		"Misskey からの戻りが確認できませんでした。もう一度お試しください。",
	miauth_denied:
		"Misskey 側で許可されませんでした。許可するとログインできます。",
	miauth_user: "Misskey のアカウント情報を取れませんでした。",
	miauth_unlinked:
		"その Misskey アカウントは、前につないでいた ID から外されています。別の方法でログインして、「自分」のページからつなぎ直してください。",
};

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
			"パスキーでのログインに失敗しました。まだ作っていなければ、X か Misskey で入ってから作ってください。";
	else await goto(data.next);
}
</script>

<svelte:head><title>ログイン | ◱</title></svelte:head>

<section class="mx-auto mt-6 max-w-md">
	<p class="label">ログイン</p>
	<h1 class="mt-2 text-2xl">開ける人はこちら</h1>
	<p class="mt-3 text-sm text-muted">見るだけならログインは要りません。まがりする（自分で開ける）人だけ。メールアドレスは使いません。{#if data.next === '/new'}ログインすると、そのまま開ける画面に進みます。{/if}</p>

	<div class="panel mt-8 space-y-6 p-6">
		{#if data.error && ERRORS[data.error]}<p class="rounded-sm bg-accent-soft px-4 py-2 text-sm text-accent-ink" role="alert">{ERRORS[data.error]}</p>{/if}

		{#if data.xEnabled}
			<button type="button" class="btn btn-primary w-full justify-center" onclick={x} disabled={busy} aria-label="X でログイン"><svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true"><path d={SNS_ICON.x} /></svg>でログイン</button>
		{:else}
			<p class="text-sm text-dim">X ログインは準備中です（Developer Portal の鍵を設定すると使えます）。</p>
		{/if}

		<div class="border-t border-line pt-6">
			<p class="label mb-2 flex items-center gap-1.5"><svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true"><path d={MISSKEY_ICON} /></svg><span class="sr-only">Misskey </span>でログイン</p>
			<MisskeyForm callbackURL={data.next} action="ログイン" disabled={busy} />
			<p class="mt-3 text-xs text-dim">自分のサーバーのドメインを入れます。どのサーバーでも可。サーバー側で「まがり」を許可すると戻ってきます。</p>
		</div>

		<div class="border-t border-line pt-6">
			<button type="button" class="btn" onclick={passkey} disabled={busy}>パスキーでログイン</button>
			<p class="mt-3 text-xs text-dim">パスキーは、X か Misskey で一度入ったあとに作れます。以後は指紋や顔で入れます。</p>
		</div>
		{#if error}<p class="text-sm text-accent-ink">{error}</p>{/if}
	</div>
	<p class="mt-4 text-xs text-dim">X と Misskey のアカウントは、入ったあと「自分」のページでいくつでもつなげます。つないだものは、どれで入っても同じ ID になります。</p>
</section>
