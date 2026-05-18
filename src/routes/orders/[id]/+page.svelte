<script lang="ts">
	import ArrowLeft from "@lucide/svelte/icons/arrow-left";
	import type { ColumnDef, SortingState } from "@tanstack/table-core";
	import { getCoreRowModel, getSortedRowModel } from "@tanstack/table-core";
	import { formatCurrency, formatDate } from "$lib/format";
	import ProductHoverCardLink from "$lib/components/ProductHoverCardLink.svelte";
	import OrderProductStatusBadge from "$lib/components/OrderProductStatusBadge.svelte";
	import SortableHeaderButton from "$lib/components/SortableHeaderButton.svelte";
	import {
		Alert,
		AlertDescription,
		AlertTitle,
	} from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import { Input } from "$lib/components/ui/input";
	import {
		createSvelteTable,
		FlexRender,
		renderComponent,
		renderSnippet,
	} from "$lib/components/ui/data-table";
	import * as Table from "$lib/components/ui/table";
	import { createRawSnippet } from "svelte";

	let { data, form } = $props();

	type OrderProductRow = NonNullable<typeof data.order.products>[number];
	const orderProducts = $derived(data.order.products ?? []);

	let sorting = $state<SortingState>([]);
	let selectedKeys = $state<string[]>([]);

	const selectionColumnWidth = 52;

	function getProductKey(product: OrderProductRow): string {
		const productId = product.productId?.trim();
		if (productId) {
			return `id:${productId}`;
		}

		return `name:${product.name}|pack:${product.packaging ?? ""}|url:${product.url ?? ""}`;
	}

	const columns: ColumnDef<OrderProductRow>[] = [
		{
			accessorKey: "name",
			size: 420,
			header: ({ column }) =>
				renderComponent(SortableHeaderButton, {
					label: "Product",
					onclick: column.getToggleSortingHandler(),
					sorted: column.getIsSorted(),
				}),
			cell: ({ row }) =>
				renderComponent(ProductHoverCardLink, {
					label: row.original.name,
					productName: row.original.name,
					productId: row.original.productId,
					productUrl: row.original.url,
				}),
		},
		{
			accessorKey: "quantity",
			sortingFn: "basic",
			size: 120,
			header: ({ column }) =>
				renderComponent(SortableHeaderButton, {
					label: "Quantity",
					onclick: column.getToggleSortingHandler(),
					sorted: column.getIsSorted(),
				}),
			cell: ({ row }) => {
				const quantitySnippet = createRawSnippet(() => ({
					render: () => `<div>${row.original.quantity ?? 1}</div>`,
				}));
				return renderSnippet(quantitySnippet);
			},
		},
		{
			accessorKey: "unavailable",
			sortingFn: "basic",
			size: 140,
			header: ({ column }) =>
				renderComponent(SortableHeaderButton, {
					label: "Status",
					onclick: column.getToggleSortingHandler(),
					sorted: column.getIsSorted(),
				}),
			cell: ({ row }) =>
				renderComponent(OrderProductStatusBadge, {
					unavailable: row.original.unavailable,
				}),
		},
		{
			accessorKey: "totalPrice",
			sortingFn: "basic",
			size: 150,
			header: ({ column }) =>
				renderComponent(SortableHeaderButton, {
					label: "Price",
					align: "right",
					onclick: column.getToggleSortingHandler(),
					sorted: column.getIsSorted(),
				}),
			cell: ({ row }) => {
				const amountSnippet = createRawSnippet(() => ({
					render: () => {
						const amount =
							row.original.totalPrice !== undefined
								? formatCurrency(
										row.original.totalPrice,
										row.original.currency ?? data.order.currency ?? "EUR",
									)
								: "-";
						return `<div class="text-right">${amount}</div>`;
					},
				}));
				return renderSnippet(amountSnippet);
			},
		},
	];

	const table = createSvelteTable({
		get data() {
			return orderProducts;
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

	const rows = $derived(table.getRowModel().rows);
	const headerGroups = $derived(table.getHeaderGroups());
	const allRowKeys = $derived(rows.map((row) => getProductKey(row.original)));
	const productsByKey = $derived(
		new Map(
			rows.map((row) => [getProductKey(row.original), row.original] as const),
		),
	);
	const allRowsSelected = $derived(
		allRowKeys.length > 0 &&
			allRowKeys.every((key) => selectedKeys.includes(key)),
	);
	const selectedCount = $derived(selectedKeys.length);
	const selectedProducts = $derived(
		selectedKeys
			.map((key) => productsByKey.get(key))
			.filter((product): product is OrderProductRow => Boolean(product)),
	);
	const selectedItemsPayload = $derived(
		JSON.stringify(
			selectedProducts.map((product) => ({
				name: product.name,
				quantity: product.quantity ?? 1,
				productId: product.productId,
				productUrl: product.url,
				unit: product.packaging,
			})),
		),
	);

	function toggleRowSelection(
		product: OrderProductRow,
		nextChecked: boolean,
	): void {
		const key = getProductKey(product);
		if (nextChecked) {
			selectedKeys = selectedKeys.includes(key)
				? selectedKeys
				: [...selectedKeys, key];
			return;
		}

		selectedKeys = selectedKeys.filter((candidate) => candidate !== key);
	}

	function toggleAllRows(nextChecked: boolean): void {
		if (nextChecked) {
			selectedKeys = [...allRowKeys];
			return;
		}

		selectedKeys = [];
	}

	$effect(() => {
		const available = new Set(allRowKeys);
		const nextKeys = selectedKeys.filter((key) => available.has(key));
		if (nextKeys.length !== selectedKeys.length) {
			selectedKeys = nextKeys;
		}
	});
</script>

<svelte:head>
	<title>Order {data.order.id}</title>
</svelte:head>

<section class="grid gap-6">
	<div>
		<Button href="/orders" variant="outline" size="sm" class="w-fit">
			<ArrowLeft class="mr-2 size-4" />
			Back
		</Button>
	</div>

	<div>
		<div>
			<p class="text-sm text-muted-foreground">Order details</p>
			<h1 class="text-3xl font-display">Order {data.order.id}</h1>
			<p class="text-sm text-muted-foreground">
				{formatDate(data.order.orderedAt)} · {formatCurrency(
					data.order.total,
					data.order.currency,
				)}
			</p>
		</div>
	</div>

	{#if form?.message}
		<Alert variant={form?.success ? "default" : "destructive"}>
			<AlertTitle>{form.success ? "Done" : "Action failed"}</AlertTitle>
			<AlertDescription>{form.message}</AlertDescription>
		</Alert>
	{/if}

	{#if data.order.products && data.order.products.length > 0}
		{#if selectedCount > 0}
			<div class="w-full rounded-md border p-4 lg:w-1/2">
				<p class="mb-3 text-sm text-muted-foreground">
					{selectedCount} selected product{selectedCount > 1 ? "s" : ""}
				</p>
				<form
					method="POST"
					action="?/addSelectionToList"
					class="grid gap-2 sm:grid-cols-2 sm:items-end"
				>
					<input
						type="hidden"
						name="selectedItems"
						value={selectedItemsPayload}
					/>

					<div class="grid gap-1">
						<label class="text-xs font-medium" for="bulk-list-id"
							>Target list</label
						>
						<select
							id="bulk-list-id"
							name="listId"
							class="h-9 rounded-md border border-input bg-background px-2 text-sm"
						>
							<option value="">Select list</option>
							{#each data.lists as list (list.id)}
								<option value={list.id}>{list.name}</option>
							{/each}
						</select>
					</div>

					<div class="grid gap-1">
						<label class="text-xs font-medium" for="bulk-new-list"
							>or create list</label
						>
						<Input
							id="bulk-new-list"
							name="newListName"
							placeholder="New list name"
							class="h-9"
						/>
					</div>

					<Button
						type="submit"
						size="sm"
						class="sm:col-span-2 sm:justify-self-start"
					>
						Add to list
					</Button>
				</form>
			</div>
		{/if}

		<div class="rounded-md border overflow-hidden">
			<div class="border-b px-3 py-2">
				<p class="text-sm text-muted-foreground">{rows.length} products</p>
			</div>

			<Table.Root>
				<Table.Header>
					{#each headerGroups as headerGroup (headerGroup.id)}
						<Table.Row>
							<Table.Head
								class="text-center"
								style={`width: ${selectionColumnWidth}px; min-width: ${selectionColumnWidth}px; max-width: ${selectionColumnWidth}px;`}
							>
								<Checkbox
									checked={allRowsSelected}
									indeterminate={!allRowsSelected && selectedCount > 0}
									onCheckedChange={(checked) => toggleAllRows(checked === true)}
								/>
							</Table.Head>

							{#each headerGroup.headers as header (header.id)}
								<Table.Head
									class={header.column.id === "totalPrice"
										? "text-right"
										: undefined}
								>
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
					{#each rows as row (row.id)}
						{@const rowKey = getProductKey(row.original)}
						<Table.Row
							class={selectedKeys.includes(rowKey) ? "bg-muted/40" : undefined}
						>
							<Table.Cell
								class="text-center"
								style={`width: ${selectionColumnWidth}px; min-width: ${selectionColumnWidth}px; max-width: ${selectionColumnWidth}px;`}
							>
								<Checkbox
									checked={selectedKeys.includes(rowKey)}
									onCheckedChange={(checked) =>
										toggleRowSelection(row.original, checked === true)}
								/>
							</Table.Cell>

							{#each row.getVisibleCells() as cell (cell.id)}
								<Table.Cell
									class={cell.column.id === "totalPrice"
										? "text-right"
										: undefined}
								>
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
			<AlertTitle>No product rows</AlertTitle>
			<AlertDescription>
				This order has no stored product details yet.
			</AlertDescription>
		</Alert>
	{/if}
</section>
