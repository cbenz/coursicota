<script lang="ts">
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { cn } from "$lib/utils";

  type Props = {
    label: string;
    productName: string;
    productId?: string;
    productUrl?: string;
    class?: string;
  };

  let {
    label,
    productName,
    productId,
    productUrl,
    class: className,
  }: Props = $props();

  let open = $state(false);
  let imageUrl = $state<string | null>(null);
  let loading = $state(false);
  let loadedOnce = $state(false);

  async function loadPreviewImage(): Promise<void> {
    if (!productUrl || loadedOnce || loading) {
      return;
    }

    loading = true;
    loadedOnce = true;

    try {
      const response = await fetch(
        `/products/image-preview?url=${encodeURIComponent(productUrl)}`,
      );
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { imageUrl?: string | null };
      imageUrl = payload.imageUrl ?? null;
    } catch {
      imageUrl = null;
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (!open) {
      return;
    }

    void loadPreviewImage();
  });
</script>

<Tooltip.Root bind:open>
  <Tooltip.Trigger>
    {#snippet child({ props })}
      {#if productUrl}
        <button
          type="button"
          {...props}
          onclick={() => {
            window.open(productUrl, "_blank", "noopener,noreferrer");
          }}
          onmouseenter={() => void loadPreviewImage()}
          class={cn(
            "block w-full truncate text-left font-medium underline-offset-4 hover:underline",
            className,
          )}
        >
          {label}
        </button>
      {:else}
        <span
          {...props}
          class={cn("block truncate font-medium", className)}
        >
          {label}
        </span>
      {/if}
    {/snippet}
  </Tooltip.Trigger>

  <Tooltip.Content
    side="right"
    align="start"
    sideOffset={10}
    class="w-56 rounded-md border border-border bg-background p-2 text-left text-foreground shadow-md"
    arrowClasses="bg-background"
  >
    <div class="grid gap-2">
      <p class="truncate text-xs font-medium">{productName}</p>
      {#if productId}
        <p class="truncate text-[11px] text-muted-foreground">ID: {productId}</p>
      {/if}

      <div class="bg-muted/40 flex aspect-square items-center justify-center overflow-hidden rounded-sm border border-border">
        {#if loading}
          <span class="text-xs text-muted-foreground">Loading photo...</span>
        {:else if imageUrl}
          <img
            src={imageUrl}
            alt={`Photo of ${productName}`}
            class="h-full w-full object-contain"
            loading="lazy"
          />
        {:else}
          <span class="px-3 text-center text-xs text-muted-foreground">
            Photo unavailable
          </span>
        {/if}
      </div>
    </div>
  </Tooltip.Content>
</Tooltip.Root>
