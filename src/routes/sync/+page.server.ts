import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getOrderStats } from "$lib/server/db";
import {
  getAuthStatus,
  getMcpServerUrl,
  logoutAuth,
} from "$lib/server/carrefour-mcp";
import { syncOrders } from "$lib/server/sync";

export const load: PageServerLoad = async () => {
  return {
    stats: getOrderStats(),
    auth: await getAuthStatus().catch(() => ({ authenticated: false })),
    mcpServerUrl: getMcpServerUrl(),
  };
};

export const actions: Actions = {
  sync: async ({ request }) => {
    const formData = await request.formData();
    const rawLimit = Number(formData.get("limit") ?? 20);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 20;

    try {
      const result = await syncOrders(limit);
      return {
        success: true,
        message: `Synced ${result.orderCount} orders.`,
        syncedAt: result.syncedAt,
      };
    } catch (error) {
      return fail(500, {
        success: false,
        message: error instanceof Error ? error.message : "Sync failed",
      });
    }
  },
  logout: async () => {
    try {
      await logoutAuth();
      return { success: true, message: "Local session deleted." };
    } catch (error) {
      return fail(500, {
        success: false,
        message: error instanceof Error ? error.message : "Logout failed",
      });
    }
  },
};
