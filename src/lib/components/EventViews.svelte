<script lang="ts">
import { page } from "$app/state";

// イベントの見せ方の切り替え。一覧・フライヤー・カレンダーは同じイベントの別の見せ方で、それぞれ URL を持つ。
// ナビの「イベント」の現在地（+layout.svelte の EVENT_VIEWS）と揃える
const views = [
	{ href: "/home", label: "一覧" },
	{ href: "/wall", label: "フライヤー" },
	{ href: "/calendar", label: "カレンダー" },
];
</script>

<nav class="pills mt-4 mb-6" aria-label="見せ方">
	{#each views as v (v.href)}
		{@const active = page.url.pathname.startsWith(v.href)}
		<a href={v.href} class="chip {active ? 'chip-tape' : 'chip-plain'}" aria-current={active ? 'page' : undefined}>{v.label}</a>
	{/each}
</nav>
