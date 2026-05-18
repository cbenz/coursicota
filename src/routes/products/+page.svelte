<script lang="ts">
  import type { ColumnDef, SortingState } from "@tanstack/table-core";
  import { getCoreRowModel, getSortedRowModel } from "@tanstack/table-core";
  import ProductHoverCardLink from "$lib/components/ProductHoverCardLink.svelte";
  import {
    aggregateProductsByOrderWindow,
    normalizeSearchText,
  } from "$lib/products";
  import type { ProductFrequencyRow } from "$lib/types/products";
  import SortableHeaderButton from "$lib/components/SortableHeaderButton.svelte";
  import { formatCurrency, formatDate, formatPercent } from "$lib/format";
  import { Button } from "$lib/components/ui/button";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { Input } from "$lib/components/ui/input";
  import { Slider } from "$lib/components/ui/slider";
  import * as Card from "$lib/components/ui/card";
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

  type ProductRow = ProductFrequencyRow;
  type TimeWindowKey = "all" | "1y" | "2y" | "3y";

  const timeWindowOptions: Array<{ key: TimeWindowKey; label: string }> = [
    { key: "all", label: "All orders" },
    { key: "1y", label: "Last 1 year" },
    { key: "2y", label: "Last 2 years" },
    { key: "3y", label: "Last 3 years" },
  ];

  let sorting = $state<SortingState>([]);
  let selectedKeys = $state<string[]>([]);
  let timeWindow = $state<TimeWindowKey>("all");
  let bulkListId = $state("");
  let bulkNewListName = $state("");
  let titleFilter = $state("");
  let frequencyRange = $state([0, 100]);
  let pageSize = $state(50);
  const pageSizeOptions = [25, 50, 100, 200] as const;

  const selectionColumnWidth = 52;

  function toPercent(value: number): number {
    return Math.round(value * 100);
  }

  function fuzzyTitleMatch(value: string, query: string): boolean {
    const normalizedValue = normalizeSearchText(value);
    if (!query) {
      return true;
    }

    if (normalizedValue.includes(query)) {
      return true;
    }

    // Keep fuzzy behavior but avoid very loose matches on long queries.
    if (query.length > 3) {
      return false;
    }

    let queryIndex = 0;
    for (const char of normalizedValue) {
      if (char === query[queryIndex]) {
        queryIndex += 1;
        if (queryIndex === query.length) {
          return true;
        }
      }
    }

    return false;
  }

  function getProductKey(product: ProductRow): string {
    const productId = product.productId?.trim();
    if (productId) {
      return `id:${productId}`;
    }

    return `name:${product.name}|pack:${product.packaging ?? ""}`;
  }

  function getWindowStartIso(window: TimeWindowKey): string | undefined {
    if (window === "all") {
      return undefined;
    }

    const now = new Date();
    const years =
      window === "1y"
        ? 1
        : window === "2y"
          ? 2
          : window === "3y"
            ? 3
            : 0;
    const start = new Date(now);
    start.setUTCFullYear(start.getUTCFullYear() - years);
    return start.toISOString();
  }

  function clearFilters(): void {
    timeWindow = "all";
    titleFilter = "";
    frequencyRange = [0, 100];
    currentPage = 0;
  }

  function getColumnWidthClass(columnId: string): string {
    if (columnId === "name") return "min-w-[30rem]";
    if (columnId === "occurrences") return "w-28";
    if (columnId === "orderFrequency") return "w-36";
    if (columnId === "lastOrderedAt") return "w-44";
    if (columnId === "latestAmount") return "w-36";
    if (columnId === "suggestedQuantity") return "w-28";
    return "";
  }

  const windowStartIso = $derived(getWindowStartIso(timeWindow));
  const aggregatedProducts = $derived(
    aggregateProductsByOrderWindow({
      orderDates: data.orderDates,
      occurrences: data.productOccurrences,
      windowStartIso,
    }),
  );

  const columns: ColumnDef<ProductRow>[] = [
    {
      accessorKey: "name",
      size: 520,
      minSize: 360,
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
      sortingFn: "basic",
      size: 140,
      header: ({ column }) =>
        renderComponent(SortableHeaderButton, {
          label: "Frequency",
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
      id: "lastOrderedAt",
      accessorFn: (row) => row.lastOrderedAt ?? "",
      sortingFn: (left, right, columnId) => {
        const leftValue = (left.getValue<string>(columnId) ?? "").trim();
        const rightValue = (right.getValue<string>(columnId) ?? "").trim();
        return leftValue.localeCompare(rightValue);
      },
      size: 150,
      header: ({ column }) =>
        renderComponent(SortableHeaderButton, {
          label: "Last ordered",
          onclick: column.getToggleSortingHandler(),
          sorted: column.getIsSorted(),
        }),
      cell: ({ row }) => {
        const lastOrderedSnippet = createRawSnippet(() => ({
          render: () => {
            const value = row.original.lastOrderedAt;
            return `<div class="truncate">${value ? formatDate(value) : "-"}</div>`;
          },
        }));
        return renderSnippet(lastOrderedSnippet);
      },
    },
    {
      accessorKey: "latestAmount",
      sortingFn: "basic",
      size: 140,
      header: ({ column }) =>
        renderComponent(SortableHeaderButton, {
          label: "Amount",
          align: "right",
          onclick: column.getToggleSortingHandler(),
          sorted: column.getIsSorted(),
        }),
      cell: ({ row }) => {
        const amountSnippet = createRawSnippet(() => ({
          render: () => {
            const amount =
              typeof row.original.latestAmount === "number"
                ? formatCurrency(
                    row.original.latestAmount,
                    row.original.latestAmountCurrency ?? "EUR",
                  )
                : "-";
            return `<div class=\"text-right\">${amount}</div>`;
          },
        }));
        return renderSnippet(amountSnippet);
      },
    },
    {
      accessorKey: "suggestedQuantity",
      enableSorting: false,
      size: 110,
      header: () => "Quantity",
      cell: ({ row }) => {
        const qtySnippet = createRawSnippet(() => ({
          render: () =>
            `<div class="text-right">${row.original.suggestedQuantity}</div>`,
        }));
        return renderSnippet(qtySnippet);
      },
    },
  ];

  const table = createSvelteTable({
    get data() {
      return aggregatedProducts;
    },
    columns,
    defaultColumn: {
      size: 150,
      minSize: 80,
    },
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
  const normalizedTitleFilter = $derived(normalizeSearchText(titleFilter));
  const filteredRows = $derived(
    rows.filter((row) => {
      const frequency = toPercent(row.original.orderFrequency);
      const matchesFrequency =
        frequency >= frequencyMin && frequency <= frequencyMax;
      const matchesTitle = fuzzyTitleMatch(
        row.original.name,
        normalizedTitleFilter,
      );
      return matchesFrequency && matchesTitle;
    }),
  );
  const productsByKey = $derived(
    new Map(
      rows.map((row) => [getProductKey(row.original), row.original] as const),
    ),
  );
  const headerGroups = $derived(table.getHeaderGroups());
  const allRowKeys = $derived(rows.map((row) => getProductKey(row.original)));
  const frequencyMin = $derived(Math.min(...frequencyRange));
  const frequencyMax = $derived(Math.max(...frequencyRange));
  const filteredCount = $derived(filteredRows.length);
  const inRangeCount = $derived(filteredRows.length);
  const visibleRowKeys = $derived(
    filteredRows.map((row) => getProductKey(row.original)),
  );
  const allRowsSelected = $derived(
    visibleRowKeys.length > 0 &&
      visibleRowKeys.every((key) => selectedKeys.includes(key)),
  );
  const selectedCount = $derived(selectedKeys.length);
  const selectedProducts = $derived(
    selectedKeys
      .map((key) => productsByKey.get(key))
      .filter((product): product is ProductRow => Boolean(product)),
  );
  const singleAvailableListId = $derived(
    data.lists.length === 1 ? data.lists[0]?.id ?? "" : "",
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

  function toggleRowSelection(product: ProductRow, nextChecked: boolean): void {
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
      selectedKeys = Array.from(new Set([...selectedKeys, ...visibleRowKeys]));
      return;
    }

    selectedKeys = selectedKeys.filter((key) => !visibleRowKeys.includes(key));
  }

  $effect(() => {
    const available = new Set(allRowKeys);
    const nextKeys = selectedKeys.filter((key) => available.has(key));
    if (nextKeys.length !== selectedKeys.length) {
      selectedKeys = nextKeys;
    }
  });

  let currentPage = $state(0);
  const totalPages = $derived(
    Math.max(1, Math.ceil(filteredRows.length / pageSize)),
  );
  const paginatedRows = $derived(
    filteredRows.slice(currentPage * pageSize, (currentPage + 1) * pageSize),
  );
  const hasAnyProducts = $derived(data.productOccurrences.length > 0);

  $effect(() => {
    // Reset to first page when filtered rows change.
    void filteredRows;
    currentPage = 0;
  });

  $effect(() => {
    const maxPage = Math.max(0, totalPages - 1);
    if (currentPage > maxPage) {
      currentPage = maxPage;
    }
  });

  $effect(() => {
    const availableListIds = new Set(data.lists.map((list) => list.id));
    const hasNewListName = bulkNewListName.trim().length > 0;

    if (!availableListIds.has(bulkListId)) {
      bulkListId = hasNewListName ? "" : singleAvailableListId;
      return;
    }

    if (!bulkListId && singleAvailableListId && !hasNewListName) {
      bulkListId = singleAvailableListId;
    }
  });

  $effect(() => {
    if (bulkNewListName.trim().length > 0 && bulkListId) {
      bulkListId = "";
    }
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

  {#if hasAnyProducts}
    <div class={`grid gap-6 ${selectedCount > 0 ? "lg:grid-cols-2 lg:items-start" : ""}`}>
      <Card.Root class={selectedCount > 0 ? "w-full" : "w-full lg:w-1/2"}>
        <Card.Header>
          <Card.Title>Filters</Card.Title>
          <Card.Description>
            Filter by time window, title and frequency. Results update while you
            type.
          </Card.Description>
        </Card.Header>
        <Card.Content class="grid gap-4">
          <div class="grid gap-2">
            <label class="text-sm font-medium" for="products-time-window"
              >Period</label
            >
            <select
              id="products-time-window"
              class="h-9 rounded-md border border-input bg-background px-2 text-sm"
              bind:value={timeWindow}
            >
              {#each timeWindowOptions as option (option.key)}
                <option value={option.key}>{option.label}</option>
              {/each}
            </select>
          </div>

          <div class="grid gap-2">
            <label class="text-sm font-medium" for="products-title-filter"
              >Title</label
            >
            <Input
              id="products-title-filter"
              placeholder="Search products..."
              bind:value={titleFilter}
            />
          </div>

          <div class="grid gap-2">
            <p class="text-sm font-medium">Frequency</p>
            <Slider
              type="multiple"
              bind:value={frequencyRange}
              min={0}
              max={100}
              step={1}
              class="max-w-md"
            />
            <p class="text-xs text-muted-foreground">
              Range: {frequencyMin}% to {frequencyMax}% ({inRangeCount} products)
            </p>
          </div>
        </Card.Content>
        <Card.Footer>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onclick={clearFilters}
          >
            Clear filters
          </Button>
        </Card.Footer>
      </Card.Root>

      {#if selectedCount > 0}
        <Card.Root class="w-full">
          <Card.Header>
            <Card.Title>Bulk add to list</Card.Title>
            <Card.Description>
              {selectedCount} selected product{selectedCount > 1 ? "s" : ""}.
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <form method="POST" action="?/addSelectionToList" class="grid gap-3">
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
                  bind:value={bulkListId}
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
                  bind:value={bulkNewListName}
                />
              </div>

              <Button type="submit" size="sm" class="justify-self-start">
                Add to list
              </Button>
            </form>
          </Card.Content>
        </Card.Root>
      {/if}
    </div>

    <div class="rounded-md border overflow-hidden">
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-2"
      >
        <p class="text-sm text-muted-foreground">
          {filteredCount} / {rows.length} products{#if totalPages > 1}
            · page {currentPage + 1} / {totalPages}{/if}
        </p>
        <div class="flex items-center gap-2 text-sm">
          <label class="text-muted-foreground" for="products-page-size"
            >Rows per page</label
          >
          <select
            id="products-page-size"
            class="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={String(pageSize)}
            onchange={(event) => {
              const value = Number.parseInt(
                (event.currentTarget as HTMLSelectElement).value,
                10,
              );
              if (Number.isFinite(value) && value > 0) {
                pageSize = value;
                currentPage = 0;
              }
            }}
          >
            {#each pageSizeOptions as option (option)}
              <option value={option}>{option}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="overflow-x-auto">
        <Table.Root class="min-w-full">
          <Table.Header class="bg-background">
            {#each headerGroups as headerGroup (headerGroup.id)}
              <Table.Row class="border-0 bg-background">
                <Table.Head
                  class="border-b bg-background px-2 py-2 text-center"
                  style={`width: ${selectionColumnWidth}px; min-width: ${selectionColumnWidth}px; max-width: ${selectionColumnWidth}px;`}
                >
                  <Checkbox
                    checked={allRowsSelected}
                    indeterminate={!allRowsSelected && selectedCount > 0}
                    onCheckedChange={(checked) =>
                      toggleAllRows(checked === true)}
                  />
                </Table.Head>

                {#each headerGroup.headers as header (header.id)}
                  <Table.Head
                    class={`border-b bg-background px-2 py-2 ${getColumnWidthClass(header.column.id)} ${header.column.id === "suggestedQuantity" || header.column.id === "latestAmount" ? "text-right" : "text-left"}`}
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
            {#if paginatedRows.length === 0}
              <Table.Row class="border-b">
                <Table.Cell class="px-3 py-6 text-center text-sm text-muted-foreground" colspan={columns.length + 1}>
                  No products match the selected period and filters.
                </Table.Cell>
              </Table.Row>
            {:else}
              {#each paginatedRows as row (row.id)}
                {@const rowKey = getProductKey(row.original)}
                <Table.Row
                  class={`border-b ${selectedKeys.includes(rowKey) ? "bg-muted/40" : ""}`}
                >
                  <Table.Cell
                    class="px-2 py-2 text-center"
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
                      class={`truncate px-2 py-2 ${getColumnWidthClass(cell.column.id)} ${cell.column.id === "suggestedQuantity" || cell.column.id === "latestAmount" ? "text-right" : "text-left"}`}
                    >
                      <FlexRender
                        content={cell.column.columnDef.cell}
                        context={cell.getContext()}
                      />
                    </Table.Cell>
                  {/each}
                </Table.Row>
              {/each}
            {/if}
          </Table.Body>
        </Table.Root>
      </div>

      <div class="flex items-center justify-end border-t px-3 py-2">
        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onclick={() => {
              currentPage = Math.max(0, currentPage - 1);
            }}
            disabled={currentPage === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onclick={() => {
              currentPage = Math.min(totalPages - 1, currentPage + 1);
            }}
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
