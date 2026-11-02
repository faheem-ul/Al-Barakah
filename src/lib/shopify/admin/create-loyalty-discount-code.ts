import "server-only";

import {
  minimumPurchasePkrForTier,
  type LoyaltyTierAmount,
} from "@/lib/loyalty/segments";
import { adminGraphql } from "@/lib/shopify/admin/client";
import { randomBytes } from "node:crypto";

const LOG = "[Shopify Loyalty Discount]";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type LoyaltyDiscountCreateInput = {
  shopifyCustomerId: number;
  amount: LoyaltyTierAmount;
  orderLabel: string;
  customerFirstName: string;
  code?: string;
};

export type LoyaltyDiscountCreateResult = {
  code: string;
  amount: LoyaltyTierAmount;
  minimumPurchasePkr: number;
  shopifyDiscountId: string;
  customerGid: string;
};

type DiscountCreateData = {
  discountCodeBasicCreate: {
    codeDiscountNode: { id: string } | null;
    userErrors: Array<{ field: string[] | null; message: string }>;
  };
};

export function shopifyCustomerGid(customerId: number | string): string {
  const id = String(customerId).replace(/\D/g, "");
  return `gid://shopify/Customer/${id}`;
}

function randomCodeSuffix(length = 6): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}

function sanitizeOrderRef(orderLabel: string): string {
  const cleaned = String(orderLabel || "ORDER")
    .trim()
    .replace(/^#+/, "")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .slice(0, 24);
  return cleaned || "ORDER";
}

function sanitizeCustomerFirstNameForCode(raw: string): string {
  const letters = String(raw || "")
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "");
  if (!letters) return "Customer";
  const capped = letters.charAt(0).toUpperCase() + letters.slice(1, 20).toLowerCase();
  return capped.slice(0, 20);
}

/** Unique checkout code: Firstname-ordernumber-RANDOM, e.g. Ali-990004-K7M3NP */
export function generateLoyaltyDiscountCode(
  customerFirstName: string,
  orderLabel: string,
): string {
  const name = sanitizeCustomerFirstNameForCode(customerFirstName);
  const order = sanitizeOrderRef(orderLabel);
  return `${name}-${order}-${randomCodeSuffix()}`;
}

function moneyAmountString(pkr: number): string {
  return `${Math.round(pkr)}.00`;
}

export function buildLoyaltyBasicCodeDiscountInput(
  params: LoyaltyDiscountCreateInput,
): Record<string, unknown> {
  const minimumPurchasePkr = minimumPurchasePkrForTier(params.amount);
  const code =
    params.code?.trim() ||
    generateLoyaltyDiscountCode(
      params.customerFirstName,
      params.orderLabel,
    );
  const customerGid = shopifyCustomerGid(params.shopifyCustomerId);
  const title = `Loyalty Rs ${params.amount} — order ${params.orderLabel}`;

  return {
    title,
    code,
    startsAt: new Date().toISOString(),
    endsAt: null,
    customerSelection: {
      customers: {
        add: [customerGid],
      },
    },
    customerGets: {
      value: {
        discountAmount: {
          amount: moneyAmountString(params.amount),
          appliesOnEachItem: false,
        },
      },
      items: {
        all: true,
      },
    },
    minimumRequirement: {
      subtotal: {
        greaterThanOrEqualToSubtotal: moneyAmountString(minimumPurchasePkr),
      },
    },
    combinesWith: {
      orderDiscounts: false,
      productDiscounts: false,
      shippingDiscounts: false,
    },
    usageLimit: 1,
    appliesOncePerCustomer: true,
  };
}

function isCodeTakenError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("code") && (m.includes("taken") || m.includes("already"));
}

const CREATE_MUTATION = `
  mutation LoyaltyDiscountCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
    discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
      codeDiscountNode {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export async function createLoyaltyDiscountCodeForCustomer(
  params: LoyaltyDiscountCreateInput,
): Promise<LoyaltyDiscountCreateResult> {
  let code =
    params.code?.trim() ||
    generateLoyaltyDiscountCode(
      params.customerFirstName,
      params.orderLabel,
    );

  for (let attempt = 0; attempt < 2; attempt++) {
    const basicCodeDiscount = buildLoyaltyBasicCodeDiscountInput({
      ...params,
      code,
    });

    const data = await adminGraphql<DiscountCreateData>(CREATE_MUTATION, {
      basicCodeDiscount,
    });

    const payload = data.discountCodeBasicCreate;
    const errors = payload.userErrors ?? [];
    if (errors.length) {
      const msg = errors.map((e) => e.message).join("; ");
      if (attempt === 0 && errors.some((e) => isCodeTakenError(e.message))) {
        code = generateLoyaltyDiscountCode(
          params.customerFirstName,
          params.orderLabel,
        );
        continue;
      }
      console.error(`${LOG} userErrors:`, errors);
      throw new Error(msg || "Shopify discount create failed");
    }

    const nodeId = payload.codeDiscountNode?.id;
    if (!nodeId) {
      throw new Error("Shopify discount create returned no discount node");
    }

    return {
      code: String(basicCodeDiscount.code),
      amount: params.amount,
      minimumPurchasePkr: minimumPurchasePkrForTier(params.amount),
      shopifyDiscountId: nodeId,
      customerGid: shopifyCustomerGid(params.shopifyCustomerId),
    };
  }

  throw new Error("Shopify discount create failed after retry");
}
