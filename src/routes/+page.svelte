<script lang="ts">
import DayList from "#lib/components/DayList.svelte";
import Flyer from "#lib/components/Flyer.svelte";
import { dayKey, formatWhen } from "#lib/date.ts";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
// ヒーローの右に貼るビラ。近い順に 3 枚。まだ誰も開けていなければ見本を貼る
const SAMPLES = [
	"18時から店にいます",
	"公園でなんもしない",
	"日替わり店長やります",
];
const sampleAt = `${dayKey(new Date())}T18:00:00+09:00`;
const fan = $derived(data.events.slice(0, 3));
// 説明より先に実物を見せる。近い順に 5 つ
const soon = $derived(data.events.slice(0, 5));
// 上を流れる帯。どんな間が開いているか
const WORDS = [
	"間借り店舗",
	"日替わり店長",
	"レンタル○○",
	"プロ○○ヤー",
	"ライブ",
	"自助会",
	"オフ会",
];
// 誰にとって何がうれしいか。行く人・開ける人・貸す人の順
const WHY = [
	{
		who: "行く人",
		title: "今日どこが開いているか、ひと目で",
		body: "X の告知やカレンダーに散らばった「いつ・どこで・誰が」を、これから 7 日ぶん並べています。見るのにログインはいりません。行くと知らせる必要もありません。",
		href: "/home",
		cta: "開いている所を見る",
	},
	{
		who: "開ける人",
		title: "ひとことで、ビラが 1 枚",
		body: "要るのは、ひとこと・日時・場所だけ。ビラは打つそばから刷り上がり、X に貼れば告知は終わりです。「18時から店にいます」で十分。",
		href: "/new",
		cta: "とりあえず開ける",
	},
	{
		who: "ハコを貸す人",
		title: "ホームページの代わりに",
		body: "紹介・アクセス・設備を書いたページに、そこで開かれる間のカレンダーが勝手に付きます。借りたい人は X で声をかけるだけ。",
		href: "/spaces/new",
		cta: "ハコを載せる",
	},
];
const STEPS = [
	{ title: "X でログイン", body: "メールも実名もいりません。" },
	{
		title: "ひとこと・日時・場所",
		body: "住所や料金は、書きたければ。",
	},
	{
		title: "ビラを貼る",
		body: "審査はなく、書いたらすぐ一覧と壁に載ります。",
	},
];
const REPO = "https://github.com/hitalin/magari";
</script>

<svelte:head>
	<title>◱ | 今日も、誰かが開けている。</title>
	<meta name="description" content="今日も、誰かが開けている。行ってもいい。ひとこと書けば、開けられる。間借り店舗・日替わり店長・ライブ・自助会・オフ会を一箇所で。" />
</svelte:head>

