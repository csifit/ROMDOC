"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  loadGoogleMaps,
} from "@/lib/google-maps/load-google-maps";
import type {
  AppLocale,
} from "@/lib/i18n/app-locale";
import type {
  GoogleAddressApiResponse,
  GoogleClinicAddress,
} from "@/lib/locations/google-address";

export type GooglePlaceAutocompleteCopy = {
  placeholder: string;
  importUnavailable: string;
  elementUnavailable: string;
  predictionMissing: string;
  placeIdMissing: string;
  verifyError: string;
  loadError: string;
  label: string;
  help: string;
  loading: string;
  verifying: string;
  selected: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

type GooglePlaceAutocompleteProps = {
  onAddressSelected: (
    address:
      GoogleClinicAddress
  ) => void;

  disabled?: boolean;
  locale?: AppLocale;

  copy?:
    GooglePlaceAutocompleteCopy;
};

type PlaceObject = {
  id?: string;
};

type PlacePrediction = {
  toPlace:
    () =>
      PlaceObject;
};

type PlacePredictionSelectEvent =
  Event & {
    placePrediction?:
      PlacePrediction;
  };

type PlaceAutocompleteElementInstance =
  HTMLElement & {
    placeholder: string;

    addEventListener: (
      type: string,
      listener:
        EventListener
    ) => void;

    removeEventListener: (
      type: string,
      listener:
        EventListener
    ) => void;
  };

type PlaceAutocompleteElementConstructor =
  new () =>
    PlaceAutocompleteElementInstance;

type PlacesLibrary = {
  PlaceAutocompleteElement?:
    PlaceAutocompleteElementConstructor;
};

type GoogleMapsRuntime = {
  importLibrary?: (
    libraryName:
      string
  ) =>
    Promise<unknown>;

  places?: {
    PlaceAutocompleteElement?:
      PlaceAutocompleteElementConstructor;
  };
};

type GoogleWindow =
  Window & {
    google?: {
      maps?:
        GoogleMapsRuntime;
    };
  };

const DEFAULT_COPY:
  GooglePlaceAutocompleteCopy = {
    placeholder:
      "Caută adresa clinicii",

    importUnavailable:
      "Funcția Google Maps importLibrary nu este disponibilă.",

    elementUnavailable:
      "Google Places nu a furnizat componenta PlaceAutocompleteElement.",

    predictionMissing:
      "Google nu a returnat sugestia selectată.",

    placeIdMissing:
      "Google nu a returnat un identificator valid pentru adresă.",

    verifyError:
      "Adresa nu a putut fi verificată.",

    loadError:
      "Google Places nu a putut fi încărcat.",

    label:
      "Adresa clinicii",

    help:
      "Selectează o adresă din lista Google",

    loading:
      "Se încarcă Google Places...",

    verifying:
      "Adresa este verificată...",

    selected:
      "Adresă selectată",

    city:
      "Oraș",

    region:
      "Regiune",

    postalCode:
      "Cod poștal",

    country:
      "Țară",
  };

function getPlaceAutocompleteConstructor(
  placesLibrary:
    PlacesLibrary
) {
  const googleWindow =
    window as
      GoogleWindow;

  return (
    placesLibrary
      .PlaceAutocompleteElement ??
    googleWindow.google
      ?.maps
      ?.places
      ?.PlaceAutocompleteElement ??
    null
  );
}

export default function GooglePlaceAutocomplete({
  onAddressSelected,
  disabled = false,
  locale = "ro",
  copy =
    DEFAULT_COPY,
}: GooglePlaceAutocompleteProps) {
  const mountRef =
    useRef<
      HTMLDivElement | null
    >(
      null
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true
    );

  const [
    isResolvingAddress,
    setIsResolvingAddress,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    selectedAddress,
    setSelectedAddress,
  ] =
    useState<
      GoogleClinicAddress | null
    >(
      null
    );

  const handleAddressSelected =
    useCallback(
      (
        address:
          GoogleClinicAddress
      ) => {
        onAddressSelected(
          address
        );
      },
      [
        onAddressSelected,
      ]
    );

  useEffect(() => {
    let isActive =
      true;

    let autocomplete:
      | PlaceAutocompleteElementInstance
      | null =
      null;

    let handleSelection:
      | EventListener
      | null =
      null;

    async function initialize() {
      try {
        setError(
          null
        );

        setIsLoading(
          true
        );

        await loadGoogleMaps();

        if (
          !isActive ||
          !mountRef.current
        ) {
          return;
        }

        const googleWindow =
          window as
            GoogleWindow;

        const importLibrary =
          googleWindow.google
            ?.maps
            ?.importLibrary;

        if (
          !importLibrary
        ) {
          throw new Error(
            copy.importUnavailable
          );
        }

        const placesLibrary =
          (await importLibrary(
            "places"
          )) as
            PlacesLibrary;

        const PlaceAutocompleteElement =
          getPlaceAutocompleteConstructor(
            placesLibrary
          );

        if (
          !PlaceAutocompleteElement
        ) {
          throw new Error(
            copy.elementUnavailable
          );
        }

        autocomplete =
          new PlaceAutocompleteElement();

        autocomplete.placeholder =
          copy.placeholder;

        autocomplete.style
          .width =
          "100%";

        autocomplete.style
          .display =
          "block";

        if (
          disabled
        ) {
          autocomplete.setAttribute(
            "disabled",
            ""
          );
        } else {
          autocomplete.removeAttribute(
            "disabled"
          );
        }

        handleSelection =
          (async (
            event:
              Event
          ) => {
            try {
              setError(
                null
              );

              setIsResolvingAddress(
                true
              );

              const placeEvent =
                event as
                  PlacePredictionSelectEvent;

              const placePrediction =
                placeEvent
                  .placePrediction;

              if (
                !placePrediction
              ) {
                throw new Error(
                  copy.predictionMissing
                );
              }

              const place =
                placePrediction
                  .toPlace();

              const placeId =
                place.id;

              if (
                !placeId
              ) {
                throw new Error(
                  copy.placeIdMissing
                );
              }

              const response =
                await fetch(
                  "/api/google/places/details",
                  {
                    method:
                      "POST",

                    headers: {
                      "Content-Type":
                        "application/json",
                    },

                    body:
                      JSON.stringify({
                        placeId,
                        locale,
                      }),
                  }
                );

              const result =
                (await response.json()) as
                  GoogleAddressApiResponse;

              if (
                !response.ok ||
                !result.address
              ) {
                throw new Error(
                  result.error ??
                    copy.verifyError
                );
              }

              if (
                !isActive
              ) {
                return;
              }

              setSelectedAddress(
                result.address
              );

              handleAddressSelected(
                result.address
              );
            } catch (
              selectionError
            ) {
              console.error(
                "Google address selection failed:",
                selectionError
              );

              if (
                !isActive
              ) {
                return;
              }

              setSelectedAddress(
                null
              );

              setError(
                selectionError instanceof
                  Error
                  ? selectionError.message
                  : copy.verifyError
              );
            } finally {
              if (
                isActive
              ) {
                setIsResolvingAddress(
                  false
                );
              }
            }
          }) as
            EventListener;

        autocomplete.addEventListener(
          "gmp-select",
          handleSelection
        );

        mountRef.current
          .appendChild(
            autocomplete
          );

        if (
          isActive
        ) {
          setIsLoading(
            false
          );
        }
      } catch (
        initializationError
      ) {
        console.error(
          "Google Places initialization failed:",
          initializationError
        );

        if (
          !isActive
        ) {
          return;
        }

        setError(
          initializationError instanceof
            Error
            ? initializationError.message
            : copy.loadError
        );

        setIsLoading(
          false
        );
      }
    }

    void initialize();

    return () => {
      isActive =
        false;

      if (
        autocomplete &&
        handleSelection
      ) {
        autocomplete
          .removeEventListener(
            "gmp-select",
            handleSelection
          );
      }

      const mountElement =
        mountRef.current;

      if (
        autocomplete &&
        mountElement &&
        autocomplete.parentNode ===
          mountElement
      ) {
        mountElement
          .removeChild(
            autocomplete
          );
      }
    };
  }, [
    copy,
    disabled,
    handleAddressSelected,
    locale,
  ]);

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium text-gray-700">
          {
            copy.label
          }
        </span>

        <span className="ml-2 text-xs text-gray-500">
          {
            copy.help
          }
        </span>

        <div className="mt-2 rounded-xl border border-gray-300 bg-white p-1">
          {isLoading && (
            <p className="px-3 py-2 text-sm text-gray-500">
              {
                copy.loading
              }
            </p>
          )}

          <div
            ref={
              mountRef
            }
            className={
              isLoading
                ? "hidden"
                : "block min-h-11 w-full"
            }
          />
        </div>
      </label>

      {isResolvingAddress && (
        <p className="text-sm text-gray-600">
          {
            copy.verifying
          }
        </p>
      )}

      {selectedAddress && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-950">
            {
              copy.selected
            }
          </p>

          <p className="mt-1 text-sm leading-6 text-green-900">
            {
              selectedAddress
                .formattedAddress
            }
          </p>

          <dl className="mt-3 grid gap-2 text-xs text-green-900 sm:grid-cols-2">
            <div>
              <dt className="font-semibold">
                {
                  copy.city
                }
              </dt>

              <dd>
                {
                  selectedAddress
                    .cityName
                }
              </dd>
            </div>

            <div>
              <dt className="font-semibold">
                {
                  copy.region
                }
              </dt>

              <dd>
                {selectedAddress
                  .countyName ??
                  "—"}
              </dd>
            </div>

            <div>
              <dt className="font-semibold">
                {
                  copy.postalCode
                }
              </dt>

              <dd>
                {selectedAddress
                  .postalCode ??
                  "—"}
              </dd>
            </div>

            <div>
              <dt className="font-semibold">
                {
                  copy.country
                }
              </dt>

              <dd>
                {
                  selectedAddress
                    .countryCode
                }
              </dd>
            </div>
          </dl>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}
    </div>
  );
}
