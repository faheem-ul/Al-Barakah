import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist } from "zustand/middleware";

import { CartItem } from "@/types";

type State = {
  cartItems: CartItem[];
  selectedColors: { [productId: string]: string | undefined };
  isCartOpen: boolean;
};

type Actions = {
  setCartItems: (
    newItemOrUpdateFn: CartItem[] | ((currentItems: CartItem[]) => CartItem[]),
  ) => void;

  setSelectedColor: (productId: string, color: string) => void;
  setIsCartOpen: (isOpen: boolean) => void;
};

export const useCartStore = create<State & Actions>()(
  persist(
    immer((set) => ({
      cartItems: [],
      selectedColors: {},
      isCartOpen: false,

      setIsCartOpen: (isOpen) => {
        set((state) => {
          state.isCartOpen = isOpen;
        });
      },

      setCartItems: (newItemOrUpdateFn) => {
        set((state) => {
          if (typeof newItemOrUpdateFn === "function") {
            state.cartItems = newItemOrUpdateFn(state.cartItems);
          } else {
            state.cartItems = newItemOrUpdateFn;
          }
        });
      },

      setSelectedColor: (productId, color) =>
        set((state) => ({
          selectedColors: {
            ...state.selectedColors,
            [productId]: color,
          },
        })),
    })),
    { name: "cart" },
  ),
);
