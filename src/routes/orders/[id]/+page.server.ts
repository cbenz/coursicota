import { error, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getStoredOrderById } from "$lib/server/db";
import {
  addItemToList,
  createProductList,
  getProductList,
  listProductLists,
} from "$lib/server/lists";
import { ensurePositiveInteger } from "$lib/server/utils";

export const load: PageServerLoad = async ({ params }) => {
  const order = getStoredOrderById(params.id);
  if (!order) {
    throw error(404, { message: "Order not found" });
  }

  return {
    order,
    lists: listProductLists().map((list) => ({ id: list.id, name: list.name })),
  };
};

export const actions: Actions = {
  addToList: async ({ request }) => {
    const formData = await request.formData();

    const name = String(formData.get("name") ?? "").trim();
    const listId = String(formData.get("listId") ?? "").trim();
    const newListName = String(formData.get("newListName") ?? "").trim();

    if (!name) {
      return fail(400, { message: "Product name is required." });
    }

    let targetListId = listId;
    if (!targetListId && newListName) {
      targetListId = createProductList(newListName).id;
    }

    if (!targetListId) {
      return fail(400, { message: "Select a list or create a new one." });
    }

    try {
      const previousCount = getProductList(targetListId)?.items.length ?? 0;

      const updatedList = addItemToList(targetListId, {
        name,
        quantity: ensurePositiveInteger(Number(formData.get("quantity") ?? 1)),
        productId: String(formData.get("productId") ?? "").trim() || undefined,
        productUrl:
          String(formData.get("productUrl") ?? "").trim() || undefined,
        unit: String(formData.get("unit") ?? "").trim() || undefined,
        occurrences:
          Number.parseInt(String(formData.get("occurrences") ?? ""), 10) ||
          undefined,
      });

      if (updatedList.items.length === previousCount) {
        return { success: true, message: "Product is already in this list." };
      }

      return { success: true, message: "Product added to list." };
    } catch (error) {
      return fail(500, {
        message:
          error instanceof Error
            ? error.message
            : "Unable to add product to list.",
      });
    }
  },
  addSelectionToList: async ({ request }) => {
    const formData = await request.formData();

    const listId = String(formData.get("listId") ?? "").trim();
    const newListName = String(formData.get("newListName") ?? "").trim();
    const selectedItemsRaw = String(formData.get("selectedItems") ?? "[]");

    let targetListId = listId;
    if (!targetListId && newListName) {
      targetListId = createProductList(newListName).id;
    }

    if (!targetListId) {
      return fail(400, { message: "Select a list or create a new one." });
    }

    let parsedItems: unknown;
    try {
      parsedItems = JSON.parse(selectedItemsRaw);
    } catch {
      return fail(400, { message: "Invalid selection payload." });
    }

    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      return fail(400, { message: "Select at least one product." });
    }

    let addedCount = 0;

    try {
      for (const rawItem of parsedItems) {
        if (!rawItem || typeof rawItem !== "object") {
          continue;
        }

        const item = rawItem as Record<string, unknown>;
        const name = String(item.name ?? "").trim();
        if (!name) {
          continue;
        }

        const previousCount = getProductList(targetListId)?.items.length ?? 0;

        const updatedList = addItemToList(targetListId, {
          name,
          quantity: ensurePositiveInteger(Number(item.quantity ?? 1)),
          productId: String(item.productId ?? "").trim() || undefined,
          productUrl: String(item.productUrl ?? "").trim() || undefined,
          unit: String(item.unit ?? "").trim() || undefined,
          occurrences:
            Number.parseInt(String(item.occurrences ?? ""), 10) || undefined,
        });

        if (updatedList.items.length > previousCount) {
          addedCount += 1;
        }
      }

      if (addedCount === 0) {
        return fail(400, { message: "Select at least one valid product." });
      }

      return {
        success: true,
        message: `${addedCount} product${addedCount > 1 ? "s" : ""} added to list.`,
      };
    } catch (error) {
      return fail(500, {
        message:
          error instanceof Error
            ? error.message
            : "Unable to add selected products to list.",
      });
    }
  },
};
