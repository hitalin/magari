<script lang="ts">
// 落書きの壁を開ける・上塗りする・閉じる（ページと会の編集画面）。送り先は ?/wall と ?/paint
let {
	open,
	painted = false,
	what,
}: { open: boolean; painted?: boolean; what: string } = $props();
</script>

{#if open}
	<p class="mb-4 text-sm text-muted">壁を開けています。{what}に、誰でも落書きできます。誰が描いたかは残りません。落書きは 30 日で消えます。困った落書きは、壁をまるごと上塗りできます。</p>
	{#if painted}<p class="mb-4 rounded-sm bg-accent-soft px-4 py-2 text-sm text-accent-ink" role="status">上塗りしました。</p>{/if}
	<div class="flex flex-wrap gap-3">
		<form method="POST" action="?/paint" onsubmit={(e) => { if (!confirm('壁をまるごと上塗りしますか？今ある落書きはすべて消え、戻せません。')) e.preventDefault(); }}>
			<button type="submit" class="btn">上塗りする</button>
		</form>
		<form method="POST" action="?/wall" onsubmit={(e) => { if (!confirm('壁を閉じますか？今ある落書きは上塗りされ、戻せません。')) e.preventDefault(); }}>
			<button type="submit" class="btn">壁を閉じる</button>
		</form>
	</div>
{:else}
	<p class="mb-4 text-sm text-muted">{what}だけの落書きの壁を開けられます。閉じている間は、{what}には落書きできません。開けると誰でも描けて、誰が描いたかは残りません。困った落書きは、ここから壁をまるごと上塗りできます。</p>
	<form method="POST" action="?/wall">
		<input type="hidden" name="open" value="1" />
		<button type="submit" class="btn">壁を開ける</button>
	</form>
{/if}
