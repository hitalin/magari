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
// 線は中身の後ろ（z-index: -1 の canvas）に描く。canvas は画面とその上下ぶんの大きさでページの中に置き、
// スクロールで端が近づいたら置き直す（スクロールのたびに描き直すと、ブラウザの流れに 1 コマ遅れて絵が揺れる）。

// 道具ごとの太さ（px。太さ「中」のとき）
const WIDTH: Record<Tool, number> = {
	chalk: 3,
	marker: 10,
	paint: 18,
	spray: 15,
	eraser: 28,
};
// 道具箱に並べる順。3 つ目は絵（24px の線画）
const TOOLS: [Tool, string, string][] = [
	["chalk", "チョーク", "M5 19h3L19 8l-3-3L5 16z"],
	["marker", "マーカー", "M4 20h5l2-2-5-5-2 2zM8 11l7-7 5 5-7 7"],
	["paint", "ペンキ", "M4 4h13v5H4zM17 6.5h3V12h-8v3M10.5 15h3v6h-3z"],
	["spray", "スプレー", "M9 10h7v11H9zM11 10V7h3v3M5 4h.01M5 8h.01M7.5 6h.01"],
	["eraser", "消しゴム", "M8 19l-4-4L14 5l6 6-8 8zM9 10l6 6M8 19h12"],
];
// canvas は画面より上下に PAD 倍ずつ広く描いて、ページの中に置く（スクロールはブラウザが滑らかに流す）
const PAD = 0.5;
const MAX_PIXELS = 12_000_000;
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
// いま canvas を置いている所（ページの上端から）
let base = 0;
let scribbles = $state.raw<Scribble[]>([]);
// まだ残していない線
let pending = $state.raw<Stroke[]>([]);
let notice = $state("");
// マウスの位置に、いまの太さの輪を出す（お絵描きアプリの筆先）
let tip = $state<[number, number] | null>(null);
const tipSize = $derived(Math.max(WIDTH[tool] * SIZES[size], 6));
const toolLabel = $derived(TOOLS.find(([t]) => t === tool)?.[1]);
// いま引いている線
let current: Stroke | null = null;
let frame = 0;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let saving = false;
let dwellTimer: ReturnType<typeof setTimeout> | undefined;
// ほかの人がいま描いている線（送り主と線の番号 → 線）。WebSocket で届くそばから足す。
// 残された線は、次に取り直したとき scribbles として届くので、ここはそれまでの仮置き
const remote = new Map<string, Stroke>();
const MAX_REMOTE = 400;
let live: WebSocket | undefined;
let liveTimer: ReturnType<typeof setInterval> | undefined;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let retryAfter = 2000;
// いま引いている線の番号と、もう送った点の数
let strokeNo = 0;
let sent = 0;
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

// 画面とその上下（画面の高さの PAD 倍ずつ）を描き直す
function paint() {
	frame = 0;
	const w = canvas.clientWidth;
	const vh = innerHeight;
	const h = Math.round(vh * (1 + 2 * PAD));
	base = Math.max(0, Math.round(scrollY - vh * PAD));
	// 大きい画面で canvas が重くなりすぎないよう、画素の数に上限を置く
	dpr = Math.min(devicePixelRatio, 2, Math.sqrt(MAX_PIXELS / (w * h)));
	// 高さだけ変わったとき（スマホでアドレスバーが引っ込む）も作り直す。古い高さのままだと、絵が縦に引き伸ばされる
	if (
		canvas.width !== Math.round(w * dpr) ||
		canvas.height !== Math.round(h * dpr) ||
		!ctx
	) {
		canvas.width = Math.round(w * dpr);
		canvas.height = Math.round(h * dpr);
		canvas.style.height = `${h}px`;
		ctx = canvas.getContext("2d");
	}
	if (!ctx) return;
	canvas.style.top = `${base}px`;
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	// 以後は地面の座標のまま描く（横は画面の中央が ORIGIN_X、縦はページの上端から）
	ctx.setTransform(dpr, 0, 0, dpr, dpr * (w / 2 - ORIGIN_X), -dpr * base);
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	for (const [i, s] of visible.entries()) {
		if (s.bottom < base - 20 || s.top > base + h + 20) continue;
		// 新しい落書きが重なるほど、古いものは擦れて薄くなる
		const fade = Math.max(0.3, 1 - (0.7 * (visible.length - 1 - i)) / VISIBLE);
		for (const stroke of s.strokes) drawStroke(ctx, stroke, fade);
	}
	for (const stroke of remote.values()) drawStroke(ctx, stroke);
	for (const stroke of pending) drawStroke(ctx, stroke);
	if (current) drawStroke(ctx, current, 1, true);
	// ざらつき（mask）は地面に貼り付ける（canvas を置き直しても粒が動かないように）
	canvas.style.maskPosition = `${Math.round(w / 2)}px ${-(base % 240)}px`;
}

