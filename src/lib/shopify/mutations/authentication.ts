const gql = String.raw;

export const createUserMutation = gql`
  mutation RegisterAccount(
    $firstName: String!
    $password: String!
    $email: String!
    $lastName: String!
    $acceptsMarketing: Boolean
  ) {
    customerCreate(
      input: {
        firstName: $firstName
        lastName: $lastName
        email: $email
        password: $password
        acceptsMarketing: $acceptsMarketing
      }
    ) {
      customer {
        id
        email
        firstName
        lastName
      }
      customerUserErrors {
        code
        field
      }
    }
  }
`;

export const loginUserMutation = gql`
  mutation LoginAccount($email: String!, $password: String!) {
    customerAccessTokenCreate(input: { email: $email, password: $password }) {
      customerAccessToken {
        accessToken
        expiresAt
      }

      customerUserErrors {
        code
        field
      }
    }
  }
`;

export const accessTokenRenewMutation = gql`
  mutation CustomerAccessTokenRenew($customerAccessToken: String!) {
    customerAccessTokenRenew(customerAccessToken: $customerAccessToken) {
      customerAccessToken {
        accessToken
        expiresAt
      }
      userErrors {
        message
        field
      }
    }
  }
`;

export const resetPasswordMutation = gql`
  mutation ResetPassword($email: String!) {
    customerRecover(email: $email) {
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;
