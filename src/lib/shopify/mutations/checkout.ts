const gql = String.raw;

export const checkoutCreateMutation = gql`
  mutation CheckoutCreateMutation($input: CheckoutCreateInput!) {
    checkoutCreate(input: $input) {
      checkout {
        id
        webUrl
        lineItems(first: 5) {
          edges {
            node {
              title
              quantity
            }
          }
        }
      }

      checkoutUserErrors {
        code
        message
        field
      }
    }
  }
`;
