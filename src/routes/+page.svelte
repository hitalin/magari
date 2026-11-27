<script lang="ts">
import { areaFilter } from "#lib/area-filter.svelte.ts";
import logo from "#lib/assets/logo.svg";
import DayList from "#lib/components/DayList.svelte";
import { sortSpaces } from "#lib/space-sort.ts";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
// 説明より先に実物を見せる。近い順に 5 つ
const soon = $derived(data.events.slice(0, 5));
// 間の多いハコを 5 つ
const topSpaces = $derived(sortSpaces(data.spaces, "many").slice(0, 5));
// この 7 日に間のあるエリアを、多い順に
const areas = $derived.by(() => {
	const counts = new Map<string, number>();
	for (const e of data.events)
		if (e.area) counts.set(e.area, (counts.get(e.area) ?? 0) + 1);
	return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
});
// いまの規模。数表にして見せる
const stats = $derived([
	{ label: "この7日の間", value: data.events.length },
	{ label: "ハコ", value: data.spaces.length },
	{
		label: "エリア",
		value: new Set(data.spaces.map((s) => s.area).filter(Boolean)).size,
	},
]);
// エリアを選んだ状態で一覧へ。選択は一覧の絞り込み（AreaFilter）と同じ場所に残す
function pickArea(area: string) {
	areaFilter.value = [area];
	try {
		localStorage.setItem("magari-area", JSON.stringify([area]));
	} catch {
		// 保存できなくても、このまま一覧へ移れば絞られている
	}
}
// 上を流れる帯。どんな間が開いているか
const WORDS = [
	"間借り店舗",
	"日替わり店長",
	"レンタル○○",
	"プロ○○ヤー",
	"○○界隈",
	"オフ会",
	"自助会",
	"ライブ",
	"たまり場",
	"シェアハウス",
	"レンタルスペース",
];
</script>

<svelte:head>
	<title>◱ | 今日も、誰かが開けている。</title>
	<meta name="description" content="今日も、誰かが開けている。行ってもいい。ひとこと書けば、開けられる。間借り店舗・日替わり店長・ライブ・自助会・オフ会を一箇所で。" />
</svelte:head>