// スクロールでは描き直さない。canvas はページと一緒に流れるので、描いてある範囲の端が近づいたときだけ置き直す
function scrolled() {
	const edge = innerHeight * PAD * 0.4;
	if (
		(base > 0 && scrollY < base + edge) ||
		scrollY + innerHeight > base + canvas.clientHeight - edge
	)
		schedule();
}

function schedule() {
	if (!frame) frame = requestAnimationFrame(paint);
}

$effect(() => {
	visible;
	pending;
	schedule();
});

function load() {
	fetch("/api/graffiti")
		.then((res) => (res.ok ? res.json() : scribbles))
		.then((rows) => {
			scribbles = rows as Scribble[];
		})
		.catch(() => {});
}

// ほかの人が描いている線を受ける。つながらない環境（vite dev には部屋が無い）では、何もしない
function connect() {
	clearTimeout(retryTimer);
	if (live || document.visibilityState === "hidden") return;
	const ws = new WebSocket(
		`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/graffiti/live`,
	);
	live = ws;
	let opened = false;
	ws.onopen = () => {
		opened = true;
		retryAfter = 2000;
	};
	ws.onmessage = (e) => {
		const data = String(e.data);
		const at = data.indexOf(" ");
		const key = data.slice(0, at);
		const part = parseStrokes(data.slice(at + 1))?.[0];
		if (!part) return;
		const stroke = remote.get(key);
		if (stroke) {
			stroke.points.push(...part.points);
			shapes.delete(stroke);
		} else {
			remote.set(key, part);
			if (remote.size > MAX_REMOTE)
				remote.delete(remote.keys().next().value as string);
		}
		schedule();
	};
	ws.onclose = () => {
		if (live !== ws) return;
		live = undefined;
		// 一度もつながらなかったら、部屋が無い。つながっていたのが切れたなら、間を空けてつなぎ直す
		if (!opened) return;
		retryTimer = setTimeout(connect, retryAfter);
		retryAfter = Math.min(retryAfter * 2, 60_000);
	};
}

// いま引いている線の、まだ送っていない点を送る
function send() {
	if (!current || live?.readyState !== WebSocket.OPEN) return;
	const d = encodeStrokes([{ ...current, points: current.points.slice(sent) }]);
	if (!d) return;
	sent = current.points.length;
	live.send(`${strokeNo} ${d}`);
}

onMount(() => {
	// ページの表示は待たせない。落書きは後から浮かぶ
	load();
	connect();
	addEventListener("scroll", scrolled, { passive: true });
	addEventListener("resize", schedule);
	const seen = () => {
		if (document.visibilityState === "hidden") {
			// 閉じる・離れる前に、残していない線を送る。見ていない間はつながない
			save(true);
			clearTimeout(retryTimer);
			live?.close();
			live = undefined;
			return;
		}
		// 戻ってきたら、見ていなかった間のぶんを取り直す
		remote.clear();
		load();
		connect();
	};
	document.addEventListener("visibilitychange", seen);
	return () => {
		removeEventListener("scroll", scrolled);
		removeEventListener("resize", schedule);
		document.removeEventListener("visibilitychange", seen);
		clearTimeout(retryTimer);
		live?.close();
		live = undefined;
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
		clearInterval(liveTimer);
		current = null;
		schedule();
		return;
	}
	clearTimeout(saveTimer);
	notice = "";
	current = { tool, color, size, points: [at(e)] };
	strokeNo++;
	sent = 0;
	clearInterval(liveTimer);
	liveTimer = setInterval(send, 90);
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
		send();
		pending = [...pending, current];
		current = { ...current, points: [last] };
		strokeNo++;
		sent = 0;
	}
	current.points.push(p);
	dwell();
	schedule();
}

