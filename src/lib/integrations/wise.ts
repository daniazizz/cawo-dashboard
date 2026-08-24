// Fetches account balances from the Wise API for the configured profile.

interface WiseBalance {
  currency: string;
  amount: {
    value: number;
  };
  type: string;
}

export interface WiseCashBalance {
  source: "wise";
  currency: string;
  amount: number;
}

const WISE_API_BASE = "https://api.transferwise.com";

export async function fetchWiseBalances(): Promise<WiseCashBalance[]> {
  const token = process.env.WISE_API_TOKEN;
  const profileId = process.env.WISE_PROFILE_ID;

  if (!token || !profileId) {
    throw new Error("Missing WISE_API_TOKEN or WISE_PROFILE_ID environment variables");
  }

  const response = await fetch(
    `${WISE_API_BASE}/v4/profiles/${profileId}/balances?types=STANDARD,SAVINGS`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Wise API request failed: ${response.status} ${response.statusText} — ${body.slice(0, 300)}`);
  }

  const balances: WiseBalance[] = await response.json();

  return balances.map((balance) => ({
    source: "wise" as const,
    currency: balance.currency,
    amount: balance.amount.value,
  }));
}
