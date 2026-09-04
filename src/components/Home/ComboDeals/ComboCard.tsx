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
  COMBO_CATEGORIES,
  getRibbonForProduct,
  isFeaturedCombo,
} from "./comboConfig";
import {
  formatComboText,
  getComboContents,
  MixedScriptText,
} from "./comboText";
import { WHATSAPP_SUPPORT_PHONE } from "@/lib/constants";

interface ComboCardProps {
  product: Product;
  categoryId: ComboCategoryId;
}

const RIBBON_STYLES: Record<RibbonVariant, string> = {
  popular: "bg-[#E9A319] text-white",
  best: "bg-[#8FB69F] text-white",
  gift: "bg-[#7A4E9E] text-white",
  biggest: "bg-[#8FB69F] text-white",
};

const ComboCard = ({ product, categoryId }: ComboCardProps) => {
  const { image, currentPrice, comparePrice, formatPrice } =
    useProductData(product);
  const { addCartQuantity, onCartOpen } = useShoppingCart();

  const variant = product.variants[0];
  const ribbon = getRibbonForProduct(categoryId, product.handle);
  const featured = isFeaturedCombo(categoryId, product.handle);
  const contents = getComboContents(product);
  const normalizedTitle = formatComboText(product.title || "");

  const compareAmount = variant?.compareAtPrice?.amount || comparePrice;
  const priceAmount = variant?.price?.amount || currentPrice;
  const savings =
    Number(compareAmount) > Number(priceAmount)
      ? Math.round(Number(compareAmount) - Number(priceAmount))
      : 0;

  const calculateDiscountPercentage = (
    currentPrice: string,
    compareAtPrice: string,
  ) => {
    const current = parseFloat(currentPrice);
    const compare = parseFloat(compareAtPrice);
    if (compare <= 0 || current >= compare) return 0;
    return Math.round(((compare - current) / compare) * 100);
  };

  const discountPercentage = calculateDiscountPercentage(
    priceAmount,
    compareAmount,
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

  const categoryLabel =
    COMBO_CATEGORIES.find((c) => c.id === categoryId)?.tabLabel || "Combo";
  const siteBase =
    (typeof window !== "undefined" ? window.location.origin : "") ||
    "https://www.albarakahoney.com";
  const productUrl = `${siteBase}/${product.handle}`;
  const whatsappMessage =
    `Assalamualaikum,\n\n` +
    `I have a question about this combo:\n` +
    `• ${product.title}\n` +
    `• Category: ${categoryLabel}\n` +
    `• Price: Rs. ${formatPrice(priceAmount)}\n` +
    (savings > 0 ? `• Save: Rs. ${formatPrice(String(savings))}\n` : "") +
    `• Link: ${productUrl}\n\n` +
    `Please share more details. Thank you.`;
  const whatsappHref = `https://wa.me/${WHATSAPP_SUPPORT_PHONE}?text=${encodeURIComponent(
    whatsappMessage,
  )}`;

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col rounded-[16px] border border-[#e7e7e7] bg-white transition-shadow duration-200 pb-3",
        // featured
        //   ? "border-black shadow-[0_8px_24px_-16px_rgba(0,0,0,0.25)]"
        //   : "border-[#e7e7e7] hover:border-black/20 hover:shadow-[0_14px_30px_-18px_rgba(0,0,0,0.12)]",
      )}
    >
      {ribbon && (
        <span
          className={cn(
            "absolute top-2 right-2 z-10 rounded-full px-2 py-0.5 text-[9px] font-bold md:top-3 md:right-3 md:px-2.5 md:py-1 md:text-[11px]",
            RIBBON_STYLES[ribbon.variant],
          )}
        >
          {ribbon.label}
        </span>
      )}

      <Link href={`/${product.handle}`} className="block">
        <div className="relative mb-3 overflow-hidden rounded-[12px] bg-[#f5f5f5] md:mb-4">
          <Image
            src={image}
            alt={product.title}
            width={800}
            height={1000}
            className="h-auto w-full object-contain"
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

        <MixedScriptText
          text={normalizedTitle}
          className="overflow-visible px-0.5 text-[13px] font-bold text-black md:text-[17px]"
          urduClassName="px-0.5"
          latinClassName=""
        />

        <MixedScriptText
          text={contents}
          className="mt-0.5 min-h-[28px] overflow-visible px-0.5 text-[11px] leading-relaxed text-black/60 md:mt-1 md:min-h-[34px] md:text-[13px]"
          urduClassName="px-0.5 text-[12px] text-black/70 md:text-[14px]"
          latinClassName="tracking-tight"
        />
      </Link>

      <div className="mt-auto px-5">
        <div className="flex justify-center px-1 md:px-0 w-full max-w-full">
          <div className="flex flex-col items-start w-full max-w-full justify-between mt-4">
            {Number(compareAmount) > 0 && (
              <Text className="font-poppins text-[10px] font-semibold text-black/50 line-through md:text-[13.2px]">
                was: {formatPrice(compareAmount)}
              </Text>
            )}
            <div className="mt-0.5 flex items-center gap-2 md:gap-[30px] w-full max-w-full justify-between">
              <Text className="text-primary-foreground shrink-0 text-[15px] font-semibold md:text-[19px]">
                Rs. {formatPrice(priceAmount)}
              </Text>

              {savings > 0 && (
                <span className="shrink-0 rounded-full bg-[#EBEBEB] px-2 py-0.5 text-[11px] font-bold text-black shadow-sm md:px-2.5 md:text-[13px]">
                  Save Rs. {formatPrice(String(savings))}
                </span>
              )}
            </div>
          </div>
        </div>

        <Text className="mt-2 flex items-center justify-center">
          <span className="rounded-full font-bold px-2.5 py-1 text-[11px] text-black md:px-3 md:text-[12px]">
            🚚 Free Delivery
          </span>
        </Text>

        <Button
          type="button"
          className="mt-2 w-full justify-center rounded-full bg-black py-2.5 text-[12px] font-semibold text-white hover:bg-black/85 md:mt-3 md:py-3 md:text-[14px]"
          onClick={onAddToCart}
        >
          Add to Cart
        </Button>

        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#25D366] underline-offset-2 hover:underline md:text-[12px]"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 fill-current md:h-4 md:w-4"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Ask on WhatsApp
        </a>
      </div>
    </div>
  );
};

export default ComboCard;
