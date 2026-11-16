<script lang="ts">
import favicon from "#lib/assets/favicon.svg";
import logo from "#lib/assets/logo.svg";
import { onNavigate } from "$app/navigation";
import { navigating, page } from "$app/state";
import type { LayoutProps } from "./$types";
import "./layout.css";

let { children, data }: LayoutProps = $props();
const year = new Date().getFullYear();
// ページ遷移を短いクロスフェードに。対応していないブラウザでは何もしない
onNavigate((navigation) => {
	if (!document.startViewTransition) return;
	return new Promise((resolve) => {
		document.startViewTransition(async () => {
			resolve();
			await navigation.complete;
		});
	});
});
const nav = [
	{ href: "/home", label: "イベント" },
	{ href: "/calendar", label: "カレンダー" },
	{ href: "/spaces", label: "ハコ" },
];
const REPO = "https://github.com/hitalin/magari";
const isActive = (href: string) => page.url.pathname.startsWith(href);
</script>

<svelte:head>
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<link rel="manifest" href="/manifest.webmanifest" />
	<meta name="theme-color" content="#151617" />
	<meta property="og:site_name" content="まがり" />
	<!-- ページが ogImage（会のフライヤー、ハコの写真）を返せばそれを、無ければ既定の画像 -->
	<meta property="og:image" content="{page.url.origin}{page.data.ogImage ?? '/og.png'}" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<a href="#main" class="skip-link btn btn-primary">本文へ</a>
{#if navigating.to}<div class="progress" role="progressbar" aria-label="読み込み中"></div>{/if}

<!-- 図像と字だけのナビ。上に固定するが帯は見せない。下を流れる本文は、下端へ向けて消えるぼかしで溶かす（.site-header） -->
<header class="site-header fixed inset-x-0 top-0 z-50 h-header" style="view-transition-name: header">
	<div class="flex h-full items-center gap-3 px-4 text-[0.8rem] sm:gap-6 sm:px-5 sm:text-sm">
		<a href={data.loggedIn ? '/home' : '/'} class="flex shrink-0 items-center" aria-label="まがり"><img src={logo} alt="" class="h-7 w-7" /></a>
		<!-- タブは中身の幅に揃えた元の位置（図像は左端、ログインは右端のまま）。狭い画面では図像のすぐ右 -->
		<nav class="flex gap-3 font-medium whitespace-nowrap sm:gap-6" style="margin-left: max(0px, calc((100vw - var(--container-content)) / 2 - 4px))">
			{#each nav as item (item.href)}
				{@const active = isActive(item.href)}
				<a href={item.href} class="transition hover:text-text {active ? 'text-text' : 'text-muted'}" aria-current={active ? 'page' : undefined}>{item.label}</a>
			{/each}
		</nav>
		<div class="ml-auto flex shrink-0 items-center gap-3 sm:gap-5">
			<a href="/new" class="font-medium text-muted transition hover:text-text">開ける</a>
			{#if data.loggedIn}
				<a href="/me" aria-label={data.me?.name ?? '自分'} title={data.me?.name ?? '自分'} aria-current={isActive('/me') ? 'page' : undefined}>
					{#if data.me?.avatarUrl}
						<img src={data.me.avatarUrl} alt="" class="h-7 w-7 rounded-full object-cover" />
					{:else}
						<span class="block h-7 w-7 rounded-full bg-accent-soft"></span>
					{/if}
				</a>
			{:else}
				<a href="/login" class="btn px-3 py-1 text-xs">ログイン</a>
			{/if}
		</div>
	</div>
</header>

<main id="main" class="mx-auto max-w-content px-4 pt-6 pb-20">
	{@render children()}
</main>

<footer class="border-t border-line">
	<div class="mx-auto grid max-w-content gap-8 px-4 py-10 text-sm text-muted sm:grid-cols-[1fr_auto_auto] sm:gap-12">
		<div>
			<a href="/" class="inline-flex items-center gap-2 font-serif text-lg font-bold text-text"><img src={logo} alt="" class="h-6 w-6" />まがり</a>
			<p class="mt-2 max-w-[28em]">今日もどこかで誰かが開けている。行ってもいいし、自分が開けてもいい。間借り店舗・日替わり店長・ライブ・自助会・オフ会を一箇所に。</p>
		</div>
		<nav aria-label="フッター" class="grid gap-1.5">
			<p class="label mb-1">見る</p>
			<a href="/home" class="hover:text-accent-ink">イベント</a>
			<a href="/calendar" class="hover:text-accent-ink">カレンダー</a>
			<a href="/spaces" class="hover:text-accent-ink">ハコ</a>
			<a href="/wall" class="hover:text-accent-ink">フライヤー</a>
		</nav>
		<nav aria-label="開ける人" class="grid gap-1.5">
			<p class="label mb-1">まがりする</p>
			{#if data.loggedIn}
				<a href="/new" class="hover:text-accent-ink">間を開く</a>
				<a href="/me" class="hover:text-accent-ink">自分のページ</a>
			{:else}
				<a href="/login" class="hover:text-accent-ink">ログイン</a>
			{/if}
			<a href="/contact" class="hover:text-accent-ink">掲載の取り下げ・連絡</a>
			<a href={REPO} class="hover:text-accent-ink" rel="noopener">GitHub ›</a>
		</nav>
	</div>
	<p class="mx-auto max-w-content px-4 pb-8 text-xs text-dim">© {year} まがり · オープンソース（MIT）</p>
</footer>
