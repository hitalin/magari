<script lang="ts">
import { onMount } from "svelte";
import {
	COLORS,
	encodeStrokes,
	MAX_POINTS,
	MAX_STROKES,
	markerHalf,
	ORIGIN_X,
	outline,
	parseStrokes,
	type Scribble,
	SIZES,
	type Stroke,
	sprayDrips,
	sprayHalf,
	type Tool,
	VISIBLE,
	WALL_H,
	WALL_W,
} from "#lib/graffiti.ts";

// 地面（アスファルト）の落書き。どのページでも同じ 1 枚の地面で、ページの中身はその上に載っている。
// 右下のチョークを持つと、画面のどこでも描ける。描いた線は少し置いてから勝手に残る（残すボタンは無い）。
// 線は中身の後ろ（z-index: -1 の canvas）に描く。canvas は画面の大きさだけで、スクロールのたびに見える所を描き直す。

// 道具ごとの太さ（px。太さ「中」のとき）
const WIDTH: Record<Tool, number> = {
	chalk: 3,
	marker: 10,
	paint: 18,
	spray: 15,
	eraser: 28,
};
const TOOLS: [Tool, string][] = [
	["chalk", "チョーク"],
	["marker", "マーカー"],
	["paint", "ペンキ"],
	["spray", "スプレー"],
	["eraser", "消しゴム"],
];
// 描き終えてから残すまでの間（続けて描いた線をまとめて送る）
const SAVE_AFTER_MS = 2500;
// スプレーを止めたままにすると、この間隔で垂れが伸びる（MAX_DWELL 回まで）
const DWELL_MS = 280;
const MAX_DWELL = 6;

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D | null = null;
let holding = $state(false);
let tool = $state<Tool>("chalk");
let color = $state(0);
let size = $state(1);
let dpr = 1;
let scribbles = $state.raw<Scribble[]>([]);
// まだ残していない線
let pending = $state.raw<Stroke[]>([]);
let notice = $state("");
// いま引いている線
let current: Stroke | null = null;
let frame = 0;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let saving = false;
let dwellTimer: ReturnType<typeof setTimeout> | undefined;
// 画面に置いている指（pointerId → 縦の位置）。2 本目が来たら描かずに地面を動かす
const fingers = new Map<number, number>();

const visible = $derived(
	scribbles.flatMap((s) => {
		const strokes = parseStrokes(s.d);
		if (!strokes) return [];
		const ys = strokes.flatMap((st) => st.points.map((p) => p[1]));
		return [
			{ id: s.id, strokes, top: Math.min(...ys), bottom: Math.max(...ys) },
		];
	}),
);

type Point = [number, number];
// 1 本の線を、塗る形の重なりにしたもの。width があれば線として引き、無ければ中を塗る
type Shape = { path: Path2D; alpha: number; width?: number };
// 残した線は変わらないので、形は 1 度だけ作る（スクロールのたびに全部描き直すため）
const shapes = new WeakMap<Stroke, Shape[]>();

// 点と点の中間を通る曲線でつなぎ、角を丸める
function curve(path: Path2D, points: Point[], closed: boolean) {
	const n = points.length;
	const mid = (a: Point, b: Point): Point => [
		(a[0] + b[0]) / 2,
		(a[1] + b[1]) / 2,
	];
	if (closed) {
		path.moveTo(...mid(points[n - 1], points[0]));
		for (let i = 0; i < n; i++)
			path.quadraticCurveTo(
				...points[i],
				...mid(points[i], points[(i + 1) % n]),
			);
		path.closePath();
		return;
	}
	path.moveTo(...points[0]);
	for (let i = 1; i < n - 1; i++)
		path.quadraticCurveTo(...points[i], ...mid(points[i], points[i + 1]));
	path.lineTo(...points[n - 1]);
}

