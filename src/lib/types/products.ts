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
