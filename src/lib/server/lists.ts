import { readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { ProductList, ProductListItem } from "$lib/types/carrefour";
import { getListsDir } from "./paths";
import { createId, nowIso, slugify } from "./utils";

const productListItemSchema = z.object({
	id: z.string(),
	name: z.string().min(1),
	quantity: z.number().int().positive(),
	checked: z.boolean(),
	productId: z.string().optional(),
	productUrl: z.string().optional(),
	unit: z.string().optional(),
	note: z.string().optional(),
	occurrences: z.number().int().positive().optional(),
});

const productListSchema = z.object({
	id: z.string(),
	name: z.string().min(1),
	createdAt: z.string(),
	updatedAt: z.string(),
	source: z.enum(["manual", "standard-basket"]),
	items: z.array(productListItemSchema),
});

function normalizeIdentityValue(value: string | undefined): string | undefined {
	const normalized = value?.trim();
	if (!normalized) {
		return undefined;
	}

	return normalized.toLowerCase();
}

function getItemIdentity(item: {
	name: string;
	productId?: string;
	productUrl?: string;
}): string {
	const productId = normalizeIdentityValue(item.productId);
	if (productId) {
		return `id:${productId}`;
	}

	const productUrl = normalizeIdentityValue(item.productUrl);
	if (productUrl) {
		return `url:${productUrl}`;
	}

	return `name:${normalizeIdentityValue(item.name) ?? ""}`;
}

function getListPath(id: string): string {
	return path.join(getListsDir(), `${id}.json`);
}

function parseList(raw: string): ProductList {
	return productListSchema.parse(JSON.parse(raw));
}

function writeList(list: ProductList): ProductList {
	writeFileSync(
		getListPath(list.id),
		`${JSON.stringify(list, null, 2)}\n`,
		"utf8",
	);
	return list;
}

export function listProductLists(): ProductList[] {
	return readdirSync(getListsDir(), { withFileTypes: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
		.map((entry) =>
			parseList(readFileSync(path.join(getListsDir(), entry.name), "utf8")),
		)
		.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getProductList(id: string): ProductList | undefined {
	try {
		return parseList(readFileSync(getListPath(id), "utf8"));
	} catch {
		return undefined;
	}
}

export function createProductList(
	name: string,
	source: ProductList["source"] = "manual",
): ProductList {
	const timestamp = nowIso();
	const baseSlug = slugify(name) || "liste";
	const list: ProductList = {
		id: `${baseSlug}-${createId("list").slice(-8)}`,
		name,
		createdAt: timestamp,
		updatedAt: timestamp,
		source,
		items: [],
	};

	return writeList(list);
}

export function saveProductList(list: ProductList): ProductList {
	const next: ProductList = {
		...list,
		updatedAt: nowIso(),
		items: list.items.map((item) => ({
			...item,
			quantity: Math.max(1, Math.floor(item.quantity)),
		})),
	};

	return writeList(productListSchema.parse(next));
}

export function deleteProductList(id: string): void {
	rmSync(getListPath(id), { force: true });
}

export function addItemToList(
	listId: string,
	item: Omit<ProductListItem, "id" | "checked">,
): ProductList {
	const list = getProductList(listId);
	if (!list) {
		throw new Error("List not found");
	}

	const targetIdentity = getItemIdentity(item);
	const alreadyExists = list.items.some(
		(existingItem) => getItemIdentity(existingItem) === targetIdentity,
	);

	// Keep list items deduplicated: re-adding an existing product is a no-op.
	if (alreadyExists) {
		return list;
	}

	list.items.push({
		id: createId("item"),
		checked: false,
		...item,
	});

	return saveProductList(list);
}

export function updateItemInList(
	listId: string,
	itemId: string,
	update: Partial<ProductListItem>,
): ProductList {
	const list = getProductList(listId);
	if (!list) {
		throw new Error("List not found");
	}

	list.items = list.items.map((item) =>
		item.id === itemId ? { ...item, ...update } : item,
	);
	return saveProductList(list);
}

export function removeItemFromList(
	listId: string,
	itemId: string,
): ProductList {
	const list = getProductList(listId);
	if (!list) {
		throw new Error("List not found");
	}

	list.items = list.items.filter((item) => item.id !== itemId);
	return saveProductList(list);
}

export function replaceListItems(
	listId: string,
	items: ProductListItem[],
): ProductList {
	const list = getProductList(listId);
	if (!list) {
		throw new Error("List not found");
	}

	return saveProductList({
		...list,
		items,
	});
}
