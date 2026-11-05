<script lang="ts">
import EventForm from '#lib/components/EventForm.svelte';
import type { PageProps } from './$types';

let { data, form }: PageProps = $props();
</script>

<svelte:head><title>まがりする | まがり</title></svelte:head>

<section class="mx-auto mt-4 max-w-2xl">
	<p class="label">まがりする</p>
	<h1 class="mt-2 mb-8 text-2xl">その日の主催者になる</h1>
	<EventForm values={form?.values ?? data.values} error={form?.error} />
</section>
