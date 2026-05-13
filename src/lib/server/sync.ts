import type { OrderDetails, OrderSummary } from "$lib/types/carrefour";
import { getRemoteOrderDetails, listRemoteOrders } from "./carrefour-mcp";
import { recordSyncRun, upsertOrderDetails } from "./db";
import { nowIso } from "./utils";

export type SyncOrdersProgressUpdate = {
  stage: "preparing" | "listing" | "syncing-order" | "saving" | "completed";
  message: string;
  totalOrders: number;
  processedOrders: number;
  currentOrderId: string | null;
  syncedAt?: string;
  orderCount?: number;
};

type SyncOrdersProgressCallback = (update: SyncOrdersProgressUpdate) => void;

export type SyncOrdersResult = {
  syncedAt: string;
  orderCount: number;
  orders: OrderDetails[];
};

export async function syncOrders(
  limit?: number,
  onProgress?: SyncOrdersProgressCallback,
): Promise<SyncOrdersResult> {
  const syncedAt = nowIso();
  const emitProgress = (update: SyncOrdersProgressUpdate) => {
    onProgress?.({ ...update, syncedAt });
  };

  emitProgress({
    stage: "preparing",
    message:
      typeof limit === "number"
        ? `Preparing sync for up to ${limit} orders.`
        : "Preparing sync for all listed orders.",
    totalOrders: typeof limit === "number" ? limit : 0,
    processedOrders: 0,
    currentOrderId: null,
  });

  const { orders } = await listRemoteOrders(limit);
  const syncableOrders = orders.filter(
    (order): order is OrderSummary & { id: string } => Boolean(order.id),
  );
  const syncedOrders: OrderDetails[] = [];

  emitProgress({
    stage: "listing",
    message: `Fetched ${syncableOrders.length} orders. Loading order details...`,
    totalOrders: syncableOrders.length,
    processedOrders: 0,
    currentOrderId: null,
  });

  for (const [index, order] of syncableOrders.entries()) {
    emitProgress({
      stage: "syncing-order",
      message: `Syncing order ${index + 1}/${syncableOrders.length}: ${order.id}.`,
      totalOrders: syncableOrders.length,
      processedOrders: syncedOrders.length,
      currentOrderId: order.id,
    });

    const details = await getRemoteOrderDetails(order.id);
    upsertOrderDetails(details, syncedAt);
    syncedOrders.push(details);

    emitProgress({
      stage: "syncing-order",
      message: `Synced order ${index + 1}/${syncableOrders.length}: ${order.id}.`,
      totalOrders: syncableOrders.length,
      processedOrders: syncedOrders.length,
      currentOrderId: order.id,
    });
  }

  emitProgress({
    stage: "saving",
    message: `Saving ${syncedOrders.length} synced orders.`,
    totalOrders: syncableOrders.length,
    processedOrders: syncedOrders.length,
    currentOrderId: null,
  });

  recordSyncRun(syncedOrders.length, "carrefour-mcp", syncedAt);

  emitProgress({
    stage: "completed",
    message: `Sync completed with ${syncedOrders.length} orders.`,
    totalOrders: syncableOrders.length,
    processedOrders: syncedOrders.length,
    currentOrderId: null,
    orderCount: syncedOrders.length,
  });

  return {
    syncedAt,
    orderCount: syncedOrders.length,
    orders: syncedOrders,
  };
}
