const gql = String.raw;

export const getCustomerQuery = gql`
  query CustomerQuery($accessToken: String!) {
    customer(customerAccessToken: $accessToken) {
      firstName
      lastName
      email
      displayName
      createdAt
      addresses(first: 10) {
        nodes {
          address1
          address2
          city
          country
          firstName
          lastName
          id
          name
          phone
          province
          zip
        }
      }
    }
  }
`;

export const getCustomerOrdersQuery = gql`
  query GetOrders($accessToken: String!) {
    customer(customerAccessToken: $accessToken) {
      orders(first: 50) {
        edges {
          node {
            lineItems(first: 50) {
              edges {
                node {
                  title
                  variant {
                    image {
                      id
                      altText
                      url
                    }
                  }
                  currentQuantity
                  quantity
                  originalTotalPrice {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;
