<script lang="ts">
import logo from '#lib/assets/logo.svg';

let { title, hint }: { title: string; hint?: string } = $props();
</script>

<div class="empty">
	<img src={logo} alt="" />
	<p class="empty-title">{title}</p>
	{#if hint}<p class="text-sm text-muted">{hint}</p>{/if}
</div>
