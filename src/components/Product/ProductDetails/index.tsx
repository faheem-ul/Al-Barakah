import React from "react";
import parse from "html-react-parser";

import { Product } from "@/lib/shopify/types";
import { RatingStarIcon } from "@/ui/Icons";
import Text from "@/ui/Text";
import { calculatePercentageOff } from "@/lib/utils";

import ProductAccordion from "./Accordion";
import ProductVariantSelector from "./ProductVariantSelector";
import { formatPrice } from "@/lib/utils/shopify";

interface PropTypes {
  product: Product;
}

const ProductDescription = (props: PropTypes) => {
  const { product } = props;

  const percentageOff = calculatePercentageOff(
    product?.priceRange?.minVariantPrice?.amount,
    product?.compareAtPriceRange?.maxVariantPrice?.amount,
  );

  return (
    <div>
      {/* Ratings */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {Array(5)
            .fill(0)
            .map((_, index) => (
              <RatingStarIcon key={index} />
            ))}
        </div>
        <Text className="text-foreground">5.0</Text>
      </div>
      {/* Ratings */}

      {/* Title */}
      <Text className="mt-5 mb-3 md:my-3" as="h1">
        {product?.title}{" "}
      </Text>
      {/* Title */}

      {/* Price */}
      <div className="mb-4 flex items-center gap-4">
        <Text className="text-foreground text-[28px] font-medium md:text-[32px]">
          {formatPrice(product.priceRange.minVariantPrice.amount)}
        </Text>

        {Number(product?.compareAtPriceRange?.maxVariantPrice?.amount) > 0 && (
          <>
            <Text className="text-[18px] font-normal text-[#959595] line-through md:text-[20px]">
              ${product?.compareAtPriceRange?.maxVariantPrice?.amount}
            </Text>

            <div className="flex h-[36px] w-[69px] items-center justify-center rounded-[62px] bg-[#E9CFC5] text-[16px] font-normal text-[#E68B85]">
              -{percentageOff}%
            </div>
          </>
        )}
      </div>
      {/* Price */}

      {/* Details Accordions */}
      <ProductAccordion title="DETAILS:">
        {/* {product?.description} */}

        <div className="product-description">
          {parse(product?.descriptionHtml, {})}
        </div>
      </ProductAccordion>
      {/* Details Accordions */}

      <ProductVariantSelector product={product} />
    </div>
  );
};

export default ProductDescription;
