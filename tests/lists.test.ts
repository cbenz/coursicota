import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addItemToList,
  createProductList,
  deleteProductList,
  getProductList,
  listProductLists,
} from "../src/lib/server/lists";

describe("list storage", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), "coursicota-lists-"));
    process.env.COURSICOTA_LISTS_DIR = tempDir;
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    delete process.env.COURSICOTA_LISTS_DIR;
  });

  it("creates and persists a local list", () => {
    const list = createProductList("Courses du lundi");
    addItemToList(list.id, {
      name: "Pâtes complètes",
      quantity: 2,
      productId: "1234567890",
      productUrl: "https://www.carrefour.fr/p/pates-1234567890",
    });

    const stored = getProductList(list.id);

    expect(stored?.name).toBe("Courses du lundi");
    expect(stored?.items).toHaveLength(1);
    expect(stored?.items[0]?.name).toBe("Pâtes complètes");
    expect(listProductLists()).toHaveLength(1);
  });

  it("deletes a list", () => {
    const list = createProductList("Temporaire");

    deleteProductList(list.id);

    expect(getProductList(list.id)).toBeUndefined();
  });
});
