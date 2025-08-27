// import { cookies } from "next/headers";
// import { redirect } from "next/navigation";

// import Services from "@/components/Home/Services";
import Shop from "@/components/Home/Shop";
import { getProducts } from "@/lib/shopify/actions/product";
import { Product } from "@/lib/shopify/types";

const HomePage = async () => {
  // const cookieStore = await cookies();
  // const goldenTicket = cookieStore.get("goldenTicket")?.value;

  // if (!goldenTicket) {
  //   redirect("/upcoming");
  // }

  const products = await getProducts({
    first: 3,
  });

  return (
    <div className="mx-auto pb-10 md:max-w-7xl md:pb-20">
      <Shop products={products.data as Product[]} />
      {/* <Services /> */}
    </div>
  );
};

export default HomePage;
