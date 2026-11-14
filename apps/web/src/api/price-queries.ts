import type { PriceHistory } from "@picky/catalog";
import { queryOptions } from "@tanstack/react-query";
import { createJsonRequester, type FetchFunction } from "./json-requester.ts";

/** A product's recorded prices. */
export interface PricesClient {
  getPriceHistory(productId: string): Promise<PriceHistory>;
}

/**
 * Typed client for the price history endpoint.
 *
 * @example await createPricesClient(fetch, "").getPriceHistory(productId)
 */
export function createPricesClient(fetchFunction: FetchFunction, baseUrl: string): PricesClient {
  const requestJson = createJsonRequester(fetchFunction, baseUrl);
  return {
    getPriceHistory: async (productId) =>
      (await requestJson<{ history: PriceHistory }>(`/api/products/${encodeURIComponent(productId)}/prices`)).history,
  };
}

export const priceQueryKeys = {
  history: (productId: string) => ["prices", productId] as const,
};

/**
 * Query for one product's price history.
 *
 * @example useQuery(priceHistoryQuery(pricesClient, productId))
 */
export function priceHistoryQuery(client: PricesClient, productId: string) {
  return queryOptions({
    queryKey: priceQueryKeys.history(productId),
    queryFn: () => client.getPriceHistory(productId),
  });
}