function shape({ tool, size, points }: Stroke): Shape[] {
	const w = WIDTH[tool] * SIZES[size];
	const path = new Path2D();
	if (tool === "marker") {
		curve(path, outline(points, markerHalf(points, w)), true);
		return [{ path, alpha: 1 }];
	}
	if (tool !== "spray") {
		curve(path, points, false);
		return [{ path, alpha: tool === "chalk" ? 0.9 : 1, width: w }];
	}
	// スプレー: 芯の外に薄い霧を重ね、まわりに飛沫を散らし、止めていた所から垂らす
	const pts = points.filter(
		(p, i) => i === 0 || p[0] !== points[i - 1][0] || p[1] !== points[i - 1][1],
	);
	const half = sprayHalf(pts, w);
	const widened = (by: number) => {
		const mist = new Path2D();
		curve(
			mist,
			outline(
				pts,
				half.map((h) => h + w * by),
			),
			true,
		);
		return mist;
	};
	curve(path, outline(pts, half), true);
	for (const { x, y, length } of sprayDrips(points, w)) {
		const r = Math.max(1.2, w * 0.1);
		curve(
			path,
			outline(
				[
					[x, y],
					[x, y + length / 2],
					[x, y + length],
				],
				[r, r * 0.7, r * 1.15],
			),
			true,
		);
	}
	const specks = new Path2D();
	for (const [i, [x, y]] of pts.entries()) {
		// 同じ絵はいつも同じ所に飛沫が出る
		const rnd = (k: number) =>
			Math.abs(Math.sin(x * 12.9898 + y * 78.233 + k * 37.719) * 43758.5453) %
			1;
		const a = rnd(1) * Math.PI * 2;
		const d = half[i] + w * (0.2 + rnd(2) * 0.9);
		const sx = x + Math.cos(a) * d;
		const sy = y + Math.sin(a) * d;
		specks.moveTo(sx, sy);
		specks.arc(sx, sy, 0.5 + rnd(3) * 0.9, 0, Math.PI * 2);
	}
	return [
		{ path: widened(0.62), alpha: 0.05 },
		{ path: widened(0.42), alpha: 0.09 },
		{ path: widened(0.26), alpha: 0.14 },
		{ path: widened(0.12), alpha: 0.22 },
		{ path: specks, alpha: 0.6 },
		{ path, alpha: 0.95 },
	];
}

// チョークは粉なので、色を粒の模様にして引く（マーカーやペンキは地面の目を埋めるので、べた塗り）
const chalks = new Map<number, CanvasPattern | null>();
function chalk(c: CanvasRenderingContext2D, color: number) {
	let pattern = chalks.get(color);
	if (pattern === undefined) {
		const tile = document.createElement("canvas");
		tile.width = tile.height = 96;
		const t = tile.getContext("2d");
		if (t) {
			t.fillStyle = COLORS[color];
			for (let y = 0; y < 96; y++)
				for (let x = 0; x < 96; x++) {
					const r = Math.random();
					if (r < 0.45) continue;
					t.globalAlpha = r;
					t.fillRect(x, y, 1, 1);
				}
		}
		pattern = c.createPattern(tile, "repeat");
		chalks.set(color, pattern);
	}
	return pattern ?? COLORS[color];
}

// fade: 古さによる薄さ（1 がそのまま）。live: いま引いている線（点が増えるので、形を毎回作る）
function drawStroke(
	c: CanvasRenderingContext2D,
	stroke: Stroke,
	fade = 1,
	live = false,
) {
	let parts = live ? undefined : shapes.get(stroke);
	if (!parts) {
		parts = shape(stroke);
		if (!live) shapes.set(stroke, parts);
	}
	// 消しゴムは色を塗らず、それまでに描いた線を抜く（古さで薄くはしない）
	const erasing = stroke.tool === "eraser";
	c.globalCompositeOperation = erasing ? "destination-out" : "source-over";
	const style =
		stroke.tool === "chalk" ? chalk(c, stroke.color) : COLORS[stroke.color];
	c.strokeStyle = style;
	c.fillStyle = style;
	for (const { path, alpha, width } of parts) {
		c.globalAlpha = erasing ? 1 : alpha * fade;
		if (width) {
			c.lineWidth = width;
			c.stroke(path);
		} else c.fill(path);
	}
}

// 画面に見えている所を描き直す
function paint() {
	frame = 0;
	const w = canvas.clientWidth;
	const h = canvas.clientHeight;
	dpr = Math.min(devicePixelRatio, 2);
	if (canvas.width !== Math.round(w * dpr) || !ctx) {
		canvas.width = Math.round(w * dpr);
		canvas.height = Math.round(h * dpr);
		ctx = canvas.getContext("2d");
	}
	if (!ctx) return;
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	// 以後は地面の座標のまま描く（横は画面の中央が ORIGIN_X、縦はページの上端から）
	ctx.setTransform(dpr, 0, 0, dpr, dpr * (w / 2 - ORIGIN_X), -dpr * scrollY);
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	for (const [i, s] of visible.entries()) {
		if (s.bottom < scrollY - 20 || s.top > scrollY + h + 20) continue;
		// 新しい落書きが重なるほど、古いものは擦れて薄くなる
		const fade = Math.max(0.3, 1 - (0.7 * (visible.length - 1 - i)) / VISIBLE);
		for (const stroke of s.strokes) drawStroke(ctx, stroke, fade);
	}
	for (const stroke of pending) drawStroke(ctx, stroke);
	if (current) drawStroke(ctx, current, 1, true);
	// ざらつき（mask）も地面と一緒に流す。画面に貼り付いたままだと、スクロールで粒がちらつく
	canvas.style.maskPosition = `${Math.round(w / 2)}px ${-Math.round(scrollY)}px`;
}

