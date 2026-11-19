<script lang="ts">
import Field from "#lib/components/Field.svelte";
import Flyer from "#lib/components/Flyer.svelte";
import FlyerPicker from "#lib/components/FlyerPicker.svelte";
import { dayKey } from "#lib/date.ts";
import type { EventFormValues } from "#lib/event-form.ts";
import { type FlyerLook, flyerStyle } from "#lib/flyer.ts";

let {
	values,
	error,
	submitLabel = "開ける",
	flyerId,
	look = null,
	host = null,
}: {
	values: EventFormValues;
	error?: string;
	submitLabel?: string;
	// 新しく開けるときだけ渡す。会の ID を先に決め、打った内容でビラをその場で刷って左に出す
	flyerId?: string;
	// ビラの型と差し色の初期値（複製元、送り直し）。無ければ ID から決まる組を最初に出す
	look?: FlyerLook | null;
	host?: string | null;
} = $props();
function pickLook(id: string): FlyerLook {
	const { variant, color } = flyerStyle(id);
	return { variant, color };
}
// svelte-ignore state_referenced_locally -- 初期値だけ props から取り、以後は利用者の操作で変える
let chosen = $state(look ?? pickLook(flyerId ?? ""));
// svelte-ignore state_referenced_locally -- 同上
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

// 自分のフライヤーを選んだら、自動のビラの代わりにその画像を見せる
let fileInput = $state<HTMLInputElement>();
let preview = $state<string | null>(null);
function pickFile() {
	if (preview) URL.revokeObjectURL(preview);
	const file = fileInput?.files?.[0];
	preview = file ? URL.createObjectURL(file) : null;
}
function clearFile() {
	if (fileInput) fileInput.value = "";
	pickFile();
}
</script>

{#snippet fields()}
	{#if error}<p class="rounded-sm bg-accent-soft px-4 py-2 text-sm text-accent-ink" role="alert">{error}</p>{/if}

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
			<div class="flex items-center gap-1"><span class="text-muted">@</span><input name="space" bind:value={v.space} class="input" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="curry_shop" /></div>
		</Field>
	</div>

	<details open={more} class="border-t border-line pt-4">
		<summary class="cursor-pointer text-sm text-muted hover:text-accent-ink">もっと書く（住所・説明・料金・公開範囲など）</summary>
		<div class="mt-6 space-y-6">
			<Field label="住所"><input name="locationAddress" value={values.locationAddress} class="input" /></Field>
			<Field label="場所の見せ方">
				<select name="locationVisibility" class="input">
					<option value="public" selected={values.locationVisibility === 'public'}>誰にでも見せる</option>
					<option value="attendees" selected={values.locationVisibility === 'attendees'}>住所は載せず、主催に聞いてもらう（自助会・オフ会向け）</option>
				</select>
			</Field>
			<Field label="オンラインの URL" hint="Zoom や Discord など。オンライン開催なら"><input name="onlineUrl" value={values.onlineUrl} class="input" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="https://" /></Field>

			<Field label="説明"><textarea name="description" rows="8" class="input">{values.description}</textarea></Field>

			<Field label="料金"><input name="feeText" value={values.feeText} class="input" placeholder="無料 / 500円 / 投げ銭" /></Field>
			<Field label="告知ページの URL" hint="X のポスト、こくちーず、自分のサイトなど"><input name="url" value={values.url} class="input" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="https://" /></Field>

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
	{@const flyer = { id: v.id, title: v.title || 'ひとこと', startsAt, endsAt, allDay: v.allDay, place, host }}
	<!-- 会のページと同じ 2 列。左のビラは打つそばから刷り上がり、保存後もこの見た目のまま -->
	<form method="POST" action="?/save" enctype="multipart/form-data" class="detail-cols">
		<input type="hidden" name="id" value={v.id} />
		<div class="detail-flyer">
			{#if preview}
				<div class="flyer-pin mx-auto mb-8 w-full max-w-[20rem] md:max-w-none"><img src={preview} alt="選んだフライヤー" /></div>
			{:else}
				<!-- スマホでは大きいビラを出さず、型の見本だけにして、打つ欄を最初の画面に入れる -->
				<div class="flyer-pin mx-auto mb-8 hidden w-full md:block">
					<Flyer {...flyer} look={chosen} />
				</div>
			{/if}
			<!-- 画像を選んでも型と差し色は送る（あとで自動のビラに戻したときに使う） -->
			<div hidden={!!preview}><FlyerPicker bind:look={chosen} {...flyer} /></div>
			<div class="mt-6">
				<div class="flex items-center gap-2">
					<input type="file" name="flyer" accept="image/jpeg,image/png,image/webp" bind:this={fileInput} onchange={pickFile} class="input min-w-0 flex-1 text-sm" />
					{#if preview}<button type="button" class="btn shrink-0 px-4 py-1.5 text-sm" onclick={clearFile}>やめる</button>{/if}
				</div>
			</div>
		</div>
		<div class="min-w-0 space-y-6">{@render fields()}</div>
	</form>
{:else}
	<form method="POST" action="?/save" class="space-y-6">{@render fields()}</form>
{/if}
