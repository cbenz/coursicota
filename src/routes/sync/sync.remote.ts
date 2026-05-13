import { form, query } from "$app/server";
import {
  getSyncProgressState,
  markSyncFailed,
  resetSyncProgress,
  setSyncProgress,
} from "$lib/server/order-sync-progress";
import { syncOrders } from "$lib/server/sync";

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const parseLimit = (value: unknown): number | undefined => {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (candidate === "" || candidate === null || candidate === undefined) {
    return undefined;
  }

  if (typeof candidate === "number" && Number.isFinite(candidate)) {
    return Math.min(100, Math.max(1, Math.floor(candidate)));
  }

  if (typeof candidate === "string") {
    const parsed = Number.parseInt(candidate, 10);

    if (Number.isFinite(parsed)) {
      return Math.min(100, Math.max(1, parsed));
    }
  }

  return undefined;
};

export const getSyncProgress = query.live(async function* () {
  let lastRevision = -1;

  while (true) {
    const snapshot = getSyncProgressState();

    if (snapshot.revision !== lastRevision) {
      lastRevision = snapshot.revision;
      yield { ...snapshot };
    }

    await delay(snapshot.stage === "idle" ? 250 : 120);
  }
});

export const runSyncOrders = form("unchecked", async (data) => {
  const limit = parseLimit(data.limit);

  resetSyncProgress(limit);

  try {
    const result = await syncOrders(limit, (progress) => {
      setSyncProgress(progress);
    });

    return {
      success: true,
      message: `Synced ${result.orderCount} orders.`,
      syncedAt: result.syncedAt,
      count: result.orderCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    markSyncFailed(message);

    return {
      success: false,
      message,
    };
  }
});
