<script lang="ts">
import { areaFilter } from "#lib/area-filter.svelte.ts";
import favicon from "#lib/assets/favicon.svg";
import logo from "#lib/assets/logo.svg";
import AreaFilter from "#lib/components/AreaFilter.svelte";
import Graffiti from "#lib/components/Graffiti.svelte";
import { onNavigate } from "$app/navigation";
import { navigating, page } from "$app/state";
import type { LayoutProps } from "./$types";
import "./layout.css";

let { children, data }: LayoutProps = $props();
// ページ遷移: 前のページを画面に残したまま次を組み、見えている画像が出せるようになってから一度に差し替える。
// フェードはしない（前のページが透けて重なる）。対応していないブラウザでは何もしない
onNavigate((navigation) => {
	if (!document.startViewTransition) return;
	return new Promise((resolve) => {
		document.startViewTransition(async () => {
			resolve();
			await navigation.complete;
			await imagesReady();
		});
	});
});
// 画面に入っている画像の読み込みと復号を待つ。初めての画像で遷移が止まって見えないよう、待つのは短い間だけ
function imagesReady() {
	const pending = [...document.images]
		.filter((img) => {
			const r = img.getBoundingClientRect();
			return r.bottom > 0 && r.top < innerHeight;
		})
		.map((img) => {
			img.loading = "eager";
			return img.decode().catch(() => {});
		});
	return Promise.race([
		Promise.all(pending),
		new Promise((r) => setTimeout(r, 300)),
	]);
}
const nav = [
	// icon は 24×24 の線画（svg の path）。イベントは切符、ハコは店先
	{
		href: "/home",
		label: "イベント",
		icon: "M3 9a3 3 0 0 0 0 6v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2a3 3 0 0 0 0-6V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2zM14 5v2M14 11v2M14 17v2",
	},
	{
		href: "/spaces",
		label: "ハコ",
		icon: "M3 10l2-6h14l2 6M3 10h18M5 10v10h14V10M10 20v-6h4v6",
	},
];
const REPO = "https://github.com/hitalin/magari";
// 一覧・フライヤー・カレンダーはイベントの見せ方（EventViews）。どれにいてもナビは「イベント」
// 本文がナビの下に入ったら、ナビに地の色を敷く
// 0（一番上）〜 1。スクロールし始めの 120px で、地の色を少しずつ濃くする
let tint = $state(0);
const onScroll = () => {
	tint = Math.min(window.scrollY / 120, 1);
};
// 途中までスクロールした位置で開き直したときも、最初から敷く
$effect(onScroll);
const EVENT_VIEWS = ["/home", "/wall", "/calendar"];
const isActive = (href: string) =>
	(href === "/home" ? EVENT_VIEWS : [href]).some((p) =>
		page.url.pathname.startsWith(p),
	);
// エリアの絞り込みは、イベントの各ページとハコの一覧で同じ位置（ナビのすぐ下）に出す。絞る対象はそのページのデータ
const filterItems = $derived<{ area: string | null }[] | undefined>(
	EVENT_VIEWS.some((p) => page.url.pathname.startsWith(p))
		? page.data.events
		: page.url.pathname === "/spaces"
			? page.data.spaces
			: undefined,
);
</script>

<svelte:window onscroll={onScroll} />

