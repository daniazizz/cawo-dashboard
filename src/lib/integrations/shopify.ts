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

export async function fetchShopifyInventory(): Promise<ShopifyInventoryItem[]> {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

  if (!storeDomain || !accessToken) {
    throw new Error(
      "Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN environment variables"
    );
  }

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
      }
    );

    if (!response.ok) {
      throw new Error(
        `Shopify API request failed: ${response.status} ${response.statusText}`
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
