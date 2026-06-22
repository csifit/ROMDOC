"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  loadGoogleMaps,
} from "@/lib/google-maps/load-google-maps";

type PublicClinicMapItem = {
  id: string;
  slug: string;
  name: string;
  cityName: string;
  citySlug:
    | string
    | null;

  formattedAddress: string;
  latitude: number;
  longitude: number;
  googleMapsUri:
    | string
    | null;

  doctorCount: number;
  specialtyCount: number;
};

type PublicClinicMapResponse = {
  clinics?: PublicClinicMapItem[];
  error?: string;
};

type LatLngLiteral = {
  lat: number;
  lng: number;
};

type MapInstance = {
  fitBounds: (
    bounds: unknown,
    padding?: number | {
      top: number;
      right: number;
      bottom: number;
      left: number;
    }
  ) => void;

  setCenter: (
    center: LatLngLiteral
  ) => void;

  setZoom: (
    zoom: number
  ) => void;

  getZoom: () =>
    | number
    | undefined;

  addListener: (
    eventName: string,
    handler: () => void
  ) => {
    remove: () => void;
  };
};

type MapConstructor = new (
  element: HTMLElement,
  options: {
    center: LatLngLiteral;
    zoom: number;
    mapId?: string;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
    clickableIcons?: boolean;
    gestureHandling?: string;
  }
) => MapInstance;

type LatLngBoundsInstance = {
  extend: (
    position: LatLngLiteral
  ) => void;
};

type LatLngBoundsConstructor =
  new () => LatLngBoundsInstance;

type InfoWindowInstance = {
  open: (
    options: {
      map: MapInstance;
      anchor: AdvancedMarkerInstance;
    }
  ) => void;

  close: () => void;
};

type InfoWindowConstructor =
  new (
    options?: {
      content?: HTMLElement;
      ariaLabel?: string;
    }
  ) => InfoWindowInstance;

type MapsLibrary = {
  Map: MapConstructor;
  LatLngBounds:
    LatLngBoundsConstructor;
  InfoWindow:
    InfoWindowConstructor;
};

type AdvancedMarkerInstance = {
  map:
    | MapInstance
    | null;

  addListener: (
    eventName: string,
    handler: () => void
  ) => {
    remove: () => void;
  };
};

type AdvancedMarkerConstructor =
  new (
    options: {
      map: MapInstance;
      position: LatLngLiteral;
      title: string;
      content?: HTMLElement;
    }
  ) => AdvancedMarkerInstance;

type MarkerLibrary = {
  AdvancedMarkerElement:
    AdvancedMarkerConstructor;
};

type GoogleMapsRuntime = {
  importLibrary?: (
    libraryName: string
  ) => Promise<unknown>;
};

type GoogleWindow =
  Window & {
    google?: {
      maps?: GoogleMapsRuntime;
    };
  };

const ROMANIA_CENTER: LatLngLiteral = {
  lat: 45.9432,
  lng: 24.9668,
};

const ROMANIA_ZOOM = 7;

function createMarkerContent(
  clinic: PublicClinicMapItem
) {
  const marker =
    document.createElement(
      "button"
    );

  marker.type = "button";
  marker.setAttribute(
    "aria-label",
    `Deschide detaliile pentru ${clinic.name}`
  );

  marker.className =
    "romdoc-map-marker";

  marker.innerHTML = `
    <span class="romdoc-map-marker-dot"></span>
    <span class="romdoc-map-marker-label">${escapeHtml(
      clinic.name
    )}</span>
  `;

  return marker;
}

