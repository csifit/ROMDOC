"use client";

import { useTranslations } from "next-intl";
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

type GlobalGooglePlaceAutocompleteProps = {
  onPlaceSelected: (
    address: GoogleClinicAddress
  ) => void;
  onClear?: () => void;
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
    placePrediction:
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
  new () =>
    PlaceAutocompleteElementInstance;

type PlacesLibrary = {
  PlaceAutocompleteElement:
    PlaceAutocompleteElementConstructor;
};

type GoogleWindow =
  Window & {
    google?: {
      maps?: {
        importLibrary?: (
          libraryName: string
        ) => Promise<unknown>;
      };
    };
  };

export default function GlobalGooglePlaceAutocomplete({
  onPlaceSelected,
  onClear,
  disabled = false,
}: GlobalGooglePlaceAutocompleteProps) {
  const t =
    useTranslations(
      "GooglePlaces"
    );

  const containerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const [
    selectedAddress,
    setSelectedAddress,
  ] =
    useState<GoogleClinicAddress | null>(
      null
    );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isResolving,
    setIsResolving,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const handleSelected =
    useCallback(
      (
        address:
          GoogleClinicAddress
      ) => {
        onPlaceSelected(
          address
        );
      },
      [onPlaceSelected]
    );

  useEffect(() => {
    let isActive = true;

    const hostElement =
      containerRef.current;

    let autocomplete:
      | PlaceAutocompleteElementInstance
      | null = null;

    let selectionHandler:
      | EventListener
      | null = null;

    async function initialize() {
      try {
        setError(null);
        setIsLoading(true);

        await loadGoogleMaps();

        if (
          !isActive ||
          !hostElement
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
            t("unavailable")
          );
        }

        const placesLibrary =
          (await importLibrary(
            "places"
          )) as PlacesLibrary;

        autocomplete =
          new placesLibrary
            .PlaceAutocompleteElement();

        autocomplete.placeholder =
          t("placeholder");

        autocomplete.style.width =
          "100%";

        autocomplete.style.display =
          "block";

        if (disabled) {
          autocomplete.setAttribute(
            "disabled",
            ""
          );
        }

        selectionHandler =
          (async (
            event: Event
          ) => {
            try {
              setError(null);
              setIsResolving(true);

              const placeEvent =
                event as
                  PlacePredictionSelectEvent;

              const place =
                placeEvent
                  .placePrediction
                  .toPlace();

              const placeId =
                place.id;

              if (!placeId) {
                throw new Error(
                  t("invalidPlace")
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
                    t(
                      "locationVerificationFailed"
                    )
                );
              }

              if (!isActive) {
                return;
              }

              setSelectedAddress(
                result.address
              );

              handleSelected(
                result.address
              );
            } catch (
              selectionError
            ) {
              console.error(
                "Global Google place selection failed:",
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
                  : t(
                      "locationVerificationFailed"
                    )
              );
            } finally {
              if (isActive) {
                setIsResolving(
                  false
                );
              }
            }
          }) as EventListener;

        autocomplete.addEventListener(
          "gmp-select",
          selectionHandler
        );

        hostElement.appendChild(
          autocomplete
        );

        setIsLoading(false);
      } catch (
        initializationError
      ) {
        console.error(
          "Global Google Places initialization failed:",
          initializationError
        );

        if (!isActive) {
          return;
        }

        setError(
          initializationError instanceof
            Error
            ? initializationError.message
            : t("loadFailed")
        );

        setIsLoading(false);
      }
    }

    void initialize();

    return () => {
      isActive = false;

      if (
        autocomplete &&
        selectionHandler
      ) {
        autocomplete
          .removeEventListener(
            "gmp-select",
            selectionHandler
          );
      }

      if (
        autocomplete &&
        hostElement &&
        autocomplete.parentNode ===
          hostElement
      ) {
        hostElement.removeChild(
          autocomplete
        );
      }
    };
  }, [
    disabled,
    handleSelected,
    t,
  ]);

  function clearSelection() {
    setSelectedAddress(null);
    setError(null);

    containerRef.current
      ?.querySelector(
        "gmp-place-autocomplete"
      )
      ?.setAttribute(
        "value",
        ""
      );

    onClear?.();
  }

  return (
    <div className="space-y-3">
      <div>
        <span className="text-sm font-semibold text-gray-800">
          {t("label")}
        </span>

        <div className="mt-2">
          <div
            ref={containerRef}
            className="min-h-12 w-full rounded-xl border border-gray-300 bg-white p-1 shadow-sm"
          />

          {isLoading && (
            <p className="mt-2 text-sm text-gray-500">
              {t("loading")}
            </p>
          )}
        </div>
      </div>

      {isResolving && (
        <p className="text-sm text-gray-600">
          {t("resolving")}
        </p>
      )}

      {selectedAddress && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-emerald-950">
                {t("selected")}
              </p>

              <p className="mt-1 text-sm leading-6 text-emerald-900">
                {
                  selectedAddress
                    .formattedAddress
                }
              </p>

              <p className="mt-2 text-xs text-emerald-800">
                {
                  selectedAddress
                    .cityName
                }
                {" · "}
                {
                  selectedAddress
                    .countryCode
                }
              </p>
            </div>

            <button
              type="button"
              onClick={clearSelection}
              className="romdoc-focus-ring rounded-lg px-2 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
            >
              {t("change")}
            </button>
          </div>
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
