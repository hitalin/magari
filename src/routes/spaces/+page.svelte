<script lang="ts">
import logo from "#lib/assets/logo.svg";
import Empty from "#lib/components/Empty.svelte";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>ハコ | まがり</title>
	<meta name="description" content="間が開かれる店や会場（ハコ）の一覧。" />
</svelte:head>

<section class="mt-4">
	<div class="section-head">
		<h1 class="section-title">ハコ</h1>
		<a href="/spaces/new" class="more text-sm">自分のハコを載せる ›</a>
	</div>
	<p class="mb-10 text-sm text-muted">間が開かれる店や会場。エリアごとに、これからの間が多い順に並べています。</p>
	{#if data.spaces.length === 0}
		<Empty title="ハコはまだありません。" />
	{:else}
		<!-- 段ボールの看板を壁に貼って並べる。上辺のテープがはみ出すので縦の間隔を広めに -->
		<div class="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.spaces as s (s.handle)}
				<a href="/@{s.handle}" class="cardboard group flex flex-col p-3 transition-transform hover:-translate-y-1" data-tape={s.area}>
					{#if s.headerUrl}
						<img src={s.headerUrl} alt="" loading="lazy" class="aspect-[16/9] w-full rounded-[1px] object-cover shadow-[0_1px_2px_rgb(0_0_0/0.25)]" />
					{:else}
						<div class="grid aspect-[16/9] w-full place-items-center rounded-[1px] bg-[rgb(42_30_19/0.07)]">
							{#if s.avatarUrl}
								<img src={s.avatarUrl} alt="" loading="lazy" class="h-24 w-24 rounded-full border border-line object-cover shadow-[0_1px_3px_rgb(0_0_0/0.3)] sm:h-28 sm:w-28" />
							{:else}
								<img src={logo} alt="" class="h-12 w-12 opacity-35" />
							{/if}
						</div>
					{/if}
					<div class="px-2 pt-3 pb-1">
						<h2 class="font-serif text-[1.2rem] leading-snug font-bold group-hover:text-accent-ink">{s.name}</h2>
						<p class="mt-1 text-sm">これからの間 <span class="font-mono font-bold">{s.upcoming}</span> 件</p>
						{#if s.catch ?? s.summary}
							<p class="mt-2 line-clamp-2 text-sm text-muted">{s.catch ?? s.summary}</p>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{/if}
</section>
