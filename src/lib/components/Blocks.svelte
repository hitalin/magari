<script lang="ts">
import { parseBlocks } from "#lib/text.ts";

let { text }: { text: string | null | undefined } = $props();
const blocks = $derived(parseBlocks(text));
</script>

<div class="space-y-4 leading-[1.9]">
	{#each blocks as block, i (i)}
		{#if block.type === 'h2'}
			<h3 class="mt-8 border-l-4 border-accent pl-3 text-[1.25rem]">{block.text}</h3>
		{:else if block.type === 'ul'}
			<ul class="list-disc space-y-1 pl-6 text-text/90">
				{#each block.items as item, j (j)}<li>{item}</li>{/each}
			</ul>
		{:else}
			<p class="text-text/90">
				{#each block.lines as line, j (j)}{#if j > 0}<br />{/if}{line}{/each}
			</p>
		{/if}
	{/each}
</div>
