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
    title: "Duo Packs (2 Jars)",
    subtitle: "1/2 kg each",
    ribbons: {
      "daily-duo": { label: "★ Most Popular", variant: "popular" },
    },
  },
  {
    id: "family",
    collectionHandle: "combo-family-packs",
    tabLabel: "Family Packs",
    tabHint: "1kg × 2",
    title: "Family Packs (2 Jars)",
    subtitle: "1kg each",
    ribbons: {
      "big-daily": { label: "🏆 Best Value", variant: "best" },
    },
  },
  {
    id: "mix",
    collectionHandle: "combo-mix-packs",
    tabLabel: "Mix Packs",
    tabHint: "1kg + 500g",
    title: "Mix Packs (2 Jars)",
    subtitle: "1kg + 1/2 kg",
    ribbons: {
      "daily-plus": { label: "★ Most Popular", variant: "popular" },
    },
  },
  {
    id: "gift",
    collectionHandle: "combo-gift-variety",
    tabLabel: "Gift & Variety",
    tabHint: "3 Jars",
    title: "Gift & Variety (3 Jars)",
    subtitle: "3 jars with different flavors",
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
  handle: string,
) => {
  const category = COMBO_CATEGORIES.find((c) => c.id === categoryId);
  return category?.ribbons[handle];
};

export const isFeaturedCombo = (
  categoryId: ComboCategoryId,
  handle: string,
) => {
  return Boolean(getRibbonForProduct(categoryId, handle));
};

const COMBO_COLLECTION_HANDLES = new Set(
  COMBO_CATEGORIES.map((category) => category.collectionHandle),
);

/** True when the product belongs to any combo collection. */
export const isComboProduct = (product: {
  collections?: { handle: string }[] | null;
}) =>
  Boolean(
    product.collections?.some((collection) =>
      COMBO_COLLECTION_HANDLES.has(collection.handle),
    ),
  );

/** Resolve combo category config from the product's collections. */
export const getComboCategoryForProduct = (product: {
  collections?: { handle: string }[] | null;
}) =>
  COMBO_CATEGORIES.find((category) =>
    product.collections?.some(
      (collection) => collection.handle === category.collectionHandle,
    ),
  );
