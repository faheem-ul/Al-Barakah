import productFragment from "../fragments/product";

const gql = String.raw;

export const getProductsQuery = gql`
  query getProducts(
    $sortKey: ProductSortKeys
    $reverse: Boolean
    $query: String
    $first: Int
  ) {
    products(
      sortKey: $sortKey
      reverse: $reverse
      query: $query
      first: $first
    ) {
      edges {
        node {
          ...product
        }
      }
    }
  }
  ${productFragment}
`;

export const getProductByHandleQuery = gql`
  query getProduct($handle: String!) {
    product(handle: $handle) {
      ...product
    }
  }
  ${productFragment}
`;

export const getProductByIdQuery = gql`
  query getProduct($handle: ID!) {
    product(id: $handle) {
      ...product
    }
  }
  ${productFragment}
`;

export const getProductsByHandlesQuery = gql`
  query getProducts($handles: [String!]!) {
    products(query: $handles) {
      edges {
        node {
          ...product
        }
      }
    }
  }
  ${productFragment}
`;

export const getCartProductsQuery = gql`
  query cartProducts($productIds: [ID!]!) {
    nodes(ids: $productIds) {
      ...product
    }
  }
  ${productFragment}
`;

export const getProductsByMetafieldQuery = gql`
  query getProductsByMetafiel($category: String!, $reverse: Boolean) {
    collection(handle: "frontpage") {
      products(
        reverse: $reverse
        first: 3
        filters: [
          {
            productMetafield: {
              namespace: "filters"
              key: "meal_type"
              value: $category
            }
          }
        ]
      ) {
        edges {
          node {
            ...product
          }
        }
      }
    }
  }

  ${productFragment}
`;

export const getProductsByProductTypeQuery = gql`
  query getProductsByProductType($productType: String!, $reverse: Boolean) {
    collections(first: 100) {
      nodes {
        handle
        products(
          reverse: $reverse
          first: 10
          filters: [{ productType: $productType }]
        ) {
          edges {
            node {
              ...product
            }
          }
        }
      }
    }
  }

  ${productFragment}
`;

export const getMetaObjectValuesQuery = gql`
  query Metaobject($id: ID!) {
    metaobject(id: $id) {
      id
      handle
      fields {
        value
        key
        type
      }
    }
  }
`;
