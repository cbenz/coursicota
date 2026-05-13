<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";

  type ListOption = {
    id: string;
    name: string;
  };

  type Props = {
    lists: ListOption[];
    action?: string;
    openUrl?: string;
    productName: string;
    productId?: string;
    productUrl?: string;
    packaging?: string;
    occurrences?: number;
    quantity?: number;
  };

  let {
    lists,
    action = "?/addToList",
    openUrl,
    productName,
    productId,
    productUrl,
    packaging,
    occurrences,
    quantity = 1,
  }: Props = $props();
</script>

<form
  method="POST"
  {action}
  class="flex flex-col gap-2 sm:flex-row sm:items-center"
>
  <input type="hidden" name="name" value={productName} />
  <input type="hidden" name="quantity" value={String(quantity)} />
  <input type="hidden" name="productId" value={productId ?? ""} />
  <input type="hidden" name="productUrl" value={productUrl ?? ""} />
  <input type="hidden" name="unit" value={packaging ?? ""} />
  <input
    type="hidden"
    name="occurrences"
    value={occurrences ? String(occurrences) : ""}
  />

  {#if openUrl}
    <button
      type="button"
      onclick={() => {
        window.open(openUrl, "_blank", "noopener,noreferrer");
      }}
      class="inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent"
    >
      Open
    </button>
  {/if}

  <select
    name="listId"
    class="h-8 rounded-md border border-border bg-background px-2 text-xs sm:min-w-36"
    aria-label="Select target list"
  >
    {#if lists.length === 0}
      <option value="">No list available</option>
    {:else}
      <option value="">Select list</option>
      {#each lists as list (list.id)}
        <option value={list.id}>{list.name}</option>
      {/each}
    {/if}
  </select>

  <Input
    name="newListName"
    placeholder="or create list"
    class="h-8 text-xs sm:w-36"
  />

  <Button type="submit" variant="outline" size="sm">Add to list</Button>
</form>
