<script lang="ts">
  import OrderProductsTable from "$lib/components/OrderProductsTable.svelte";
  import {
    Alert,
    AlertDescription,
    AlertTitle,
  } from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import * as Field from "$lib/components/ui/field";
  import { Input } from "$lib/components/ui/input";

  let { data, form } = $props();

  const products = $derived(
    data.list.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      packaging: item.unit,
      unavailable: !item.checked,
      totalPrice: undefined,
      currency: undefined,
      url: item.productUrl,
      productId: item.productId,
    })),
  );
</script>

<svelte:head>
  <title>{data.list.name}</title>
</svelte:head>

<section class="grid gap-6">
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <p class="text-sm text-muted-foreground">List details</p>
      <h1 class="text-3xl font-display">{data.list.name}</h1>
      <p class="text-sm text-muted-foreground">Source: {data.list.source}</p>
    </div>
    <Button href="/lists" variant="outline" size="sm">Back to lists</Button>
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
    <OrderProductsTable
      products={products}
      showStatusColumn={false}
      showAddToListAction={false}
    />
  {:else}
    <Alert>
      <AlertTitle>List is empty</AlertTitle>
      <AlertDescription>
        Add products from Products, Orders, or a product detail page.
      </AlertDescription>
    </Alert>
  {/if}
</section>
