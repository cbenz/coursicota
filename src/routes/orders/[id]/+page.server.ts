import { error, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getStoredOrderById } from "$lib/server/db";
import {
  addItemToList,
  createProductList,
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
      addItemToList(targetListId, {
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
};
