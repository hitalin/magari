<script lang="ts">
import type { Snippet } from "svelte";

let {
	label,
	hint,
	children,
}: { label: string; hint?: string; children: Snippet } = $props();
</script>

<label class="block">
	<span class="label">{label}</span>
	<div class="mt-1">{@render children()}</div>
	{#if hint}<p class="mt-1 text-xs text-dim">{hint}</p>{/if}
</label>
