// Centralized API network layer.
// All requests to the AWS API Gateway backend flow through this module.

export const BASE_URL =
  "https://o2dkvnfpyf.execute-api.ap-south-1.amazonaws.com/dev";

export type Product = {
  productId: string;
  name: string;
  price: number;
  category: string;
};

/** Build the dynamic x-store-name header from a raw store name. */
export function storeHeader(storeName: string): Record<string, string> {
  const slug = storeName.trim().replace(/\s+/g, "-");
  // If caller already passed a fully-qualified id, don't double-prefix.
  const value = slug.startsWith("Store-") ? slug : `Store-${slug}`;
  return { "x-store-name": value };
}

async function handle<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return (data as T) ?? ({} as T);
}

function safeJson(t: string) {
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

/** POST /provision-store — create a new tenant store. */
export async function provisionStore(storeName: string) {
  const res = await fetch(`${BASE_URL}/provision-store`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storeName }),
  });
  return handle<{ message?: string }>(res);
}

/** GET /products — list products for the active store. */
export async function listProducts(storeName: string): Promise<Product[]> {
  const res = await fetch(`${BASE_URL}/products`, {
    headers: { ...storeHeader(storeName) },
  });
  const data = await handle<unknown>(res);
  if (Array.isArray(data)) return data as Product[];
  const obj = data as { items?: Product[]; products?: Product[] };
  return obj.items ?? obj.products ?? [];
}

/** POST /products — add a new product to the active store. */
export async function createProduct(storeName: string, product: Product) {
  const res = await fetch(`${BASE_URL}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...storeHeader(storeName) },
    body: JSON.stringify(product),
  });
  return handle<{ message?: string }>(res);
}
