<script lang="ts">
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import type { ColumnDef, SortingState } from "@tanstack/table-core";
  import { getCoreRowModel, getSortedRowModel } from "@tanstack/table-core";
  import { formatCurrency } from "$lib/format";
  import ProductHoverCardLink from "$lib/components/ProductHoverCardLink.svelte";
  import SortableHeaderButton from "$lib/components/SortableHeaderButton.svelte";
  import {
    Alert,
    AlertDescription,
    AlertTitle,
  } from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import * as Field from "$lib/components/ui/field";
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

  const failedCartItems = $derived(
    form?.cartResult?.results?.filter((result) => !result.success) ?? [],
  );

  type ListProductRow = (typeof data.list.items)[number];
  const products = $derived(data.list.items);

  let sorting = $state<SortingState>([]);

  const columns: ColumnDef<ListProductRow>[] = [
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
          productId: row.original.productId,
          productUrl: row.original.productUrl,
        }),
    },
    {
      accessorKey: "quantity",
      sortingFn: "basic",
      header: ({ column }) =>
        renderComponent(SortableHeaderButton, {
          label: "Quantity",
          onclick: column.getToggleSortingHandler(),
          sorted: column.getIsSorted(),
        }),
      cell: ({ row }) => {
        const quantitySnippet = createRawSnippet(() => ({
          render: () => `<span>${row.original.quantity}</span>`,
        }));
        return renderSnippet(quantitySnippet);
      },
    },
    {
      accessorKey: "latestAmount",
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
      id: "actions",
      enableSorting: false,
      header: "Actions",
      cell: ({ row }) => {
        const removeSnippet = createRawSnippet(() => ({
          render: () =>
            `<form method="POST" action="?/removeItem" onsubmit="return confirm('Remove this product from the list?')"><input type="hidden" name="itemId" value="${row.original.id}" /><button type="submit" class="inline-flex h-8 items-center justify-center rounded-md border border-destructive/40 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10">Remove</button></form>`,
        }));
        return renderSnippet(removeSnippet);
      },
    },
  ];

  const table = createSvelteTable({
    get data() {
      return products;
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
</script>

<svelte:head>
  <title>{data.list.name}</title>
</svelte:head>

<section class="grid gap-6">
  <div>
    <Button href="/lists" variant="outline" size="sm" class="w-fit">
      <ArrowLeft class="mr-2 size-4" />
      Back
    </Button>
  </div>

  <div>
    <p class="text-sm text-muted-foreground">List details</p>
    <h1 class="text-3xl font-display">{data.list.name}</h1>
    <p class="text-sm text-muted-foreground">Source: {data.list.source}</p>
  </div>

  {#if form?.message}
    <Alert variant={form?.success ? "default" : "destructive"}>
      <AlertTitle>{form.success ? "Done" : "Action failed"}</AlertTitle>
      <AlertDescription>{form.message}</AlertDescription>
    </Alert>
  {/if}

  <div class="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
    <form method="POST" action="?/rename" class="space-y-2">
      <Field.Field>
        <Field.Label for="list-name">Rename list</Field.Label>
        <Input id="list-name" name="name" value={data.list.name} />
      </Field.Field>
      <Button type="submit" variant="outline">Save name</Button>
    </form>

    <form
      method="POST"
      action="?/deleteList"
      onsubmit={(event) => {
        if (!confirm("Delete this list? This action cannot be undone.")) {
          event.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="destructive">Delete list</Button>
    </form>
  </div>

  {#if products.length > 0}
    <div class="rounded-md border overflow-hidden">
      <div class="border-b px-3 py-2">
        <p class="text-sm text-muted-foreground">{rows.length} products</p>
      </div>

      <Table.Root>
        <Table.Header>
          {#each headerGroups as headerGroup (headerGroup.id)}
            <Table.Row>
              {#each headerGroup.headers as header (header.id)}
                <Table.Head
                  class={header.column.id === "latestAmount" ? "text-right" : undefined}
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
            <Table.Row>
              {#each row.getVisibleCells() as cell (cell.id)}
                <Table.Cell
                  class={cell.column.id === "latestAmount" ? "text-right" : undefined}
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

    <form
      method="POST"
      action="?/addToCart"
      onsubmit={(event) => {
        if (
          !confirm(
            "This will add the products to your cart on carrefour.fr. Do you want to continue?",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="default">Add to Carrefour cart</Button>
    </form>

    {#if form?.cartResult}
      <Alert variant={form.cartResult.failed > 0 ? "destructive" : "default"}>
        <AlertTitle>
          {form.cartResult.added} added, {form.cartResult.failed} failed
        </AlertTitle>
        <AlertDescription>
          {#if failedCartItems.length > 0}
            <div class="mb-3">
              <p class="mb-1 text-sm font-medium">Failed products:</p>
              <ul class="list-disc space-y-1 pl-5 text-sm">
                {#each failedCartItems as failedItem (failedItem.productUrl)}
                  <li>
                    <span class="font-medium">{failedItem.name}</span>
                    {#if failedItem.message}
                      <span class="text-muted-foreground"> - {failedItem.message}</span>
                    {/if}
                  </li>
                {/each}
              </ul>
            </div>
          {/if}

          <form
            method="GET"
            action={form.cartResult.cartUrl}
            target="_blank"
            class="inline"
          >
            <button
              type="submit"
              class="underline underline-offset-4"
            >
              Open cart on carrefour.fr
            </button>
          </form>
        </AlertDescription>
      </Alert>
    {/if}
  {:else}
    <Alert>
      <AlertTitle>List is empty</AlertTitle>
      <AlertDescription>
        Add products from Products, Orders, or a product detail page.
      </AlertDescription>
    </Alert>
  {/if}
</section>
