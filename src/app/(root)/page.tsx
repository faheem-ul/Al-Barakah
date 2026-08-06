// import { cookies } from "next/headers";
// import { redirect } from "next/navigation";

// import Services from "@/components/Home/Services";
import Shop from "@/components/Home/Shop";
import GoogleReviews from "@/components/Home/GoogleReviews";
import { getGoogleReviewsSnapshot } from "@/lib/google-reviews";
import { getProducts } from "@/lib/shopify/actions/product";
import { Product } from "@/lib/shopify/types";

const HomePage = async () => {
  // const cookieStore = await cookies();
  // const goldenTicket = cookieStore.get("goldenTicket")?.value;

  // if (!goldenTicket) {
  //   redirect("/upcoming");
  // }

  const [products, googleReviews] = await Promise.all([
    getProducts({
      first: 3,
    }),
    getGoogleReviewsSnapshot(),
  ]);

  return (
    <div className="mx-auto pb-1 md:max-w-7xl md:pb-20">
      <Shop products={products.data as Product[]} />
      <GoogleReviews snapshot={googleReviews} />
      {/* <Services /> */}
    </div>
  );
};

export default HomePage;
