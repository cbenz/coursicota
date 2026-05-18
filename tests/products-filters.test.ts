import { describe, expect, it } from "vitest";
import {
	aggregateProductsByOrderWindow,
	type OrderDateRow,
	type ProductOccurrenceRow,
	normalizeSearchText,
} from "../src/lib/products";

describe("product filters", () => {
	it("normalizes accents, ligatures and apostrophes", () => {
		expect(normalizeSearchText("Œuf")).toBe("oeuf");
		expect(normalizeSearchText("oeuf")).toBe("oeuf");
		expect(normalizeSearchText("Crème Brûlée")).toBe("creme brulee");
		expect(normalizeSearchText("Pim's")).toBe("pims");
		expect(normalizeSearchText("Pim’s")).toBe("pims");
	});

	it("aggregates products using only orders in the selected window", () => {
		const orderDates: OrderDateRow[] = [
			{ orderId: "o1", orderedAt: "2026-03-01T10:00:00.000Z" },
			{ orderId: "o2", orderedAt: "2025-08-15T10:00:00.000Z" },
			{ orderId: "o3", orderedAt: "2023-05-01T10:00:00.000Z" },
		];
		const occurrences: ProductOccurrenceRow[] = [
			{
				orderId: "o1",
				orderedAt: "2026-03-01T10:00:00.000Z",
				name: "Large eggs",
				productId: "egg-1",
				quantity: 2,
				unitPrice: 4,
				currency: "EUR",
			},
			{
				orderId: "o2",
				orderedAt: "2025-08-15T10:00:00.000Z",
				name: "Large eggs",
				productId: "egg-1",
				quantity: 1,
				unitPrice: 3,
				currency: "EUR",
			},
			{
				orderId: "o3",
				orderedAt: "2023-05-01T10:00:00.000Z",
				name: "Large eggs",
				productId: "egg-1",
				quantity: 6,
				unitPrice: 2,
				currency: "EUR",
			},
			{
				orderId: "o3",
				orderedAt: "2023-05-01T10:00:00.000Z",
				name: "Orange juice",
				productId: "juice-1",
				quantity: 1,
			},
		];

		const oneYearStartIso = "2025-05-18T00:00:00.000Z";
		const rows = aggregateProductsByOrderWindow({
			orderDates,
			occurrences,
			windowStartIso: oneYearStartIso,
		});

		expect(rows).toHaveLength(1);
		expect(rows[0]?.name).toBe("Large eggs");
		expect(rows[0]?.occurrences).toBe(2);
		expect(rows[0]?.orderFrequency).toBe(1);
		expect(rows[0]?.lastOrderedAt).toBe("2026-03-01T10:00:00.000Z");
		expect(rows[0]?.latestAmount).toBe(4);
		expect(rows[0]?.suggestedQuantity).toBe(2);
	});
});