function createInfoWindowContent(
  clinic: PublicClinicMapItem
) {
  const container =
    document.createElement(
      "article"
    );

  container.className =
    "romdoc-map-popup";

  const doctorLabel =
    clinic.doctorCount === 1
      ? "1 medic activ"
      : `${clinic.doctorCount} medici activi`;

  const specialtyLabel =
    clinic.specialtyCount === 1
      ? "1 specialitate"
      : `${clinic.specialtyCount} specialități`;

  const doctorsHref =
    clinic.citySlug
      ? `/medici?city=${encodeURIComponent(
          clinic.citySlug
        )}`
      : "/medici";

  container.innerHTML = `
    <p class="romdoc-map-popup-city">${escapeHtml(
      clinic.cityName
    )}</p>
    <h2 class="romdoc-map-popup-title">${escapeHtml(
      clinic.name
    )}</h2>
    <p class="romdoc-map-popup-address">${escapeHtml(
      clinic.formattedAddress
    )}</p>
    <div class="romdoc-map-popup-stats">
      <span>${escapeHtml(
        doctorLabel
      )}</span>
      <span>${escapeHtml(
        specialtyLabel
      )}</span>
    </div>
    <div class="romdoc-map-popup-actions">
      <a
        href="${doctorsHref}"
        class="romdoc-map-popup-primary"
      >
        Vezi medicii
      </a>
      ${
        clinic.googleMapsUri
          ? `<a
              href="${escapeAttribute(
                clinic.googleMapsUri
              )}"
              target="_blank"
              rel="noreferrer"
              class="romdoc-map-popup-secondary"
            >
              Google Maps
            </a>`
          : ""
      }
    </div>
  `;

  return container;
}

function escapeHtml(
  value: string
) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(
  value: string
) {
  return escapeHtml(value);
}

function scrollToFilters() {
  document
    .getElementById(
      "doctor-filters"
    )
    ?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
}

