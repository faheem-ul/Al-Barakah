import React, { SVGProps, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import Spinner from "@/ui/Spinner";
import Text from "@/ui/Text";
import useGetCartProducts from "@/hooks/useGetCartProducts";
import { cn } from "@/lib/utils";
import useShoppingCart from "@/hooks/useShoppingCart";
import { useCartStore } from "@/stores/useCartStore";
import { Button } from "@/ui/button";
import { MinusIcon, PlusIcon } from "@/ui/Icons";
import { Product } from "@/lib/shopify/types";
import EmptyCart from "@/components/Cart/EmptyCart";
import { formatPrice } from "@/lib/utils/shopify";

import { CartItem as DefaultCartItem } from "@/types";

interface CartProduct extends Product {
  quantity: number;
}

interface CartItem {
  id: string | number;
  quantity: number;
}

interface PropTypes {
  onCartClose: () => void;
}

const Cart = (props: PropTypes) => {
  const { onCartClose } = props;

  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);

  const { data: products, isLoading } = useGetCartProducts();

  const router = useRouter();

  const {
    getItemQuantityByVariantId,
    removeFromCart,
    cartQuantity,
    cartItemCount,
    increaseCartQuantity,
    decreaseCartQuantity,
  } = useShoppingCart();

  const cartItems = useCartStore((state) => state.cartItems);

  const totalPice: number = useMemo(() => {
    const productsInCart: CartProduct[] = [];

    cartItems?.map((item: CartItem) => {
      const found = products?.data?.find((product) => product.id === item.id);

      if (found) {
        productsInCart.push({ ...item, ...found });
      }
    });

    const totalPice = productsInCart?.reduce(
      (totalPrice: number, product: CartProduct) =>
        (totalPrice +=
          Number(product?.priceRange?.maxVariantPrice?.amount || 0) *
          product.quantity),
      0
    );

    return totalPice;
  }, [cartItems, products]);

  // Function to generate the checkout URL
  const generateCheckoutUrl = (
    lineItems: { variantId: string; quantity: number }[]
  ) => {
    const storeUrl = process.env.NEXT_PUBLIC_STORE_URL;
    const previewKey = process.env.NEXT_PUBLIC_THEME_PREVIEW_KEY;
    const baseUrl = `${storeUrl}/cart`;
    // Create a query string with all variantId and quantity pairs
    const cartQuery = lineItems
      ?.map((item) => `${item?.variantId}:${item?.quantity}`)
      .join(",");
    const url = `${baseUrl}/${cartQuery}`;
    return previewKey ? `${url}?key=${previewKey}` : url;
  };

  const handleOnCheckout = async () => {
    try {
      setIsCreatingCheckout(true);
      const lineItems = cartItems?.map((item) => ({
        //   variantId: item.variantId as string,
        variantId: item?.variantId?.replace(
          "gid://shopify/ProductVariant/",
          ""
        ), // Strip 'gid://' from variantId,
        quantity: item?.quantity,
      }));

      // console.log("object", { lineItems });

      // Create the checkout URL
      const checkoutUrl = generateCheckoutUrl(lineItems);
      // console.log("Checkout URL:", checkoutUrl);

      window.location.href = checkoutUrl;
    } catch (error) {
      console.log("Error creating checkout:", error);
    } finally {
      setTimeout(() => {
        setIsCreatingCheckout(false);
      }, 2000);
    }
  };

  if (isLoading) {
    // if (true) {
    return (
      <div className="mt-[-200px] flex h-screen w-full items-center justify-center">
        <Spinner fill="#8FB69F" />
      </div>
    );
  }

  // if (!products?.success && !isLoading) {
  if ((!products?.success && !isLoading) || cartItems?.length === 0) {
    return (
      <EmptyCart
        className="mt-0 min-h-fit py-10 md:min-h-[calc(100vh-200px)]"
        onCartClose={onCartClose}
      />
    );
  }

  if (cartItems?.length === 0) {
    return (
      <EmptyCart
        className="mt-0 min-h-fit py-10 md:min-h-[calc(100vh-200px)]"
        onCartClose={onCartClose}
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex flex-1 flex-col gap-3 rounded-[24px] py-3">
        {cartItems?.map((cartItem: DefaultCartItem) => {
          // const isLastItem = index === cartItems?.length - 1;

          console.log("cartItem", cartItem);

          // Find the corresponding product from the fetched data
          const product = products?.data?.find((p) => p?.id === cartItem?.id);

          // Find the specific variant within the product's variants
          const variant = product?.variants?.find(
            (v) => v?.id === cartItem?.variantId
          );

          const color =
            variant?.selectedOptions?.find((option) => option?.name === "Color")
              ?.value || "";
          const size =
            variant?.selectedOptions?.find((option) => option?.name === "Size")
              ?.value || "";

          if (!product) {
            return null;
          }

          return (
            <div
              key={cartItem?.variantId}
              className={cn(
                "relative flex h-fit justify-between gap-4 py-1 md:h-fit md:flex-row md:gap-2 md:py-3"
                // isLastItem ? "border-none" : "border-b pb-3",
              )}
            >
              <div className="flex gap-4 md:flex-row">
                <div className="relative h-[80px] w-[80px] overflow-hidden rounded-[24px] md:h-[140px] md:w-[140px]">
                  <Image
                    src={product?.images[0]?.url}
                    alt={product?.images[0]?.altText}
                    fill
                    className="object-cover"
                    sizes="50%"
                  />
                </div>

                <div>
                  <Text className="text-primary-foreground text-[14px] font-semibold md:text-[20px]">
                    {product?.title}
                  </Text>

                  <div className="flex items-center gap-2">
                    <Text className="text-foreground text-[14px] md:text-[16px]">
                      Size: <span className="text-foreground"> {size}</span>{" "}
                    </Text>

                    <Text className="text-foreground my-1 flex gap-2 text-[14px] md:text-[16px]">
                      Color: {color}
                    </Text>
                  </div>

                  <Text className="text-accent text-[20px] font-semibold">
                    {formatPrice(product?.priceRange?.minVariantPrice?.amount)}
                  </Text>

                  {/* <div className="text-foreground font-poppins mt-4 text-[14px] font-medium md:text-[16px]">
                    Quantity {getItemQuantityByVariantId(variant?.id as string)}
                  </div> */}

                  <div className="mt-4 flex w-fit items-center gap-[20px] rounded-[62px] bg-[#F0F0F0] px-[12px]">
                    <MinusIcon
                      className="cursor-pointer"
                      onClick={() =>
                        decreaseCartQuantity(cartItem?.variantId, 1)
                      }
                    />
                    <span>
                      {getItemQuantityByVariantId(variant?.id as string)}
                    </span>
                    <PlusIcon
                      className="cursor-pointer"
                      onClick={() =>
                        increaseCartQuantity(
                          cartItem?.id,
                          1,
                          color,
                          size,
                          variant?.id as string
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="absolute right-0 md:block">
                <TrashIcon
                  className="cursor-pointer"
                  onClick={() => removeFromCart(variant?.id as string)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="mt-[60px] md:mt-0">
        {/* Subtotal */}
        <div className="flex items-center justify-between border-b pb-3">
          <Text className="text-[16px] font-semibold text-[#161616] md:text-[20px]">
            Subtotal ({cartItemCount} items)
          </Text>

          <Text className="text-foreground text-[16px] leading-[24px] font-semibold md:text-[18px]">
            {formatPrice(totalPice)}
          </Text>
        </div>
        {/* Subtotal */}
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse items-center gap-5 pt-8 pb-8 md:flex-row md:pb-0">
        <Button
          className="flex h-[56px] items-center w-[390px] justify-center border border-[#161616] bg-white text-[14px] font-medium text-[#161616] uppercase"
          onClick={() => {
            onCartClose();
            router.push("/cart");
          }}
        >
          Shopping BAg
        </Button>

        {cartItems.length > 0 && (
          <div className="flex w-full justify-center">
            <Button
              onClick={handleOnCheckout}
              isLoading={isCreatingCheckout}
              fill="#fff"
              className="flex items-center justify-center w-[390px] px-6 h-[60px] text-[12px] font-medium uppercase md:w-fit bg-black"
            >
              <Icon /> Proceed to Checkout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;

const TrashIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={33}
    height={32}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="m27.91 9-1.792 17.234A2 2 0 0 1 24.132 28H9.689a2 2 0 0 1-1.986-1.766L5.91 9M29.91 4h-26a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h26a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1ZM20.41 15l-7 7m7 0-7-7"
      stroke="#232321"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Icon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={25}
    height={24}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M3.5 1h12.414L21.5 6.586V23h-18V1Zm2 2v18h14V7.414L15.086 3H5.5Zm7 6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM9 10.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0ZM6.5 19a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1h-2v-1a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v1h-2v-1Z"
      fill="#fff"
    />
  </svg>
);
