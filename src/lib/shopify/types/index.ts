type ExtractVariables<T> = T extends { variables: object }
  ? T["variables"]
  : never;

export type Shopifetch<T> = {
  cache?: RequestCache;
  headers?: HeadersInit;
  query: string;
  tags?: string[];
  variables?: ExtractVariables<T>;
};

type ShopifyError = {
  message: string;
  path: string[];
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  locations: any[];
};

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export type Error = null | ShopifyError | any;

type ErrorResponse = {
  success: boolean;
  error: Error;
  data: null;
};

type SuccessResponse<T> = {
  success: boolean;
  error: Error;
  data: T;
};

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export type MacrosMetaField = {
  key: "calories" | "protein" | "carbs" | "fats";
  namespace: "macros";
};

export type FiltersMetaField = {
  key: "meal_type" | "meal_size" | "allergens" | "calories" | "protein";
  namespace: "filters";
};

export type ProductMetaField = {
  key:
    | "short_description"
    | "ingredients"
    | "allergen_information"
    | "nutrition_facts";
  namespace: "product";
};

export type MyFieldMetaField = {
  key: "new_item";

  namespace: "my_fields";
};

export type MetaFieldPair =
  | MacrosMetaField
  | FiltersMetaField
  | ProductMetaField
  | MyFieldMetaField;

// export {...CustomerTypes }
export * from "./customer";
export * from "./product";
export * from "./checkout";