export default function PublicClinicMap() {
  const mapContainerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(
      null
    );

  const [clinicCount, setClinicCount] =
    useState(0);

  useEffect(() => {
    let isActive = true;

    let map:
      | MapInstance
      | null = null;

    let infoWindow:
      | InfoWindowInstance
      | null = null;

    const markerListeners: Array<{
      remove: () => void;
    }> = [];

    const markers:
      AdvancedMarkerInstance[] = [];

    async function initializeMap() {
      try {
        setIsLoading(true);
        setError(null);

        const response =
          await fetch(
            "/api/public/clinics/map",
            {
              method: "GET",
              headers: {
                Accept:
                  "application/json",
              },
              cache: "no-store",
            }
          );

        const result =
          (await response.json()) as
            PublicClinicMapResponse;

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Clinicile nu au putut fi încărcate."
          );
        }

        const clinics =
          result.clinics ?? [];

        if (!isActive) {
          return;
        }

        setClinicCount(
          clinics.length
        );

        await loadGoogleMaps();

        if (
          !isActive ||
          !mapContainerRef.current
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
            "Google Maps importLibrary nu este disponibil."
          );
        }

        const [
          mapsLibrary,
          markerLibrary,
        ] = await Promise.all([
          importLibrary(
            "maps"
          ) as Promise<MapsLibrary>,

          importLibrary(
            "marker"
          ) as Promise<MarkerLibrary>,
        ]);

        if (
          !isActive ||
          !mapContainerRef.current
        ) {
          return;
        }

        const mapId =
          process.env
            .NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() ||
          "DEMO_MAP_ID";

        map =
          new mapsLibrary.Map(
            mapContainerRef.current,
            {
              center:
                ROMANIA_CENTER,

              zoom:
                ROMANIA_ZOOM,

              mapId,

              mapTypeControl:
                false,

              streetViewControl:
                false,

              fullscreenControl:
                true,

              clickableIcons:
                false,

              gestureHandling:
                "cooperative",
            }
          );

        infoWindow =
          new mapsLibrary.InfoWindow();

        if (
          clinics.length === 0
        ) {
          setIsLoading(false);
          return;
        }

        const bounds =
          new mapsLibrary
            .LatLngBounds();

        for (
          const clinic of clinics
        ) {
          const position = {
            lat:
              clinic.latitude,

            lng:
              clinic.longitude,
          };

          bounds.extend(
            position
          );

          const marker =
            new markerLibrary
              .AdvancedMarkerElement({
                map,
                position,
                title:
                  clinic.name,
                content:
                  createMarkerContent(
                    clinic
                  ),
              });

          const listener =
            marker.addListener(
              "click",
              () => {
                if (
                  !map ||
                  !infoWindow
                ) {
                  return;
                }

                infoWindow.close();

                infoWindow =
                  new mapsLibrary
                    .InfoWindow({
                      content:
                        createInfoWindowContent(
                          clinic
                        ),

                      ariaLabel:
                        clinic.name,
                    });

                infoWindow.open({
                  map,
                  anchor:
                    marker,
                });
              }
            );

          markers.push(marker);
          markerListeners.push(
            listener
          );
        }

        map.fitBounds(
          bounds,
          {
            top: 72,
            right: 48,
            bottom: 72,
            left: 48,
          }
        );

        const idleListener =
          map.addListener(
            "idle",
            () => {
              if (
                map &&
                (
                  map.getZoom() ??
                  0
                ) > 15
              ) {
                map.setZoom(15);
              }

              idleListener.remove();
            }
          );

        if (isActive) {
          setIsLoading(false);
        }
      } catch (
        initializationError
      ) {
        console.error(
          "Public clinic map initialization failed:",
          initializationError
        );

        if (!isActive) {
          return;
        }

        setError(
          initializationError instanceof
            Error
            ? initializationError.message
            : "Harta clinicilor nu a putut fi încărcată."
        );

        setIsLoading(false);
      }
    }

    void initializeMap();

    return () => {
      isActive = false;

      for (
        const listener of
          markerListeners
      ) {
        listener.remove();
      }

      for (
        const marker of
          markers
      ) {
        marker.map = null;
      }

      infoWindow?.close();
    };
  }, []);

  return (
    <section
      aria-label="Harta clinicilor aprobate"
      className="relative isolate overflow-hidden bg-gray-200"
    >
      <div
        ref={mapContainerRef}
        className="h-[55vh] min-h-[26rem] w-full md:h-[68vh] lg:h-[80vh]"
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#F0EEE9]">
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 text-center shadow-sm">
            <span
              aria-hidden="true"
              className="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-[#036661] border-r-transparent"
            />

            <p className="mt-3 text-sm font-medium text-gray-700">
              Se încarcă harta clinicilor...
            </p>
          </div>
        </div>
      )}

      {!isLoading &&
        error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#F0EEE9] px-4">
            <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                Harta nu este disponibilă
              </h2>

              <p className="mt-2 text-sm leading-6 text-red-700">
                {error}
              </p>

              <Link
                href="/medici"
                className="romdoc-button romdoc-button-primary mt-5"
              >
                Vezi lista medicilor
              </Link>
            </div>
          </div>
        )}

      {!isLoading &&
        !error &&
        clinicCount === 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center px-4">
            <div className="pointer-events-auto max-w-lg rounded-2xl border border-gray-200 bg-white/95 p-5 text-center shadow-lg backdrop-blur">
              <p className="font-semibold text-gray-900">
                Clinicile aprobate vor apărea aici
              </p>

              <p className="mt-1 text-sm text-gray-600">
                Poți căuta deja medicii disponibili în director.
              </p>
            </div>
          </div>
        )}

      {!isLoading &&
        !error &&
        clinicCount > 0 && (
          <div className="pointer-events-none absolute left-4 top-4 sm:left-6 sm:top-6">
            <div className="rounded-full border border-white/70 bg-white/95 px-4 py-2 text-sm font-semibold text-gray-900 shadow-lg backdrop-blur">
              {clinicCount === 1
                ? "1 clinică aprobată"
                : `${clinicCount} clinici aprobate`}
            </div>
          </div>
        )}

      <button
        type="button"
        onClick={scrollToFilters}
        className="romdoc-button romdoc-button-primary absolute bottom-5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap shadow-xl sm:bottom-7"
      >
        Caută medici
      </button>
    </section>
  );
}
