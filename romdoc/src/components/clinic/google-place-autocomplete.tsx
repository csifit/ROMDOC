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
  GoogleAddressApiResponse,
  GoogleClinicAddress,
} from "@/lib/locations/google-address";

type GooglePlaceAutocompleteProps = {
  onAddressSelected: (
    address: GoogleClinicAddress
  ) => void;

  disabled?: boolean;
};

type PlaceObject = {
  id?: string;
};

type PlacePrediction = {
  toPlace: () => PlaceObject;
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
      listener: EventListener
    ) => void;

    removeEventListener: (
      type: string,
      listener: EventListener
    ) => void;
  };

type PlaceAutocompleteElementConstructor =
  new (
    options?: {
      includedRegionCodes?:
        string[];
    }
  ) =>
    PlaceAutocompleteElementInstance;

type PlacesLibrary = {
  PlaceAutocompleteElement?:
    PlaceAutocompleteElementConstructor;
};

type GoogleMapsRuntime = {
  importLibrary?: (
    libraryName: string
  ) => Promise<unknown>;

  places?: {
    PlaceAutocompleteElement?:
      PlaceAutocompleteElementConstructor;
  };
};

type GoogleWindow =
  Window & {
    google?: {
      maps?: GoogleMapsRuntime;
    };
  };

function getPlaceAutocompleteConstructor(
  placesLibrary:
    PlacesLibrary
) {
  const googleWindow =
    window as GoogleWindow;

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
}: GooglePlaceAutocompleteProps) {
  const mountRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const autocompleteRef =
    useRef<
      PlaceAutocompleteElementInstance
      | null
    >(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    isResolvingAddress,
    setIsResolvingAddress,
  ] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null
    );

  const [
    selectedAddress,
    setSelectedAddress,
  ] =
    useState<GoogleClinicAddress | null>(
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
      [onAddressSelected]
    );

  useEffect(() => {
    const mountElement = mountRef.current;

    let isActive =
      true;

    let autocomplete:
      | PlaceAutocompleteElementInstance
      | null = null;

    let handleSelection:
      | EventListener
      | null = null;

    async function initialize() {
      try {
        setError(null);
        setIsLoading(true);

        await loadGoogleMaps();

        if (
          !isActive ||
          !mountRef.current
        ) {
          return;
        }

        const googleWindow =
          window as GoogleWindow;

        const importLibrary =
          googleWindow.google
            ?.maps
            ?.importLibrary;

        if (!importLibrary) {
          throw new Error(
            "FuncÈ›ia Google Maps importLibrary nu este disponibilÄƒ."
          );
        }

        const placesLibrary =
          (await importLibrary(
            "places"
          )) as PlacesLibrary;

        const PlaceAutocompleteElement =
          getPlaceAutocompleteConstructor(
            placesLibrary
          );

        if (
          !PlaceAutocompleteElement
        ) {
          throw new Error(
            "Google Places nu a furnizat componenta PlaceAutocompleteElement."
          );
        }

        autocomplete =
          new PlaceAutocompleteElement({
            includedRegionCodes: [
              "ro",
            ],
          });

        autocomplete.placeholder =
          "CautÄƒ adresa clinicii";

        autocomplete.style.width =
          "100%";

        autocomplete.style.display =
          "block";

        if (disabled) {
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
            event: Event
          ) => {
            try {
              setError(null);

              setIsResolvingAddress(
                true
              );

              const placeEvent =
                event as
                  PlacePredictionSelectEvent;

              const placePrediction =
                placeEvent
                  .placePrediction;

              if (!placePrediction) {
                throw new Error(
                  "Google nu a returnat sugestia selectatÄƒ."
                );
              }

              const place =
                placePrediction
                  .toPlace();

              const placeId =
                place.id;

              if (!placeId) {
                throw new Error(
                  "Google nu a returnat un identificator valid pentru adresÄƒ."
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
                    "Adresa nu a putut fi verificatÄƒ."
                );
              }

              if (!isActive) {
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

              if (!isActive) {
                return;
              }

              setSelectedAddress(
                null
              );

              setError(
                selectionError instanceof
                  Error
                  ? selectionError.message
                  : "Adresa nu a putut fi verificatÄƒ."
              );
            } finally {
              if (isActive) {
                setIsResolvingAddress(
                  false
                );
              }
            }
          }) as EventListener;

        autocomplete.addEventListener(
          "gmp-select",
          handleSelection
        );

        /*
         * This mount element is intentionally empty in JSX.
         * React never renders children inside it, so Google may safely
         * append and remove its custom element.
         */
        mountRef.current.appendChild(
          autocomplete
        );

        autocompleteRef.current =
          autocomplete;

        if (isActive) {
          setIsLoading(false);
        }
      } catch (
        initializationError
      ) {
        console.error(
          "Google Places initialization failed:",
          initializationError
        );

        if (!isActive) {
          return;
        }

        setError(
          initializationError instanceof
            Error
            ? initializationError.message
            : "Google Places nu a putut fi Ã®ncÄƒrcat."
        );

        setIsLoading(false);
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

      /*
       * Remove only the Google element we inserted.
       * Do not call replaceChildren(), because React owns the
       * surrounding component tree.
       */
      

      if (
        autocomplete &&
        mountElement &&
        autocomplete.parentNode ===
        mountElement
      ) {
        mountElement.removeChild(
          autocomplete
        );
      }

      autocompleteRef.current =
        null;
    };
  }, [
    disabled,
    handleAddressSelected,
  ]);

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium text-gray-700">
          Adresa clinicii
        </span>

        <span className="ml-2 text-xs text-gray-500">
          SelecteazÄƒ o adresÄƒ din lista Google
        </span>

        <div className="mt-2 rounded-xl border border-gray-300 bg-white p-1">
          {isLoading && (
            <p className="px-3 py-2 text-sm text-gray-500">
              Se Ã®ncarcÄƒ Google Places...
            </p>
          )}

          <div
            ref={mountRef}
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
          Adresa este verificatÄƒ...
        </p>
      )}

      {selectedAddress && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-950">
            AdresÄƒ selectatÄƒ
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
                OraÈ™
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
                JudeÈ›
              </dt>

              <dd>
                {selectedAddress
                  .countyName ??
                  "â€”"}
              </dd>
            </div>

            <div>
              <dt className="font-semibold">
                Cod poÈ™tal
              </dt>

              <dd>
                {selectedAddress
                  .postalCode ??
                  "â€”"}
              </dd>
            </div>

            <div>
              <dt className="font-semibold">
                ÈšarÄƒ
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
