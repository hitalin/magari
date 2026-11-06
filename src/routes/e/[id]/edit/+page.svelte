<script lang="ts">
import EventForm from "#lib/components/EventForm.svelte";
import type { PageProps } from "./$types";

let { data, form }: PageProps = $props();
</script>

<svelte:head><title>間を編集 | まがり</title></svelte:head>

<section class="mx-auto mt-4 max-w-2xl">
	<p class="label">間を編集</p>
	<h1 class="mt-2 mb-8 text-2xl">{data.values.title}</h1>
	<EventForm values={form?.values ?? data.values} error={form?.error} submitLabel="保存して公開" />

	<div class="mt-12 flex flex-wrap gap-3 border-t border-line pt-6">
		{#if data.status === 'cancelled'}
			<form method="POST" action="?/reopen"><button type="submit" class="btn">中止を取り消す</button></form>
		{:else}
			<form method="POST" action="?/cancel" onsubmit={(e) => { if (!confirm('この間を中止にしますか？')) e.preventDefault(); }}>
				<button type="submit" class="btn">中止にする</button>
			</form>
		{/if}
		<form method="POST" action="?/delete" onsubmit={(e) => { if (!confirm('この間を削除しますか？元に戻せません。')) e.preventDefault(); }}>
			<button type="submit" class="btn text-accent-ink">削除する</button>
		</form>
	</div>
</section>
