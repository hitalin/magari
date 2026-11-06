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
	{ href: "/", label: "これからの間" },
	{ href: "/calendar", label: "カレンダー" },
];
const REPO = "https://github.com/hitalin/magari";
const isActive = (href: string) =>
	href === "/" ? page.url.pathname === "/" : page.url.pathname.startsWith(href);
</script>

<svelte:head>
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<link rel="manifest" href="/manifest.webmanifest" />
	<meta name="theme-color" content="#151617" />
	<meta property="og:site_name" content="まがり" />
	<meta property="og:image" content="{page.url.origin}/og.png" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<a href="#main" class="skip-link btn btn-primary">本文へ</a>
{#if navigating.to}<div class="progress" role="progressbar" aria-label="読み込み中"></div>{/if}

<header class="fixed inset-x-0 top-0 z-50 h-header border-b bg-bg/75 backdrop-blur-md transition-colors {page.url.pathname === '/' ? 'border-transparent' : 'border-line'}" style="view-transition-name: header">
	<div class="mx-auto flex h-full max-w-content items-center gap-3 px-3 sm:gap-5 sm:px-4">
		<a href="/" class="flex shrink-0 items-center gap-2 font-serif text-[1.35rem] font-bold tracking-[0.08em] whitespace-nowrap">
			<img src={logo} alt="" class="h-7 w-7" />
			まがり
		</a>
		<span class="hidden h-7 w-px bg-line sm:block" aria-hidden="true"></span>
		<nav class="flex gap-3 text-[0.9rem] font-semibold whitespace-nowrap sm:gap-5 sm:text-[0.95rem]">
			{#each nav as item (item.href)}
				{@const active = isActive(item.href)}
				<a
					href={item.href}
					class="relative py-1 transition hover:text-accent-ink {active ? 'text-accent-ink' : ''}"
					aria-current={active ? 'page' : undefined}
				>
					{item.label}
					{#if active}<span class="tape absolute -inset-x-1 -bottom-1.5 h-1.5" aria-hidden="true"></span>{/if}
				</a>
			{/each}
		</nav>
		<div class="ml-auto flex items-center gap-2 text-sm">
			<a href={REPO} class="icon-btn hidden sm:inline-grid" aria-label="GitHub" title="ソースコード（GitHub）" rel="noopener">
				<svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
			</a>
			{#if data.loggedIn}
				<a href="/new" class="btn btn-primary hidden px-3 py-1.5 text-xs sm:inline-flex">まがりする</a>
				<a href="/new" class="icon-btn sm:hidden" aria-label="まがりする" title="まがりする">
					<svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8 2v12M2 8h12" /></svg>
				</a>
				<a href="/me" class="btn gap-2 py-1 pr-3 pl-1 text-xs" aria-current={isActive('/me') ? 'page' : undefined}>
					{#if data.me?.avatarUrl}
						<img src={data.me.avatarUrl} alt="" class="h-6 w-6 rounded-full object-cover" />
					{:else}
						<span class="inline-block h-6 w-6 rounded-full bg-accent-soft"></span>
					{/if}
					{data.me?.name ?? '自分'}
				</a>
			{:else}
				<a href="/login" class="btn px-3 py-1.5 text-xs">ログイン</a>
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
			<p class="mt-2 max-w-[28em]">場所を持たない人と、場所を貸す人をつなぐ。間借り店舗・日替わり店長・ライブ・自助会・オフ会の間を一箇所に。</p>
		</div>
		<nav aria-label="フッター" class="grid gap-1.5">
			<p class="label mb-1">見る</p>
			<a href="/" class="hover:text-accent-ink">これからの間</a>
			<a href="/calendar" class="hover:text-accent-ink">カレンダー</a>
		</nav>
		<nav aria-label="主催者" class="grid gap-1.5">
			<p class="label mb-1">まがりする</p>
			{#if data.loggedIn}
				<a href="/new" class="hover:text-accent-ink">間を開く</a>
				<a href="/me" class="hover:text-accent-ink">自分のページ</a>
			{:else}
				<a href="/login" class="hover:text-accent-ink">ログイン</a>
			{/if}
			<a href={REPO} class="hover:text-accent-ink" rel="noopener">GitHub ›</a>
		</nav>
	</div>
	<p class="mx-auto max-w-content px-4 pb-8 text-xs text-dim">© {year} まがり · オープンソース（MIT）</p>
</footer>
