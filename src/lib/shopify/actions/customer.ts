// "use server";
// import _get from "lodash/get";

// import { getSession } from "@/lib/ironSession";
// import { shopifyFetch } from "@/lib/shopify";
// import {
//   createUserMutation,
//   loginUserMutation,
//   resetPasswordMutation,
// } from "../mutations/authentication";
// import { getCustomerOrdersQuery, getCustomerQuery } from "../queries/customer";
// import {
//   updateCustomerAddressAndProfileMutation,
//   updateCustomerProfileAndCreateAddressMutation,
// } from "../mutations/customer";
// import {
//   ApiResponse,
//   Error,
//   Customer,
//   CustomerAccessToken,
//   CustomerCreateOperation,
//   CustomerLoginOperation,
//   CustomerGetProfileOperation,
//   CustomerProfileData,
//   CustomerProfile,
//   CustomerProfileAndAddressUpdateOperation,
//   CustomerAddressInput,
//   CustomerUpdate,
//   CustomerProfileUpdateAndAddressCreateOperation,
//   CustomerGetOrdersOperation,
//   CustomerOrder,
// } from "../types";
// import { stringifyLog } from "@/lib/utils";
// import { reshadeCustomerOrders } from "@/lib/utils/shopify";

// export const createUser = async (
//   userData: Customer,
// ): Promise<ApiResponse<Customer>> => {
//   try {
//     const res = await shopifyFetch<CustomerCreateOperation>({
//       query: createUserMutation,
//       variables: userData,
//       cache: "no-store",
//     });

//     const customerUserErrors = res.body.data.customerCreate.customerUserErrors;

//     if (customerUserErrors.length > 0) {
//       {
//         return {
//           success: false,
//           data: null,
//           error: {
//             message:
//               customerUserErrors[0].field[1] + " " + customerUserErrors[0].code,
//           },
//         };
//       }
//     }

//     return {
//       data: res.body.data.customerCreate.customer,
//       error: null,
//       success: true,
//     };
//   } catch (error: Error) {
//     console.log("error inside create User", error);
//     const { error: innerError, query } = error;
//     return { data: null, success: false, error: { ...innerError, query } };
//   }
// };

// export const loginUser = async (userData: {
//   email: string;
//   password: string;
// }): Promise<ApiResponse<CustomerAccessToken>> => {
//   const session = await getSession();

//   try {
//     const res = await shopifyFetch<CustomerLoginOperation>({
//       query: loginUserMutation,
//       variables: userData,
//       cache: "no-store",
//     });

//     console.log("Login user res", res);

//     const customerUserErrors =
//       res.body.data.customerAccessTokenCreate.customerUserErrors;

//     if (customerUserErrors.length > 0) {
//       {
//         return {
//           success: false,
//           data: null,
//           error: {
//             message:
//               _get(customerUserErrors, "[0].field[1]", "") +
//               " " +
//               _get(customerUserErrors, "[0].code", ""),
//           },
//         };
//       }
//     }

//     const accessTokenData =
//       res.body.data.customerAccessTokenCreate.customerAccessToken;

//     //* Creating and Saving Session with the Data From Shopify
//     session.accessToken = accessTokenData.accessToken;
//     session.expirationDate = accessTokenData.expiresAt;
//     session.isLoggedIn = true;

//     await session.save();

//     return {
//       success: true,
//       error: null,
//       data: accessTokenData,
//     };
//   } catch (error: Error) {
//     console.log("error inside Login User", error);
//     const { error: innerError, query } = error;
//     return { data: null, success: false, error: { ...innerError, query } };
//   }
// };

// export const getCustomerProfileData = async ({
//   accessToken,
//   cache,
// }: {
//   accessToken: string;
//   cache: RequestCache;
// }): Promise<ApiResponse<CustomerProfile>> => {
//   try {
//     const res = await shopifyFetch<CustomerGetProfileOperation>({
//       query: getCustomerQuery,
//       cache,
//       variables: {
//         accessToken,
//       },
//     });

//     // console.log(
//     //   "get profile data res",
//     //   res?.body?.data?.customer?.addresses?.nodes[0] || {},
//     // );

//     const { addresses, ...customer } = res?.body?.data?.customer;

