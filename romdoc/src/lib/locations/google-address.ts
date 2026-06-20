export type GoogleClinicAddress = {
  placeId: string;

  displayName:
    | string
    | null;

  formattedAddress: string;

  addressLine1: string;

  cityName: string;

  countyName:
    | string
    | null;

  postalCode:
    | string
    | null;

  countryCode: string;

  latitude: number;

  longitude: number;

  googleMapsUri:
    | string
    | null;
};

export type GoogleAddressApiResponse = {
  address?: GoogleClinicAddress;
  error?: string;
};