<script lang="ts">
import { labelSize, planBox, planOutline, type Room } from "#lib/floor-plan.ts";

let {
	rooms,
	highlight = null,
	onpick,
}: {
	rooms: Room[];
	// ガムテープを貼って見せる区画（会が開かれる所）
	highlight?: string | null;
	// 渡すと、区画を押して選べる（もう一度押すと外す）
	onpick?: (name: string | null) => void;
} = $props();

const box = $derived(planBox(rooms));
const outline = $derived(planOutline(rooms));
// 外枠の線の半分だけ外へ出す（図の左端を、上下の文字の左端に揃える）
const PAD = 0.04;
const pick = (name: string) => onpick?.(name === highlight ? null : name);

// 区画に貼るガムテープ。ロゴと同じく、両端を手でちぎったぎざぎざにして、少し傾ける
function tape(r: Room) {
	const w = r.w * 0.84;
	const h = Math.min(r.h * 0.7, Math.max(0.7, r.w * 0.5));
	const x0 = r.x + (r.w - w) / 2;
	const y0 = r.y + (r.h - h) / 2;
	const teeth = Math.max(2, Math.round(h / 0.22));
	const jag = Math.min(0.09, w * 0.05);
	const right: string[] = [];
	const left: string[] = [];
	for (let i = 0; i <= teeth; i++) {
		const y = y0 + (h * i) / teeth;
		const d = i % 2 ? jag : 0;
		right.push(`${x0 + w - d},${y}`);
		left.unshift(`${x0 + d},${y}`);
	}
	return {
		points: [...right, ...left].join(" "),
		// 上の縁の光の反射
		shine: `${x0 + jag},${y0} ${x0 + w - jag},${y0} ${x0 + w - jag},${y0 + h * 0.16} ${x0 + jag},${y0 + h * 0.16}`,
		// 区画ごとに決まった向きへ、少しだけ傾ける
		rotate: `rotate(${(r.x + r.y) % 2 ? 2.5 : -3} ${r.x + r.w / 2} ${r.y + r.h / 2})`,
	};
}
</script>

{#snippet shape(r: Room, on: boolean)}
	<rect x={r.x} y={r.y} width={r.w} height={r.h} class="wall" />
	{#if on}
		{@const t = tape(r)}
		<g transform={t.rotate} filter="url(#plan-shadow)">
			<polygon points={t.points} fill="url(#plan-tape)" />
			<polygon points={t.points} fill="url(#plan-weave)" />
			<polygon points={t.shine} fill="#fff" fill-opacity="0.12" />
		</g>
	{/if}
	<text x={r.x + r.w / 2} y={r.y + r.h / 2} font-size={labelSize(r)} class:on>{r.name}</text>
{/snippet}

<!-- ロゴ（◱）と同じ描き方の見取り図: クリーム色の外枠と、それより細い仕切り。借りる一角にガムテープを貼る -->
<svg
	viewBox="{box.x - PAD} {box.y - PAD} {box.w + PAD * 2} {box.h + PAD * 2}"
	class="plan"
	style="max-width: {(box.w + PAD * 2) * 3.2}rem"
	role={onpick ? 'group' : 'img'}
	aria-label="間取り: {rooms.map((r) => r.name).join('、')}"
>
	<defs>
		<linearGradient id="plan-tape" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0" stop-color="#d49a5a" />
			<stop offset="0.5" stop-color="#c4874a" />
			<stop offset="1" stop-color="#b87a3f" />
		</linearGradient>
		<pattern id="plan-weave" width="0.12" height="0.12" patternUnits="userSpaceOnUse">
			<path d="M0 0.06h0.12" stroke="#000" stroke-opacity="0.1" stroke-width="0.02" />
			<path d="M0.06 0v0.12" stroke="#fff" stroke-opacity="0.12" stroke-width="0.02" />
		</pattern>
		<filter id="plan-shadow" x="-20%" y="-20%" width="140%" height="150%">
			<feDropShadow dx="0" dy="0.06" stdDeviation="0.06" flood-color="#000" flood-opacity="0.5" />
		</filter>
	</defs>
	{#each rooms as r (r.name)}
		{@const on = r.name === highlight}
		{#if onpick}
			<g
				role="button"
				tabindex="0"
				aria-pressed={on}
				aria-label={r.name}
				class="pick"
				onclick={() => pick(r.name)}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						pick(r.name);
					}
				}}
			>
				{@render shape(r, on)}
			</g>
		{:else}
			{@render shape(r, on)}
		{/if}
	{/each}
	<path d={outline} class="frame" />
</svg>

<style>
	.plan {
		display: block;
		width: 100%;
		/* 傾けたテープと影が、端で切れないように */
		overflow: visible;
	}
	/* 仕切り。ロゴの外枠と仕切りの太さの比（40:28）に合わせる */
	.wall {
		fill: transparent;
		stroke: #f1efe9;
		stroke-width: 0.05;
		stroke-linejoin: round;
	}
	.frame {
		fill: none;
		stroke: #f1efe9;
		stroke-width: 0.08;
		stroke-linecap: round;
		pointer-events: none;
	}
	text {
		fill: #f1efe9;
		font-weight: 700;
		text-anchor: middle;
		dominant-baseline: central;
		pointer-events: none;
	}
	/* テープの上の字は、サイトのテープ（.tape）と同じ濃い茶 */
	text.on {
		fill: #1b1510;
	}
	.pick {
		cursor: pointer;
		outline: none;
	}
	.pick:hover .wall,
	.pick:focus-visible .wall {
		fill: rgb(241 239 233 / 0.12);
	}
</style>
