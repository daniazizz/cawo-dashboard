export interface CashBalance {
  source: string;
  currency: string;
  amount: number;
  capturedAt: string;
}

export interface InventoryItem {
  sku: string;
  productTitle: string;
  quantity: number;
  unitCost: number | null;
  capturedAt: string;
}

export interface Liability {
  name: string;
  amount: number;
  source: string;
  capturedAt: string;
}

export interface RecurringCost {
  id: string;
  name: string;
  amount: number;
  frequency: "weekly" | "monthly" | "yearly" | "one_time";
  category: string;
  active: boolean;
}

export interface OverviewResponse {
  cash: CashBalance[];
  inventory: InventoryItem[];
  liabilities: Liability[];
  recurringCosts: RecurringCost[];
  totals: {
    totalCash: number;
    totalInventoryValue: number;
    totalLiabilities: number;
    netPosition: number;
    monthlyRecurringCosts: number;
  };
  generatedAt: string;
  errors?: string[];
}
