const gql = String.raw;

export const cartCreateMutation = gql`
  mutation CartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const cartDeliveryAddressesAddMutation = gql`
  mutation CartDeliveryAddressesAdd(
    $cartId: ID!
    $addresses: [CartSelectableAddressInput!]!
  ) {
    cartDeliveryAddressesAdd(cartId: $cartId, addresses: $addresses) {
      cart {
        id
        checkoutUrl
        delivery {
          addresses {
            selected
            address {
              ... on CartDeliveryAddress {
                address1
                city
                provinceCode
                zip
                countryCode
              }
            }
          }
        }
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;
