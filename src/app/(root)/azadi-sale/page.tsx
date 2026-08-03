import Shop from "@/components/Home/Shop";
import { getCollectionProducts } from "@/lib/shopify/actions/product";
import { Product } from "@/lib/shopify/types";

const AzadiSalePage = async () => {
  const products = await getCollectionProducts({
    handle: "azadi-sale",
  });

  return (
    <div className="mx-auto pb-1 md:max-w-7xl md:pb-20">
      <Shop
        products={(products.data as Product[]) ?? []}
        title="Azadi Sale"
        productNameMaxWidth={260}
        useShopifyHandle
        imageObjectFit="fill"
      />
    </div>
  );
};

export default AzadiSalePage;
