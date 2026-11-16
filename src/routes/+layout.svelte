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

<!-- ナビと同じものは繰り返さない。ここにしか無い入口（壁、運営への連絡、ソース）だけを 1 行で -->
<footer class="border-t border-line">
	<div class="mx-auto flex max-w-content flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-6 text-xs text-dim">
		<p>© {year} まがり</p>
		<nav aria-label="フッター" class="flex flex-wrap gap-x-5 gap-y-1">
			<a href="/wall" class="hover:text-text">フライヤーの壁</a>
			<a href="/terms" class="hover:text-text">利用規約</a>
			<a href="/privacy" class="hover:text-text">プライバシー</a>
			<a href="/policy" class="hover:text-text">掲載と削除の方針</a>
			<a href="/contact" class="hover:text-text">掲載の取り下げ・連絡</a>
			<a href={REPO} class="hover:text-text" rel="noopener">GitHub（MIT）</a>
		</nav>
	</div>
</footer>
