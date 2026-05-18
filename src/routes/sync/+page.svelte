<script lang="ts">
  import Info from "@lucide/svelte/icons/info";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import { formatDate } from "$lib/format";
  import {
    Alert,
    AlertDescription,
    AlertTitle,
  } from "$lib/components/ui/alert";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Separator } from "$lib/components/ui/separator";
  import { getSyncProgress, runSyncOrders } from "./sync.remote";

  let { data } = $props();
  const syncProgress = getSyncProgress();
  const fallbackProgress = {
    stage: "idle",
    message: "Ready to sync orders.",
    processedOrders: 0,
    totalOrders: 0,
    currentOrderId: null,
    startedAt: null,
    syncedAt: null,
    error: null,
  };
  const progress = $derived(syncProgress.current ?? fallbackProgress);

  const stageLabels: Record<string, string> = {
    idle: "Ready",
    preparing: "Preparing",
    listing: "Listing orders",
    "syncing-order": "Syncing orders",
    saving: "Saving",
    completed: "Completed",
    failed: "Failed",
  };

  const stageLabel = (stage: string) => stageLabels[stage] ?? stage;
</script>

<svelte:head>
  <title>Sync</title>
</svelte:head>

<section class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
  <Card.Root>
    <Card.Header>
      <Card.Description>Database sync</Card.Description>
      <Card.Title class="font-display text-3xl"
        >Synchronize local orders</Card.Title
      >
      <Card.Description>
        Pull orders and product lines from carrefour-mcp into the local SQLite
        database.
      </Card.Description>
    </Card.Header>

    <Card.Content class="space-y-4">
      {#if runSyncOrders.result?.message}
        <Alert
          variant={runSyncOrders.result?.success ? "default" : "destructive"}
        >
          <AlertTitle
            >{runSyncOrders.result.success ? "Done" : "Sync failed"}</AlertTitle
          >
          <AlertDescription>{runSyncOrders.result.message}</AlertDescription>
        </Alert>
      {/if}

      <form {...runSyncOrders} class="space-y-4">
        <Button type="submit" class="w-full">Run sync</Button>
      </form>

      <Card.Root class="border-dashed" size="sm">
        <Card.Header class="gap-2">
          <div class="flex items-center justify-between gap-3">
            <Card.Description>Live sync status</Card.Description>
            <Badge
              variant={progress.stage === "failed"
                ? "destructive"
                : progress.stage === "completed"
                  ? "default"
                  : "outline"}
            >
              {stageLabel(progress.stage)}
            </Badge>
          </div>
          <Card.Title class="text-base font-semibold">
            {progress.message}
          </Card.Title>
          <Card.Description>
            {syncProgress.connected
              ? "Live stream connected"
              : "Reconnecting live stream..."}
          </Card.Description>
        </Card.Header>
        <Card.Content
          class="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2"
        >
          <p>
            Processed: <span class="font-medium text-foreground">
              {progress.processedOrders}
            </span>
            / {progress.totalOrders}
          </p>
          <p>
            Current order: <span class="font-medium text-foreground">
              {progress.currentOrderId ?? "-"}
            </span>
          </p>
          <p>
            Started: <span class="font-medium text-foreground">
              {progress.startedAt ? formatDate(progress.startedAt) : "-"}
            </span>
          </p>
          <p>
            Last sync: <span class="font-medium text-foreground">
              {progress.syncedAt ? formatDate(progress.syncedAt) : "-"}
            </span>
          </p>
          {#if progress.error}
            <p class="sm:col-span-2 text-destructive">
              Error: {progress.error}
            </p>
          {/if}
        </Card.Content>
      </Card.Root>

      <div class="grid gap-3 sm:grid-cols-2">
        <Card.Root size="sm">
          <Card.Header class="gap-1">
            <Card.Description>Orders</Card.Description>
            <Card.Title class="text-xl font-semibold"
              >{data.stats.orderCount}</Card.Title
            >
          </Card.Header>
        </Card.Root>
        <Card.Root size="sm">
          <Card.Header class="gap-1">
            <Card.Description>Products</Card.Description>
            <Card.Title class="text-xl font-semibold"
              >{data.stats.storedProductCount}</Card.Title
            >
          </Card.Header>
        </Card.Root>
      </div>

      {#if runSyncOrders.result?.syncedAt}
        <p class="text-xs text-muted-foreground">
          Last sync: {formatDate(runSyncOrders.result.syncedAt)}
        </p>
      {/if}
    </Card.Content>
  </Card.Root>

  <Card.Root>
    <Card.Header>
      <div class="flex items-center gap-3">
        <Info class="text-primary" />
        <Card.Title class="font-display text-2xl">Login workflow</Card.Title>
      </div>
      <Card.Action>
        <Badge variant={data.auth.authenticated ? "default" : "outline"}>
          {data.auth.authenticated ? "Session active" : "No valid session"}
        </Badge>
      </Card.Action>
    </Card.Header>

    <Card.Content class="space-y-4">
      <Separator />
      <ol class="space-y-4 text-sm text-muted-foreground">
        <li class="space-y-2">
          <strong class="text-foreground">1. Launch remote Chromium</strong>
          <p>In your terminal, run:</p>
          <code
            class="block break-all bg-secondary px-2 py-1 text-xs font-mono text-foreground"
          >
            pnpm cli auth_login
          </code>
          <p>
            The command prints an SSH `-Y` launch command for Chromium on the
            remote server.
          </p>
        </li>

        <li class="space-y-2">
          <strong class="text-foreground"
            >2. Complete Carrefour authentication</strong
          >
          <p>
            Log in and complete any security challenge in the opened browser.
          </p>
        </li>

        <li class="space-y-2">
          <strong class="text-foreground">3. Capture the auth state</strong>
          <p>In your terminal, run:</p>
          <code
            class="block break-all bg-secondary px-2 py-1 text-xs font-mono text-foreground"
          >
            pnpm cli auth_capture_state --cdp-url http://127.0.0.1:9222
          </code>
        </li>
      </ol>
    </Card.Content>

    <Card.Footer>
      <form method="POST" action="?/logout" class="w-full">
        <Button type="submit" variant="outline" class="w-full">
          Delete local session
        </Button>
      </form>
    </Card.Footer>
  </Card.Root>
</section>
