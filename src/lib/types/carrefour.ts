export type OrderSummary = {
  id?: string;
  date?: string;
  total?: number;
  currency?: string;
  status?: string;
  timeSlot?: string;
  billed?: boolean;
  detailUrl?: string;
};

export type OrderProduct = {
  name: string;
  productId?: string;
  unavailable: boolean;
  quantity?: number;
  packaging?: string;
  totalPrice?: number;
  unitPrice?: number;
  currency?: string;
  url?: string;
};

export type OrderDetails = {
  id: string;
  url: string;
  orderedAt?: string;
  billed?: boolean;
  deliveryType?: string;
  deliveryAddress?: string;
  deliverySlot?: string;
  total?: number;
  currency?: string;
  invoiceUrl?: string;
  reorderUrl?: string;
  refundUrl?: string;
  unavailableProductsCount?: number;
  products?: OrderProduct[];
};

export type ProductListItem = {
  id: string;
  name: string;
  quantity: number;
  checked: boolean;
  productId?: string;
  productUrl?: string;
  unit?: string;
  note?: string;
  occurrences?: number;
};

export type ProductList = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  source: "manual" | "standard-basket";
  items: ProductListItem[];
};

export type OrderStats = {
  orderCount: number;
  storedProductCount: number;
  latestOrderDate?: string;
  totalSpend: number;
};
