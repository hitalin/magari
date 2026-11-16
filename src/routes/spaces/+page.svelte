<script lang="ts">
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
		<!-- 段ボールの看板を壁に貼って並べる。上辺のテープがはみ出すので縦の間隔を広めに。写真の無い看板は低いので上で揃える -->
		<div class="grid items-start gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.spaces as s (s.handle)}
				<a href="/@{s.handle}" class="cardboard group flex flex-col p-3 transition-transform hover:-translate-y-1" data-tape={s.area}>
					{#if s.headerUrl}
						<!-- 写真は焼いたプリントを貼ったように、白い縁を付ける -->
						<img src={s.headerUrl} alt="" loading="lazy" class="space-photo aspect-[16/9] w-full object-cover" />
					{/if}
					<div class="px-1.5 {s.headerUrl ? 'pt-3' : 'pt-4'} pb-1.5">
						<div class="min-w-0">
							<h2 class="font-serif text-[1.15rem] leading-snug font-bold group-hover:text-accent-ink">{s.name}</h2>
							{#if s.catch ?? s.summary}
								<p class="mt-1 line-clamp-1 text-[0.8rem] leading-relaxed text-muted">{s.catch ?? s.summary}</p>
							{/if}
						</div>
					</div>
					<!-- 下端: これからの間の数と、非公式の判 -->
					<div class="mt-2 flex items-center justify-between gap-2 border-t border-dashed border-line px-1.5 pt-2 text-[0.8rem]">
						{#if s.upcoming > 0}
							<p><span class="font-mono text-base font-bold">{s.upcoming}</span> 件の間</p>
						{:else}
							<p class="text-dim">いまは予定なし</p>
						{/if}
						{#if !s.hasManager}<span class="stamp" title="運営者がまだいない非公式のページ">非公式</span>{/if}
					</div>
				</a>
			{/each}
		</div>
	{/if}
</section>

<style>
	/* 貼ったプリント: 白い縁と、紙の厚みの影 */
	.space-photo {
		border: 3px solid #f3eee2;
		border-radius: 1px;
		box-shadow:
			0 1px 2px rgb(0 0 0 / 0.3),
			0 0 0 1px rgb(42 30 19 / 0.12);
	}
	/* 判子: 枠だけの小さな字を少し傾けて押す */
	.stamp {
		padding: 0.05rem 0.4rem;
		border: 1.5px solid currentColor;
		border-radius: 2px;
		color: #8a3a1c;
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		transform: rotate(-3deg);
		opacity: 0.85;
	}
</style>
