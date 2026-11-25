<script lang="ts">
let { title, hint }: { title: string; hint?: string } = $props();
</script>

<div class="empty">
	<p class="empty-title">{title}</p>
	{#if hint}<p class="text-sm text-muted">{hint}</p>{/if}
</div>
