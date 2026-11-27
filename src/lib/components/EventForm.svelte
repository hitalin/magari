<script lang="ts">
import Field from "#lib/components/Field.svelte";
import FloorPlan from "#lib/components/FloorPlan.svelte";
import Flyer from "#lib/components/Flyer.svelte";
import FlyerPicker from "#lib/components/FlyerPicker.svelte";
import { dayKey } from "#lib/date.ts";
import type { EventFormValues } from "#lib/event-form.ts";
import type { Room } from "#lib/floor-plan.ts";
import { type FlyerLook, flyerStyle } from "#lib/flyer.ts";
import { REPEATS, type Repeat, repeatRule, ruleLabel } from "#lib/repeat.ts";

let {
	values,
	error,
	submitLabel = "開ける",
	flyerId,
	look = null,
	host = null,
	repeat = null,
	repeatUntil = "",
	repeatable = true,
	series = null,
	rooms = [],
	spaces = null,
}: {
	values: EventFormValues;
	error?: string;
	submitLabel?: string;
	// 新しく開けるときだけ渡す。会の ID を先に決め、打った内容でビラをその場で刷って左に出す
	flyerId?: string;
	// ビラの型と差し色の初期値（複製元、送り直し）。無ければ ID から決まる組を最初に出す
	look?: FlyerLook | null;
	host?: string | null;
	// 繰り返しと、その終わりの日の初期値（送り直し）
	repeat?: Repeat | null;
	repeatUntil?: string;
	// 繰り返しを選べるか。もう繰り返しの中の回と、中止した間では選べない
	repeatable?: boolean;
	// 繰り返しの中の回を直すとき、その決まりの言い方（「毎週火曜」）。この先の回もまとめて直すかを聞く
	series?: string | null;
	// はじめに入っているハコの間取り（区画の候補）。ハコを書き換えたあとは、保存時に照らす
	rooms?: Room[];
	// 作るときだけ渡す、管理しているハコの handle。ここを「ハコ」に書くと、ほかの人の会として載せられる。
	// 直すときは null（ほかの人の会かどうかは、作ったときのまま）
	spaces?: string[] | null;
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
	url: values.url,
});
// svelte-ignore state_referenced_locally -- 同上
let others = $state(values.postedBySpace);
// svelte-ignore state_referenced_locally -- 同上
let visibility = $state(values.visibility);
// ほかの人の会として載せるか。作るときは、管理しているハコを書いて印を付けたとき
const canChoose = $derived(
	!!spaces?.includes(v.space.replace(/^@/, "").toLowerCase()),
);
const posting = $derived(
	spaces === null ? values.postedBySpace : canChoose && others,
);
// ほかの人の会は、最初はハコのページにだけ出す（当事者会などを、本人の知らない所へ広げない）
function pickOthers(on: boolean) {
	others = on;
	visibility = on ? "space" : "public";
}
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
// 繰り返しの言い方は選んだ日で変わる（毎週火曜、毎月 第2火曜）
const repeats = $derived.by(() => {
	const day = new Date(`${v.date || dayKey(new Date())}T12:00:00+09:00`);
	if (Number.isNaN(day.getTime())) return [];
	return REPEATS.map((kind) => ({
		kind,
		label: ruleLabel(repeatRule(kind, day), day),
	}));
});
// svelte-ignore state_referenced_locally -- 同上
let room = $state(values.room);
// 見取り図は、開いたときに入っていたハコのもの。ハコを書き換えたら図は出さず、名前を打ってもらう（保存時に照らす）
const planShown = $derived(rooms.length > 0 && v.space === values.space);
const stale = $derived(
	!!values.room && !rooms.some((r) => r.name === values.room),
);
const roomUp = $derived(rooms.length > 0 || !!values.room);
const place = $derived(
	(!posting && v.locationName) || (v.space ? `@${v.space}` : null),
);

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

