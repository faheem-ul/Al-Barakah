import { stringifyLog } from "@/lib/utils";
import { shopifyFetch } from "..";
import { checkoutCreateMutation } from "../mutations/checkout";
import { CheckoutCreateInput } from "../types";

//!  Checkout Create
export async function checkoutCreate(
  checkoutCreateInput: CheckoutCreateInput
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
): Promise<any> {
  // console.log("lineItems in func", checkoutCreateInput);

  try {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const res = await shopifyFetch<any>({
      query: checkoutCreateMutation,
      variables: {
        input: {
          ...checkoutCreateInput,
        },
      },
      cache: "no-store",
    });
    // console.log("checkout Create Mutation Res", res.body);

    return res.body?.data?.checkoutCreate?.checkout;
  } catch (err) {
    stringifyLog("checkout create error", err);
    return {
      err,
      id: "",
      webUrl: "",
      lineItems: {},
    };
  }
}

// //!  Checkout Create
// export async function checkoutCreate(
//   lineItems: { variantId: string; quantity: number }[],
// ): Promise<any> {
//   console.log("lineItems in func", lineItems);

//   try {
//     const res = await shopifyFetch<any>({
//       query: checkoutCreateMutation,
//       variables: {
//         input: {
//           lineItems,
//         },
//       },
//       cache: "no-store",
//     });
//     // console.log("checkout Create Mutation Res", res.body);

//     return res.body?.data?.checkoutCreate?.checkout;
//   } catch (err) {
//     console.log("error", err);
//     return {
//       err,
//       id: "",
//       webUrl: "",
//       lineItems: {},
//     };
//   }
// }
