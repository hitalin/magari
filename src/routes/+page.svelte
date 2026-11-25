<script lang="ts">
import logo from "#lib/assets/logo.svg";
import DayList from "#lib/components/DayList.svelte";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
// 説明より先に実物を見せる。近い順に 5 つ
const soon = $derived(data.events.slice(0, 5));
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
// 誰にとって何がうれしいか。行く人・開ける人・貸す人の順
const WHY = [
	{
		who: "行く人",
		title: "今日どこが開いているか、ひと目で",
		body: "散らばった告知を、これから 7 日ぶん並べています。ログインも、行くと知らせる必要もありません。",
		href: "/home",
		cta: "開いている所を見る",
	},
	{
		who: "開ける人",
		title: "ひとことで、ビラが 1 枚",
		body: "要るのは、ひとこと・日時・場所だけ。X に貼れば告知は終わりです。",
		href: "/new",
		cta: "とりあえず開ける",
	},
	{
		who: "ハコを貸す人",
		title: "ホームページの代わりに",
		body: "ハコのページに、そこで開かれる間のカレンダーが勝手に付きます。",
		href: "/spaces/new",
		cta: "ハコを載せる",
	},
];
const REPO = "https://github.com/hitalin/magari";
</script>

<svelte:head>
	<title>◱ | 今日も、誰かが開けている。</title>
	<meta name="description" content="今日も、誰かが開けている。行ってもいい。ひとこと書けば、開けられる。間借り店舗・日替わり店長・ライブ・自助会・オフ会を一箇所で。" />
</svelte:head>

<!-- 最初の画面は、左に一文とボタン、右にロゴだけ。うれしさの説明はその下に続ける -->
<div class="ticker mt-2" aria-hidden="true">
	<span class="chip chip-tape ticker-label">こんな間</span>
	<span class="ticker-items">
		<span class="ticker-track">
			{#each [...WORDS, ...WORDS] as word, i (i)}<span>{word}</span>{/each}
		</span>
	</span>
</div>
<p class="sr-only">{WORDS.join('、')}。</p>

<section class="landing">
	<div>
		<h1 class="text-[clamp(1.9rem,4.2vw,2.75rem)] leading-[1.35] whitespace-nowrap">
			今日も、<br /><span class="tape mr-1 px-3 leading-[1.15]">誰か</span>が開けている。
		</h1>
		<p class="mt-6 text-[1.05rem] leading-loose text-muted">
			行ってもいい。ひとこと書けば、開けられる。
		</p>
		<div class="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
			<a href="/new" class="btn btn-primary">とりあえず開ける</a>
			<a href="/home" class="more">開いている所を見る ›</a>
		</div>
	</div>
	<img src={logo} alt="" class="hero-logo" width="512" height="512" />
</section>

{#if soon.length}
	<section class="sect">
		<div class="section-head">
			<h2 class="section-title">これから開く間</h2>
			<a href="/home" class="more">ぜんぶ見る ›</a>
		</div>
		<DayList events={soon} />
	</section>
{/if}

<!-- 説明は一覧と同じ行の組みで読ませる。題は左、中身は右。カードや 3 列の枠にはしない -->
<section class="sect aside">
	<h2 class="section-title">なにがうれしい</h2>
	<div class="rule-list prose-rows">
		{#each WHY as w (w.who)}
			<a href={w.href} class="row group">
				<span class="label">{w.who}</span>
				<span class="block min-w-0">
					<span class="block font-serif text-[1.15rem] font-bold leading-snug group-hover:text-accent-ink">{w.title}</span>
					<span class="mt-2 block text-sm leading-loose text-muted">{w.body}</span>
					<span class="more mt-2 block text-sm">{w.cta} ›</span>
				</span>
			</a>
		{/each}
	</div>
</section>

<section class="sect aside">
	<h2 class="section-title">しないこと</h2>
	<dl class="rule-list prose-rows nots">
		<div class="row">
			<dt>お金をとらない</dt>
			<dd>個人が無償で動かしています。広告もありません。</dd>
		</div>
		<div class="row">
			<dt>預からない</dt>
			<dd>メールアドレスも、誰がどこへ行くかも持ちません。</dd>
		</div>
		<div class="row">
			<dt>取り持たない</dt>
			<dd>予約も決済もありません。行く前の確認は、開けた人の告知で。</dd>
		</div>
		<div class="row">
			<dt>隠さない</dt>
			<dd>ソースは<a href={REPO} class="more" rel="noopener">公開</a>していて、だれでも読めて、直せます。</dd>
		</div>
	</dl>
</section>

<style>
	.landing {
		display: grid;
		gap: 3.5rem;
		align-items: center;
		padding-block: 2.5rem 4.5rem;
	}
	@media (min-width: 48rem) {
		.landing {
			grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
			gap: 3rem;
			/* 縦に長い画面で間延びしないよう、上限を置く */
			min-height: min(calc(100svh - var(--spacing-header) - 12rem), 40rem);
		}
	}
	.hero-logo {
		width: min(70%, 19rem);
		height: auto;
		margin-inline: auto;
	}
	.sect {
		padding-block: 3.5rem;
	}
	.aside > h2 {
		margin-bottom: 1.75rem;
	}
	.prose-rows > :global(.row) {
		padding-block: 1.25rem;
	}
	/* 狭い画面では、行の左の列を上に載せる */
	@media (max-width: 40rem) {
		.prose-rows > :global(.row) {
			grid-template-columns: minmax(0, 1fr);
			gap: 0.35rem;
		}
	}
	/* 押せない行は、hover で色を敷かない */
	.nots > .row:hover {
		background: none;
	}
	.nots dt {
		font-family: var(--font-serif);
		font-size: 1.1rem;
		font-weight: 700;
	}
	.nots dd {
		font-size: 0.875rem;
		line-height: 1.8;
		color: var(--color-muted);
	}
	@media (min-width: 48rem) {
		.aside {
			display: grid;
			grid-template-columns: 13rem minmax(0, 1fr);
			column-gap: 2.5rem;
			align-items: start;
		}
		.aside > h2 {
			justify-self: start;
			margin-bottom: 0;
		}
		.prose-rows {
			--row-lead: 8.5rem;
		}
	}
</style>