{#snippet roomField()}
	{#if planShown}
		<!-- 見取り図の上で、どこで開けるかを選ぶ。いまの間取りに無い区画（ハコが直す前のもの）は、そのまま持っておける -->
		<div>
			<p class="label">区画</p>
			<div class="mt-1"><FloorPlan {rooms} highlight={room} onpick={(name) => (room = name ?? '')} /></div>
			<select name="room" bind:value={room} class="input mt-2" aria-label="区画">
				<option value="">決めない</option>
				{#each rooms as r (r.name)}<option value={r.name}>{r.name}</option>{/each}
				{#if stale}<option value={values.room}>{values.room}（前の間取り）</option>{/if}
			</select>
			<p class="mt-1 text-xs text-dim">{stale && room === values.room ? 'ハコのいまの間取りに無い名前です。このままでも保存できます' : '見取り図を押すか、ここから選ぶ。ハコのどこで開けるか'}</p>
		</div>
	{:else}
		<Field label="区画" hint="ハコが間取りを分けているとき、その中のどこで開けるか。カウンター、2階など">
			<input name="room" bind:value={room} maxlength="30" class="input" />
		</Field>
	{/if}
{/snippet}

{#snippet urlField()}
	{#if posting}
		<Field label="元の告知の URL" hint="主催の X のポストやサイトなど。載せられるのは、もう告知が出ている会だけです">
			<input name="url" bind:value={v.url} required class="input" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="https://" />
		</Field>
	{:else}
		<Field label="告知ページの URL" hint="X のポスト、こくちーず、自分のサイトなど"><input name="url" bind:value={v.url} class="input" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="https://" /></Field>
	{/if}
{/snippet}

{#snippet visibilityField()}
	<div class="grid gap-4 sm:grid-cols-2">
		<Field label="誰に見せるか" hint={visibility === 'space' ? '一覧・カレンダー・壁には出さず、ハコのページと iCal にだけ載せる' : undefined}>
			<select name="visibility" bind:value={visibility} class="input">
				<option value="public">公開（一覧に出る）</option>
				<option value="space">ハコのページだけ</option>
				<option value="unlisted">URL を知っている人だけ</option>
			</select>
		</Field>
	</div>
{/snippet}

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

	{#if repeatable}
		<div class="grid gap-4 sm:grid-cols-2">
			<Field label="繰り返し" hint="選ぶと、先の回もまとめて開ける。回ごとに直したり中止にしたりできる">
				<select name="repeat" class="input">
					<option value="">この日だけ</option>
					{#each repeats as r (r.kind)}<option value={r.kind} selected={repeat === r.kind}>{r.label}</option>{/each}
				</select>
			</Field>
			<Field label="いつまで" hint="繰り返しの終わりの日。空欄なら、やめるまで続く">
				<input type="date" name="repeatUntil" value={repeatUntil} class="input" />
			</Field>
		</div>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2">
		{#if !posting}<Field label="場所" hint="店名、公園、誰かの家など。決まっていなければ空欄で"><input name="locationName" bind:value={v.locationName} class="input" /></Field>{/if}
		<Field label="ハコ" hint="まがりに登録された場なら @ID。その場のページにも載る">
			<!-- ほかの人の会は、載せたハコから移さない -->
			<div class="flex items-center gap-1"><span class="text-muted">@</span><input name="space" bind:value={v.space} readonly={posting && spaces === null} class="input" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="curry_shop" /></div>
		</Field>
	</div>
	{#if canChoose}
		<div>
			<label class="flex items-start gap-2 text-sm"><input type="checkbox" name="postedBySpace" checked={others} onchange={(e) => pickOthers(e.currentTarget.checked)} class="mt-1 accent-accent" /><span>ほかの人の会として載せる（主催は自分ではない）</span></label>
			{#if others}<p class="mt-2 text-xs leading-relaxed text-dim">主催を空けて、@{v.space.replace(/^@/, '')} が載せた会として出します。載せるのは題・日時・区画と元の告知へのリンクだけで、説明やフライヤーの画像は載せません。最初は「ハコのページだけ」にしてあります。主催の方が自分で載せたら、こちらは消してください。</p>{/if}
		</div>
	{:else if posting}
		<p class="text-xs leading-relaxed text-dim">ハコが載せた、ほかの人の会です。載せるのは題・日時・区画と元の告知へのリンクだけです。主催の方が自分で載せたら、こちらは消してください。</p>
	{/if}
	<!-- 区画は、ハコが間取りを分けているときだけ要る。候補が分かっていれば上に、無ければ「もっと書く」の中に置く -->
	{#if roomUp || posting}{@render roomField()}{/if}

	{#if posting}
		{@render urlField()}
		{@render visibilityField()}
	{:else}
	<details open={more} class="border-t border-line pt-4">
		<summary class="cursor-pointer text-sm text-muted hover:text-accent-ink">もっと書く（住所・説明・料金・公開範囲など）</summary>
		<div class="mt-6 space-y-6">
			{#if !roomUp}{@render roomField()}{/if}
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
			{@render urlField()}

			{@render visibilityField()}
		</div>
	</details>
	{/if}

	{#if series}
		<div class="border-t border-line pt-4">
			<label class="flex items-center gap-2 text-sm"><input type="checkbox" name="following" class="accent-accent" /> この先の回もまとめて直す（{series}）</label>
			<p class="mt-2 text-xs text-dim">印を付けなければ、この回だけを直して、繰り返しから外します。日付を変えられるのは、この回だけを直すときです。</p>
		</div>
	{/if}

	<div class="flex flex-wrap gap-3 pt-2">
		<button type="submit" name="status" value="published" class="btn btn-primary">{posting && spaces !== null ? '載せる' : submitLabel}</button>
		<button type="submit" name="status" value="draft" class="btn">下書きで保存</button>
	</div>
	<p class="text-xs text-dim">載せる内容（題・説明・画像）は、自分に権利があるか、載せてよいものだけにしてください。<a href="/terms" class="underline underline-offset-2 hover:text-accent-ink">利用規約</a></p>
{/snippet}

{#if flyerId}
	{@const flyer = { id: v.id, title: v.title || 'ひとこと', startsAt, endsAt, allDay: v.allDay, place, host: posting ? null : host }}
	<!-- 会のページと同じ 2 列。左のビラは打つそばから刷り上がり、保存後もこの見た目のまま -->
	<form method="POST" action="?/save" enctype="multipart/form-data" class="detail-cols">
		<input type="hidden" name="id" value={v.id} />
		<div class="detail-flyer">
			{#if preview && !posting}
				<div class="flyer-pin mx-auto mb-8 w-full max-w-[20rem] md:max-w-none"><img src={preview} alt="選んだフライヤー" /></div>
			{:else}
				<!-- スマホでは大きいビラを出さず、型の見本だけにして、打つ欄を最初の画面に入れる -->
				<div class="flyer-pin mx-auto mb-8 hidden w-full md:block">
					<Flyer {...flyer} look={chosen} />
				</div>
			{/if}
			<!-- 画像を選んでも型と差し色は送る（あとで自動のビラに戻したときに使う） -->
			<div hidden={!!preview && !posting}><FlyerPicker bind:look={chosen} {...flyer} /></div>
			<!-- ほかの人の会は、主催の画像を載せないので自動のビラだけ。選んだ画像は送らずに持っておく -->
			<div class="mt-6" hidden={posting}>
				<div class="flex items-center gap-2">
					<input type="file" name="flyer" accept="image/jpeg,image/png,image/webp" bind:this={fileInput} onchange={pickFile} disabled={posting} class="input min-w-0 flex-1 text-sm" />
					{#if preview}<button type="button" class="btn shrink-0 px-4 py-1.5 text-sm" onclick={clearFile}>やめる</button>{/if}
				</div>
			</div>
		</div>
		<div class="min-w-0 space-y-6">{@render fields()}</div>
	</form>
{:else}
	<form method="POST" action="?/save" class="space-y-6">{@render fields()}</form>
{/if}
