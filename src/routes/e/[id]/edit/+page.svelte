<script lang="ts">
import EventForm from "#lib/components/EventForm.svelte";
import Flyer from "#lib/components/Flyer.svelte";
import type { PageProps } from "./$types";

let { data, form }: PageProps = $props();
</script>

<svelte:head><title>間を編集 | まがり</title></svelte:head>

<section class="mx-auto mt-4 max-w-2xl">
	<p class="label">間を編集</p>
	<h1 class="mt-2 mb-8 text-2xl">{data.values.title}</h1>

	<section class="mb-12">
		<h2 class="section-title text-[1.25rem]">フライヤー</h2>
		{#if form && 'flyerError' in form}<p class="mt-4 rounded-sm bg-accent-soft px-4 py-2 text-sm text-accent-ink">{form.flyerError}</p>{/if}
		<div class="mt-6 grid items-start gap-6 sm:grid-cols-[10rem_1fr]">
			<div class="flyer-pin mx-auto w-40">
				{#if data.flyer.url}
					<img src={data.flyer.url} alt="今のフライヤー" />
				{:else}
					<Flyer id={data.id} title={data.flyer.title} startsAt={data.flyer.startsAt} endsAt={data.flyer.endsAt} allDay={data.flyer.allDay} place={data.flyer.place} host={data.hosts[0]?.name ?? null} />
				{/if}
			</div>
			<div>
				<p class="text-sm text-muted">
					{#if data.flyer.url}上げた画像を壁と間のページに貼っています。{:else}今は題・日時・場所から作った自動のビラです。好きな画像に差し替えられます。{/if}
					X で共有したときの画像にもなります。縦横比は自由で、切り抜きません。JPEG / PNG / WebP、10MB まで。
				</p>
				<div class="mt-4 flex flex-wrap items-center gap-3">
					<form method="POST" action="?/flyer" enctype="multipart/form-data" class="flex flex-wrap items-center gap-2">
						<input type="file" name="flyer" accept="image/jpeg,image/png,image/webp" required class="input max-w-xs" />
						<button type="submit" class="btn">{data.flyer.url ? '差し替える' : 'アップロード'}</button>
					</form>
					{#if data.flyer.url}
						<form method="POST" action="?/removeFlyer"><button type="submit" class="btn">自動のビラに戻す</button></form>
					{/if}
				</div>
			</div>
		</div>
	</section>
	<EventForm values={form?.values ?? data.values} error={form?.error} submitLabel="保存して公開" />

	<section class="mt-12 border-t border-line pt-6">
		<h2 class="section-title text-[1.25rem]">主催</h2>
		<p class="mt-4 mb-4 text-sm text-muted">主催は間のページに並んで出て、全員がこの間を編集できます。まがりにログインしたことのある人を @handle で足せます。</p>
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
		<form method="POST" action="?/addHost" class="mt-4 flex flex-wrap items-center gap-2">
			<input name="handle" required class="input max-w-xs" placeholder="@handle" autocomplete="off" />
			<button type="submit" class="btn">主催に足す</button>
		</form>
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
</section>
