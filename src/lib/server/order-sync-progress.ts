import { nowIso } from "./utils";

export type SyncProgressStage =
  | "idle"
  | "preparing"
  | "listing"
  | "syncing-order"
  | "saving"
  | "completed"
  | "failed";

export type SyncProgressState = {
  revision: number;
  stage: SyncProgressStage;
  message: string;
  totalOrders: number;
  processedOrders: number;
  currentOrderId: string | null;
  startedAt: string | null;
  syncedAt: string | null;
  orderCount: number | null;
  error: string | null;
};

const createInitialState = (): SyncProgressState => ({
  revision: 0,
  stage: "idle",
  message: "Ready to sync orders.",
  totalOrders: 0,
  processedOrders: 0,
  currentOrderId: null,
  startedAt: null,
  syncedAt: null,
  orderCount: null,
  error: null,
});

let state = createInitialState();

const commitState = (patch: Partial<Omit<SyncProgressState, "revision">>) => {
  state = {
    ...state,
    ...patch,
    revision: state.revision + 1,
  };
};

export function resetSyncProgress(limit: number | undefined) {
  state = createInitialState();
  commitState({
    stage: "preparing",
    message:
      typeof limit === "number"
        ? `Preparing sync for up to ${limit} orders.`
        : "Preparing sync for all listed orders.",
    totalOrders: typeof limit === "number" ? limit : 0,
    processedOrders: 0,
    currentOrderId: null,
    startedAt: nowIso(),
    syncedAt: null,
    orderCount: null,
    error: null,
  });
}

export function setSyncProgress(
  patch: Partial<Omit<SyncProgressState, "revision">>,
) {
  commitState(patch);
}

export function markSyncFailed(message: string) {
  commitState({
    stage: "failed",
    message,
    error: message,
    currentOrderId: null,
  });
}

export function getSyncProgressState(): SyncProgressState {
  return state;
}
