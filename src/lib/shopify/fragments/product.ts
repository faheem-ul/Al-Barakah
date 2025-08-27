import imageFragment from "./image";
import seoFragment from "./seo";

const productFragment = /* GraphQL */ `
  fragment product on Product {
    id
    handle
    availableForSale
    title

    description
    descriptionHtml
    productType
    options {
      id
      name
      values
    }
    compareAtPriceRange {
      maxVariantPrice {
        amount
        currencyCode
      }
      minVariantPrice {
        amount
        currencyCode
      }
    }
    priceRange {
      maxVariantPrice {
        amount
        currencyCode
      }
      minVariantPrice {
        amount
        currencyCode
      }
    }
    variants(first: 50) {
      edges {
        node {
          id
          title
          availableForSale
          selectedOptions {
            name
            value
          }
          price {
            amount
            currencyCode
          }
        }
      }
    }
    featuredImage {
      ...image
    }
    images(first: 20) {
      edges {
        node {
          ...image
        }
      }
    }
    seo {
      ...seo
    }
    tags
    updatedAt

    metafields(
      identifiers: [
        { key: "color-pattern", namespace: "shopify" }
        { key: "accessory-size", namespace: "shopify" }
        { key: "size", namespace: "shopify" }
      ]
    ) {
      id
      key
      value
      namespace
    }
  }
  ${imageFragment}
  ${seoFragment}
`;

export default productFragment;