function up(e: PointerEvent) {
	fingers.delete(e.pointerId);
	clearTimeout(dwellTimer);
	clearInterval(liveTimer);
	if (!current) return;
	send();
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

<div class="ground" aria-hidden="true"><canvas bind:this={canvas}></canvas></div>

{#if holding}
	<!-- チョークを持っている間だけ、画面全体で指やマウスを受ける（ヘッダーはこの上にあるので、持ったままページを移れる） -->
	<div
		class="catch"
		role="presentation"
		onpointerdown={down}
		onpointermove={(e) => {
			tip = e.pointerType === 'mouse' ? [e.clientX, e.clientY] : null;
			move(e);
		}}
		onpointerleave={() => (tip = null)}
		onpointerup={up}
		onpointercancel={up}
	></div>
	{#if tip}
		<span class="tip" style="left: {tip[0]}px; top: {tip[1]}px; width: {tipSize}px; height: {tipSize}px; border-color: {tool === 'eraser' ? 'var(--color-text)' : COLORS[color]}"></span>
	{/if}
{/if}

<div class="hand">
	{#if holding}
		<!-- 道具箱。上から道具・色・太さ、いちばん下に一言（お絵描きアプリの並び） -->
		<div class="tools" role="toolbar" aria-label="落書きの道具">
			<div class="tool-row" role="group" aria-label="道具">
				{#each TOOLS as [t, label, icon] (t)}
					<button type="button" class:on={tool === t} aria-pressed={tool === t} aria-label={label} title={label} onclick={() => (tool = t)}>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={icon} /></svg>
					</button>
				{/each}
			</div>
			<div class="color-row" class:off={tool === 'eraser'}>
				<span class="now" style="background: {COLORS[color]}" aria-hidden="true"></span>
				<div class="colors" role="group" aria-label="色">
					{#each COLORS as c, i (c)}
						<button type="button" class:on={color === i} style="background: {c}" aria-pressed={color === i} aria-label="色 {i + 1}" onclick={() => (color = i)}></button>
					{/each}
				</div>
			</div>
			<div class="sizes" role="group" aria-label="太さ">
				{#each ['細い', '中くらい', '太い'] as label, i (label)}
					<button type="button" class:on={size === i} aria-pressed={size === i} aria-label={label} title={label} onclick={() => (size = i)}>
						<span style="height: {3 + i * 5}px; background: {tool === 'eraser' ? 'var(--color-dim)' : COLORS[color]}"></span>
					</button>
				{/each}
			</div>
			<p class="status {notice ? 'text-accent-ink' : 'text-muted'}" role="status">{notice || `${toolLabel}。描いた線はそのまま残ります。`}{#if !notice}<span class="touch">指 2 本で地面を動かせます。</span>{/if}</p>
		</div>
	{/if}
	<button type="button" class="chalk" class:holding aria-pressed={holding} aria-label={holding ? 'チョークを置く' : '落書きする'} title={holding ? 'チョークを置く' : '落書きする'} onclick={toggle}>
		<span style={holding ? `background: ${COLORS[color]}` : undefined}></span>
	</button>
</div>

<style>
	/* body を重なりの基準にして、z-index: -1 の地面が「body の地の上・中身の下」に入るようにする。
	   地面はページ全体に敷く（position: relative の body いっぱい）。はみ出した canvas でページが伸びないよう切る */
	:global(body) {
		position: relative;
		isolation: isolate;
	}
	.ground {
		position: absolute;
		inset: 0;
		z-index: -1;
		overflow: hidden;
		pointer-events: none;
	}
	/* 地面の目（ざらつき）は描くたびに計算せず、SVG のノイズで全体を薄く抜く */
	.ground canvas {
		position: absolute;
		left: 0;
		width: 100%;
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
	/* 筆先の輪。いまの太さと色 */
	.tip {
		position: fixed;
		z-index: 46;
		border: 1.5px solid;
		border-radius: 9999px;
		box-shadow: 0 0 0 1px rgb(0 0 0 / 0.5);
		transform: translate(-50%, -50%);
		pointer-events: none;
	}
	.tools {
		display: grid;
		width: min(15rem, calc(100vw - 5.5rem));
		border: 1px solid var(--color-line);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}
	.tools > * {
		padding: 0.5rem 0.6rem;
	}
	.tools > * + * {
		border-top: 1px solid var(--color-line);
	}
	.tool-row {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 0.25rem;
	}
	.tool-row button {
		display: grid;
		place-items: center;
		aspect-ratio: 1;
		border-radius: 4px;
		color: var(--color-muted);
	}
	.tool-row button:hover {
		background: var(--color-surface-2);
		color: var(--color-text);
	}
	.tool-row button.on {
		background: var(--color-accent);
		color: #1a1206;
	}
	.tool-row svg {
		width: 1.35rem;
		height: 1.35rem;
	}
	.color-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.color-row.off {
		opacity: 0.35;
	}
	/* いまの色 */
	.now {
		flex: none;
		width: 2.6rem;
		height: 2.6rem;
		border: 2px solid var(--color-text);
		border-radius: 4px;
	}
	.colors {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.25rem;
		flex: 1;
	}
	.colors button {
		height: 1.2rem;
		border-radius: 2px;
	}
	.colors button.on {
		outline: 2px solid var(--color-text);
		outline-offset: 1px;
	}
	.sizes {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.25rem;
	}
	.sizes button {
		display: grid;
		align-items: center;
		height: 1.9rem;
		padding-inline: 0.5rem;
		border-radius: 4px;
	}
	.sizes button:hover {
		background: var(--color-surface-2);
	}
	.sizes button.on {
		background: var(--color-surface-2);
		outline: 1px solid var(--color-text);
	}
	.sizes span {
		border-radius: 9999px;
	}
	.status {
		font-size: 0.7rem;
		line-height: 1.5;
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
