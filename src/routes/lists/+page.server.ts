import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  createProductList,
  deleteProductList,
  listProductLists,
} from "$lib/server/lists";

export const load: PageServerLoad = async () => {
  return {
    lists: listProductLists().map((list) => ({
      id: list.id,
      name: list.name,
      itemCount: list.items.length,
      updatedAt: list.updatedAt,
    })),
  };
};

export const actions: Actions = {
  create: async ({ request }) => {
    const formData = await request.formData();
    const name = String(formData.get("name") ?? "").trim();

    if (!name) {
      return fail(400, { message: "List name is required." });
    }

    const list = createProductList(name);
    throw redirect(303, `/lists/${list.id}`);
  },
  delete: async ({ request }) => {
    const formData = await request.formData();
    const listId = String(formData.get("listId") ?? "").trim();

    if (!listId) {
      return fail(400, { message: "List id is required." });
    }

    try {
      deleteProductList(listId);
      return { success: true, message: "List deleted." };
    } catch (error) {
      return fail(500, {
        message: error instanceof Error ? error.message : "Delete failed",
      });
    }
  },
};
