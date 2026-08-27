// Queries the Shopify Admin GraphQL API for current inventory quantity per SKU.

export interface ShopifyInventoryItem {
  sku: string;
  productTitle: string;
  quantity: number;
}

const INVENTORY_QUERY = `
  query InventoryLevels($cursor: String) {
    productVariants(first: 100, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        sku
        inventoryQuantity
        product {
          title
        }
      }
    }
  }
`;

interface ProductVariantNode {
  sku: string | null;
  inventoryQuantity: number | null;
  product: {
    title: string;
  };
}

interface ShopifyGraphQLResponse {
  data?: {
    productVariants: {
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
      nodes: ProductVariantNode[];
    };
  };
  errors?: Array<{ message: string }>;
}

// Client credentials grant — exchanges the app's client ID/secret for a short-lived
// access token. Only works when the app and store belong to the same Shopify org.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(storeDomain: string): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing SHOPIFY_CLIENT_ID or SHOPIFY_CLIENT_SECRET environment variables",
    );
  }

  const response = await fetch(
    `https://${storeDomain}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Shopify token exchange failed: ${response.status} ${response.statusText} — ${body.slice(0, 300)}`,
    );
  }

  const {
    access_token,
    expires_in,
  }: { access_token: string; expires_in: number } = await response.json();

  cachedToken = {
    value: access_token,
    expiresAt: Date.now() + expires_in * 1000,
  };
  return access_token;
}

export async function fetchShopifyInventory(): Promise<ShopifyInventoryItem[]> {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;

  if (!storeDomain) {
    throw new Error("Missing SHOPIFY_STORE_DOMAIN environment variable");
  }

  const accessToken = await getAccessToken(storeDomain);

  const items: ShopifyInventoryItem[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await fetch(
      `https://${storeDomain}/admin/api/2024-10/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({ query: INVENTORY_QUERY, variables: { cursor } }),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Shopify API request failed: ${response.status} ${response.statusText} — ${body.slice(0, 300)}`,
      );
    }

    const json: ShopifyGraphQLResponse = await response.json();

    if (json.errors && json.errors.length > 0) {
      throw new Error(`Shopify GraphQL error: ${json.errors[0].message}`);
    }

    const variants = json.data?.productVariants;
    if (!variants) break;

    for (const node of variants.nodes) {
      if (!node.sku) continue;
      items.push({
        sku: node.sku,
        productTitle: node.product.title,
        quantity: node.inventoryQuantity ?? 0,
      });
    }

    hasNextPage = variants.pageInfo.hasNextPage;
    cursor = variants.pageInfo.endCursor;
  }

  return items;
}

export interface ShopifyPendingPayout {
  source: "shopify_payout";
  currency: string;
  amount: number;
}

interface ShopifyBalanceResponse {
  balance: Array<{ amount: string; currency: string }>;
}

// Money already collected via Shopify Payments but not yet paid out to the bank —
// requires the `shopify_payments_payouts` (or `shopify_payments_accounts`) scope,
// and only returns data for stores actually using Shopify Payments.
export async function fetchShopifyPendingPayout(): Promise<ShopifyPendingPayout[]> {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;

  if (!storeDomain) {
    throw new Error("Missing SHOPIFY_STORE_DOMAIN environment variable");
  }

  const accessToken = await getAccessToken(storeDomain);

  const response = await fetch(
    `https://${storeDomain}/admin/api/2024-10/shopify_payments/balance.json`,
    {
      headers: { "X-Shopify-Access-Token": accessToken },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Shopify payout balance request failed: ${response.status} ${response.statusText} — ${body.slice(0, 300)}`,
    );
  }

  const json: ShopifyBalanceResponse = await response.json();

  return json.balance.map((entry) => ({
    source: "shopify_payout" as const,
    currency: entry.currency,
    amount: parseFloat(entry.amount),
  }));
}
