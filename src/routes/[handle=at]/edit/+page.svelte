<script lang="ts">
import Field from "#lib/components/Field.svelte";
import type { PageProps } from "./$types";

let { data, form }: PageProps = $props();
const v = $derived(
	form?.section === "profile" && form.values ? form.values : data.values,
);
const err = (section: string) =>
	form?.section === section && "error" in form ? form.error : null;
const person = $derived(data.kind === "person");
const KIND_WORD: Record<string, string> = {
	space: "ハコ",
	group: "団体",
	person: "自分",
};
</script>

<svelte:head><title>{data.values.name} を編集 | ◱</title></svelte:head>

<div class="mt-4 mb-8 flex flex-wrap items-end justify-between gap-3">
	<div>
		<p class="label">{KIND_WORD[data.kind]}のページを編集 · @{data.handle}</p>
		<h1 class="mt-2 text-2xl">{data.values.name}</h1>
		{#if data.hidden}<p class="mt-4 rounded-sm bg-accent-soft px-4 py-2 text-sm text-accent-ink">運営がこのページを非表示にしています。公開のページと、ここで開かれる会は出ていません。心当たりが無ければ<a href="/contact?kind=other&about=@{data.handle}" class="ml-1 underline">運営に連絡</a>してください。</p>{/if}
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
	<p class="mt-2 text-xs text-dim">
		{#if data.kind === 'space'}店のロゴや外観の写真。ハコ一覧のバナーと、ページの丸いアイコン（中央を丸く切り抜く）と、X で共有したときの画像になります。{:else}ページの上と、X で共有したときの画像になります。{/if}
		JPEG / PNG / WebP、5MB まで。
	</p>
</section>

<section class="mb-12">
	<div class="section-head"><h2 class="section-title text-[1.25rem]">紹介</h2></div>
	<form method="POST" action="?/profile" class="space-y-6">
		{@render error('profile')}
		<!-- 人のページは、名前・ひとこと・紹介文・リンクだけ。ハコ向けの欄（キャッチコピー・設備・アクセス）は出さない -->
		{#if person}
			<Field label="名前"><input name="name" value={v.name} required maxlength="50" class="input" /></Field>
			<Field label="ひとこと" hint="名前の下に出る自己紹介。何をしている人か、どんな会を開けるか"><textarea name="summary" rows="3" maxlength="200" class="input" placeholder="例: 月に一度、間借りでカレー屋をやっています。">{v.summary}</textarea></Field>
			<Field label="紹介文" hint="長く書きたいときに。「## 見出し」「- 箇条書き」が使えます">
				<textarea name="body" rows="6" class="input">{v.body}</textarea>
			</Field>
		{:else}
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
		{/if}

		<h3 class="label pt-4">リンク</h3>
		<div class="grid gap-4 sm:grid-cols-3">
			<Field label="ウェブサイト"><input name="url" value={v.url} class="input" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="https://" /></Field>
			<Field label="X"><input name="xHandle" value={v.xHandle} class="input" placeholder="@ユーザー名" autocapitalize="off" autocorrect="off" spellcheck="false" /></Field>
			<Field label="Instagram"><input name="instagram" value={v.instagram} class="input" placeholder="@ユーザー名" autocapitalize="off" autocorrect="off" spellcheck="false" /></Field>
		</div>
		<Field label={person ? 'ほかの SNS・リンク' : '関連リンク'} hint={person ? '1 行に 1 つ、URL だけでも「名前 https://...」でも。Misskey・Mastodon・Bluesky・Threads・YouTube・TikTok・GitHub・note・Twitch のプロフィールは、アイコン付きで名前の下に出ます' : '1 行に 1 つ、「名前 https://...」の形で。系列店や関連サイトなど。SNS のプロフィールの URL は、アイコン付きでページの上に出ます'}>
			<textarea name="links" rows="4" class="input">{v.links}</textarea>
		</Field>

		<button type="submit" class="btn btn-primary">保存する</button>
	</form>
</section>

{#if data.kind !== 'person'}
	<section class="mb-12">
		<div class="section-head"><h2 class="section-title text-[1.25rem]">管理者</h2></div>
		<p class="mb-4 text-sm text-muted">管理者は全員、このページを編集できます。</p>
		{@render error('members')}
		<div class="rule-list">
			{#each data.members as m (m.userId)}
				<div class="row items-center">
					<span class="font-mono text-xs text-muted">{m.role === 'owner' ? '作った人' : '管理者'}</span>
					<span class="flex flex-wrap items-center gap-3">
						<a href="/@{m.handle}" class="font-serif text-[1.05rem] font-bold hover:text-accent-ink">{m.name}</a>
						<span class="text-xs text-muted">@{m.handle}</span>
						{#if data.members.length > 1}
							{@const self = m.userId === data.myUserId}
							<form method="POST" action="?/removeMember" onsubmit={(e) => { if (!confirm(self ? '自分を管理者から外しますか？このページを編集できなくなります。' : `${m.name} を管理者から外しますか？`)) e.preventDefault(); }}>
								<input type="hidden" name="userId" value={m.userId} />
								<button type="submit" class="text-xs text-muted hover:text-accent-ink">{self ? '自分を外す' : '外す'}</button>
							</form>
						{/if}
					</span>
				</div>
			{/each}
		</div>
	</section>
{/if}
