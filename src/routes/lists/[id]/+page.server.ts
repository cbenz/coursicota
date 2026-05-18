import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  deleteProductList,
  getProductList,
  removeItemFromList,
  saveProductList,
} from "$lib/server/lists";
import { addToCart } from "$lib/server/carrefour-mcp";
import { getLatestAmountsForProducts } from "$lib/server/db";

export const load: PageServerLoad = async ({ params }) => {
  const list = getProductList(params.id);
  if (!list) {
    throw error(404, { message: "List not found" });
  }

  const latestAmounts = getLatestAmountsForProducts(
    list.items.map((item) => ({
      name: item.name,
      productId: item.productId,
      productUrl: item.productUrl,
    })),
  );

  const listItemsWithAmount = list.items.map((item) => {
    const lookupKey = item.productId?.trim()
      ? `id:${item.productId.trim().toLowerCase()}`
      : item.productUrl?.trim()
        ? `url:${item.productUrl.trim().toLowerCase()}`
        : `name:${item.name.trim().toLowerCase()}`;
    const latestAmount = latestAmounts.get(lookupKey);

    return {
      ...item,
      latestAmount: latestAmount?.amount,
      latestAmountCurrency: latestAmount?.currency,
    };
  });

  return {
    list: {
      ...list,
      items: listItemsWithAmount,
    },
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
  removeItem: async ({ params, request }) => {
    const list = getProductList(params.id);
    if (!list) {
      throw error(404, { message: "List not found" });
    }

    const formData = await request.formData();
    const itemId = String(formData.get("itemId") ?? "").trim();

    if (!itemId) {
      return fail(400, { message: "Item id is required." });
    }

    const itemExists = list.items.some((item) => item.id === itemId);
    if (!itemExists) {
      return fail(404, { message: "List item not found." });
    }

    removeItemFromList(params.id, itemId);
    return { success: true, message: "Product removed from list." };
  },
};