<!-- 最初の画面は、左に一文・ボタン・いまの規模、右にロゴ。その下に実物（間・ハコ・エリア）を続ける -->
<div class="ticker mt-2" aria-hidden="true">
	<span class="label ticker-label">こんな間</span>
	<span class="ticker-items">
		<span class="ticker-track">
			{#each [...WORDS, ...WORDS] as word, i (i)}<span>{word}</span>{/each}
		</span>
	</span>
</div>
<p class="sr-only">{WORDS.join('、')}。</p>

<section class="landing">
	<div>
		<h1 class="text-[clamp(2.1rem,6vw,3.5rem)] leading-[1.3] whitespace-nowrap">
			今日も、<br /><span class="tape mr-1 px-3 leading-[1.15]">誰か</span>が開けている。
		</h1>
		<p class="mt-6 text-[1.05rem] leading-loose text-muted">
			行ってもいい。ひとこと書けば、開けられる。
		</p>
		<div class="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
			<a href="/new" class="btn btn-primary">とりあえず開ける</a>
			<a href="/events" class="more">開いている所を見る ›</a>
		</div>
		<dl class="stats">
			{#each stats as st (st.label)}
				<div><dt>{st.label}</dt><dd>{st.value}</dd></div>
			{/each}
		</dl>
	</div>
	<img src={logo} alt="" class="hero-logo" width="512" height="512" />
</section>

{#if soon.length}
	<section class="sect">
		<div class="section-head">
			<h2 class="section-title">これから開く間</h2>
			<a href="/events" class="more">ぜんぶ見る ›</a>
		</div>
		<DayList events={soon} />
	</section>
{/if}

<div class="sect two-col">
	<section>
		<div class="section-head">
			<h2 class="section-title">ハコ</h2>
			<a href="/spaces" class="more">一覧 ›</a>
		</div>
		<div class="rule-list">
			{#each topSpaces as sp (sp.handle)}
				<a href="/@{sp.handle}" class="space-row group">
					<span class="min-w-0 truncate font-serif text-[1.05rem] font-bold group-hover:text-accent-ink">{sp.name}</span>
					{#if sp.area}<span class="text-sm text-muted">{sp.area}</span>{/if}
					<span class="ml-auto text-sm whitespace-nowrap text-muted tabular-nums">{sp.upcoming} 件</span>
				</a>
			{/each}
		</div>
	</section>
	<section>
		<div class="section-head">
			<h2 class="section-title">エリア</h2>
			<a href="/events" class="more">この7日の間 ›</a>
		</div>
		<div class="rule-list">
			{#each areas as [area, n] (area)}
				<a href="/events" class="space-row group" onclick={() => pickArea(area)}>
					<span class="font-serif text-[1.05rem] font-bold group-hover:text-accent-ink">{area}</span>
					<span class="ml-auto text-sm whitespace-nowrap text-muted tabular-nums">{n} 件</span>
				</a>
			{/each}
		</div>
	</section>
</div>

<!-- 見る側の次は、載せる側。開ける人と、ハコを貸す人 -->
<div class="sect two-col">
	<section class="invite">
		<h2>ひとことで、ビラが 1 枚</h2>
		<p>要るのは、ひとこと・日時・場所だけ。X に貼れば告知は終わりです。</p>
		<a href="/new" class="btn">とりあえず開ける</a>
	</section>
	<section class="invite">
		<h2>ホームページの代わりに</h2>
		<p>ハコのページに、そこで開かれる間のカレンダーが勝手に付きます。</p>
		<a href="/spaces/new" class="btn">ハコを載せる</a>
	</section>
</div>

<style>
	.landing {
		display: grid;
		gap: 2rem;
		align-items: center;
		padding-block: 2.5rem 3rem;
	}
	.hero-logo {
		order: -1;
		width: 6.5rem;
		height: auto;
	}
	@media (min-width: 48rem) {
		.landing {
			grid-template-columns: minmax(0, 1fr) auto;
			gap: 3rem;
			padding-block: 4rem 3.5rem;
		}
		.hero-logo {
			order: 0;
			width: 15rem;
		}
	}
	/* いまの規模。罫線で区切った数表 */
	.stats {
		display: flex;
		flex-wrap: wrap;
		margin-top: 2.5rem;
		border-top: 1px solid var(--color-line);
	}
	.stats > div {
		display: flex;
		flex-direction: column-reverse;
		padding: 0.75rem 1.5rem 0 0;
		margin-right: 1.5rem;
		border-right: 1px solid var(--color-line);
	}
	.stats > div:last-child {
		border-right: none;
		margin-right: 0;
		padding-right: 0;
	}
	.stats dt {
		font-size: 0.78rem;
		color: var(--color-muted);
	}
	.stats dd {
		font-family: var(--font-serif);
		font-size: 1.6rem;
		font-weight: 700;
		line-height: 1.3;
		font-variant-numeric: tabular-nums;
	}
	.two-col {
		display: grid;
		gap: 3.5rem;
	}
	@media (min-width: 48rem) {
		.two-col {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 3rem;
		}
	}
	.space-row {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		padding: 0.75rem 0.6rem;
		border-bottom: 1px solid var(--color-line);
	}
	.invite {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		padding-top: 1.25rem;
		border-top: 1px solid var(--color-text);
	}
	.invite h2 {
		font-size: 1.35rem;
	}
	.invite p {
		margin-block: 0.5rem 1.25rem;
		font-size: 0.95rem;
		line-height: 1.8;
		color: var(--color-muted);
	}
	.invite .btn {
		margin-top: auto;
	}
	.sect {
		padding-block: 3.5rem;
	}
</style>