function schedule() {
	if (!frame) frame = requestAnimationFrame(paint);
}

$effect(() => {
	visible;
	pending;
	schedule();
});

onMount(() => {
	// ページの表示は待たせない。落書きは後から浮かぶ
	fetch("/api/graffiti")
		.then((res) => (res.ok ? res.json() : []))
		.then((rows) => {
			scribbles = [...(rows as Scribble[]), ...scribbles];
		})
		.catch(() => {});
	addEventListener("scroll", schedule, { passive: true });
	addEventListener("resize", schedule);
	// 閉じる・離れる前に、残していない線を送る
	const leave = () => {
		if (document.visibilityState === "hidden") save(true);
	};
	document.addEventListener("visibilitychange", leave);
	return () => {
		removeEventListener("scroll", schedule);
		removeEventListener("resize", schedule);
		document.removeEventListener("visibilitychange", leave);
	};
});

function at(e: PointerEvent): [number, number] {
	const x = e.clientX - document.documentElement.clientWidth / 2 + ORIGIN_X;
	const y = e.clientY + scrollY;
	return [
		Math.min(WALL_W, Math.max(0, Math.round(x))),
		Math.min(WALL_H, Math.max(0, Math.round(y))),
	];
}

// スプレーを動かさずにいる間、同じ点を足していく（その数だけ垂れが伸びる）
function dwell() {
	clearTimeout(dwellTimer);
	if (current?.tool !== "spray") return;
	dwellTimer = setTimeout(() => {
		if (!current) return;
		const pts = current.points;
		const last = pts[pts.length - 1];
		const held = pts.findLastIndex((p) => p[0] !== last[0] || p[1] !== last[1]);
		if (pts.length - 1 - held > MAX_DWELL) return;
		pts.push([last[0], last[1]]);
		schedule();
		dwell();
	}, DWELL_MS);
}

function down(e: PointerEvent) {
	if (!ctx) return;
	(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	fingers.set(e.pointerId, e.clientY);
	// 2 本目の指: 描きかけの線は捨てて、地面を動かす
	if (fingers.size > 1) {
		clearTimeout(dwellTimer);
		current = null;
		schedule();
		return;
	}
	clearTimeout(saveTimer);
	notice = "";
	current = { tool, color, size, points: [at(e)] };
	dwell();
	schedule();
}

function move(e: PointerEvent) {
	if (fingers.size > 1) {
		const y = fingers.get(e.pointerId);
		if (y === undefined) return;
		fingers.set(e.pointerId, e.clientY);
		scrollBy({ top: (y - e.clientY) / fingers.size, behavior: "instant" });
		return;
	}
	if (!current || !ctx) return;
	const p = at(e);
	const last = current.points[current.points.length - 1];
	if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 3) return;
	// 1 本が長すぎたら、そこで切って次の線として続ける
	if (current.points.length >= MAX_POINTS / 2) {
		pending = [...pending, current];
		current = { ...current, points: [last] };
	}
	current.points.push(p);
	dwell();
	schedule();
}

function up(e: PointerEvent) {
	fingers.delete(e.pointerId);
	clearTimeout(dwellTimer);
	if (!current) return;
	pending = [...pending, current];
	current = null;
	clearTimeout(saveTimer);
	saveTimer = setTimeout(save, SAVE_AFTER_MS);
}

// 残していない線を、1 回に送れる量ずつ送る
async function save(leaving = false) {
	clearTimeout(saveTimer);
	if (saving || pending.length === 0) return;
	let count = 0;
	let points = 0;
	for (const s of pending) {
		if (count >= MAX_STROKES || points + s.points.length > MAX_POINTS) break;
		count++;
		points += s.points.length;
	}
	const d = encodeStrokes(pending.slice(0, count));
	saving = true;
	const res = await fetch("/api/graffiti", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ d }),
		// ページを離れても送り切る
		keepalive: leaving,
	}).catch(() => null);
	saving = false;
	if (res?.ok) {
		const { id } = (await res.json()) as { id: string };
		scribbles = [...scribbles, { id, d }];
		pending = pending.slice(count);
		if (pending.length > 0 && !current) save();
		return;
	}
	// 形が不正と言われた線は、送り直しても通らないので捨てる。ほかは少し待ってもう一度
	if (res?.status === 400) {
		pending = pending.slice(count);
		return;
	}
	if (res?.status === 429) notice = "描きすぎ。少し休むと、また残せます。";
	saveTimer = setTimeout(save, 15_000);
}

function toggle() {
	holding = !holding;
	notice = "";
	fingers.clear();
	if (!holding) save();
}
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && holding && toggle()} />

<canvas bind:this={canvas} class="ground" aria-hidden="true"></canvas>

