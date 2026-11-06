<script lang="ts">
import Empty from "#lib/components/Empty.svelte";
import FlyerWall from "#lib/components/FlyerWall.svelte";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>フライヤー | まがり</title>
	<meta name="description" content="これからの間のフライヤーを貼った壁。" />
</svelte:head>

<section class="mt-4">
	<div class="section-head">
		<h1 class="section-title">フライヤー</h1>
		<span class="chip">{data.events.length} 枚</span>
	</div>
	<p class="mb-10 text-sm text-muted">主催が上げたフライヤーを、これから開かれる順に貼っています。自分の間のフライヤーは、間の編集画面から上げられます。</p>
	{#if data.events.length === 0}
		<Empty title="まだ誰もフライヤーを貼っていません。" hint="間の編集画面から画像を上げると、ここに貼られます。" />
	{:else}
		<FlyerWall events={data.events} collapse={false} />
	{/if}
</section>
