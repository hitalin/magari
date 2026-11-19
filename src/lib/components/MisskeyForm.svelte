<script lang="ts">
import { onMount } from "svelte";
import { startMiAuth } from "#lib/auth-client.ts";
import { parseMisskeyHost, rememberHost } from "#lib/misskey.ts";

// Misskey のサーバーを入れて許可画面へ飛ぶ。ログイン画面（入る）と /me（つなぐ）で使う。
let {
	callbackURL,
	action,
	disabled = false,
}: { callbackURL: string; action: string; disabled?: boolean } = $props();

const STORAGE_KEY = "misskey-hosts";
let input = $state("");
let busy = $state(false);
let error = $state<string | null>(null);
// 前に使ったサーバー。次からは押すだけで入れる
let recent = $state<string[]>([]);

onMount(() => {
	try {
		const saved: unknown = JSON.parse(
			localStorage.getItem(STORAGE_KEY) ?? "[]",
		);
		if (Array.isArray(saved))
			recent = saved.filter(
				(h): h is string => typeof h === "string" && parseMisskeyHost(h) === h,
			);
	} catch {
		// 覚えていなくても困らない
	}
});

async function go(value: string) {
	error = null;
	const host = parseMisskeyHost(value);
	if (!host) {
		error =
			"サーバー名が正しくありません。misskey.io のようなドメインか、@you@misskey.io を入れてください。";
		return;
	}
	busy = true;
	const res = await startMiAuth(host, callbackURL);
	if ("error" in res) {
		busy = false;
		error = res.error;
		return;
	}
	try {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify(rememberHost(recent, res.host)),
		);
	} catch {
		// 覚えていなくても困らない
	}
	location.href = res.url;
}
</script>

<!-- Misskey から「戻る」で帰ってきたときに、押せないままにしない -->
<svelte:window onpageshow={() => (busy = false)} />

<form
	onsubmit={(e) => {
		e.preventDefault();
		go(input);
	}}
>
	<div class="flex gap-2">
		<input
			bind:value={input}
			class="input"
			aria-label="Misskey のサーバー"
			placeholder="例: misskey.io"
			autocapitalize="off"
			autocomplete="off"
			autocorrect="off"
			spellcheck="false"
			inputmode="url"
			enterkeyhint="go"
			required
		/>
		<button type="submit" class="btn shrink-0" disabled={busy || disabled}>{busy ? '確かめています…' : action}</button>
	</div>
	{#if recent.length}
		<div class="mt-3 flex flex-wrap items-center gap-2">
			<span class="text-xs text-dim">前に使った</span>
			{#each recent as h (h)}
				<button type="button" class="chip hover:border-accent-border" disabled={busy || disabled} onclick={() => go(h)}>{h} ›</button>
			{/each}
		</div>
	{/if}
	{#if error}<p class="mt-2 text-sm text-accent-ink" role="alert">{error}</p>{/if}
</form>
