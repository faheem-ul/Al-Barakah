import AzadiSaleShop from "@/components/AzadiSale/Shop";
import GoogleReviews from "@/components/GoogleReviews";
import { getCollectionProducts } from "@/lib/shopify/actions/product";
import { Product } from "@/lib/shopify/types";

const AzadiSalePage = async () => {
  const products = await getCollectionProducts({
    handle: "azadi-sale",
  });

  return (
    <div className="mx-auto pb-1 md:max-w-7xl md:pb-20">
      <AzadiSaleShop products={(products.data as Product[]) ?? []} />
      <GoogleReviews />
    </div>
  );
};

export default AzadiSalePage;
