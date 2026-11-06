<script lang="ts">
import Field from '#lib/components/Field.svelte';
import type { EventFormValues } from '#lib/event-form.ts';

let {
	values,
	error,
	submitLabel = '公開する'
}: { values: EventFormValues; error?: string; submitLabel?: string } = $props();
// svelte-ignore state_referenced_locally -- 初期値だけ props から取り、以後は利用者の操作で変える
let allDay = $state(values.allDay);
</script>

<form method="POST" action="?/save" class="space-y-6">
	{#if error}<p class="rounded-sm bg-accent-soft px-4 py-2 text-sm text-accent-ink">{error}</p>{/if}

	<Field label="題">
		<input name="title" value={values.title} required maxlength="200" class="input" placeholder="例: 日替わり店長デー / 弾き語りライブ / 月例の当事者会 / 公園でなんもしないオフ会" />
	</Field>

	<div class="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
		<Field label="日付"><input type="date" name="date" value={values.date} required class="input" /></Field>
		<Field label="開始"><input type="time" name="startTime" value={values.startTime} class="input" disabled={allDay} /></Field>
		<Field label="終了" hint="空欄でも可。開始より前なら翌日扱い"><input type="time" name="endTime" value={values.endTime} class="input" disabled={allDay} /></Field>
	</div>
	<label class="flex items-center gap-2 text-sm"><input type="checkbox" name="allDay" bind:checked={allDay} class="accent-accent" /> 終日（時刻を決めない）</label>

	<Field label="ハコ" hint="まがりに登録された場（@ID）。その場のページとカレンダーに載る">
		<div class="flex items-center gap-1"><span class="text-muted">@</span><input name="space" value={values.space} class="input" autocapitalize="off" placeholder="curry_shop" /></div>
	</Field>
	<div class="grid gap-4 sm:grid-cols-2">
		<Field label="場所の名前" hint="ハコの名前、公園、店名など"><input name="locationName" value={values.locationName} class="input" /></Field>
		<Field label="住所"><input name="locationAddress" value={values.locationAddress} class="input" /></Field>
	</div>
	<Field label="場所の見せ方">
		<select name="locationVisibility" class="input">
			<option value="public" selected={values.locationVisibility === 'public'}>誰にでも見せる</option>
			<option value="attendees" selected={values.locationVisibility === 'attendees'}>参加者にだけ知らせる（自助会・オフ会向け）</option>
		</select>
	</Field>
	<Field label="オンラインの URL" hint="Zoom や Discord など。オンライン開催なら"><input name="onlineUrl" value={values.onlineUrl} class="input" placeholder="https://" /></Field>

	<Field label="説明"><textarea name="description" rows="8" class="input">{values.description}</textarea></Field>

	<div class="grid gap-4 sm:grid-cols-3">
		<Field label="タグ" hint="カンマ区切り。間借り、ライブ、自助会、オフ会 など"><input name="tags" value={values.tags} class="input" /></Field>
		<Field label="定員"><input type="number" name="capacity" value={values.capacity} min="1" class="input" /></Field>
		<Field label="料金"><input name="feeText" value={values.feeText} class="input" placeholder="無料 / 500円 / 投げ銭" /></Field>
	</div>
	<Field label="告知ページの URL" hint="X のポスト、こくちーず、自分のサイトなど"><input name="url" value={values.url} class="input" placeholder="https://" /></Field>

	<div class="grid gap-4 sm:grid-cols-2">
		<Field label="誰に見せるか">
			<select name="visibility" class="input">
				<option value="public" selected={values.visibility === 'public'}>公開（一覧に出る）</option>
				<option value="unlisted" selected={values.visibility === 'unlisted'}>URL を知っている人だけ</option>
				<option value="private" selected={values.visibility === 'private'}>自分だけ</option>
			</select>
		</Field>
	</div>

	<div class="flex flex-wrap gap-3 pt-2">
		<button type="submit" name="status" value="published" class="btn btn-primary">{submitLabel}</button>
		<button type="submit" name="status" value="draft" class="btn">下書きで保存</button>
	</div>
</form>
