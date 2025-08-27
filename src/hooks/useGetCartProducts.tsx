"use client";
import { useQuery } from "@tanstack/react-query";
import { getCartProducts } from "@/lib/shopify/actions/product";
import { useCartStore } from "@/stores/useCartStore";
import { CartItem } from "@/types";

const useGetCartProducts = () => {
  const cartItems = useCartStore((state) => state.cartItems);

  const queryResult = useQuery({
    queryKey: ["Cart_Products"],
    queryFn: async () => {
      const ids: string[] = cartItems.map(
        (item: CartItem) => item.id as string,
      );
      return await getCartProducts(ids);
    },
    refetchOnWindowFocus: false,
    enabled: cartItems.length > 0,
  });

  return queryResult;
};

export default useGetCartProducts;
