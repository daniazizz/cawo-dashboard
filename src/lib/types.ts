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

// Ad-hoc money owed to/by CAWO. amount > 0 = receivable (owed to CAWO), amount < 0 = payable (CAWO owes).
export interface OtherBalance {
  id: string;
  name: string;
  amount: number;
  note: string | null;
  createdAt: string;
}

export interface OverviewResponse {
  cash: CashBalance[];
  inventory: InventoryItem[];
  liabilities: Liability[];
  recurringCosts: RecurringCost[];
  otherBalances: OtherBalance[];
  totals: {
    currency: "EUR";
    totalCash: number;
    totalInventoryValue: number;
    totalLiabilities: number;
    totalOtherBalances: number;
    netPosition: number;
    monthlyRecurringCosts: number;
  };
  generatedAt: string;
  errors?: string[];
}
