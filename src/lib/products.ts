import type { ProductFrequencyRow } from "$lib/types/products";

export type ProductOccurrenceRow = {
	orderId: string;
	orderedAt: string;
	productId?: string;
	productUrl?: string;
	name: string;
	packaging?: string;
	quantity?: number;
	unitPrice?: number;
	currency?: string;
};

export type OrderDateRow = {
	orderId: string;
	orderedAt: string;
};

type AggregateBucket = {
	productId?: string;
	productUrl?: string;
	name: string;
	packaging?: string;
	orderIds: Set<string>;
	lastOrderedAtMs: number;
	lastOrderedAt?: string;
	latestAmountAtMs: number;
	latestAmount?: number;
	latestAmountCurrency?: string;
	quantitySum: number;
	quantityCount: number;
};

function getIdentityKey(input: {
	productId?: string;
	productUrl?: string;
	name: string;
}): string {
	const productId = input.productId?.trim();
	if (productId) {
		return `id:${productId}`;
	}

	const productUrl = input.productUrl?.trim();
	if (productUrl) {
		return `url:${productUrl}`;
	}

	return `name:${input.name}`;
}

function toTimestamp(value: string): number {
	const time = Date.parse(value);
	return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
}

export function normalizeSearchText(value: string): string {
	return value
		.toLowerCase()
		.replace(/œ/g, "oe")
		.replace(/æ/g, "ae")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[’']/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

export function aggregateProductsByOrderWindow(input: {
	orderDates: OrderDateRow[];
	occurrences: ProductOccurrenceRow[];
	windowStartIso?: string;
}): ProductFrequencyRow[] {
	const { orderDates, occurrences, windowStartIso } = input;
	const windowStartMs = windowStartIso
		? toTimestamp(windowStartIso)
		: Number.NEGATIVE_INFINITY;

	const eligibleOrderIds = new Set<string>();
	for (const order of orderDates) {
		if (toTimestamp(order.orderedAt) >= windowStartMs) {
			eligibleOrderIds.add(order.orderId);
		}
	}

	const totalOrdersInWindow = Math.max(1, eligibleOrderIds.size);
	const byKey = new Map<string, AggregateBucket>();

	for (const occurrence of occurrences) {
		if (!eligibleOrderIds.has(occurrence.orderId)) {
			continue;
		}

		const key = getIdentityKey(occurrence);
		const existing = byKey.get(key);
		const orderedAtMs = toTimestamp(occurrence.orderedAt);

		if (!existing) {
			const bucket: AggregateBucket = {
				productId: occurrence.productId,
				productUrl: occurrence.productUrl,
				name: occurrence.name,
				packaging: occurrence.packaging,
				orderIds: new Set([occurrence.orderId]),
				lastOrderedAtMs: orderedAtMs,
				lastOrderedAt: occurrence.orderedAt,
				latestAmountAtMs:
					typeof occurrence.unitPrice === "number"
						? orderedAtMs
						: Number.NEGATIVE_INFINITY,
				latestAmount: occurrence.unitPrice,
				latestAmountCurrency:
					typeof occurrence.unitPrice === "number"
						? occurrence.currency
						: undefined,
				quantitySum: Math.max(1, occurrence.quantity ?? 1),
				quantityCount: 1,
			};
			byKey.set(key, bucket);
			continue;
		}

		existing.orderIds.add(occurrence.orderId);
		if (!existing.productId && occurrence.productId) {
			existing.productId = occurrence.productId;
		}
		if (!existing.productUrl && occurrence.productUrl) {
			existing.productUrl = occurrence.productUrl;
		}
		if (!existing.packaging && occurrence.packaging) {
			existing.packaging = occurrence.packaging;
		}
		if (orderedAtMs > existing.lastOrderedAtMs) {
			existing.lastOrderedAtMs = orderedAtMs;
			existing.lastOrderedAt = occurrence.orderedAt;
		}
		if (
			typeof occurrence.unitPrice === "number" &&
			orderedAtMs >= existing.latestAmountAtMs
		) {
			existing.latestAmountAtMs = orderedAtMs;
			existing.latestAmount = occurrence.unitPrice;
			existing.latestAmountCurrency = occurrence.currency;
		}
		existing.quantitySum += Math.max(1, occurrence.quantity ?? 1);
		existing.quantityCount += 1;
	}

	return Array.from(byKey.values())
		.map(
			(bucket): ProductFrequencyRow => ({
				productId: bucket.productId,
				productUrl: bucket.productUrl,
				name: bucket.name,
				packaging: bucket.packaging,
				occurrences: bucket.orderIds.size,
				orderFrequency: bucket.orderIds.size / totalOrdersInWindow,
				lastOrderedAt: bucket.lastOrderedAt,
				latestAmount: bucket.latestAmount,
				latestAmountCurrency: bucket.latestAmountCurrency,
				suggestedQuantity: Math.max(
					1,
					Math.round(bucket.quantitySum / Math.max(1, bucket.quantityCount)),
				),
			}),
		)
		.sort((left, right) => {
			if (right.occurrences !== left.occurrences) {
				return right.occurrences - left.occurrences;
			}
			return left.name.localeCompare(right.name);
		});
}
