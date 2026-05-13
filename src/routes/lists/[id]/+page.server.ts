import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  deleteProductList,
  getProductList,
  saveProductList,
} from "$lib/server/lists";

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
};
