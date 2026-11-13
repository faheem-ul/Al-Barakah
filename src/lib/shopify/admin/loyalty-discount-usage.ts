import "server-only";

import { adminGraphql } from "@/lib/shopify/admin/client";

const LOG = "[Loyalty Discount Usage]";

/** Shopify `nodes(ids:)` accepts at most 250 ids per call. */
const NODES_CHUNK = 250;
/** Codes looked up per aliased `codeDiscountNodeByCode` query. */
const CODES_CHUNK = 25;

const USAGE_FRAGMENT = `
  codeDiscount {
    ... on DiscountCodeBasic { asyncUsageCount }
    ... on DiscountCodeBxgy { asyncUsageCount }
    ... on DiscountCodeFreeShipping { asyncUsageCount }
  }
`;

type UsageNode = {
  id?: string;
  codeDiscount?: { asyncUsageCount?: number | null } | null;
} | null;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function usedCount(node: UsageNode): number | undefined {
  const n = node?.codeDiscount?.asyncUsageCount;
  return typeof n === "number" ? n : undefined;
}

/** Discount node GID → Shopify "Used" count. */
export async function fetchDiscountUsedCounts(
  ids: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const unique = [...new Set(ids.filter(Boolean))];

  for (const batch of chunk(unique, NODES_CHUNK)) {
    const data = await adminGraphql<{ nodes: UsageNode[] }>(
      `query LoyaltyDiscountUsage($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on DiscountCodeNode { id ${USAGE_FRAGMENT} }
        }
      }`,
      { ids: batch },
    );
    for (const node of data.nodes ?? []) {
      const count = usedCount(node);
      if (node?.id && count !== undefined) result.set(node.id, count);
    }
  }

  return result;
}

/** Discount code (case-insensitive) → Shopify "Used" count, for records without a stored id. */
export async function fetchDiscountUsedCountsByCode(
  codes: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const unique = [...new Set(codes.map((c) => c.trim()).filter(Boolean))];

  for (const batch of chunk(unique, CODES_CHUNK)) {
    const varDefs = batch.map((_, i) => `$c${i}: String!`).join(", ");
    const fields = batch
      .map((_, i) => `c${i}: codeDiscountNodeByCode(code: $c${i}) { id ${USAGE_FRAGMENT} }`)
      .join("\n");
    const variables = Object.fromEntries(batch.map((code, i) => [`c${i}`, code]));

    const data = await adminGraphql<Record<string, UsageNode>>(
      `query LoyaltyDiscountUsageByCode(${varDefs}) { ${fields} }`,
      variables,
    );
    batch.forEach((code, i) => {
      const count = usedCount(data[`c${i}`]);
      if (count !== undefined) result.set(code.toLowerCase(), count);
    });
  }

  return result;
}

/**
 * For each voucher record, whether its Shopify discount has been used (Used ≥ 1).
 * Keyed by the caller's key. Missing key = unknown (no code, or Shopify lookup failed).
 * Never throws — the admin page should still load if Shopify is unavailable.
 */
export async function resolveVoucherCodeUsage(
  records: Array<{
    key: string;
    discountCode?: string | null;
    shopifyDiscountId?: string | null;
  }>,
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  const withId = records.filter((r) => r.shopifyDiscountId);
  const codeOnly = records.filter((r) => !r.shopifyDiscountId && r.discountCode);
  if (!withId.length && !codeOnly.length) return result;

  try {
    const [byId, byCode] = await Promise.all([
      fetchDiscountUsedCounts(withId.map((r) => r.shopifyDiscountId as string)),
      fetchDiscountUsedCountsByCode(codeOnly.map((r) => r.discountCode as string)),
    ]);

    for (const r of withId) {
      const count = byId.get(r.shopifyDiscountId as string);
      if (count !== undefined) result.set(r.key, count >= 1);
    }
    for (const r of codeOnly) {
      const count = byCode.get((r.discountCode as string).trim().toLowerCase());
      if (count !== undefined) result.set(r.key, count >= 1);
    }
  } catch (err) {
    console.error(`${LOG} usage lookup failed`, err);
  }

  return result;
}