<!-- 最初の画面は、左に一文とボタン、右にビラだけ。うれしさの説明はその下に続ける -->
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
	<div class="text-center md:text-left">
		<h1 class="text-[clamp(1.9rem,4.2vw,2.75rem)] leading-[1.35] whitespace-nowrap">
			今日も、<br /><span class="tape mr-1 px-3 leading-[1.15]">誰か</span>が開けている。
		</h1>
		<p class="mt-6 text-[1.05rem] leading-loose text-muted">
			行ってもいい。ひとこと書けば、開けられる。
		</p>
		<div class="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 md:justify-start">
			<a href="/new" class="btn btn-primary">とりあえず開ける</a>
			<a href="/home" class="more">開いている所を見る ›</a>
		</div>
	</div>
	<div class="fan" aria-hidden={fan.length === 0}>
		{#each fan as e (e.id)}
			<a href="/e/{e.id}" class="flyer-pin" aria-label="{e.title}（{formatWhen(e)}）">
				{#if e.flyerUrl}
					<img src={e.flyerUrl} alt="" />
				{:else}
					<Flyer id={e.id} title={e.title} startsAt={e.startsAt} endsAt={e.endsAt} allDay={e.allDay} place={e.space?.name ?? e.locationName} host={e.hosts[0]?.name ?? null} look={e.flyerLook} />
				{/if}
			</a>
		{:else}
			{#each SAMPLES as title (title)}
				<div class="flyer-pin"><Flyer id={title} {title} startsAt={sampleAt} endsAt={null} allDay={false} /></div>
			{/each}
		{/each}
	</div>
</section>

{#if soon.length}
	<section class="block">
		<div class="section-head">
			<h2 class="section-title">これから開く間</h2>
			<a href="/home" class="more">ぜんぶ見る ›</a>
		</div>
		<DayList events={soon} />
	</section>
{/if}

<section class="block">
	<h2 class="section-title">なにがうれしい</h2>
	<ul class="why">
		{#each WHY as w (w.who)}
			<li>
				<p class="label">{w.who}</p>
				<h3 class="mt-2 text-xl leading-snug">{w.title}</h3>
				<p class="mt-3 text-sm leading-loose text-muted">{w.body}</p>
				<a href={w.href} class="more mt-4 inline-block text-sm">{w.cta} ›</a>
			</li>
		{/each}
	</ul>
</section>

<section class="block">
	<h2 class="section-title">開けかた</h2>
	<ol class="steps">
		{#each STEPS as step, i (step.title)}
			<li>
				<span class="step-no" aria-hidden="true">{i + 1}</span>
				<div>
					<h3 class="text-lg">{step.title}</h3>
					<p class="mt-1 text-sm leading-relaxed text-muted">{step.body}</p>
				</div>
			</li>
		{/each}
	</ol>
</section>

<section class="block">
	<h2 class="section-title">しないこと</h2>
	<dl class="nots">
		<div>
			<dt>お金をとらない</dt>
			<dd>個人が無償で動かしています。広告もありません。</dd>
		</div>
		<div>
			<dt>預からない</dt>
			<dd>メールアドレスも、誰がどこへ行くかも持ちません。</dd>
		</div>
		<div>
			<dt>取り持たない</dt>
			<dd>予約も決済もありません。行く前の確認は、開けた人の告知で。</dd>
		</div>
		<div>
			<dt>隠さない</dt>
			<dd>ソースは<a href={REPO} class="more" rel="noopener">公開</a>していて、だれでも読めて、直せます。</dd>
		</div>
	</dl>
</section>

<section class="block ends">
	<div class="panel">
		<div>
			<h2 class="text-xl">とりあえず開ける</h2>
			<p class="mt-2 text-sm leading-relaxed text-muted">ひとこと・日時・場所を書けば、ビラが 1 枚できます。</p>
		</div>
		<a href="/new" class="btn btn-primary">開ける</a>
	</div>
	<div class="panel">
		<div>
			<h2 class="text-xl">ハコを載せる</h2>
			<p class="mt-2 text-sm leading-relaxed text-muted">貸せる場所があるなら、看板を 1 枚出しておけます。</p>
		</div>
		<a href="/spaces/new" class="btn">載せる</a>
	</div>
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
			min-height: calc(100svh - var(--spacing-header) - 12rem);
		}
	}
	/* ビラ 3 枚を少しずらして重ねる。近い会が手前 */
	.fan {
		position: relative;
		width: min(86%, 23rem);
		aspect-ratio: 1 / 1.1;
		margin-inline: auto;
	}
	.fan > :global(*) {
		position: absolute;
		width: 56%;
	}
	.fan > :global(* img) {
		aspect-ratio: 1 / 1.414;
		object-fit: cover;
	}
	.fan > :global(:nth-child(1)) {
		left: 22%;
		top: 14%;
		z-index: 2;
		--tilt: -1.5deg;
	}
	.fan > :global(:nth-child(2)) {
		left: 0;
		top: 4%;
		--tilt: -8deg;
	}
	.fan > :global(:nth-child(3)) {
		right: 0;
		top: 0;
		--tilt: 7deg;
	}
	.fan > :global(a:hover) {
		z-index: 3;
	}
	.block {
		padding-block: 3.5rem;
	}
	/* カードにはせず、一覧と同じ 1px の線で区切る */
	.why,
	.steps,
	.nots {
		display: grid;
		margin-top: 2.5rem;
	}
	.why > li,
	.steps > li,
	.nots > div {
		padding-block: 1.5rem;
		border-top: 1px solid var(--color-line);
	}
	.steps > li {
		display: flex;
		gap: 1rem;
		align-items: baseline;
	}
	.step-no {
		font-family: var(--font-serif);
		font-size: 2rem;
		line-height: 1;
		color: var(--color-accent-ink);
	}
	.nots dt {
		font-family: var(--font-serif);
		font-size: 1.1rem;
	}
	.nots dd {
		margin-top: 0.35rem;
		font-size: 0.875rem;
		line-height: 1.8;
		color: var(--color-muted);
	}
	.ends {
		display: grid;
		gap: 1rem;
	}
	.ends > .panel {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1.25rem;
		padding: 1.5rem;
	}
	@media (min-width: 48rem) {
		.ends {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.why,
		.steps {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			column-gap: 2.5rem;
		}
		.nots {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			column-gap: 2.5rem;
		}
	}
</style>
