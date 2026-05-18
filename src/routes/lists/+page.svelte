<script lang="ts">
	import type { ColumnDef, SortingState } from "@tanstack/table-core";
	import { getCoreRowModel, getSortedRowModel } from "@tanstack/table-core";
	import SortableHeaderButton from "$lib/components/SortableHeaderButton.svelte";
	import {
		Alert,
		AlertDescription,
		AlertTitle,
	} from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import * as Field from "$lib/components/ui/field";
	import {
		createSvelteTable,
		FlexRender,
		renderComponent,
		renderSnippet,
	} from "$lib/components/ui/data-table";
	import { Input } from "$lib/components/ui/input";
	import * as Table from "$lib/components/ui/table";
	import { createRawSnippet } from "svelte";

	let { data, form } = $props();
	let sorting = $state<SortingState>([]);

	const columns: ColumnDef<(typeof data.lists)[0]>[] = [
		{
			accessorKey: "id",
			header: ({ column }) =>
				renderComponent(SortableHeaderButton, {
					label: "List ID",
					onclick: column.getToggleSortingHandler(),
					sorted: column.getIsSorted(),
				}),
			cell: ({ row }) => {
				const idSnippet = createRawSnippet(() => ({
					render: () =>
						`<a href="/lists/${row.original.id}" class="font-medium text-primary underline-offset-4 hover:underline">${row.original.id}</a>`,
				}));
				return renderSnippet(idSnippet);
			},
		},
		{
			accessorKey: "name",
			header: ({ column }) =>
				renderComponent(SortableHeaderButton, {
					label: "Name",
					onclick: column.getToggleSortingHandler(),
					sorted: column.getIsSorted(),
				}),
			cell: ({ row }) => {
				const nameSnippet = createRawSnippet(() => ({
					render: () =>
						`<a href="/lists/${row.original.id}" class="font-medium underline-offset-4 hover:underline">${row.original.name}</a>`,
				}));
				return renderSnippet(nameSnippet);
			},
		},
		{
			id: "items",
			accessorKey: "itemCount",
			sortingFn: "basic",
			header: ({ column }) =>
				renderComponent(SortableHeaderButton, {
					label: "Items",
					onclick: column.getToggleSortingHandler(),
					sorted: column.getIsSorted(),
				}),
			cell: ({ row }) => {
				const itemsSnippet = createRawSnippet(() => ({
					render: () => `<span>${row.original.itemCount}</span>`,
				}));
				return renderSnippet(itemsSnippet);
			},
		},
		{
			accessorKey: "updatedAt",
			header: ({ column }) =>
				renderComponent(SortableHeaderButton, {
					label: "Updated",
					onclick: column.getToggleSortingHandler(),
					sorted: column.getIsSorted(),
				}),
			cell: ({ row }) => {
				const updatedSnippet = createRawSnippet(() => ({
					render: () => `<span>${row.original.updatedAt.slice(0, 10)}</span>`,
				}));
				return renderSnippet(updatedSnippet);
			},
		},
		{
			id: "actions",
			enableSorting: false,
			header: "Actions",
			cell: ({ row }) => {
				const actionSnippet = createRawSnippet(() => ({
					render: () =>
						`<div class="flex items-center gap-2"><a href="/lists/${row.original.id}" class="inline-flex h-8 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent">Open</a><form method="POST" action="?/delete" onsubmit="return confirm('Delete this list? This action cannot be undone.')"><input type="hidden" name="listId" value="${row.original.id}" /><button type="submit" class="inline-flex h-8 items-center justify-center rounded-md border border-destructive/40 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10">Delete</button></form></div>`,
				}));
				return renderSnippet(actionSnippet);
			},
		},
	];

	const table = createSvelteTable({
		get data() {
			return data.lists;
		},
		columns,
		state: {
			get sorting() {
				return sorting;
			},
		},
		onSortingChange: (updater) => {
			if (typeof updater === "function") {
				sorting = updater(sorting);
			} else {
				sorting = updater;
			}
		},
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});
</script>

<svelte:head>
	<title>Lists</title>
</svelte:head>

<section class="grid gap-6">
	<div>
		<h1 class="text-3xl font-display">Lists</h1>
		<p class="text-sm text-muted-foreground">
			Manage local lists, open details by ID or name, and delete lists directly
			from the table.
		</p>
	</div>

	{#if form?.message}
		<Alert variant={form?.success ? "default" : "destructive"}>
			<AlertTitle>{form.success ? "Done" : "Action failed"}</AlertTitle>
			<AlertDescription>{form.message}</AlertDescription>
		</Alert>
	{/if}

	<form
		method="POST"
		action="?/create"
		class="grid gap-3 md:max-w-xl md:grid-cols-[1fr_auto] md:items-end"
	>
		<Field.Field>
			<Field.Label for="list-name">New list name</Field.Label>
			<Input id="list-name" name="name" placeholder="Weekly groceries" />
		</Field.Field>
		<Button type="submit">Create list</Button>
	</form>

	{#if data.lists.length > 0}
		<div class="rounded-md border overflow-hidden">
			<div class="border-b px-3 py-2">
				<p class="text-sm text-muted-foreground">{data.lists.length} lists</p>
			</div>

			<Table.Root>
				<Table.Header>
					{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
						<Table.Row>
							{#each headerGroup.headers as header (header.id)}
								<Table.Head>
									{#if !header.isPlaceholder}
										<FlexRender
											content={header.column.columnDef.header}
											context={header.getContext()}
										/>
									{/if}
								</Table.Head>
							{/each}
						</Table.Row>
					{/each}
				</Table.Header>
				<Table.Body>
					{#each table.getRowModel().rows as row (row.id)}
						<Table.Row>
							{#each row.getVisibleCells() as cell (cell.id)}
								<Table.Cell>
									<FlexRender
										content={cell.column.columnDef.cell}
										context={cell.getContext()}
									/>
								</Table.Cell>
							{/each}
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{:else}
		<Alert>
			<AlertTitle>No local list</AlertTitle>
			<AlertDescription
				>Create your first list from the form above.</AlertDescription
			>
		</Alert>
	{/if}
</section>
