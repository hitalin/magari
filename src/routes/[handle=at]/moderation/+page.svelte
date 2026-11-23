<script lang="ts">
import ActorFace from "#lib/components/ActorFace.svelte";
import Empty from "#lib/components/Empty.svelte";
import Field from "#lib/components/Field.svelte";
import {
	groupModerations,
	MODERATION_KIND_LABEL,
	MODERATION_KINDS,
	MODERATION_ROLE_LABEL,
	type ModerationKind,
} from "#lib/host-moderation.ts";
import type { PageProps } from "./$types";

let { data, form }: PageProps = $props();
const groups = $derived(groupModerations(data.moderations));
// 断られて戻ったときは、選んでいた種別のまま
let kind = $state<ModerationKind>(
	MODERATION_KINDS.find((k) => k === form?.values?.kind) ?? "ng",
);
// 欄の名前は種別で変わる。権威は 1 人だけ
const FIELDS: Record<ModerationKind, [string, string | null]> = {
	ng: ["1 人目", "2 人目"],
	mentor: ["師匠", "弟子"],
	authority: ["権威のある主催", null],
};
const second = $derived(FIELDS[kind][1]);
const HINT: Record<ModerationKind, string> = {
	ng: "同じ会に並べない 2 組。",
	mentor: "教えた側と、教わった側。",
	authority: "界隈で一目置かれている主催。",
};
</script>

<svelte:head>
	<title>{data.name} のモデレーション | ◱</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mt-4 mb-6 flex flex-wrap items-end justify-between gap-3">
	<div>
		<p class="label">モデレーション · @{data.handle}</p>
		<h1 class="mt-2 text-2xl">{data.name}</h1>
	</div>
	<a href="/@{data.handle}" class="btn">ページを見る ›</a>
</div>

<p class="mb-10 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
	<span class="chip">管理者だけに見えます</span>
	<span>主催どうしの関係の覚え書き。公開のページにも、書き出しにも出ません。</span>
</p>

<section class="mb-12">
	<div class="section-head"><h2 class="section-title text-[1.25rem]">主催ごと</h2></div>
	{#if groups.length}
		<ul class="border-t border-line">
			{#each groups as g (g.actor.handle)}
				<li class="grid gap-x-6 gap-y-3 border-b border-line px-2 py-4 sm:grid-cols-[14rem_1fr] sm:items-center">
					<a href="/@{g.actor.handle}" class="group relative block min-h-9 min-w-0 pl-12">
						<ActorFace actor={g.actor} />
						<span class="block truncate font-serif text-[1.05rem] font-bold leading-tight group-hover:text-accent-ink">{g.actor.name}</span>
						<span class="block truncate text-xs text-muted">@{g.actor.handle}</span>
					</a>
					<div class="flex flex-wrap gap-2">
						{#each g.items as item (item.id)}
							<form method="POST" action="?/remove" class="chip gap-1.5 py-1 {item.role === 'ng' ? '' : 'chip-plain'}" onsubmit={(e) => { if (!confirm('このメモを消しますか？')) e.preventDefault(); }}>
								<input type="hidden" name="id" value={item.id} />
								<span>{MODERATION_ROLE_LABEL[item.role]}</span>
								{#if item.other}<a href="/@{item.other.handle}" class="font-normal text-text underline-offset-2 hover:underline">{item.other.name}</a>{/if}
								<button type="submit" class="-mr-1 px-1 text-muted hover:text-accent-ink" aria-label="このメモを消す">×</button>
							</form>
						{/each}
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<Empty title="まだ何も書いていません" hint="下から、共演 NG・師弟・権威を足せます。" />
	{/if}
</section>

<section class="mb-12">
	<div class="section-head"><h2 class="section-title text-[1.25rem]">足す</h2></div>
	<form method="POST" action="?/add" class="panel max-w-2xl space-y-5 p-5">
		{#if form?.error}<p class="rounded-sm bg-accent-soft px-4 py-2 text-sm text-accent-ink" role="alert">{form.error}</p>{/if}
		<div>
			<div class="flex flex-wrap gap-2" role="radiogroup" aria-label="種別">
				{#each MODERATION_KINDS as k (k)}
					<label class="chip chip-plain cursor-pointer px-4 py-1.5 text-sm has-checked:border-accent-border has-checked:bg-accent-soft has-checked:text-accent-ink has-focus-visible:outline-2 has-focus-visible:outline-accent">
						<input type="radio" name="kind" value={k} bind:group={kind} class="sr-only" />
						{MODERATION_KIND_LABEL[k]}
					</label>
				{/each}
			</div>
			<p class="mt-2 text-xs text-dim">{HINT[kind]}</p>
		</div>
		<div class="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
			<Field label={FIELDS[kind][0]}><input name="a" value={form?.values?.a ?? ''} required class="input" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="@ID" /></Field>
			{#if second}
				<Field label={second}><input name="b" value={form?.values?.b ?? ''} required class="input" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="@ID" /></Field>
			{/if}
			<button type="submit" class="btn btn-primary">足す</button>
		</div>
		<p class="text-xs text-dim">入れられるのは、まがりに主催として載っているページの @ID だけ（ハコ・団体と、会を主催したことのある人）。</p>
	</form>
</section>
