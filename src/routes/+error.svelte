<script lang="ts">
import { page } from '$app/state';

const notFound = $derived(page.status === 404);
</script>

<svelte:head><title>{notFound ? '道がくねくねしすぎました' : 'つまずきました'} | まがり</title></svelte:head>

<section class="dots -mx-4 mt-10 px-4 py-20 text-center">
	<p class="label">{page.status}</p>
	<h1 class="mt-3 text-[clamp(1.8rem,5vw,2.8rem)]">
		{#if notFound}道がくねくねしすぎて、<br />そこには辿り着けませんでした。{:else}途中で<span class="tape mx-1 px-3">つまずき</span>ました。{/if}
	</h1>
	<p class="mt-5 text-muted">
		{#if notFound}間はもう終わったか、はじめから無かったのかもしれません。{:else}{page.error?.message ?? 'もう一度試してください。'}{/if}
	</p>
	<div class="mt-8 flex flex-wrap justify-center gap-3">
		<a href="/" class="btn btn-primary">これからの間へ</a>
		<a href="/calendar" class="btn">カレンダー ›</a>
	</div>
</section>
