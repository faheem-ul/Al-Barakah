"use client";
import React, { SVGProps, useMemo, useState } from "react";
import Image from "next/image";

import Spinner from "@/ui/Spinner";
import Text from "@/ui/Text";
import useGetCartProducts from "@/hooks/useGetCartProducts";
import { cn } from "@/lib/utils";
import useShoppingCart from "@/hooks/useShoppingCart";
import { useCartStore } from "@/stores/useCartStore";
// import { SWATCH_COLORS } from "@/lib/constants";
import { Button } from "@/ui/button";
import { MinusIcon, PlusIcon } from "@/ui/Icons";
// import { Input } from "@/ui/input";
// import { Product } from "@/lib/shopify/types";
import EmptyCart from "@/components/Cart/EmptyCart";
import { formatPrice } from "@/lib/utils/shopify";

// interface CartProduct extends Product {
//   quantity: number;
// }

interface CartItem {
  id: string | number;
  quantity: number;
}

const CartPage = () => {
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);

  const { data: products, isLoading } = useGetCartProducts();

  const {
    increaseCartQuantity,
    decreaseCartQuantity,
    getItemQuantityByVariantId,
  } = useShoppingCart();

  const cartItems = useCartStore((state) => state.cartItems);

  const formatNumberNoCurrency = (value: number | string) => {
    const num = Number(value) || 0;
    return new Intl.NumberFormat("en-PK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const totalPice: number = useMemo(() => {
    if (!products?.data) return 0;
    return cartItems?.reduce(
      (total: number, item: CartItem & { variantId?: string }) => {
        const product = products.data?.find((p) => p.id === item.id);
        if (!product) return total;
        const variant = product.variants?.find((v) => v.id === item.variantId);
        const unitPrice = Number(variant?.price?.amount || 0);
        return total + unitPrice * item.quantity;
      },
      0
    );
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

      console.log("object", { lineItems });

      // Create the checkout URL
      const checkoutUrl = generateCheckoutUrl(lineItems);
      console.log("Checkout URL:", checkoutUrl);

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
    return (
      <div className="mt-[-200px] flex h-screen items-center justify-center">
        <Spinner fill="#8FB69F" />
      </div>
    );
  }

  // if (!products?.success && !isLoading) {
  if ((!products?.success && !isLoading) || cartItems?.length === 0) {
    return <EmptyCart />;
  }

  if (cartItems?.length === 0) {
    return <EmptyCart />;
  }

  return (
    <div className="mx-auto min-h-[70vh] max-w-full px-5 md:max-w-[1117px] md:px-5">
      <Text as="h1" className="my-4 md:my-2 capitalize">
        My cart
      </Text>

      <div className="flex flex-col gap-1 md:flex-row md:gap-10">
        {/* Left Side */}
        <div className="mt-6 flex flex-1 flex-col gap-8 md:gap-3 rounded-[24px] py-3">
          {cartItems?.map((cartItem, index) => {
            const isLastItem = index === cartItems?.length - 1;

            // Find the corresponding product from the fetched data
            const product = products?.data?.find((p) => p?.id === cartItem?.id);

            // if (product) {
            //   const { urdu, english } = separateTitle(product.title);
            // }

            // console.log(urdu)

            // Find the specific variant within the product's variants
            const variant = product?.variants?.find(
              (v) => v?.id === cartItem?.variantId
            );

            const color =
              variant?.selectedOptions?.find(
                (option) => option?.name === "Color"
              )?.value || "";
            const size =
              variant?.selectedOptions?.find(
                (option) => option?.name === "Size"
              )?.value || "";
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
                  "flex h-fit flex-col justify-between gap-4 border-b md:h-[196px] md:flex-row md:gap-2",
                  isLastItem ? "border-none" : "border-b pb-3"
                )}
              >
                <div className="flex gap-4 items-center md:items-start">
                  <div className="relative overflow-hidden rounded-[20px] w-[100px] h-[100px] md:h-[172px] md:w-[162px]">
                    <Image
                      src={product?.images[0]?.url}
                      alt={product?.images[0]?.altText}
                      fill
                      className="object-cover"
                      sizes="50%"
                    />
                  </div>

                  {/* <div>
                    <Text className="text-primary-foreground text-[20px] font-semibold">
                      {product?.title}
                    </Text>
                  </div> */}

                  <div>
                    {(() => {
                      const { urdu, english } = separateTitle(product.title);
                      return (
                        <>
                          {urdu && (
                            <Text className="mb-1 text-[18px] font-bold text-black font-arabic">
                              {urdu}
                            </Text>
                          )}
                          {english && (
                            <Text className="mb-1 text-[14px] font-semibold text-black">
                              {english}
                            </Text>
                          )}

                          <div className="md:hidden block">
                            {Number(variant?.compareAtPrice?.amount || 0) >
                              0 && (
                              <Text className="line-through text-black/50 text-[13.2px] font-poppins font-semibold mb-[-3px]">
                                was:{" "}
                                {formatNumberNoCurrency(
                                  variant?.compareAtPrice?.amount as string
                                )}
                              </Text>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <Text className="text-accent text-[18px] font-semibold ">
                                Rs.{" "}
                                {formatNumberNoCurrency(
                                  variant?.price?.amount as string
                                )}
                              </Text>
                              {weight && (
                                <Text className="text-[12px] text-black/60 md:hidden block">
                                  ({weight})
                                </Text>
                              )}
                            </div>
                          </div>
                          {weight && (
                            <Text className="text-[12px] text-black/60 md:block hidden">
                              ({weight})
                            </Text>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex h-full items-center gap-[30px] px-5 md:flex-col justify-center md:pr-3">
                  {/* <Text className="text-primary-foreground tet text-[22px] font-normal">
                    {formatPrice(product?.priceRange?.minVariantPrice?.amount)}
                  </Text> */}
                  <div className="md:block hidden">
                    {Number(variant?.compareAtPrice?.amount || 0) > 0 && (
                      <Text className="line-through text-black/50 text-[13.2px] font-poppins font-semibold mb-[-3px] mt-4 ">
                        was:{" "}
                        {formatNumberNoCurrency(
                          variant?.compareAtPrice?.amount as string
                        )}
                      </Text>
                    )}

                    <Text className="text-accent text-[20px] font-semibold">
                      Rs.{" "}
                      {formatNumberNoCurrency(variant?.price?.amount as string)}
                    </Text>
                  </div>

                  <div className="flex items-center gap-[50px] rounded-[62px] bg-[#F0F0F0] px-[18px] md:px-[22px] py-[11px] md:py-[17px]">
                    <MinusIcon
                      className="cursor-pointer"
                      onClick={() => {
                        decreaseCartQuantity(variant?.id as string);
                      }}
                    />
                    {/* <span></span> */}
                    <span>
                      {getItemQuantityByVariantId(variant?.id as string)}
                    </span>
                    {/* <span></span> */}
                    <PlusIcon
                      className="cursor-pointer"
                      onClick={() => {
                        increaseCartQuantity(
                          product.id,
                          1,
                          color,
                          size,
                          variant?.id as string
                        );
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Side */}
        <div className="w-full md:w-[40%]">
          <div className="mt-6 flex flex-1 flex-col rounded-[24px] bg-[#F7F7F7] p-8">
            {/* Discount Code */}
            {/* <div className="flex flex-col items-center justify-between gap-[10px] border-b pb-5 md:flex-row">
              <Input
                type="text"
                placeholder="Gift card or discount/support code"
              />

              <Button
                variant="secondary"
                className="mt-1 flex w-full items-center justify-center px-10 uppercase md:mt-0 md:w-fit"
              >
                Apply{" "}
              </Button>
            </div> */}
            {/* Discount Code */}

            {/* Subtotal */}
            <div className="flex items-center justify-between">
              <Text className="text-caption text-[16px] leading-[40px] font-medium uppercase">
                subtotal:
              </Text>

              <Text className="text-accent text-[20px] font-semibold">
                {formatPrice(totalPice)}
              </Text>
            </div>
            {/* Subtotal */}

            {/* Shipping */}
            <div className="flex items-center justify-between pb-5">
              <Text className="text-caption text-[16px] leading-[40px] font-medium uppercase">
                shipping:
              </Text>

              <Text className="text-[14px] font-semibold text-black">
                Calculated at next step
              </Text>
            </div>
            {/* Shipping */}

            {/* Total */}
            <div className="flex items-center justify-between border-t pt-5">
              <Text className="text-caption text-[16px] leading-[20px] font-medium uppercase">
                total:
              </Text>

              <Text className="text-accent text-[20px] font-semibold">
                {formatPrice(totalPice)}
              </Text>
            </div>
            {/* Total */}
          </div>
        </div>
      </div>

      {cartItems.length > 0 && (
        <div className="flex w-full justify-center py-[24px] md:py-[40px]">
          <Button
            variant={"secondary"}
            onClick={handleOnCheckout}
            isLoading={isCreatingCheckout}
            fill="#fff"
            className="flex w-full items-center justify-center px-6 text-[14px] font-medium uppercase md:w-fit bg-black"
          >
            <Icon /> Proceed to Checkout
          </Button>
        </div>
      )}
    </div>
  );
};

export default CartPage;

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
