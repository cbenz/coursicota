import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  deleteProductList,
  getProductList,
  saveProductList,
} from "$lib/server/lists";
import { addToCart } from "$lib/server/carrefour-mcp";

export const load: PageServerLoad = async ({ params }) => {
  const list = getProductList(params.id);
  if (!list) {
    throw error(404, { message: "List not found" });
  }

  return {
    list,
  };
};

export const actions: Actions = {
  rename: async ({ params, request }) => {
    const list = getProductList(params.id);
    if (!list) {
      throw error(404, { message: "List not found" });
    }

    const formData = await request.formData();
    const name = String(formData.get("name") ?? "").trim();

    if (!name) {
      return fail(400, { message: "List name is required." });
    }

    saveProductList({ ...list, name });
    return { success: true };
  },
  deleteList: async ({ params }) => {
    deleteProductList(params.id);
    throw redirect(303, "/lists");
  },
  addToCart: async ({ params }) => {
    const list = getProductList(params.id);
    if (!list) {
      throw error(404, { message: "List not found" });
    }

    const items = list.items
      .filter((product) => Boolean(product.productUrl))
      .map((product) => ({
        name: product.name,
        productId: product.productId,
        productUrl: product.productUrl!,
        quantity: product.quantity ?? 1,
      }));

    if (items.length === 0) {
      return fail(400, { message: "No products with a URL in this list." });
    }

    try {
      const result = await addToCart(items);
      return { success: true, cartResult: result };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return fail(500, { message: `Failed to add to cart: ${message}` });
    }
  },
};
