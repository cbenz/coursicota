import type { PageServerLoad } from "./$types";
import { listStoredOrders } from "$lib/server/db";

export const load: PageServerLoad = async () => {
  return {
    orders: listStoredOrders(),
  };
};
