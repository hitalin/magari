<script lang="ts">
import FloorPlan from "#lib/components/FloorPlan.svelte";
import { PLAN, parsePlan } from "#lib/floor-plan.ts";

// 間取りを記法で書く欄。書いたそばから、下に見取り図を出す
let { value }: { value: string } = $props();
// svelte-ignore state_referenced_locally -- 初期値だけ props から取り、以後は利用者の入力で変える
let text = $state(value);
const plan = $derived(parsePlan(text));
const EXAMPLE =
	"カウンター カウンター 厨房\nカウンター カウンター 個室\n入口 入口 個室";
</script>

<div>
	<label class="block">
		<span class="label">間取り</span>
		<textarea name="floorPlan" bind:value={text} rows="6" maxlength={PLAN.textMax} class="input mt-1 font-mono text-sm leading-relaxed" spellcheck="false" autocapitalize="off" placeholder={EXAMPLE}></textarea>
	</label>
	<p class="mt-1 text-xs text-dim">
		ハコの中を升目に見立てて、区画の名前を空白で区切って並べます。同じ名前の並んだ升が 1 つの区画になり、広い区画は名前を多く並べます。何も無い升は「.」。
		長い名前は記号で書いて、下に「A = カウンター」と名前を付けてもかまいません。
		間を開ける人が区画を選べ、同じ時間に別の区画で別の間を開けられます。区画の名前を変えても、開けてある間は前の名前のままです。
	</p>
	{#if !plan.ok}
		<p class="mt-3 rounded-sm bg-accent-soft px-4 py-2 text-sm text-accent-ink" role="status">{plan.error}</p>
	{:else if plan.rooms.length}
		<div class="mt-4"><FloorPlan rooms={plan.rooms} /></div>
	{:else}
		<button type="button" class="btn mt-3 text-sm" onclick={() => (text = EXAMPLE)}>例を入れてみる</button>
	{/if}
</div>
