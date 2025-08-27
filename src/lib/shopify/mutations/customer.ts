const gql = String.raw;

export const updateCustomerAddressAndProfileMutation = gql`
  mutation updateCustomerAddressAndProfile(
    $address: MailingAddressInput!
    $id: ID!
    $customerAccessToken: String!
    $firstName: String!
    $lastName: String!
  ) {
    customerAddressUpdate(
      address: $address
      id: $id
      customerAccessToken: $customerAccessToken
    ) {
      customerAddress {
        address1
        address2
        city
        country
        firstName
        lastName
        id
        name
        phone
        zip
        province
      }

      customerUserErrors {
        message
        field
        code
      }
    }

    customerUpdate(
      customer: { firstName: $firstName, lastName: $lastName }
      customerAccessToken: $customerAccessToken
    ) {
      customer {
        firstName
        lastName
        email
        displayName
        createdAt
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

export const updateCustomerProfileAndCreateAddressMutation = gql`
  mutation updateCustomerProfileAndCreateAddress(
    $address: MailingAddressInput!
    $customerAccessToken: String!
    $firstName: String!
    $lastName: String!
  ) {
    customerAddressCreate(
      address: $address
      customerAccessToken: $customerAccessToken
    ) {
      customerAddress {
        address1
        address2
        city
        country
        firstName
        lastName
        id
        phone
        zip
        province
      }
      customerUserErrors {
        message
        field
        code
      }
    }

    customerUpdate(
      customer: { firstName: $firstName, lastName: $lastName }
      customerAccessToken: $customerAccessToken
    ) {
      customer {
        firstName
        lastName
        email
        displayName
        createdAt
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;
