<script lang="ts">
  import type { ColumnDef, SortingState } from "@tanstack/table-core";
  import { getCoreRowModel, getSortedRowModel } from "@tanstack/table-core";
  import SortableHeaderButton from "$lib/components/SortableHeaderButton.svelte";
  import { formatCurrency, formatDate } from "$lib/format";
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

  let { data } = $props();
  let sorting = $state<SortingState>([]);

  const columns: ColumnDef<(typeof data.orders)[0]>[] = [
    {
      accessorKey: "id",
      header: ({ column }) =>
        renderComponent(SortableHeaderButton, {
          label: "Order ID",
          onclick: column.getToggleSortingHandler(),
          sorted: column.getIsSorted(),
        }),
      cell: ({ row }) => {
        const idSnippet = createRawSnippet(() => ({
          render: () =>
            `<a href="/orders/${row.original.id}" class="font-medium text-primary underline-offset-4 hover:underline">${row.original.id}</a>`,
        }));
        return renderSnippet(idSnippet);
      },
    },
    {
      accessorKey: "orderedAt",
      header: ({ column }) =>
        renderComponent(SortableHeaderButton, {
          label: "Date",
          onclick: column.getToggleSortingHandler(),
          sorted: column.getIsSorted(),
        }),
      cell: ({ row }) => {
        const dateSnippet = createRawSnippet(() => ({
          render: () => `<div>${formatDate(row.original.orderedAt)}</div>`,
        }));
        return renderSnippet(dateSnippet);
      },
    },
    {
      accessorKey: "deliverySlot",
      header: ({ column }) =>
        renderComponent(SortableHeaderButton, {
          label: "Delivery slot",
          onclick: column.getToggleSortingHandler(),
          sorted: column.getIsSorted(),
        }),
      cell: ({ row }) => {
        const slotSnippet = createRawSnippet(() => ({
          render: () => `<div>${row.original.deliverySlot ?? "-"}</div>`,
        }));
        return renderSnippet(slotSnippet);
      },
    },
    {
      id: "productCount",
      accessorFn: (order) => order.products?.length ?? 0,
      sortingFn: "basic",
      header: ({ column }) =>
        renderComponent(SortableHeaderButton, {
          label: "Products",
          onclick: column.getToggleSortingHandler(),
          sorted: column.getIsSorted(),
        }),
      cell: ({ row }) => {
        const countSnippet = createRawSnippet(() => ({
          render: () => `<div>${row.original.products?.length ?? 0}</div>`,
        }));
        return renderSnippet(countSnippet);
      },
    },
    {
      accessorKey: "total",
      sortingFn: "basic",
      header: ({ column }) =>
        renderComponent(SortableHeaderButton, {
          label: "Total",
          align: "right",
          onclick: column.getToggleSortingHandler(),
          sorted: column.getIsSorted(),
        }),
      cell: ({ row }) => {
        const totalSnippet = createRawSnippet(() => ({
          render: () =>
            `<div class="text-right">${formatCurrency(row.original.total, row.original.currency)}</div>`,
        }));
        return renderSnippet(totalSnippet);
      },
    },
    {
      id: "actions",
      enableSorting: false,
      header: "Actions",
      cell: ({ row }) => {
        const actionSnippet = createRawSnippet(() => ({
          render: () =>
            `<a href="/orders/${row.original.id}" class="inline-flex h-8 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent">Open</a>`,
        }));

        return renderSnippet(actionSnippet);
      },
    },
  ];

  const table = createSvelteTable({
    get data() {
      return data.orders;
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
  <title>Orders</title>
</svelte:head>

<section class="grid gap-6">
  <div>
    <h1 class="text-3xl font-display">Orders</h1>
    <p class="text-sm text-muted-foreground">
      Synced orders shown as a sortable table. Open any row for detailed lines.
    </p>
  </div>

  {#if data.orders.length > 0}
    <div class="rounded-md border overflow-hidden">
      <Table.Root>
          <Table.Header>
            {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
              <Table.Row>
                {#each headerGroup.headers as header (header.id)}
                  <Table.Head
                    class={header.column.id === "total"
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
            {#each table.getRowModel().rows as row (row.id)}
              <Table.Row>
                {#each row.getVisibleCells() as cell (cell.id)}
                  <Table.Cell
                    class={cell.column.id === "total"
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
        <AlertTitle>No orders yet</AlertTitle>
        <AlertDescription>
          Go to Sync and run your first synchronization.
        </AlertDescription>
      </Alert>
    {/if}
</section>
