<script lang="ts">
import Field from "#lib/components/Field.svelte";
import Flyer from "#lib/components/Flyer.svelte";
import { dayKey } from "#lib/date.ts";
import type { EventFormValues } from "#lib/event-form.ts";
import { shortId } from "#lib/id.ts";

let {
	values,
	error,
	submitLabel = "開ける",
	flyerId,
	host = null,
}: {
	values: EventFormValues;
	error?: string;
	submitLabel?: string;
	// 新しく開けるときだけ渡す。会の ID を先に決め、打った内容でビラをその場で刷って左に出す
	flyerId?: string;
	host?: string | null;
} = $props();
// svelte-ignore state_referenced_locally -- 初期値だけ props から取り、以後は利用者の操作で変える
let v = $state({
	id: flyerId ?? "",
	title: values.title,
	date: values.date,
	startTime: values.startTime,
	endTime: values.endTime,
	allDay: values.allDay,
	locationName: values.locationName,
	space: values.space,
});
// 要るのは「ひとこと・日時・場所」だけ。残りは畳んでおき、何か書いてあるとき（編集・複製）だけ開く
const more = $derived(
	!!(
		values.locationAddress ||
		values.onlineUrl ||
		values.description ||
		values.feeText ||
		values.url
	) ||
		values.locationVisibility !== "public" ||
		values.visibility !== "public",
);

// ビラ用の日時。まだ打っていない所は今日・開始時刻で埋める（保存時の解釈は parseEventForm）
const iso = (time: string) => {
	const d = new Date(`${v.date || dayKey(new Date())}T${time}:00+09:00`);
	return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
const startsAt = $derived(
	iso(v.allDay ? "00:00" : v.startTime || "19:00") ?? new Date().toISOString(),
);
const endsAt = $derived(v.allDay || !v.endTime ? null : iso(v.endTime));
const place = $derived(v.locationName || (v.space ? `@${v.space}` : null));
</script>

{#snippet fields()}
	{#if error}<p class="rounded-sm bg-accent-soft px-4 py-2 text-sm text-accent-ink">{error}</p>{/if}

	<Field label="ひとこと" hint="これだけ書けば開けられます">
		<input name="title" bind:value={v.title} required maxlength="200" class="input font-serif text-[1.4rem] font-bold" placeholder="18時から店にいます" />
	</Field>

	<div class="grid grid-cols-2 gap-4">
		<div class="col-span-2"><Field label="日付"><input type="date" name="date" bind:value={v.date} required class="input" /></Field></div>
		<Field label="開始"><input type="time" name="startTime" bind:value={v.startTime} class="input" disabled={v.allDay} /></Field>
		<Field label="終了" hint="空欄でも可。開始より前なら翌日扱い"><input type="time" name="endTime" bind:value={v.endTime} class="input" disabled={v.allDay} /></Field>
	</div>
	<label class="flex items-center gap-2 text-sm"><input type="checkbox" name="allDay" bind:checked={v.allDay} class="accent-accent" /> 終日（時刻を決めない）</label>

	<div class="grid gap-4 sm:grid-cols-2">
		<Field label="場所" hint="店名、公園、誰かの家など。決まっていなければ空欄で"><input name="locationName" bind:value={v.locationName} class="input" /></Field>
		<Field label="ハコ" hint="まがりに登録された場なら @ID。その場のページにも載る">
			<div class="flex items-center gap-1"><span class="text-muted">@</span><input name="space" bind:value={v.space} class="input" autocapitalize="off" placeholder="curry_shop" /></div>
		</Field>
	</div>

	<details open={more} class="border-t border-line pt-4">
		<summary class="cursor-pointer text-sm text-muted hover:text-accent-ink">もっと書く（住所・説明・料金・公開範囲など）</summary>
		<div class="mt-6 space-y-6">
			<Field label="住所"><input name="locationAddress" value={values.locationAddress} class="input" /></Field>
			<Field label="場所の見せ方">
				<select name="locationVisibility" class="input">
					<option value="public" selected={values.locationVisibility === 'public'}>誰にでも見せる</option>
					<option value="attendees" selected={values.locationVisibility === 'attendees'}>参加者にだけ知らせる（自助会・オフ会向け）</option>
				</select>
			</Field>
			<Field label="オンラインの URL" hint="Zoom や Discord など。オンライン開催なら"><input name="onlineUrl" value={values.onlineUrl} class="input" placeholder="https://" /></Field>

			<Field label="説明"><textarea name="description" rows="8" class="input">{values.description}</textarea></Field>

			<Field label="料金"><input name="feeText" value={values.feeText} class="input" placeholder="無料 / 500円 / 投げ銭" /></Field>
			<Field label="告知ページの URL" hint="X のポスト、こくちーず、自分のサイトなど"><input name="url" value={values.url} class="input" placeholder="https://" /></Field>

			<div class="grid gap-4 sm:grid-cols-2">
				<Field label="誰に見せるか">
					<select name="visibility" class="input">
						<option value="public" selected={values.visibility === 'public'}>公開（一覧に出る）</option>
						<option value="unlisted" selected={values.visibility === 'unlisted'}>URL を知っている人だけ</option>
					</select>
				</Field>
			</div>
		</div>
	</details>

	<div class="flex flex-wrap gap-3 pt-2">
		<button type="submit" name="status" value="published" class="btn btn-primary">{submitLabel}</button>
		<button type="submit" name="status" value="draft" class="btn">下書きで保存</button>
	</div>
	<p class="text-xs text-dim">載せる内容（題・説明・画像）は、自分に権利があるか、載せてよいものだけにしてください。<a href="/terms" class="underline underline-offset-2 hover:text-accent-ink">利用規約</a></p>
{/snippet}

{#if flyerId}
	<!-- 会のページと同じ 2 列。左のビラは打つそばから刷り上がり、保存後もこの見た目のまま -->
	<form method="POST" action="?/save" class="detail-cols">
		<input type="hidden" name="id" value={v.id} />
		<div class="detail-flyer">
			<div class="flyer-pin mx-auto w-full max-w-[11rem] md:max-w-none">
				<Flyer id={v.id} title={v.title || 'ひとこと'} {startsAt} {endsAt} allDay={v.allDay} {place} {host} />
			</div>
			<p class="mt-4 text-center text-sm">
				<button type="button" class="text-muted underline underline-offset-2 hover:text-accent-ink" onclick={() => (v.id = shortId())}>刷り直す</button>
				<span class="ml-2 text-xs text-dim">好きな画像には、開けたあとで差し替えられます</span>
			</p>
		</div>
		<div class="min-w-0 space-y-6">{@render fields()}</div>
	</form>
{:else}
	<form method="POST" action="?/save" class="space-y-6">{@render fields()}</form>
{/if}
