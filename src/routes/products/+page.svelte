<script lang="ts">
  import type { ColumnDef, SortingState } from "@tanstack/table-core";
  import { getCoreRowModel, getSortedRowModel } from "@tanstack/table-core";
  import AddToListCell from "$lib/components/AddToListCell.svelte";
  import ProductHoverCardLink from "$lib/components/ProductHoverCardLink.svelte";
  import SortableHeaderButton from "$lib/components/SortableHeaderButton.svelte";
  import { formatPercent } from "$lib/format";
  import { Button } from "$lib/components/ui/button";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { Input } from "$lib/components/ui/input";
  import { Slider } from "$lib/components/ui/slider";
  import {
    Alert,
    AlertDescription,
    AlertTitle,
  } from "$lib/components/ui/alert";
  import {
    createSvelteTable,
    FlexRender,
    renderComponent,
    renderSnippet,
  } from "$lib/components/ui/data-table";
  import * as Table from "$lib/components/ui/table";
  import { createRawSnippet } from "svelte";

  let { data, form } = $props();

  type ProductRow = (typeof data.products)[0];

  let sorting = $state<SortingState>([]);
  let selectedKeys = $state<string[]>([]);
  let frequencyRange = $state([10, 70]);
  let pageSize = $state(50);

  const selectionColumnWidth = 52;

  function toPercent(value: number): number {
    return Math.round(value * 100);
  }

  function getProductKey(product: ProductRow): string {
    const productId = product.productId?.trim();
    if (productId) {
      return `id:${productId}`;
    }

    return `name:${product.name}|pack:${product.packaging ?? ""}`;
  }

  const columns: ColumnDef<(typeof data.products)[0]>[] = [
    {
      accessorKey: "productId",
      size: 180,
      sortingFn: "alphanumeric",
      header: ({ column }) =>
        renderComponent(SortableHeaderButton, {
          label: "Product ID",
          onclick: column.getToggleSortingHandler(),
          sorted: column.getIsSorted(),
        }),
      cell: ({ row }) =>
        renderComponent(ProductHoverCardLink, {
          label: row.original.productId ?? "-",
          productName: row.original.name,
          productId: row.original.productId,
          productUrl: row.original.productUrl,
          class: "text-primary",
        }),
    },
    {
      accessorKey: "name",
      size: 320,
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
          productUrl: row.original.productUrl,
        }),
    },
    {
      accessorKey: "packaging",
      size: 140,
      header: ({ column }) =>
        renderComponent(SortableHeaderButton, {
          label: "Pack",
          onclick: column.getToggleSortingHandler(),
          sorted: column.getIsSorted(),
        }),
      cell: ({ row }) => {
        const packSnippet = createRawSnippet(() => ({
          render: () =>
            `<div class="truncate">${row.original.packaging ?? "-"}</div>`,
        }));
        return renderSnippet(packSnippet);
      },
    },
    {
      accessorKey: "occurrences",
      size: 120,
      header: ({ column }) =>
        renderComponent(SortableHeaderButton, {
          label: "Occurrences",
          onclick: column.getToggleSortingHandler(),
          sorted: column.getIsSorted(),
        }),
      cell: ({ row }) => {
        const occSnippet = createRawSnippet(() => ({
          render: () =>
            `<div class="truncate">${row.original.occurrences}</div>`,
        }));
        return renderSnippet(occSnippet);
      },
    },
    {
      accessorKey: "orderFrequency",
      size: 180,
      sortingFn: "basic",
      header: ({ column }) =>
        renderComponent(SortableHeaderButton, {
          label: "Purchase frequency",
          onclick: column.getToggleSortingHandler(),
          sorted: column.getIsSorted(),
        }),
      cell: ({ row }) => {
        const frequencySnippet = createRawSnippet(() => ({
          render: () =>
            `<div class="truncate">${formatPercent(row.original.orderFrequency)}</div>`,
        }));
        return renderSnippet(frequencySnippet);
      },
    },
    {
      accessorKey: "suggestedQuantity",
      size: 140,
      header: ({ column }) =>
        renderComponent(SortableHeaderButton, {
          label: "Suggested qty",
          align: "right",
          onclick: column.getToggleSortingHandler(),
          sorted: column.getIsSorted(),
        }),
      cell: ({ row }) => {
        const qtySnippet = createRawSnippet(() => ({
          render: () =>
            `<div class="text-right">${row.original.suggestedQuantity}</div>`,
        }));
        return renderSnippet(qtySnippet);
      },
    },
    {
      id: "actions",
      size: 320,
      enableSorting: false,
      header: "Actions",
      cell: ({ row }) =>
        renderComponent(AddToListCell, {
          lists: data.lists,
          action: "?/addToList",
          openUrl: row.original.productUrl,
          productName: row.original.name,
          productId: row.original.productId,
          productUrl: row.original.productUrl,
          packaging: row.original.packaging,
          occurrences: row.original.occurrences,
          quantity: row.original.suggestedQuantity,
        }),
    },
  ];

  const table = createSvelteTable({
    get data() {
      return data.products;
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
  const productsByKey = $derived(
    new Map(rows.map((row) => [getProductKey(row.original), row.original] as const)),
  );
  const headerGroups = $derived(table.getHeaderGroups());
  const leafColumns = $derived(table.getAllLeafColumns());
  const allRowKeys = $derived(rows.map((row) => getProductKey(row.original)));
  const frequencyMin = $derived(Math.min(...frequencyRange));
  const frequencyMax = $derived(Math.max(...frequencyRange));
  const inRangeCount = $derived(
    rows.filter((row) => {
      const frequency = toPercent(row.original.orderFrequency);
      return frequency >= frequencyMin && frequency <= frequencyMax;
    }).length,
  );
  const allRowsSelected = $derived(
    allRowKeys.length > 0 && allRowKeys.every((key) => selectedKeys.includes(key)),
  );
  const selectedCount = $derived(selectedKeys.length);
  const selectedProducts = $derived(
    selectedKeys
      .map((key) => productsByKey.get(key))
      .filter((product): product is ProductRow => Boolean(product)),
  );
  const selectedItemsPayload = $derived(
    JSON.stringify(
      selectedProducts.map((product) => ({
        name: product.name,
        quantity: product.suggestedQuantity,
        productId: product.productId,
        productUrl: product.productUrl,
        unit: product.packaging,
        occurrences: product.occurrences,
      })),
    ),
  );

  const totalColumnWidth = $derived(
    selectionColumnWidth + leafColumns.reduce((sum, column) => sum + column.getSize(), 0),
  );

  function toggleRowSelection(product: ProductRow, nextChecked: boolean): void {
    const key = getProductKey(product);
    if (nextChecked) {
      selectedKeys = selectedKeys.includes(key) ? selectedKeys : [...selectedKeys, key];
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

  function selectRowsInFrequencyRange(): void {
    const keysInRange = rows
      .filter((row) => {
        const frequency = toPercent(row.original.orderFrequency);
        return frequency >= frequencyMin && frequency <= frequencyMax;
      })
      .map((row) => getProductKey(row.original));

    selectedKeys = Array.from(new Set([...selectedKeys, ...keysInRange]));
  }

  function clearSelection(): void {
    selectedKeys = [];
  }

  $effect(() => {
    const available = new Set(allRowKeys);
    const nextKeys = selectedKeys.filter((key) => available.has(key));
    if (nextKeys.length !== selectedKeys.length) {
      selectedKeys = nextKeys;
    }
  });

  let currentPage = $state(0);
  const totalPages = $derived(Math.max(1, Math.ceil(rows.length / pageSize)));
  const paginatedRows = $derived(rows.slice(currentPage * pageSize, (currentPage + 1) * pageSize));

  $effect(() => {
    // Reset to first page when rows change (e.g. sorting)
    void rows;
    currentPage = 0;
  });
</script>

<svelte:head>
  <title>Products</title>
</svelte:head>

<section class="grid gap-6">
  <div>
    <h1 class="text-3xl font-display">Products</h1>
    <p class="text-sm text-muted-foreground">
      Aggregated products across all synced orders with purchase frequency.
    </p>
  </div>

  {#if form?.message}
    <Alert variant={form?.success ? "default" : "destructive"}>
      <AlertTitle>{form.success ? "Done" : "Action failed"}</AlertTitle>
      <AlertDescription>{form.message}</AlertDescription>
    </Alert>
  {/if}

  {#if data.products.length > 0}
    <div class="rounded-md border p-4">
      <div class="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-end">
        <div class="grid gap-2">
          <p class="text-sm font-medium">Frequency range selection</p>
          <Slider
            type="multiple"
            bind:value={frequencyRange}
            min={0}
            max={100}
            step={1}
            class="max-w-md"
          />
          <p class="text-xs text-muted-foreground">
            Range: {frequencyMin}% to {frequencyMax}% ({inRangeCount} products in range)
          </p>
          <div class="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onclick={selectRowsInFrequencyRange}>
              Select range
            </Button>
            <Button type="button" variant="outline" size="sm" onclick={() => toggleAllRows(true)}>
              Select all
            </Button>
            <Button type="button" variant="outline" size="sm" onclick={clearSelection}>
              Clear selection
            </Button>
          </div>
        </div>

        <form method="POST" action="?/addSelectionToList" class="grid gap-2 sm:grid-cols-[minmax(0,220px)_minmax(0,220px)_auto] sm:items-end">
          <input type="hidden" name="selectedItems" value={selectedItemsPayload} />

          <div class="grid gap-1">
            <label class="text-xs font-medium" for="bulk-list-id">Target list</label>
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
            <label class="text-xs font-medium" for="bulk-new-list">or create list</label>
            <Input id="bulk-new-list" name="newListName" placeholder="New list name" class="h-9" />
          </div>

          <Button type="submit" size="sm" disabled={selectedCount === 0}>
            Add {selectedCount} selected
          </Button>
        </form>
      </div>
    </div>

    <div class="rounded-md border">
      <Table.Root class="w-max min-w-full">
        <Table.Header class="bg-background">
          {#each headerGroups as headerGroup (headerGroup.id)}
            <Table.Row
              class="border-0 bg-background"
              style={`display: flex; width: ${totalColumnWidth}px; min-width: 100%;`}
            >
              <Table.Head
                class="border-b bg-background px-2 py-2 text-center"
                style={`width: ${selectionColumnWidth}px; min-width: ${selectionColumnWidth}px; max-width: ${selectionColumnWidth}px;`}
              >
                <Checkbox
                  checked={allRowsSelected}
                  indeterminate={!allRowsSelected && selectedCount > 0}
                  onclick={() => toggleAllRows(!allRowsSelected)}
                />
              </Table.Head>

              {#each headerGroup.headers as header (header.id)}
                <Table.Head
                  class={`border-b bg-background px-2 py-2 ${header.column.id === "suggestedQuantity" ? "text-right" : "text-left"}`}
                  style={`width: ${header.getSize()}px; min-width: ${header.getSize()}px; max-width: ${header.getSize()}px;`}
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
      </Table.Root>

      <div class="overflow-auto">
        <Table.Root class="w-max min-w-full">
          <Table.Body
            class="block"
            style={`display: block; width: ${totalColumnWidth}px; min-width: 100%;`}
          >
            {#each paginatedRows as row (row.id)}
              {@const rowKey = getProductKey(row.original)}
              <Table.Row
                class={`border-b ${selectedKeys.includes(rowKey) ? "bg-muted/40" : ""}`}
                style={`display: flex; width: ${totalColumnWidth}px; min-width: 100%;`}
              >
                <Table.Cell
                  class="px-2 py-2 text-center"
                  style={`width: ${selectionColumnWidth}px; min-width: ${selectionColumnWidth}px; max-width: ${selectionColumnWidth}px;`}
                >
                  <Checkbox
                    checked={selectedKeys.includes(rowKey)}
                    onclick={() => toggleRowSelection(row.original, !selectedKeys.includes(rowKey))}
                  />
                </Table.Cell>

                {#each row.getVisibleCells() as cell (cell.id)}
                  <Table.Cell
                    class={`truncate px-2 py-2 ${cell.column.id === "suggestedQuantity" ? "text-right" : "text-left"}`}
                    style={`width: ${cell.column.getSize()}px; min-width: ${cell.column.getSize()}px; max-width: ${cell.column.getSize()}px;`}
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

      <div class="flex items-center justify-between border-t pt-3">
        <p class="text-sm text-muted-foreground">
          {rows.length} products — page {currentPage + 1} / {totalPages}
        </p>
        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onclick={() => { currentPage = Math.max(0, currentPage - 1); }}
            disabled={currentPage === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onclick={() => { currentPage = Math.min(totalPages - 1, currentPage + 1); }}
            disabled={currentPage >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  {:else}
    <Alert>
      <AlertTitle>No products yet</AlertTitle>
      <AlertDescription>
        Go to Sync and run the first synchronization.
      </AlertDescription>
    </Alert>
  {/if}
</section>
