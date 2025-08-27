export type CartItem = {
  id: string | number;
  quantity: number;
  color: string; // kept for backward compatibility; can be empty
  size: string;
  variantId: string;
};
