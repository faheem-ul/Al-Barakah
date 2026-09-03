export type ComboCategoryId = "duo" | "family" | "mix" | "gift";

export type RibbonVariant = "popular" | "best" | "gift" | "biggest";

export interface ComboCategoryConfig {
  id: ComboCategoryId;
  collectionHandle: string;
  tabLabel: string;
  tabHint: string;
  title: string;
  subtitle: string;
  ribbons: Record<string, { label: string; variant: RibbonVariant }>;
}

export const COMBO_CATEGORIES: ComboCategoryConfig[] = [
  {
    id: "duo",
    collectionHandle: "combo-duo-packs",
    tabLabel: "Duo Packs",
    tabHint: "500g × 2",
    title: "Duo Packs — Perfect to Start · Combo of Two",
    subtitle: "500g each. The easiest way to try Albaraka.",
    ribbons: {
      "daily-duo": { label: "⭐ Most Popular", variant: "popular" },
    },
  },
  {
    id: "family",
    collectionHandle: "combo-family-packs",
    tabLabel: "Family Packs",
    tabHint: "1kg × 2",
    title: "Family Packs — Best Value for Homes · Combo of Two",
    subtitle: "1kg each. Lowest price per kg — stock up and save.",
    ribbons: {
      "big-daily": { label: "🏆 Best Value", variant: "best" },
    },
  },
  {
    id: "mix",
    collectionHandle: "combo-mix-packs",
    tabLabel: "Mix Packs",
    tabHint: "1kg + 500g",
    title: "Mix Packs — Smart Choice · Combo of Two",
    subtitle: "1kg + 500g. A bigger jar plus something new to try.",
    ribbons: {
      "daily-plus": { label: "⭐ Most Popular", variant: "popular" },
    },
  },
  {
    id: "gift",
    collectionHandle: "combo-gift-variety",
    tabLabel: "Gift & Variety",
    tabHint: "3 Jars",
    title: "Gift & Variety — Try All / Perfect Gift · Combo of Three",
    subtitle: "Three varieties together. Great for gifting or tasting them all.",
    ribbons: {
      "gift-box-deluxe": { label: "🎁 Perfect Gift", variant: "gift" },
      "grand-trio": { label: "💎 Biggest", variant: "biggest" },
    },
  },
];

export const PROMO_ITEMS = [
  { icon: "🚚", label: "Free Delivery on All Combos" },
  { icon: "🍯", label: "100% Pure & Natural" },
  { icon: "💵", label: "Cash on Delivery" },
  { icon: "⭐", label: "5.0 Rated (30+ Reviews)" },
];

export const TRUST_ITEMS = [
  "100% Pure & Lab-Tested",
  "Free Delivery",
  "Cash on Delivery",
  "5.0★ · 30+ Reviews",
];

export const getRibbonForProduct = (
  categoryId: ComboCategoryId,
  handle: string
) => {
  const category = COMBO_CATEGORIES.find((c) => c.id === categoryId);
  return category?.ribbons[handle];
};

export const isFeaturedCombo = (
  categoryId: ComboCategoryId,
  handle: string
) => {
  return Boolean(getRibbonForProduct(categoryId, handle));
};
