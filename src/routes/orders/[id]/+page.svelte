<script lang="ts">
  import { formatCurrency, formatDate } from "$lib/format";
  import OrderProductsTable from "$lib/components/OrderProductsTable.svelte";
  import {
    Alert,
    AlertDescription,
    AlertTitle,
  } from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";

  let { data, form } = $props();
</script>

<svelte:head>
  <title>Order {data.order.id}</title>
</svelte:head>

<section class="grid gap-6">
  <div>
    <div class="flex items-end justify-between gap-4">
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
      <Button href="/orders" variant="outline" size="sm">Back to orders</Button>
    </div>
  </div>

  {#if form?.message}
    <Alert variant={form?.success ? "default" : "destructive"}>
      <AlertTitle>{form.success ? "Done" : "Action failed"}</AlertTitle>
      <AlertDescription>{form.message}</AlertDescription>
    </Alert>
  {/if}

  {#if data.order.products && data.order.products.length > 0}
    <OrderProductsTable
      products={data.order.products}
      fallbackCurrency={data.order.currency ?? "EUR"}
      lists={data.lists}
      addToListAction="?/addToList"
    />
  {:else}
    <Alert>
      <AlertTitle>No product rows</AlertTitle>
      <AlertDescription>
        This order has no stored product details yet.
      </AlertDescription>
    </Alert>
  {/if}
</section>
