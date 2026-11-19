<script lang="ts">
import {
	FLYER_COLOR_LABEL,
	FLYER_COLORS,
	FLYER_VARIANT_LABEL,
	FLYER_VARIANTS,
	type FlyerLook,
	flyerStyle,
} from "#lib/flyer.ts";
import Flyer from "./Flyer.svelte";

// 自動のビラの型と差し色を選ぶ。型は、今の内容で刷った小さな見本から選ぶ（flyerVariant / flyerColor で送る）
let {
	look = $bindable(),
	...flyer
}: {
	look: FlyerLook;
	id: string;
	title: string;
	startsAt: string;
	endsAt: string | null;
	allDay: boolean;
	place?: string | null;
	host?: string | null;
} = $props();
</script>

<fieldset class="variants">
	<legend class="sr-only">ビラの型</legend>
	{#each FLYER_VARIANTS as variant (variant)}
		<label>
			<input type="radio" name="flyerVariant" value={variant} bind:group={look.variant} class="sr-only" />
			<span class="thumb"><Flyer {...flyer} look={{ variant, color: look.color }} /></span>
			<span class="name">{FLYER_VARIANT_LABEL[variant]}</span>
		</label>
	{/each}
</fieldset>
<fieldset class="colors">
	<legend class="sr-only">差し色</legend>
	{#each FLYER_COLORS as color (color)}
		<label title={FLYER_COLOR_LABEL[color]}>
			<input type="radio" name="flyerColor" value={color} bind:group={look.color} class="sr-only" />
			<span class="dot" style="background: {flyerStyle(flyer.id, { variant: look.variant, color }).spot}"></span>
			<span class="sr-only">{FLYER_COLOR_LABEL[color]}</span>
		</label>
	{/each}
</fieldset>

<style>
	.variants {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.75rem;
	}
	label {
		display: block;
		cursor: pointer;
	}
	.thumb {
		display: block;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.35);
		opacity: 0.8;
		transition: opacity 0.15s;
	}
	label:hover .thumb {
		opacity: 1;
	}
	.name {
		display: block;
		margin-top: 0.4rem;
		text-align: center;
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--color-muted);
		white-space: nowrap;
	}
	/* いま選んでいるものはテープの色で囲む */
	input:checked ~ .thumb {
		opacity: 1;
		outline: 2px solid var(--color-accent);
		outline-offset: 3px;
	}
	input:checked ~ .name {
		color: var(--color-accent-ink);
	}
	input:focus-visible ~ .thumb,
	input:focus-visible ~ .dot {
		outline: 2px solid var(--color-text);
		outline-offset: 3px;
	}
	.colors {
		display: flex;
		justify-content: center;
		gap: 0.9rem;
		margin-top: 1rem;
	}
	.dot {
		display: block;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		box-shadow: inset 0 0 0 1px rgb(241 239 233 / 0.25);
	}
	input:checked ~ .dot {
		outline: 2px solid var(--color-accent);
		outline-offset: 3px;
	}
</style>
