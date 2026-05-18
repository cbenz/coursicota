import Database from "better-sqlite3";
import type {
	OrderDetails,
	OrderProduct,
	OrderStats,
} from "$lib/types/carrefour";
import { getDatabasePath } from "./paths";

let database: Database.Database | undefined;

function getDatabase(dbPath = getDatabasePath()): Database.Database {
	if (!database) {
		database = new Database(dbPath);
		database.pragma("journal_mode = WAL");
		database.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        ordered_at TEXT,
        billed INTEGER,
        delivery_type TEXT,
        delivery_address TEXT,
        delivery_slot TEXT,
        total REAL,
        currency TEXT,
        invoice_url TEXT,
        reorder_url TEXT,
        refund_url TEXT,
        unavailable_products_count INTEGER,
        synced_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS order_products (
        order_id TEXT NOT NULL,
        product_index INTEGER NOT NULL,
        name TEXT NOT NULL,
        product_id TEXT,
        unavailable INTEGER NOT NULL,
        quantity INTEGER,
        packaging TEXT,
        total_price REAL,
        unit_price REAL,
        currency TEXT,
        url TEXT,
        PRIMARY KEY (order_id, product_index),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS sync_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        synced_at TEXT NOT NULL,
        order_count INTEGER NOT NULL,
        source TEXT NOT NULL
      );
    `);
	}

	return database;
}

function mapProduct(row: Record<string, unknown>): OrderProduct {
	return {
		name: String(row.name),
		productId: row.product_id ? String(row.product_id) : undefined,
		unavailable: Boolean(row.unavailable),
		quantity: typeof row.quantity === "number" ? row.quantity : undefined,
		packaging: row.packaging ? String(row.packaging) : undefined,
		totalPrice:
			typeof row.total_price === "number" ? row.total_price : undefined,
		unitPrice: typeof row.unit_price === "number" ? row.unit_price : undefined,
		currency: row.currency ? String(row.currency) : undefined,
		url: row.url ? String(row.url) : undefined,
	};
}

export function upsertOrderDetails(
	order: OrderDetails,
	syncedAt: string,
): void {
	const db = getDatabase();
	const insertOrder = db.prepare(`
    INSERT INTO orders (
      id, url, ordered_at, billed, delivery_type, delivery_address, delivery_slot,
      total, currency, invoice_url, reorder_url, refund_url, unavailable_products_count, synced_at
    ) VALUES (
      @id, @url, @orderedAt, @billed, @deliveryType, @deliveryAddress, @deliverySlot,
      @total, @currency, @invoiceUrl, @reorderUrl, @refundUrl, @unavailableProductsCount, @syncedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      url = excluded.url,
      ordered_at = excluded.ordered_at,
      billed = excluded.billed,
      delivery_type = excluded.delivery_type,
      delivery_address = excluded.delivery_address,
      delivery_slot = excluded.delivery_slot,
      total = excluded.total,
      currency = excluded.currency,
      invoice_url = excluded.invoice_url,
      reorder_url = excluded.reorder_url,
      refund_url = excluded.refund_url,
      unavailable_products_count = excluded.unavailable_products_count,
      synced_at = excluded.synced_at
  `);
	const deleteProducts = db.prepare(
		"DELETE FROM order_products WHERE order_id = ?",
	);
	const insertProduct = db.prepare(`
    INSERT INTO order_products (
      order_id, product_index, name, product_id, unavailable, quantity,
      packaging, total_price, unit_price, currency, url
    ) VALUES (
      @orderId, @productIndex, @name, @productId, @unavailable, @quantity,
      @packaging, @totalPrice, @unitPrice, @currency, @url
    )
  `);

	const transaction = db.transaction(() => {
		insertOrder.run({
			id: order.id,
			url: order.url,
			orderedAt: order.orderedAt ?? null,
			billed: order.billed === undefined ? null : Number(order.billed),
			deliveryType: order.deliveryType ?? null,
			deliveryAddress: order.deliveryAddress ?? null,
			deliverySlot: order.deliverySlot ?? null,
			total: order.total ?? null,
			currency: order.currency ?? null,
			invoiceUrl: order.invoiceUrl ?? null,
			reorderUrl: order.reorderUrl ?? null,
			refundUrl: order.refundUrl ?? null,
			unavailableProductsCount: order.unavailableProductsCount ?? null,
			syncedAt,
		});
		deleteProducts.run(order.id);

		order.products?.forEach((product, productIndex) => {
			insertProduct.run({
				orderId: order.id,
				productIndex,
				name: product.name,
				productId: product.productId ?? null,
				unavailable: Number(product.unavailable),
				quantity: product.quantity ?? null,
				packaging: product.packaging ?? null,
				totalPrice: product.totalPrice ?? null,
				unitPrice: product.unitPrice ?? null,
				currency: product.currency ?? null,
				url: product.url ?? null,
			});
		});
	});

	transaction();
}

export function recordSyncRun(
	orderCount: number,
	source: string,
	syncedAt: string,
): void {
	getDatabase()
		.prepare(
			"INSERT INTO sync_runs (synced_at, order_count, source) VALUES (?, ?, ?)",
		)
		.run(syncedAt, orderCount, source);
}

export function listStoredOrders(): OrderDetails[] {
	const db = getDatabase();
	const orders = db
		.prepare(
			"SELECT * FROM orders ORDER BY COALESCE(ordered_at, synced_at) DESC",
		)
		.all() as Record<string, unknown>[];
	const productsByOrder = db
		.prepare("SELECT * FROM order_products ORDER BY order_id, product_index")
		.all() as Record<string, unknown>[];

	const groupedProducts = new Map<string, OrderProduct[]>();
	for (const row of productsByOrder) {
		const orderId = String(row.order_id);
		const entries = groupedProducts.get(orderId) ?? [];
		entries.push(mapProduct(row));
		groupedProducts.set(orderId, entries);
	}

	return orders.map((row) => ({
		id: String(row.id),
		url: String(row.url),
		orderedAt: row.ordered_at ? String(row.ordered_at) : undefined,
		billed:
			row.billed === null || row.billed === undefined
				? undefined
				: Boolean(row.billed),
		deliveryType: row.delivery_type ? String(row.delivery_type) : undefined,
		deliveryAddress: row.delivery_address
			? String(row.delivery_address)
			: undefined,
		deliverySlot: row.delivery_slot ? String(row.delivery_slot) : undefined,
		total: typeof row.total === "number" ? row.total : undefined,
		currency: row.currency ? String(row.currency) : undefined,
		invoiceUrl: row.invoice_url ? String(row.invoice_url) : undefined,
		reorderUrl: row.reorder_url ? String(row.reorder_url) : undefined,
		refundUrl: row.refund_url ? String(row.refund_url) : undefined,
		unavailableProductsCount:
			typeof row.unavailable_products_count === "number"
				? row.unavailable_products_count
				: undefined,
		products: groupedProducts.get(String(row.id)) ?? [],
	}));
}

export function getStoredOrderById(orderId: string): OrderDetails | undefined {
	const db = getDatabase();
	const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as
		| Record<string, unknown>
		| undefined;

	if (!row) {
		return undefined;
	}

	const products = db
		.prepare(
			"SELECT * FROM order_products WHERE order_id = ? ORDER BY product_index",
		)
		.all(orderId) as Record<string, unknown>[];

	return {
		id: String(row.id),
		url: String(row.url),
		orderedAt: row.ordered_at ? String(row.ordered_at) : undefined,
		billed:
			row.billed === null || row.billed === undefined
				? undefined
				: Boolean(row.billed),
		deliveryType: row.delivery_type ? String(row.delivery_type) : undefined,
		deliveryAddress: row.delivery_address
			? String(row.delivery_address)
			: undefined,
		deliverySlot: row.delivery_slot ? String(row.delivery_slot) : undefined,
		total: typeof row.total === "number" ? row.total : undefined,
		currency: row.currency ? String(row.currency) : undefined,
		invoiceUrl: row.invoice_url ? String(row.invoice_url) : undefined,
		reorderUrl: row.reorder_url ? String(row.reorder_url) : undefined,
		refundUrl: row.refund_url ? String(row.refund_url) : undefined,
		unavailableProductsCount:
			typeof row.unavailable_products_count === "number"
				? row.unavailable_products_count
				: undefined,
		products: products.map(mapProduct),
	};
}

export type ProductFrequencyRow = {
	productId?: string;
	productUrl?: string;
	name: string;
	packaging?: string;
	occurrences: number;
	orderFrequency: number;
	lastOrderedAt?: string;
	latestAmount?: number;
	latestAmountCurrency?: string;
	suggestedQuantity: number;
};

export function listProductsByFrequency(): ProductFrequencyRow[] {
	const db = getDatabase();
	const orderCountRow = db
		.prepare("SELECT COUNT(*) AS count FROM orders")
		.get() as { count: number };
	const totalOrders = Math.max(1, orderCountRow.count);

	const rows = db
		.prepare(
			`
			WITH aggregated_products AS (
				SELECT
					COALESCE(order_products.product_id, order_products.url, order_products.name) AS key,
					order_products.product_id,
					order_products.url,
					order_products.name,
					order_products.packaging,
					COUNT(DISTINCT order_products.order_id) AS occurrences,
					MAX(COALESCE(orders.ordered_at, orders.synced_at)) AS last_ordered_at,
					ROUND(AVG(COALESCE(order_products.quantity, 1))) AS suggested_quantity
				FROM order_products
				LEFT JOIN orders ON orders.id = order_products.order_id
				GROUP BY key, order_products.product_id, order_products.url, order_products.name, order_products.packaging
			)
			SELECT
				aggregated_products.*,
				(
					SELECT latest_line.unit_price
					FROM order_products AS latest_line
					LEFT JOIN orders AS latest_order ON latest_order.id = latest_line.order_id
					WHERE COALESCE(latest_line.product_id, latest_line.url, latest_line.name) = aggregated_products.key
						AND latest_line.unit_price IS NOT NULL
					ORDER BY COALESCE(latest_order.ordered_at, latest_order.synced_at) DESC
					LIMIT 1
				) AS latest_amount,
				(
					SELECT latest_line.currency
					FROM order_products AS latest_line
					LEFT JOIN orders AS latest_order ON latest_order.id = latest_line.order_id
					WHERE COALESCE(latest_line.product_id, latest_line.url, latest_line.name) = aggregated_products.key
						AND latest_line.unit_price IS NOT NULL
					ORDER BY COALESCE(latest_order.ordered_at, latest_order.synced_at) DESC
					LIMIT 1
				) AS latest_amount_currency
			FROM aggregated_products
			ORDER BY aggregated_products.occurrences DESC, aggregated_products.name ASC
		`,
		)
		.all() as Record<string, unknown>[];

	return rows.map((row) => ({
		productId: row.product_id ? String(row.product_id) : undefined,
		productUrl: row.url ? String(row.url) : undefined,
		name: String(row.name),
		packaging: row.packaging ? String(row.packaging) : undefined,
		occurrences: Number(row.occurrences),
		orderFrequency: Number(row.occurrences) / totalOrders,
		lastOrderedAt: row.last_ordered_at
			? String(row.last_ordered_at)
			: undefined,
		latestAmount:
			typeof row.latest_amount === "number"
				? row.latest_amount
				: undefined,
		latestAmountCurrency: row.latest_amount_currency
			? String(row.latest_amount_currency)
			: undefined,
		suggestedQuantity: Math.max(1, Number(row.suggested_quantity ?? 1)),
	}));
}

export function getOrderStats(): OrderStats {
	const db = getDatabase();
	const row = db
		.prepare(
			`
      SELECT
        COUNT(*) AS order_count,
        COALESCE(SUM(total), 0) AS total_spend,
        MAX(ordered_at) AS latest_order_date,
        (SELECT COUNT(*) FROM order_products) AS stored_product_count
      FROM orders
    `,
		)
		.get() as Record<string, unknown>;

	return {
		orderCount: Number(row.order_count ?? 0),
		storedProductCount: Number(row.stored_product_count ?? 0),
		latestOrderDate: row.latest_order_date
			? String(row.latest_order_date)
			: undefined,
		totalSpend: Number(row.total_spend ?? 0),
	};
}

export type LatestProductAmount = {
	amount?: number;
	currency?: string;
	orderedAt?: string;
};

function identityKeyForLookup(input: {
	name?: string;
	productId?: string;
	productUrl?: string;
}): string {
	const productId = input.productId?.trim();
	if (productId) {
		return `id:${productId.toLowerCase()}`;
	}

	const productUrl = input.productUrl?.trim();
	if (productUrl) {
		return `url:${productUrl.toLowerCase()}`;
	}

	const name = input.name?.trim().toLowerCase() ?? "";
	return `name:${name}`;
}

export function getLatestAmountsForProducts(
	products: Array<{ name: string; productId?: string; productUrl?: string }>,
): Map<string, LatestProductAmount> {
	const db = getDatabase();
	const rows = db
		.prepare(
			`
      SELECT
        order_products.name,
        order_products.product_id,
        order_products.url,
        order_products.unit_price,
        order_products.currency,
        COALESCE(orders.ordered_at, orders.synced_at) AS ordered_at,
        ROW_NUMBER() OVER (
          PARTITION BY COALESCE(order_products.product_id, order_products.url, order_products.name)
          ORDER BY COALESCE(orders.ordered_at, orders.synced_at) DESC
        ) AS rank
      FROM order_products
      LEFT JOIN orders ON orders.id = order_products.order_id
      WHERE order_products.unit_price IS NOT NULL
    `,
		)
		.all() as Array<Record<string, unknown>>;

	const latestByIdentity = new Map<string, LatestProductAmount>();
	for (const row of rows) {
		if (Number(row.rank) !== 1) {
			continue;
		}

		const key = identityKeyForLookup({
			name: String(row.name ?? ""),
			productId: row.product_id ? String(row.product_id) : undefined,
			productUrl: row.url ? String(row.url) : undefined,
		});

		latestByIdentity.set(key, {
			amount:
				typeof row.unit_price === "number" ? row.unit_price : undefined,
			currency: row.currency ? String(row.currency) : undefined,
			orderedAt: row.ordered_at ? String(row.ordered_at) : undefined,
		});
	}

	const result = new Map<string, LatestProductAmount>();
	for (const product of products) {
		const lookupKey = identityKeyForLookup(product);
		const matched = latestByIdentity.get(lookupKey);
		if (matched) {
			result.set(lookupKey, matched);
		}
	}

	return result;
}

export function closeDatabase(): void {
	if (!database) {
		return;
	}

	database.close();
	database = undefined;
}
