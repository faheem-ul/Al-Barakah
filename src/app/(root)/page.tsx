// import { cookies } from "next/headers";
// import { redirect } from "next/navigation";

// import Services from "@/components/Home/Services";
import ComboDeals from "@/components/Home/ComboDeals";
import GoogleReviews from "@/components/GoogleReviews";
import Shop from "@/components/Home/Shop";
import {
  getCollectionProducts,
  getProducts,
} from "@/lib/shopify/actions/product";
import { Product } from "@/lib/shopify/types";

const HomePage = async () => {
  // const cookieStore = await cookies();
  // const goldenTicket = cookieStore.get("goldenTicket")?.value;

  // if (!goldenTicket) {
  //   redirect("/upcoming");
  // }

  const [products, duo, family, mix, gift] = await Promise.all([
    getProducts({ first: 3 }),
    getCollectionProducts({ handle: "combo-duo-packs" }),
    getCollectionProducts({ handle: "combo-family-packs" }),
    getCollectionProducts({ handle: "combo-mix-packs" }),
    getCollectionProducts({ handle: "combo-gift-variety" }),
  ]);

  return (
    <div className="mx-auto pb-1 md:max-w-7xl md:pb-20">
      <Shop products={products.data as Product[]} />
      <ComboDeals
        categories={{
          duo: (duo.data as Product[]) ?? [],
          family: (family.data as Product[]) ?? [],
          mix: (mix.data as Product[]) ?? [],
          gift: (gift.data as Product[]) ?? [],
        }}
      />
      <GoogleReviews />
      {/* <Services /> */}
    </div>
  );
};

export default HomePage;
