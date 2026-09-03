"use client";

import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

import Text from "@/ui/Text";
import { Button } from "@/ui/button";
import { Product } from "@/lib/shopify/types";
import { useProductData } from "@/hooks/useProductData";
import useShoppingCart from "@/hooks/useShoppingCart";
import { cn } from "@/lib/utils";

import {
  ComboCategoryId,
  RibbonVariant,
  getRibbonForProduct,
  isFeaturedCombo,
} from "./comboConfig";

interface ComboCardProps {
  product: Product;
  categoryId: ComboCategoryId;
}

const RIBBON_STYLES: Record<RibbonVariant, string> = {
  popular: "bg-[#E9A319] text-[#3a2b06]",
  best: "bg-[#8FB69F] text-white",
  gift: "bg-[#7A4E9E] text-white",
  biggest: "bg-[#8FB69F] text-white",
};

const getContents = (product: Product) => {
  const firstLine = product.description?.split("\n")[0]?.trim();
  return firstLine || product.title;
};

const ComboCard = ({ product, categoryId }: ComboCardProps) => {
  const { image, currentPrice, comparePrice, formatPrice } =
    useProductData(product);
  const { addCartQuantity, onCartOpen } = useShoppingCart();

  const variant = product.variants[0];
  const ribbon = getRibbonForProduct(categoryId, product.handle);
  const featured = isFeaturedCombo(categoryId, product.handle);
  const contents = getContents(product);

  const compareAmount = variant?.compareAtPrice?.amount || comparePrice;
  const priceAmount = variant?.price?.amount || currentPrice;
  const savings =
    Number(compareAmount) > Number(priceAmount)
      ? Math.round(Number(compareAmount) - Number(priceAmount))
      : 0;

  const calculateDiscountPercentage = (
    currentPrice: string,
    compareAtPrice: string
  ) => {
    const current = parseFloat(currentPrice);
    const compare = parseFloat(compareAtPrice);
    if (compare <= 0 || current >= compare) return 0;
    return Math.round(((compare - current) / compare) * 100);
  };

  const discountPercentage = calculateDiscountPercentage(
    priceAmount,
    compareAmount
  );

  const onAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!variant) {
      toast.error("Sorry, this item is not available.");
      return;
    }

    onCartOpen();
    addCartQuantity(product.id, 1, "", "", variant.id);
  };

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col rounded-[16px] border bg-white p-3 transition-shadow duration-200 md:p-5",
        featured
          ? "border-black shadow-[0_8px_24px_-16px_rgba(0,0,0,0.25)]"
          : "border-[#e7e7e7] hover:border-black/20 hover:shadow-[0_14px_30px_-18px_rgba(0,0,0,0.12)]"
      )}
    >
      {ribbon && (
        <span
          className={cn(
            "absolute top-2 right-2 z-10 rounded-full px-2 py-0.5 text-[9px] font-bold md:top-3 md:right-3 md:px-2.5 md:py-1 md:text-[11px]",
            RIBBON_STYLES[ribbon.variant]
          )}
        >
          {ribbon.label}
        </span>
      )}

      <Link href={`/${product.handle}`} className="block">
        <div className="relative mb-3 h-[130px] overflow-hidden rounded-[12px] bg-[#f5f5f5] md:mb-4 md:h-[180px]">
          <Image
            src={image}
            alt={product.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
          />

          {discountPercentage > 0 && (
            <div className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 md:bottom-3">
              <Text className="rounded-[18px] border border-[#e7e7e7] bg-white px-2.5 py-1 text-[11px] leading-tight font-semibold whitespace-nowrap md:rounded-[20px] md:px-3 md:py-1.5 md:text-[12px]">
                Discount {discountPercentage}% Off
              </Text>
            </div>
          )}
        </div>

        <Text className="text-center text-[13px] font-bold text-black md:text-[17px]">
          {product.title}
        </Text>

        <Text className="mt-0.5 min-h-[28px] text-center text-[11px] leading-snug text-black/60 md:mt-1 md:min-h-[34px] md:text-[13px]">
          {contents}
        </Text>
      </Link>

      <div className="mt-auto pt-3">
        <div className="flex justify-center px-1 md:px-4">
          <div className="flex flex-col items-start">
            {Number(compareAmount) > 0 && (
              <Text className="font-poppins text-[10px] font-semibold text-black/50 line-through md:text-[13.2px]">
                was: {formatPrice(compareAmount)}
              </Text>
            )}
            <div className="mt-0.5 flex items-center gap-2 md:gap-[30px]">
              <Text className="text-primary-foreground shrink-0 text-[15px] font-semibold md:text-[19px]">
                Rs. {formatPrice(priceAmount)}
              </Text>

              {savings > 0 && (
                <span className="shrink-0 rounded-md bg-[#EAF5EB] px-1.5 py-0.5 text-[9px] font-bold text-[#2E7D32] md:px-2.5 md:py-1 md:text-[12px]">
                  Save Rs {formatPrice(String(savings))}
                </span>
              )}
            </div>
          </div>
        </div>

        <Text className="mt-2 flex items-center justify-center gap-1 text-[12px]">
          <span aria-hidden="true" className="text-black">
            🚚
          </span>
          <span className="text-black/60">Free Delivery</span>
        </Text>

        <Button
          type="button"
          className="mt-2 w-full justify-center rounded-full bg-black py-2.5 text-[12px] font-semibold text-white hover:bg-black/85 md:mt-3 md:py-3 md:text-[14px]"
          onClick={onAddToCart}
        >
          Add to Cart
        </Button>
      </div>
    </div>
  );
};

export default ComboCard;
