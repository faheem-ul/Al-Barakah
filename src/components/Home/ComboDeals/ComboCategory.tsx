import Text from "@/ui/Text";
import { Product } from "@/lib/shopify/types";

import ComboCard from "./ComboCard";
import { ComboCategoryConfig } from "./comboConfig";

interface ComboCategoryProps {
  config: ComboCategoryConfig;
  products: Product[];
}

const ComboCategory = ({ config, products }: ComboCategoryProps) => {
  if (products.length === 0) {
    return (
      <div className="py-8 text-center">
        <Text className="text-black/50">
          Combo deals coming soon — check back shortly.
        </Text>
      </div>
    );
  }

  return (
    <div>
      <Text className="font-arabic text-[18px] font-bold text-black md:text-[20px]">
        {config.title}
      </Text>
      <Text className="mt-1 mb-5 text-[14px] text-black/60">
        {config.subtitle}
      </Text>

      <div className="grid grid-cols-4 justify-items-center gap-3 lg:grid-cols-4 lg:gap-5">
        {products.map((product) => (
          <div key={product.id} className="w-full">
            <ComboCard product={product} categoryId={config.id} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComboCategory;
