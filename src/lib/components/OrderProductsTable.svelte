<script lang="ts">
  import type { ColumnDef, SortingState } from "@tanstack/table-core";
  import { getCoreRowModel, getSortedRowModel } from "@tanstack/table-core";
  import AddToListCell from "$lib/components/AddToListCell.svelte";
  import ProductHoverCardLink from "$lib/components/ProductHoverCardLink.svelte";
  import { formatCurrency } from "$lib/format";
  import OrderProductStatusBadge from "$lib/components/OrderProductStatusBadge.svelte";
  import SortableHeaderButton from "$lib/components/SortableHeaderButton.svelte";
  import {
    createSvelteTable,
    FlexRender,
    renderComponent,
    renderSnippet,
  } from "$lib/components/ui/data-table";
  import * as Table from "$lib/components/ui/table";
  import { createRawSnippet } from "svelte";

  export type OrderProduct = {
    name: string;
    quantity?: number;
    packaging?: string;
    unavailable?: boolean;
    totalPrice?: number;
    currency?: string;
    url?: string;
    productId?: string;
  };

  type Props = {
    products: OrderProduct[];
    fallbackCurrency?: string;
    lists?: Array<{ id: string; name: string }>;
    addToListAction?: string;
    showStatusColumn?: boolean;
    showAddToListAction?: boolean;
  };

  let {
    products,
    fallbackCurrency = "EUR",
    lists = [],
    addToListAction = "?/addToList",
    showStatusColumn = true,
    showAddToListAction = true,
  }: Props = $props();

  let sorting = $state<SortingState>([]);

  const baseColumns: ColumnDef<OrderProduct>[] = [
    {
      accessorKey: "name",
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
          productUrl: row.original.url,
          productId: row.original.productId,
        }),
    },
    {
      accessorKey: "quantity",
      sortingFn: "basic",
      header: ({ column }) =>
        renderComponent(SortableHeaderButton, {
          label: "Qty",
          onclick: column.getToggleSortingHandler(),
          sorted: column.getIsSorted(),
        }),
      cell: ({ row }) => {
        const qtySnippet = createRawSnippet(() => ({
          render: () => `<div>${row.original.quantity ?? 1}</div>`,
        }));
        return renderSnippet(qtySnippet);
      },
    },
    {
      accessorKey: "packaging",
      header: ({ column }) =>
        renderComponent(SortableHeaderButton, {
          label: "Pack",
          onclick: column.getToggleSortingHandler(),
          sorted: column.getIsSorted(),
        }),
      cell: ({ row }) => {
        const packSnippet = createRawSnippet(() => ({
          render: () => `<div>${row.original.packaging ?? "-"}</div>`,
        }));
        return renderSnippet(packSnippet);
      },
    },
    {
      accessorKey: "totalPrice",
      sortingFn: "basic",
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
              row.original.totalPrice !== undefined
                ? formatCurrency(
                    row.original.totalPrice,
                    row.original.currency ?? fallbackCurrency,
                  )
                : "-";
            return `<div class="text-right">${amount}</div>`;
          },
        }));
        return renderSnippet(amountSnippet);
      },
    },
  ];

  const statusColumn: ColumnDef<OrderProduct> = {
    accessorKey: "unavailable",
    sortingFn: "basic",
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
  };

  const addToListColumn: ColumnDef<OrderProduct> = {
    id: "actions",
    enableSorting: false,
    header: "Actions",
    cell: ({ row }) =>
      renderComponent(AddToListCell, {
        lists,
        action: addToListAction,
        productName: row.original.name,
        productId: row.original.productId,
        productUrl: row.original.url,
        packaging: row.original.packaging,
        quantity: row.original.quantity ?? 1,
      }),
  };

  const columns = $derived<ColumnDef<OrderProduct>[]>([
    ...baseColumns.slice(0, 3),
    ...(showStatusColumn ? [statusColumn] : []),
    ...baseColumns.slice(3),
    ...(showAddToListAction ? [addToListColumn] : []),
  ]);

  const table = createSvelteTable({
    get data() {
      return products;
    },
    get columns() {
      return columns;
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
</script>

<div class="rounded-md border overflow-hidden">
  <div class="flex items-center justify-between border-b px-3 py-2">
    <p class="text-sm text-muted-foreground">{products.length} products</p>
  </div>

  <Table.Root>
    <Table.Header>
      {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
        <Table.Row>
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
      {#each table.getRowModel().rows as row (row.id)}
        <Table.Row>
          {#each row.getVisibleCells() as cell (cell.id)}
            <Table.Cell
              class={cell.column.id === "totalPrice" ? "text-right" : undefined}
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
