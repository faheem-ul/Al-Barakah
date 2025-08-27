"use client";
import { useMemo } from "react";

import { useCartStore } from "@/stores/useCartStore";
import { CartItem } from "@/types";

const useShoppingCart = () => {
  const cartItems = useCartStore((state) => state.cartItems);
  const setCartItems = useCartStore((state) => state.setCartItems);
  const isCartOpen = useCartStore((state) => state.isCartOpen);
  const setIsCartOpen = useCartStore((state) => state.setIsCartOpen);

  const onCartOpen = () => {
    setIsCartOpen(true);
  };

  const onCartClose = () => {
    setIsCartOpen(false);
  };

  const cartQuantity = useMemo(
    () =>
      cartItems?.reduce(
        (quantity: number, item: CartItem) => item.quantity + quantity,
        0
      ),
    [cartItems]
  );

  // Distinct item count (number of unique cart lines), independent of quantities
  const cartItemCount = useMemo(() => cartItems?.length || 0, [cartItems]);

  const getItemQuantity = (id: number | string) => {
    return cartItems.find((item: CartItem) => item.id === id)?.quantity || 1;
  };

  const getItemQuantityByVariantId = (variantId: number | string) => {
    return (
      cartItems.find((item: CartItem) => item.variantId === variantId)
        ?.quantity || 1
    );
  };

  const findCartItem = (
    items: CartItem[],
    id: string | number,
    variantId?: string | number
  ): CartItem | undefined => {
    if (variantId) {
      return items.find((item) => item.variantId === variantId);
    }
    return items.find((item) => item.id === id);
  };

  const increaseCartQuantity = (
    id: string | number,
    quantity: number = 1,
    color: string,
    size: string,
    variantId: string
  ) => {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.variantId === variantId
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item.variantId === variantId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        return [...currentItems, { id, quantity, color, size, variantId }];
      }
    });
  };

  const addCartQuantity = (
    id: string | number,
    quantity: number = 1,
    color: string,
    size: string,
    variantId: string
  ) => {
    setCartItems((currentItems) => {
      const existingItem = findCartItem(currentItems, id, variantId);
      if (existingItem) {
        return currentItems.map((item) =>
          item.variantId === variantId ? { ...item, quantity: quantity } : item
        );
      } else {
        return [...currentItems, { id, quantity, color, size, variantId }];
      }
    });
  };

  const decreaseCartQuantity = (
    variantId: number | string,
    quantity: number = 1
  ) => {
    setCartItems((currItems: CartItem[]) => {
      const existingItem = findCartItem(currItems, "", variantId);

      if (!existingItem) {
        return currItems; // Item not found, no change
      }

      if (existingItem.quantity <= quantity) {
        return currItems.filter(
          (item: CartItem) => item.variantId !== variantId
        );
      } else {
        return currItems.map((item: CartItem) =>
          item.variantId === variantId
            ? { ...item, quantity: item.quantity - quantity }
            : item
        );
      }
    });
  };

  const removeFromCart = (variantIdToRemove: number | string) => {
    setCartItems((currItems: CartItem[]) => {
      return currItems.filter(
        (item: CartItem) => item.variantId !== variantIdToRemove
      );
    });
  };

  return {
    getItemQuantity,
    getItemQuantityByVariantId,
    cartQuantity,
    cartItemCount,
    increaseCartQuantity,
    decreaseCartQuantity,
    removeFromCart,
    addCartQuantity,
    isCartOpen,
    onCartOpen,
    onCartClose,
  };
};

export default useShoppingCart;
