"use client";

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
// import { Product } from "@/lib/shopify/types";
import EmptyCart from "@/components/Cart/EmptyCart";
import { formatPrice } from "@/lib/utils/shopify";

import { CartItem as DefaultCartItem } from "@/types";
// import { useProductData } from "@/hooks/useProductData";
// import { useProductData } from "@/hooks/useProductData";

// interface CartProduct extends Product {
//   quantity: number;
// }

// interface CartItem {
//   id: string | number;
//   quantity: number;
// }

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
    cartItemCount,
    increaseCartQuantity,
    decreaseCartQuantity,
  } = useShoppingCart();

  const cartItems = useCartStore((state) => state.cartItems);

  const separateTitle = (title: string) => {
    const urduRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]+/;
    const match = title.match(urduRegex);
    if (match) {
      const urduPart = match[0].trim();
      const englishPart = title.replace(urduPart, "").trim();
      return { urdu: urduPart, english: englishPart };
    }
    return { urdu: "", english: title };
  };

  // Helpers for price display
  const formatRs = (amount?: string | number) => {
    const num = Number(amount || 0);
    return `Rs. ${new Intl.NumberFormat("en-PK", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num)}`;
  };

  const formatNumberNoCurrency = (amount?: string | number) => {
    const num = Number(amount || 0);
    return new Intl.NumberFormat("en-PK", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const totalPice: number = useMemo(() => {
    if (!products?.data) return 0;
    return cartItems?.reduce((total: number, item: DefaultCartItem) => {
      const product = products.data?.find((p) => p.id === item.id);
      if (!product) return total;
      const variant = product.variants?.find((v) => v.id === item.variantId);
      const unitPrice = Number(variant?.price?.amount || 0);
      return total + unitPrice * item.quantity;
    }, 0);
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

  // Titles will be derived per-item using useProductData

  // const { formatPrice } = useProductData(product);

  return (
    <div className="flex w-full flex-col">
      <div className="flex flex-col gap-3 rounded-[24px] py-3">
        {cartItems?.map((cartItem: DefaultCartItem) => {
          // const isLastItem = index === cartItems?.length - 1;

          // console.log("cartItem", cartItem);

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
          const weight =
            variant?.selectedOptions?.find(
              (option) => option?.name?.toLowerCase() === "weight"
            )?.value || "";

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
                  {(() => {
                    const { urdu, english } = separateTitle(product.title);
                    return (
                      <>
                        {urdu && (
                          <Text className="md:mb-2 mb-1 text-[20px] md:text-[30px] font-bold text-black font-arabic">
                            {urdu}
                          </Text>
                        )}
                        <div className="md:block flex gap-[12px] items-center">
                          {english && (
                            <Text className="md:mb-2 text-[16px] font-semibold text-black capitalize">
                              {english}
                            </Text>
                          )}
                          {weight && (
                            <Text className="text-[12px] text-black/60">
                              ({weight})
                            </Text>
                          )}
                        </div>
                      </>
                    );
                  })()}

                  {Number(variant?.compareAtPrice?.amount || 0) > 0 && (
                    <Text className="line-through text-black/50 text-[13.2px] font-poppins font-semibold mb-[-3px] md:mt-4 mt-2">
                      was:{" "}
                      {formatNumberNoCurrency(
                        variant?.compareAtPrice?.amount as string
                      )}
                    </Text>
                  )}

                  <Text className="text-accent text-[20px] font-semibold">
                    {formatRs(variant?.price?.amount as string)}
                  </Text>

                  {/* <div className="mt-4 flex w-fit items-center gap-[20px] rounded-[62px] bg-[#F0F0F0] px-[12px]"> */}
                  <div className="flex w-fit items-center gap-[50px] rounded-[62px] bg-[#F0F0F0] px-[22px] py-[17px] mt-6">
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

              <div className="absolute right-0 top-[80px] md:block">
                <TrashIcon
                  className="cursor-pointers"
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
          className="flex items-center justify-center text-black border w-full px-6 h-[60px] text-[14px] font-medium uppercase md:w-[352px] bg-transparent"
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
              className="flex items-center justify-center w-full px-6 h-[60px] text-[12px] font-medium uppercase md:w-fit bg-black"
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
    xmlns="http://www.w3.org/2000/svg"
    width={34}
    height={32}
    fill="none"
    {...props}
  >
    <path
      fill="#000"
      d="M31.603.843H2.838A2.397 2.397 0 0 0 .44 3.241v1.198a2.397 2.397 0 0 0 2.398 2.397h28.765A2.397 2.397 0 0 0 34 4.44V3.241A2.397 2.397 0 0 0 31.603.843ZM3.621 9.233a.6.6 0 0 0-.6.662l1.972 18.919a3.596 3.596 0 0 0 3.572 3.192h17.311a3.596 3.596 0 0 0 3.571-3.175v-.016l1.968-18.92a.598.598 0 0 0-.6-.662H3.622ZM22.263 22.77a1.196 1.196 0 0 1 .012 1.707 1.2 1.2 0 0 1-1.707-.013l-3.347-3.347-3.348 3.347a1.198 1.198 0 0 1-1.695-1.694l3.348-3.348-3.348-3.348a1.198 1.198 0 0 1 1.695-1.694l3.348 3.347 3.347-3.347a1.198 1.198 0 0 1 1.695 1.694l-3.348 3.348 3.348 3.348Z"
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