//     return {
//       data: {
//         // ...res.body.data.customer,
//         // address: res?.body?.data?.customer?.addresses?.nodes[0] || {},
//         ...customer,
//         address: addresses?.nodes[0] || {},
//       },
//       success: true,
//       error: null,
//     };
//   } catch (err) {
//     console.log("get customer profile error", err);

//     return {
//       data: null,
//       success: false,
//       error: err,
//     };
//   }
// };

// export const getCustomerOrdersData = async ({
//   accessToken,
//   cache,
// }: {
//   accessToken: string;
//   cache: RequestCache;
// }): Promise<ApiResponse<CustomerOrder[]>> => {
//   try {
//     const res = await shopifyFetch<CustomerGetOrdersOperation>({
//       query: getCustomerOrdersQuery,
//       cache,
//       variables: {
//         accessToken,
//       },
//     });

//     const reshapedOrders = reshadeCustomerOrders(res.body.data.customer.orders);

//     // stringifyLog("reshapedOrders", reshapedOrders);

//     // console.log("get customer orders res", res?.body?.data?.customer?.orders);

//     // stringifyLog("get orders res", res);

//     // res.body.data.customer.orders.edges.

//     return {
//       data: reshapedOrders,
//       success: true,
//       error: null,
//     };
//   } catch (err) {
//     console.log("get customer profile error", err);

//     return {
//       data: null,
//       success: false,
//       error: err,
//     };
//   }
// };

// export const updateCustomerAddressAndProfile = async ({
//   customerAccessToken,
//   address,
//   id,
//   firstName,
//   lastName,
// }: {
//   customerAccessToken: string;
//   address: CustomerAddressInput;
//   id: string;
//   firstName: string;
//   lastName: string;
// }): Promise<ApiResponse<CustomerUpdate>> => {
//   try {
//     const res = await shopifyFetch<CustomerProfileAndAddressUpdateOperation>({
//       query: updateCustomerAddressAndProfileMutation,
//       variables: {
//         customerAccessToken,
//         address,
//         id,
//         firstName,
//         lastName,
//       },
//     });

//     // stringifyLog("update res", res);

//     return {
//       data: {
//         customerAddress: res.body.data.customerAddressUpdate.customerAddress,
//         customer: res.body.data.customerUpdate.customer,
//       },
//       success: true,
//       error: null,
//     };
//   } catch (err) {
//     console.log("get customer profile error", err);

//     return {
//       data: null,
//       success: false,
//       error: err,
//     };
//   }
// };

// export const updateCustomerProfileAndCreateAddress = async ({
//   customerAccessToken,
//   address,
//   firstName,
//   lastName,
// }: {
//   customerAccessToken: string;
//   address: CustomerAddressInput;
//   firstName: string;
//   lastName: string;
// }): Promise<ApiResponse<CustomerUpdate>> => {
//   try {
//     const res =
//       await shopifyFetch<CustomerProfileUpdateAndAddressCreateOperation>({
//         query: updateCustomerProfileAndCreateAddressMutation,
//         variables: {
//           customerAccessToken,
//           address,
//           firstName,
//           lastName,
//         },
//       });

//     // stringifyLog("update profile and create address res", res);

//     return {
//       data: {
//         customerAddress:
//           res?.body?.data?.customerAddressUpdate?.customerAddress,
//         customer: res?.body?.data?.customerUpdate?.customer,
//       },
//       success: true,
//       error: null,
//     };
//   } catch (err) {
//     console.log("get customer profile error", err);

//     return {
//       data: null,
//       success: false,
//       error: err,
//     };
//   }
// };

// export const resetCustomerPassword = async ({
//   email,
// }: {
//   email: string;
// }): Promise<ApiResponse<any>> => {
//   try {
//     const res = await shopifyFetch<any>({
//       query: resetPasswordMutation,
//       variables: {
//         email,
//       },
//     });

//     // stringifyLog("reset password res", res);

//     if (res.body.data.customerRecover.customerUserErrors.length > 0) {
//       return {
//         data: null,
//         success: false,
//         error: { message: "Some error occured!" },
//       };
//     }

//     return {
//       data: { email },
//       success: true,
//       error: null,
//     };
//   } catch (err) {
//     console.log("reset password error", err);

//     return {
//       data: null,
//       success: false,
//       error: err,
//     };
//   }
// };
