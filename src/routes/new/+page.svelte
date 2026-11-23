<script lang="ts">
import EventForm from "#lib/components/EventForm.svelte";
import type { PageProps } from "./$types";

let { data, form }: PageProps = $props();
</script>

<svelte:head><title>まがりする | ◱</title></svelte:head>

<section class="mt-4">
	<p class="label">まがりする</p>
	<h1 class="mt-2 mb-8 text-2xl">とりあえず開ける</h1>
	<EventForm values={form?.values ?? data.values} error={form?.error} flyerId={data.id} look={form?.look ?? data.look} repeat={form?.repeat ?? null} repeatUntil={form?.repeatUntil ?? ''} host={data.host} rooms={data.rooms} />
</section>
