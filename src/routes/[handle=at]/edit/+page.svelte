<script lang="ts">
import Field from '#lib/components/Field.svelte';
import { formatDay, formatTime } from '#lib/date.ts';
import { INQUIRY_KIND_LABEL, PLAN_KIND_LABEL, PLAN_KINDS } from '#lib/space-form.ts';
import type { PageProps } from './$types';

let { data, form }: PageProps = $props();
const v = $derived(form?.section === 'profile' && form.values ? form.values : data.values);
const err = (section: string) => (form?.section === section && 'error' in form ? form.error : null);
const KIND_WORD: Record<string, string> = { space: 'ハコ', group: '団体', person: '自分' };
let newPlan = $state(false);
</script>

<svelte:head><title>{data.values.name} を編集 | まがり</title></svelte:head>

<div class="mt-4 mb-8 flex flex-wrap items-end justify-between gap-3">
	<div>
		<p class="label">{KIND_WORD[data.kind]}のページを編集 · @{data.handle}</p>
		<h1 class="mt-2 text-2xl">{data.values.name}</h1>
	</div>
	<a href="/@{data.handle}" class="btn">ページを見る ›</a>
</div>

{#snippet error(section: string)}
	{@const e = err(section)}
	{#if e}<p class="rounded-sm bg-accent-soft px-4 py-2 text-sm text-accent-ink">{e}</p>{/if}
{/snippet}

<section class="mb-12">
	<div class="section-head"><h2 class="section-title text-[1.25rem]">写真</h2></div>
	{@render error('header')}
	{#if data.headerUrl}
		<img src={data.headerUrl} alt="" class="mb-3 aspect-[3/1] w-full max-w-xl rounded-lg border border-line object-cover" />
	{/if}
	<div class="flex flex-wrap items-center gap-3">
		<form method="POST" action="?/header" enctype="multipart/form-data" class="flex flex-wrap items-center gap-2">
			<input type="file" name="header" accept="image/jpeg,image/png,image/webp" required class="input max-w-xs" />
			<button type="submit" class="btn">{data.headerUrl ? '差し替える' : 'アップロード'}</button>
		</form>
		{#if data.headerUrl}
			<form method="POST" action="?/removeHeader"><button type="submit" class="btn">外す</button></form>
		{/if}
	</div>
	<p class="mt-2 text-xs text-dim">店の外観や中の写真。ページの上と、X で共有したときの画像になります。JPEG / PNG / WebP、5MB まで。</p>
</section>

<section class="mb-12">
	<div class="section-head"><h2 class="section-title text-[1.25rem]">紹介</h2></div>
	<form method="POST" action="?/profile" class="space-y-6">
		{@render error('profile')}
		<div class="grid gap-4 sm:grid-cols-2">
			<Field label="名前"><input name="name" value={v.name} required maxlength="50" class="input" /></Field>
			<Field label="キャッチコピー" hint="見出しの下に大きく出ます"><input name="catch" value={v.catch} maxlength="100" class="input" placeholder="例: 出会い、つながる、みんなのスタンド。" /></Field>
		</div>
		<Field label="ひとこと" hint="一覧や検索結果に出る短い説明"><input name="summary" value={v.summary} maxlength="200" class="input" /></Field>
		<Field label="紹介文" hint="「## 見出し」「- 箇条書き」が使えます。コンセプト、使い方、利用の流れなど">
			<textarea name="body" rows="12" class="input">{v.body}</textarea>
		</Field>
		<Field label="設備" hint="カンマ区切り。例: 厨房, 客席 8 席, Wi-Fi, 電源, 食器・調理器具, お酒あり">
			<input name="facilities" value={v.facilities} class="input" />
		</Field>

		<h3 class="label pt-4">アクセス</h3>
		<div class="grid gap-4 sm:grid-cols-[1fr_8rem]">
			<Field label="住所"><input name="address" value={v.address} maxlength="200" class="input" /></Field>
			<Field label="都道府県"><input name="region" value={v.region} maxlength="10" class="input" placeholder="東京都" /></Field>
		</div>
		<Field label="行き方" hint="最寄り駅と徒歩分、建物の目印など"><textarea name="access" rows="2" maxlength="300" class="input">{v.access}</textarea></Field>
		<div class="grid gap-4 sm:grid-cols-2">
			<Field label="営業時間"><textarea name="hours" rows="2" maxlength="300" class="input">{v.hours}</textarea></Field>
			<Field label="定休日"><textarea name="closedDays" rows="2" maxlength="200" class="input">{v.closedDays}</textarea></Field>
		</div>
		<Field label="運営" hint="会社名・個人名など"><input name="operator" value={v.operator} maxlength="100" class="input" /></Field>

		<h3 class="label pt-4">リンク</h3>
		<div class="grid gap-4 sm:grid-cols-3">
			<Field label="ウェブサイト"><input name="url" value={v.url} class="input" placeholder="https://" /></Field>
			<Field label="X"><input name="xHandle" value={v.xHandle} class="input" placeholder="@ユーザー名" autocapitalize="off" /></Field>
			<Field label="Instagram"><input name="instagram" value={v.instagram} class="input" placeholder="@ユーザー名" autocapitalize="off" /></Field>
		</div>
		<Field label="関連リンク" hint="1 行に 1 つ、「名前 https://...」の形で。系列店や関連サイトなど">
			<textarea name="links" rows="4" class="input">{v.links}</textarea>
		</Field>

		<button type="submit" class="btn btn-primary">保存する</button>
	</form>
</section>

{#if data.kind === 'space'}
	<section class="mb-12">
		<div class="section-head">
			<h2 class="section-title text-[1.25rem]">出店プラン</h2>
			<button type="button" class="btn" onclick={() => (newPlan = !newPlan)}>プランを足す</button>
		</div>
		<p class="mb-4 text-sm text-muted">時間帯で借りる・曜日固定・貸し切りなど、どう借りられるかと料金。料金は自由に書けます（表のように改行して並べられます）。</p>
		{#snippet planForm(p: { id: string; name: string; kind: string; priceText: string | null; description: string | null } | null)}
			<form method="POST" action="?/savePlan" class="panel space-y-4 p-5">
				{#if form?.section === 'plan' && 'error' in form && (form.planId ?? '') === (p?.id ?? '')}
					<p class="text-sm text-accent-ink">{form.error}</p>
				{/if}
				<input type="hidden" name="id" value={p?.id ?? ''} />
				<div class="grid gap-4 sm:grid-cols-[1fr_12rem]">
					<Field label="プラン名"><input name="name" value={p?.name ?? ''} required maxlength="50" class="input" placeholder="例: 間借りパートナープラン" /></Field>
					<Field label="種類">
						<select name="kind" class="input">
							{#each PLAN_KINDS as k (k)}<option value={k} selected={(p?.kind ?? 'spot') === k}>{PLAN_KIND_LABEL[k]}</option>{/each}
						</select>
					</Field>
				</div>
				<Field label="料金" hint="例: 昼 11:00〜17:00 平日 3,000円 / 土日祝 4,000円（1 行ずつ）">
					<textarea name="priceText" rows="4" class="input">{p?.priceText ?? ''}</textarea>
				</Field>
				<Field label="説明" hint="含まれるもの、条件、審査など。「- 箇条書き」が使えます">
					<textarea name="description" rows="4" class="input">{p?.description ?? ''}</textarea>
				</Field>
				<div class="flex gap-3">
					<button type="submit" class="btn btn-primary">{p ? '保存する' : '追加する'}</button>
					{#if p}
						<button type="submit" form="delete-plan-{p.id}" class="btn" onclick={(e) => { if (!confirm('このプランを消しますか？')) e.preventDefault(); }}>消す</button>
					{/if}
				</div>
			</form>
			{#if p}
				<form id="delete-plan-{p.id}" method="POST" action="?/deletePlan" hidden><input type="hidden" name="id" value={p.id} /></form>
			{/if}
		{/snippet}
		<div class="space-y-4">
			{#if newPlan || data.plans.length === 0}{@render planForm(null)}{/if}
			{#each data.plans as p (p.id)}{@render planForm(p)}{/each}
		</div>
	</section>
{/if}

<section class="mb-12">
	<div class="section-head"><h2 class="section-title text-[1.25rem]">お知らせ</h2></div>
	<form method="POST" action="?/addPost" class="panel space-y-4 p-5">
		{@render error('post')}
		<Field label="題"><input name="title" required maxlength="100" class="input" placeholder="例: 9/15 グランドオープン" /></Field>
		<Field label="本文" hint="「## 見出し」「- 箇条書き」が使えます"><textarea name="body" rows="5" class="input"></textarea></Field>
		<button type="submit" class="btn btn-primary">出す</button>
	</form>
	{#if data.posts.length}
		<div class="rule-list mt-6">
			{#each data.posts as post (post.id)}
				<div class="row">
					<span class="font-mono text-xs text-muted">{formatDay(post.publishedAt)}</span>
					<span class="flex flex-wrap items-baseline gap-3">
						<span class="font-serif font-bold">{post.title}</span>
						<form method="POST" action="?/deletePost" onsubmit={(e) => { if (!confirm('このお知らせを消しますか？')) e.preventDefault(); }}>
							<input type="hidden" name="id" value={post.id} />
							<button type="submit" class="text-xs text-muted hover:text-accent-ink">消す</button>
						</form>
					</span>
				</div>
			{/each}
		</div>
	{/if}
</section>

{#if data.kind !== 'person'}
	<section class="mb-12">
		<div class="section-head">
			<h2 class="section-title text-[1.25rem]">問い合わせ</h2>
			<span class="chip">{data.inquiries.length} 件</span>
		</div>
		<p class="mb-4 text-sm text-muted">ページのフォームから届いたもの。返事はメールか電話で直接どうぞ。まがりからは通知しません。ときどきここを見てください。</p>
		{#if data.inquiries.length === 0}
			<p class="text-sm text-dim">まだありません。</p>
		{:else}
			<div class="space-y-4">
				{#each data.inquiries as q (q.id)}
					<article class="panel p-5">
						<div class="flex flex-wrap items-baseline justify-between gap-2">
							<p class="label">{INQUIRY_KIND_LABEL[q.kind]} · {formatDay(q.createdAt)} {formatTime(q.createdAt)}</p>
							<form method="POST" action="?/deleteInquiry" onsubmit={(e) => { if (!confirm('この問い合わせを消しますか？')) e.preventDefault(); }}>
								<input type="hidden" name="id" value={q.id} />
								<button type="submit" class="text-xs text-muted hover:text-accent-ink">消す</button>
							</form>
						</div>
						<p class="mt-2 font-serif font-bold">{q.name}</p>
						<p class="text-sm">
							<a href="mailto:{q.email}" class="text-accent-ink hover:underline">{q.email}</a>
							{#if q.phone}<span class="ml-3">{q.phone}</span>{/if}
						</p>
						<p class="mt-3 whitespace-pre-line text-[0.95rem] leading-[1.8]">{q.body}</p>
					</article>
				{/each}
			</div>
		{/if}
	</section>
{/if}
