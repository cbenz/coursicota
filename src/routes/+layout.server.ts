import type { LayoutServerLoad } from "./$types";
import { getAuthStatus } from "$lib/server/carrefour-mcp";

export const load: LayoutServerLoad = async () => {
  const auth = await getAuthStatus().catch(() => ({ authenticated: false }));

  return {
    auth,
  };
};
