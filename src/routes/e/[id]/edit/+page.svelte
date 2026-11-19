<script lang="ts">
import EventForm from "#lib/components/EventForm.svelte";
import Flyer from "#lib/components/Flyer.svelte";
import FlyerPicker from "#lib/components/FlyerPicker.svelte";
import { flyerStyle } from "#lib/flyer.ts";
import type { PageProps } from "./$types";

let { data, form }: PageProps = $props();
// svelte-ignore state_referenced_locally -- 初期値だけ data から取り、以後は選んだ型と色
let look = $state({ ...data.flyer.look });
const flyer = $derived({
	id: data.id,
	title: data.flyer.title,
	startsAt: data.flyer.startsAt,
	endsAt: data.flyer.endsAt,
	allDay: data.flyer.allDay,
	place: data.flyer.place,
	host: data.hosts[0]?.name ?? null,
});
</script>

<svelte:head><title>間を編集 | ◱</title></svelte:head>

<section class="mt-4">
	<p class="text-sm text-muted"><a href="/e/{data.id}" class="hover:text-accent-ink">{data.values.title}</a> › 編集</p>

	<!-- 間のページと同じ 2 列。左にフライヤーとその差し替え、右に中身 -->
	<div class="detail-cols mt-8">
		<div class="detail-flyer">
			<div class="flyer-pin mx-auto w-full max-w-[20rem] md:max-w-none" style="--tilt: {flyerStyle(data.id).tilt / 2}deg">
				{#if data.flyer.url}
					<img src={data.flyer.url} alt="今のフライヤー" />
				{:else}
					<Flyer {...flyer} {look} />
				{/if}
			</div>
			{#if form && 'flyerError' in form}<p class="mt-6 rounded-sm bg-accent-soft px-4 py-2 text-sm text-accent-ink">{form.flyerError}</p>{/if}
			{#if !data.flyer.url}
				<form method="POST" action="?/look" class="mt-8">
					<FlyerPicker bind:look {...flyer} />
					<p class="mt-4 text-center"><button type="submit" class="btn px-4 py-1.5 text-sm">このビラにする</button></p>
				</form>
			{/if}
			<div class="mt-6 border-t border-line pt-5">
				<p class="text-xs leading-relaxed text-dim">
					{#if data.flyer.url}上げた画像を貼っています。{:else}好きな画像にも差し替えられます。{/if}X で共有したときの画像にもなります。縦横比は自由で、切り抜きません。JPEG / PNG / WebP、10MB まで。
				</p>
				<form method="POST" action="?/flyer" enctype="multipart/form-data" class="mt-3 flex items-center gap-2">
					<input type="file" name="flyer" accept="image/jpeg,image/png,image/webp" required class="input min-w-0 flex-1 text-sm" />
					<button type="submit" class="btn shrink-0 px-4 py-1.5 text-sm">{data.flyer.url ? '差し替える' : '上げる'}</button>
				</form>
				{#if data.flyer.url}
					<form method="POST" action="?/removeFlyer" class="mt-3"><button type="submit" class="text-xs text-muted underline underline-offset-2 hover:text-accent-ink">自動のビラに戻す</button></form>
				{/if}
			</div>
		</div>
		<div class="min-w-0">
			<p class="label mb-6">間を編集</p>
			{#if data.status === 'cancelled'}
				<p class="mb-6 rounded-sm bg-accent-soft px-4 py-2 text-sm text-accent-ink">中止にした間です。内容を直して保存しても、中止のままです。</p>
			{/if}
			<EventForm values={form?.values ?? data.values} error={form?.error} submitLabel={data.status === 'cancelled' ? '保存する' : '保存して公開'} />

	<section class="mt-12 border-t border-line pt-6">
		<h2 class="section-title text-[1.25rem]">主催</h2>
		<p class="mt-4 mb-4 text-sm text-muted">主催は間のページに並んで出て、全員がこの間を編集できます。</p>
		{#if form && 'hostError' in form}<p class="mb-4 rounded-sm bg-accent-soft px-4 py-2 text-sm text-accent-ink">{form.hostError}</p>{/if}
		<div class="rule-list">
			{#each data.hosts as h (h.actorId)}
				<div class="row items-center">
					<span class="font-mono text-xs text-muted">{h.role === 'host' ? '主催' : '共同主催'}</span>
					<span class="flex flex-wrap items-center gap-3">
						<a href="/@{h.handle}" class="font-serif text-[1.05rem] font-bold hover:text-accent-ink">{h.name}</a>
						<span class="text-xs text-muted">@{h.handle}</span>
						{#if data.hosts.length > 1}
							{@const self = h.actorId === data.myActorId}
							<form method="POST" action="?/removeHost" onsubmit={(e) => { if (!confirm(self ? '自分を主催から外しますか？' : `${h.name} を主催から外しますか？`)) e.preventDefault(); }}>
								<input type="hidden" name="actorId" value={h.actorId} />
								<button type="submit" class="text-xs text-muted hover:text-accent-ink">{self ? '自分を外す' : '外す'}</button>
							</form>
						{/if}
					</span>
				</div>
			{/each}
		</div>
	</section>

	<div class="mt-12 flex flex-wrap gap-3 border-t border-line pt-6">
		{#if data.status === 'cancelled'}
			<form method="POST" action="?/reopen"><button type="submit" class="btn">中止を取り消す</button></form>
		{:else}
			<form method="POST" action="?/cancel" onsubmit={(e) => { if (!confirm('この間を中止にしますか？')) e.preventDefault(); }}>
				<button type="submit" class="btn">中止にする</button>
			</form>
		{/if}
		<form method="POST" action="?/delete" onsubmit={(e) => { if (!confirm('この間を削除しますか？元に戻せません。')) e.preventDefault(); }}>
			<button type="submit" class="btn text-accent-ink">削除する</button>
		</form>
	</div>
		</div>
	</div>
</section>