{#if holding}
	<!-- チョークを持っている間だけ、画面全体で指やマウスを受ける（ヘッダーはこの上にあるので、持ったままページを移れる） -->
	<div class="catch" role="presentation" onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}></div>
{/if}

<div class="hand">
	{#if holding}
		<div class="tools" role="toolbar" aria-label="落書きの道具">
			<p class="w-full text-xs {notice ? 'text-accent-ink' : 'text-muted'}" role="status">{notice || 'どこにでも描けます。描いた線はそのまま残ります。'}{#if !notice}<span class="touch">指 2 本で地面を動かせます。</span>{/if}</p>
			{#each TOOLS as [t, label] (t)}
				<button type="button" class="chip {tool === t ? 'chip-tape' : 'chip-plain'}" aria-pressed={tool === t} onclick={() => (tool = t)}>{label}</button>
			{/each}
			<div class="colors" role="group" aria-label="色">
				{#each COLORS as c, i (c)}
					<button type="button" class:on={color === i} style="background: {c}" aria-pressed={color === i} aria-label="色 {i + 1}" onclick={() => (color = i)}></button>
				{/each}
			</div>
			<div class="sizes" role="group" aria-label="太さ">
				{#each ['細い', '中くらい', '太い'] as label, i (label)}
					<button type="button" class:on={size === i} aria-pressed={size === i} aria-label={label} title={label} onclick={() => (size = i)}><span style="width: {0.3 + i * 0.3}rem; height: {0.3 + i * 0.3}rem"></span></button>
				{/each}
			</div>
		</div>
	{/if}
	<button type="button" class="chalk" class:holding aria-pressed={holding} aria-label={holding ? 'チョークを置く' : '落書きする'} title={holding ? 'チョークを置く' : '落書きする'} onclick={toggle}>
		<span style={holding ? `background: ${COLORS[color]}` : undefined}></span>
	</button>
</div>

<style>
	/* body を重なりの基準にして、z-index: -1 の canvas が「body の地の上・中身の下」に入るようにする */
	:global(body) {
		isolation: isolate;
	}
	/* 線はアスファルトの粒にのった粉。ざらつきは描くたびに計算せず、SVG のノイズで全体を抜く */
	.ground {
		position: fixed;
		inset: 0;
		z-index: -1;
		width: 100%;
		height: 100%;
		pointer-events: none;
		mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='m'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' seed='11' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2 0 0 0 -0.1'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23m)'/%3E%3C/svg%3E");
		mask-size: 240px;
	}
	.catch {
		position: fixed;
		inset: 0;
		z-index: 45;
		cursor: crosshair;
		touch-action: none;
	}
	/* チョークは画面の右下に置いてある */
	.hand {
		position: fixed;
		z-index: 60;
		right: max(1rem, env(safe-area-inset-right));
		bottom: max(1rem, env(safe-area-inset-bottom));
		display: flex;
		align-items: flex-end;
		gap: 0.6rem;
		pointer-events: none;
	}
	.hand > * {
		pointer-events: auto;
	}
	.tools {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		max-width: min(20.5rem, calc(100vw - 5.5rem));
		padding: 0.6rem 0.8rem;
		border: 1px solid var(--color-line);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}
	.colors {
		display: flex;
		gap: 0.45rem;
		width: 100%;
	}
	.colors button {
		width: 1.4rem;
		height: 1.4rem;
		border-radius: 9999px;
		border: 2px solid var(--color-surface);
	}
	.colors button.on {
		outline: 2px solid var(--color-text);
	}
	.sizes {
		display: flex;
		gap: 0.45rem;
	}
	.sizes button {
		display: grid;
		place-items: center;
		width: 1.6rem;
		height: 1.6rem;
		border: 1px solid var(--color-line);
		border-radius: 9999px;
	}
	.sizes button.on {
		border-color: var(--color-text);
	}
	.sizes span {
		border-radius: 9999px;
		background: var(--color-text);
	}
	/* 指で触る画面でだけ出す案内 */
	.touch {
		display: none;
	}
	@media (pointer: coarse) {
		.touch {
			display: inline;
		}
	}
	.chalk {
		display: grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		border: 1px solid var(--color-line);
		border-radius: 9999px;
		background: var(--color-surface);
		transition:
			border-color 0.15s,
			transform 0.15s;
	}
	.chalk:hover,
	.chalk.holding {
		border-color: var(--color-accent-border);
	}
	/* 短い白墨。持つと立つ */
	.chalk span {
		width: 1.35rem;
		height: 0.42rem;
		border-radius: 2px;
		background: linear-gradient(#f4f1ea, #d3cfc6);
		transform: rotate(-35deg);
		transition: transform 0.15s;
	}
	.chalk.holding span {
		transform: rotate(-70deg);
	}
</style>