<svelte:head>
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<link rel="manifest" href="/manifest.webmanifest" />
	<meta name="theme-color" content="#151617" />
	<meta property="og:site_name" content="◱" />
	<!-- ページが ogImage（会のフライヤー、ハコの写真）を返せばそれを、無ければ既定の画像 -->
	<meta property="og:image" content="{page.url.origin}{page.data.ogImage ?? '/og.png'}" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<a href="#main" class="skip-link btn btn-primary">本文へ</a>
{#if navigating.to}<div class="progress" role="progressbar" aria-label="読み込み中"></div>{/if}

<!-- 図像と字だけのナビ。上に固定するが帯は見せない。下を流れる本文は、下端へ向けて消えるぼかしで溶かす（.site-header） -->
<header class="site-header fixed inset-x-0 top-0 z-50 h-header" style:--nav-tint={tint}>
	<div class="flex h-full items-center gap-3 px-4 text-[0.8rem] sm:gap-6 sm:px-5 sm:text-sm">
		<a href="/" class="flex shrink-0 items-center" aria-label="まがり"><img src={logo} alt="" class="h-7 w-7" /></a>
		<!-- タブ（実体の「イベント」「ハコ」だけ）の左端を、本文の左端に揃える（図像は左端、「まがり」は右端のまま）。狭い画面では図像のすぐ右。
		     % はこの行の中身の幅（ヘッダー幅 − 左右 2.5rem）。本文の左端 (ヘッダー幅 − content)/2 + 1rem から、左余白・図像・間の 4.5rem を引くと -2.25rem -->
		<nav class="flex gap-3 font-medium whitespace-nowrap sm:gap-6" style="margin-left: max(0px, calc((100% - var(--container-content)) / 2 - 2.25rem))">
			{#each nav as item (item.href)}
				{@const active = isActive(item.href)}
				<a href={item.href} class="flex items-center gap-1.5 transition hover:text-text {active ? 'text-text' : 'text-muted'}" aria-current={active ? 'page' : undefined}>
					<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={item.icon} /></svg>
					{item.label}
				</a>
			{/each}
		</nav>
		<div class="ml-auto flex shrink-0 items-center gap-3 sm:gap-5">
			<!-- ログイン前は「まがり」だけ。押せばログインを挟んで /new に着くので、ログインのボタンは並べない（フッターに小さく置く） -->
			<!-- このサイトの主な動作なので、ナビでここだけテープ（primary）にする。開ける画面にいる間は字に戻す -->
			{#if isActive('/new')}
				<a href="/new" class="font-medium text-text" aria-current="page">まがり</a>
			{:else}
				<a href="/new" class="btn btn-primary px-3 py-1 text-xs sm:text-[0.8rem]">まがり</a>
			{/if}
			{#if data.loggedIn}
				<a href="/me" aria-label={data.me?.name ?? '自分'} title={data.me?.name ?? '自分'} aria-current={isActive('/me') ? 'page' : undefined}>
					{#if data.me?.avatarUrl}
						<img src={data.me.avatarUrl} alt="" class="h-7 w-7 rounded-full object-cover" />
					{:else}
						<span class="block h-7 w-7 rounded-full bg-accent-soft"></span>
					{/if}
				</a>
			{/if}
		</div>
	</div>
</header>

<Graffiti />

<main id="main" class="mx-auto max-w-content px-4 pt-6 pb-20">
	{#if filterItems}
		<!-- 狭い画面では検索を上、エリアを下。広い画面ではエリアの右に検索 -->
		<div class="mt-4 flex flex-col gap-3 sm:flex-row-reverse sm:items-start sm:justify-between sm:gap-6">
			<input type="search" class="input py-1 text-sm sm:w-56" placeholder="名前や場所で探す" aria-label="名前や場所で探す" bind:value={areaFilter.query} />
			<div class="min-w-0 sm:flex-1">
				<AreaFilter items={filterItems} bind:value={areaFilter.value} />
			</div>
		</div>
	{/if}
	{@render children()}
</main>

<!-- 奥付。ナビと同じものは繰り返さない。左にだれがどう動かしているか（無償・広告なし・ソース公開）、右に規約類と連絡。© は置かない -->
<footer class="border-t border-line">
	<nav aria-label="フッター" class="mx-auto flex max-w-content flex-wrap items-center gap-x-3 gap-y-1 px-4 pt-4 pb-20 text-xs text-muted sm:gap-x-5 sm:pb-4">
		<img src={logo} alt="" class="h-4 w-4" />
		<a href="/terms" class="footer-link">利用規約</a>
		<a href="/privacy" class="footer-link">プライバシー</a>
		<a href="/policy" class="footer-link">掲載方針</a>
		<a href="/contact" class="footer-link">連絡</a>
		{#if !data.loggedIn}<a href="/login" class="footer-link">ログイン</a>{/if}
		<a href={REPO} class="footer-link sm:ml-auto" rel="noopener">ソース<span aria-hidden="true"> ↗</span></a>
	</nav>
</footer>

<style>
	.footer-link {
		text-decoration: underline;
		text-decoration-color: var(--color-line);
		text-underline-offset: 0.3em;
		transition: color 0.15s;
	}
	.footer-link:hover {
		color: var(--color-text);
		text-decoration-color: currentColor;
	}
</style>
