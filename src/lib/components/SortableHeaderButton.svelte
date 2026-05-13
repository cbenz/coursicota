<script lang="ts">
  import ArrowDown from "@lucide/svelte/icons/arrow-down";
  import ArrowUp from "@lucide/svelte/icons/arrow-up";
  import ArrowUpDown from "@lucide/svelte/icons/arrow-up-down";
  import { Button } from "$lib/components/ui/button";

  type Props = {
    label: string;
    align?: "left" | "right";
    sorted?: false | "asc" | "desc";
    onclick?: (event: MouseEvent) => void;
  };

  let { label, align = "left", sorted = false, onclick }: Props = $props();
</script>

<Button
  variant="ghost"
  size="sm"
  class={align === "right"
    ? "-me-2 ms-auto flex w-full justify-end"
    : "-ms-2 flex"}
  {onclick}
>
  <span>{label}</span>
  {#if sorted === "asc"}
    <ArrowUp class="size-4" />
  {:else if sorted === "desc"}
    <ArrowDown class="size-4" />
  {:else}
    <ArrowUpDown class="size-4" />
  {/if}
</Button>
