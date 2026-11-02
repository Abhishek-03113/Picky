export interface SupportedSite {
  readonly name: string;
  readonly host: string;
}

// Display names for the homepage; keep in sync with packages/catalog when a store is added.
export const SUPPORTED_SITES: readonly SupportedSite[] = [
  { name: "Amazon.in", host: "amazon.in" },
  { name: "Flipkart", host: "flipkart.com" },
];
