<script lang="ts">
import { page } from "$app/state";

// イベントの見せ方の切り替え。一覧・フライヤー・カレンダーは同じイベントの別の見せ方で、それぞれ URL を持つ。
// ナビの「イベント」の現在地（+layout.svelte の EVENT_VIEWS）と揃える
const views = [
	{ href: "/events", label: "一覧" },
	{ href: "/wall", label: "フライヤー" },
	{ href: "/calendar", label: "カレンダー" },
];
</script>

<!-- 絞り込み（エリアのチップ）とは別の物なので、形を変える。ナビと同じく、いまいる所の下にテープを一本 -->
<nav class="views mt-5 mb-6" aria-label="見せ方">
	{#each views as v (v.href)}
		{@const active = page.url.pathname.startsWith(v.href)}
		<a href={v.href} aria-current={active ? 'page' : undefined}>{v.label}</a>
	{/each}
</nav>

<style>
	.views {
		display: flex;
		gap: 1.5rem;
		border-bottom: 1px solid var(--color-line);
		font-size: 0.875rem;
		font-weight: 600;
	}
	.views > a {
		position: relative;
		padding-block: 0.6rem;
		color: var(--color-muted);
		transition: color 0.15s;
	}
	.views > a:hover,
	.views > a[aria-current] {
		color: var(--color-text);
	}
	.views > a[aria-current]::after {
		content: "";
		position: absolute;
		inset: auto 0 -2px;
		height: 3px;
		background: var(--color-accent);
		transform: rotate(-1deg);
	}
</style>
