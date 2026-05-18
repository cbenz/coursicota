<script lang="ts">
	import "../app.css";
	import AppSidebar from "$lib/components/app-sidebar.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";

	let { data, children } = $props();
</script>

<div class="grain"></div>
<Sidebar.Provider>
	<AppSidebar authenticated={data.auth?.authenticated ?? false} />
	<!-- Cf https://github.com/huntabyte/shadcn-svelte/discussions/1436 and https://github.com/shadcn-ui/ui/discussions/5582 -->
	<Sidebar.Inset class="overflow-hidden">
		<header class="flex h-12 shrink-0 items-center gap-2 border-b px-4">
			<Sidebar.Trigger class="-ml-1" />
		</header>
		<div class="flex flex-1 flex-col gap-5 p-4 md:p-6">
			{@render children?.()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
