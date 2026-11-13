import React from "react";

type CodeUsageBadgeProps = {
  /** true = Shopify "Used" ≥ 1, false = unused, null/undefined = unknown. */
  used: boolean | null | undefined;
};

/** Shopify discount usage for a voucher code (read-only, from Shopify used count). */
const CodeUsageBadge: React.FC<CodeUsageBadgeProps> = ({ used }) => {
  if (used == null) return null;
  return (
    <span
      title={
        used
          ? "Customer has used this code on Shopify"
          : "Code not used on Shopify yet"
      }
      className={
        used
          ? "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium bg-[#f2f4f7] text-[#344054] border-[#d0d5dd]"
          : "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium bg-white text-[#6B6B6B] border-black/10"
      }
    >
      {used ? "Used" : "Unused"}
    </span>
  );
};

export default CodeUsageBadge;
