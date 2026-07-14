"use client";

import Link from "next/link";
import {
  useTranslations,
} from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
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
  citySlug: string | null;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  googleMapsUri: string | null;
  doctorCount: number;
  specialtyCount: number;
};

type PublicClinicMapResponse = {
  clinics?: PublicClinicMapItem[];
  error?: string;
};

type RadiusOption = 10 | 50;

type HomepageMapSearchDetail = {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  countryCode: string;
  radius: RadiusOption;
} | null;

type LatLngLiteral = {
  lat: number;
  lng: number;
};

type MapLike = {
  fitBounds: (
    bounds: unknown,
    padding?:
      | number
      | Record<string, number>
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

type MarkerLike = {
  map: MapLike | null;
  addListener: (
    eventName: string,
    handler: () => void
  ) => {
    remove: () => void;
  };
};

type CircleLike = {
  setMap: (
    map: MapLike | null
  ) => void;
};

type InfoWindowLike = {
  open: (options: {
    map: MapLike;
    anchor: MarkerLike;
  }) => void;
  close: () => void;
};

type MapsLibrary = {
  Map: new (
    element: HTMLElement,
    options:
      Record<string, unknown>
  ) => MapLike;
  InfoWindow: new (
    options?:
      Record<string, unknown>
  ) => InfoWindowLike;
  Circle: new (
    options:
      Record<string, unknown>
  ) => CircleLike;
};

type CoreLibrary = {
  LatLngBounds: new () => {
    extend: (
      position: LatLngLiteral
    ) => void;
  };
};

type MarkerLibrary = {
  AdvancedMarkerElement: new (
    options:
      Record<string, unknown>
  ) => MarkerLike;
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

type ClinicMapCopy = {
  openClinic: (
    clinicName: string
  ) => string;
  activeDoctorCount: (
    count: number
  ) => string;
  specialtyCount: (
    count: number
  ) => string;
  viewDoctors: string;
};

const ROMANIA_CENTER:
LatLngLiteral = {
  lat: 45.9432,
  lng: 24.9668,
};

const ROMANIA_ZOOM = 7;

function escapeHtml(
  value: string
) {
  return value
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

function createClinicMarkerContent(
  clinic: PublicClinicMapItem,
  copy: ClinicMapCopy
) {
  const marker =
    document.createElement(
      "button"
    );

  marker.type = "button";

  marker.className =
    "romdoc-map-marker";

  marker.setAttribute(
    "aria-label",
    copy.openClinic(
      clinic.name
    )
  );

  marker.innerHTML = `
    <span class="romdoc-map-marker-dot"></span>
    <span class="romdoc-map-marker-label">${escapeHtml(
      clinic.name
    )}</span>
  `;

  return marker;
}

function createSearchMarkerContent() {
  const marker =
    document.createElement(
      "div"
    );

  marker.className =
    "flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-[#ff2800] text-white shadow-xl";

  marker.innerHTML = `
    <span class="block h-3 w-3 rounded-full bg-white"></span>
  `;

  return marker;
}

function createInfoWindowContent(
  clinic: PublicClinicMapItem,
  copy: ClinicMapCopy
) {
  const container =
    document.createElement(
      "article"
    );

  container.className =
    "romdoc-map-popup";

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
        copy.activeDoctorCount(
          clinic.doctorCount
        )
      )}</span>
      <span>${escapeHtml(
        copy.specialtyCount(
          clinic.specialtyCount
        )
      )}</span>
    </div>
    <div class="romdoc-map-popup-actions">
      <a href="${doctorsHref}" class="romdoc-map-popup-primary">
        ${escapeHtml(
          copy.viewDoctors
        )}
      </a>
      ${
        clinic.googleMapsUri
          ? `<a
              href="${escapeHtml(
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

function distanceKilometres(
  first: LatLngLiteral,
  second: LatLngLiteral
) {
  const earthRadius =
    6371;

  const toRadians = (
    degrees: number
  ) =>
    (
      degrees *
      Math.PI
    ) / 180;

  const latitudeDelta =
    toRadians(
      second.lat -
        first.lat
    );

  const longitudeDelta =
    toRadians(
      second.lng -
        first.lng
    );

  const firstLatitude =
    toRadians(
      first.lat
    );

  const secondLatitude =
    toRadians(
      second.lat
    );

  const a =
    Math.sin(
      latitudeDelta / 2
    ) ** 2 +
    Math.cos(
      firstLatitude
    ) *
      Math.cos(
        secondLatitude
      ) *
      Math.sin(
        longitudeDelta / 2
      ) ** 2;

  return (
    2 *
    earthRadius *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )
  );
}

function scrollToFilters() {
  document
    .getElementById(
      "doctor-filters"
    )
    ?.scrollIntoView({
      behavior:
        "smooth",
      block:
        "start",
    });
}

export default function
PublicClinicMap() {
  const t =
    useTranslations(
      "ClinicMap"
    );

  const copy =
    useMemo<ClinicMapCopy>(
      () => ({
        openClinic:
          (
            clinicName
          ) =>
            t(
              "openClinic",
              {
                clinicName,
              }
            ),
        activeDoctorCount:
          (
            count
          ) =>
            t(
              "activeDoctorCount",
              {
                count,
              }
            ),
        specialtyCount:
          (
            count
          ) =>
            t(
              "specialtyCount",
              {
                count,
              }
            ),
        viewDoctors:
          t(
            "viewDoctors"
          ),
      }),
      [t]
    );

  const mapContainerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const mapRef =
    useRef<MapLike | null>(
      null
    );

  const mapsLibraryRef =
    useRef<MapsLibrary | null>(
      null
    );

  const coreLibraryRef =
    useRef<CoreLibrary | null>(
      null
    );

  const markerLibraryRef =
    useRef<MarkerLibrary | null>(
      null
    );

  const clinicsRef =
    useRef<
      PublicClinicMapItem[]
    >([]);

  const clinicMarkersRef =
    useRef<MarkerLike[]>(
      []
    );

  const markerListenersRef =
    useRef<
      Array<{
        remove: () => void;
      }>
    >([]);

  const searchMarkerRef =
    useRef<MarkerLike | null>(
      null
    );

  const radiusCircleRef =
    useRef<CircleLike | null>(
      null
    );

  const infoWindowRef =
    useRef<InfoWindowLike | null>(
      null
    );

  const activeSearchRef =
    useRef<HomepageMapSearchDetail>(
      null
    );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    visibleClinicCount,
    setVisibleClinicCount,
  ] = useState(0);

  const [
    activeSearch,
    setActiveSearch,
  ] =
    useState<HomepageMapSearchDetail>(
      null
    );

  const clearRenderedSearch =
    useCallback(
      () => {
        if (
          searchMarkerRef.current
        ) {
          searchMarkerRef.current
            .map = null;
        }

        searchMarkerRef.current =
          null;

        radiusCircleRef.current
          ?.setMap(
            null
          );

        radiusCircleRef.current =
          null;
      },
      []
    );

  const clearClinicMarkers =
    useCallback(
      () => {
        for (
          const listener of
          markerListenersRef.current
        ) {
          listener.remove();
        }

        for (
          const marker of
          clinicMarkersRef.current
        ) {
          marker.map =
            null;
        }

        markerListenersRef.current =
          [];

        clinicMarkersRef.current =
          [];

        infoWindowRef.current
          ?.close();
      },
      []
    );

  const renderMap =
    useCallback(
      (
        search:
          HomepageMapSearchDetail
      ) => {
        const map =
          mapRef.current;

        const mapsLibrary =
          mapsLibraryRef.current;

        const coreLibrary =
          coreLibraryRef.current;

        const markerLibrary =
          markerLibraryRef.current;

        if (
          !map ||
          !mapsLibrary ||
          !coreLibrary ||
          !markerLibrary
        ) {
          return;
        }

        clearClinicMarkers();
        clearRenderedSearch();

        const searchCenter =
          search
            ? {
                lat:
                  search.latitude,
                lng:
                  search.longitude,
              }
            : null;

        const visibleClinics =
          searchCenter &&
          search
            ? clinicsRef.current
                .filter(
                  (
                    clinic
                  ) =>
                    distanceKilometres(
                      searchCenter,
                      {
                        lat:
                          clinic.latitude,
                        lng:
                          clinic.longitude,
                      }
                    ) <=
                    search.radius
                )
            : clinicsRef.current;

        setVisibleClinicCount(
          visibleClinics.length
        );

        const bounds =
          new coreLibrary
            .LatLngBounds();

        for (
          const clinic of
          visibleClinics
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
                  createClinicMarkerContent(
                    clinic,
                    copy
                  ),
              });

          const listener =
            marker.addListener(
              "click",
              () => {
                infoWindowRef.current
                  ?.close();

                const infoWindow =
                  new mapsLibrary
                    .InfoWindow({
                      content:
                        createInfoWindowContent(
                          clinic,
                          copy
                        ),
                      ariaLabel:
                        clinic.name,
                    });

                infoWindow.open({
                  map,
                  anchor:
                    marker,
                });

                infoWindowRef.current =
                  infoWindow;
              }
            );

          clinicMarkersRef.current
            .push(
              marker
            );

          markerListenersRef.current
            .push(
              listener
            );
        }

        if (
          searchCenter &&
          search
        ) {
          searchMarkerRef.current =
            new markerLibrary
              .AdvancedMarkerElement({
                map,
                position:
                  searchCenter,
                title:
                  search
                    .formattedAddress,
                content:
                  createSearchMarkerContent(),
                zIndex:
                  9999,
              });

          radiusCircleRef.current =
            new mapsLibrary
              .Circle({
                map,
                center:
                  searchCenter,
                radius:
                  search.radius *
                  1000,
                clickable:
                  false,
                fillColor:
                  "#036661",
                fillOpacity:
                  0.08,
                strokeColor:
                  "#036661",
                strokeOpacity:
                  0.75,
                strokeWeight:
                  2,
              });

          map.setCenter(
            searchCenter
          );

          map.setZoom(
            search.radius ===
              10
              ? 11
              : 9
          );

          return;
        }

        if (
          visibleClinics.length >
          0
        ) {
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
                  (
                    map.getZoom() ??
                    0
                  ) > 15
                ) {
                  map.setZoom(
                    15
                  );
                }

                idleListener
                  .remove();
              }
            );
        } else {
          map.setCenter(
            ROMANIA_CENTER
          );

          map.setZoom(
            ROMANIA_ZOOM
          );
        }
      },
      [
        clearClinicMarkers,
        clearRenderedSearch,
        copy,
      ]
    );

  useEffect(() => {
    function handleSearchChange(
      event: Event
    ) {
      const customEvent =
        event as
          CustomEvent<HomepageMapSearchDetail>;

      activeSearchRef.current =
        customEvent.detail;

      setActiveSearch(
        customEvent.detail
      );

      renderMap(
        customEvent.detail
      );
    }

    window.addEventListener(
      "romdoc:homepage-map-search-change",
      handleSearchChange
    );

    return () => {
      window.removeEventListener(
        "romdoc:homepage-map-search-change",
        handleSearchChange
      );
    };
  }, [
    renderMap,
  ]);

  useEffect(() => {
    let isActive = true;

    async function initializeMap() {
      try {
        setIsLoading(
          true
        );

        setError(
          null
        );

        const response =
          await fetch(
            "/api/public/clinics/map",
            {
              headers: {
                Accept:
                  "application/json",
              },
              cache:
                "no-store",
            }
          );

        const result =
          (await response.json()) as
            PublicClinicMapResponse;

        if (
          !response.ok
        ) {
          throw new Error(
            result.error ??
              t(
                "clinicsLoadFailed"
              )
          );
        }

        await loadGoogleMaps();

        if (
          !isActive ||
          !mapContainerRef.current
        ) {
          return;
        }

        const importLibrary =
          (
            window as
              GoogleWindow
          ).google
            ?.maps
            ?.importLibrary;

        if (!importLibrary) {
          throw new Error(
            t(
              "mapsUnavailable"
            )
          );
        }

        const [
          mapsLibrary,
          coreLibrary,
          markerLibrary,
        ] =
          await Promise.all([
            importLibrary(
              "maps"
            ) as Promise<MapsLibrary>,
            importLibrary(
              "core"
            ) as Promise<CoreLibrary>,
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
            .NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID
            ?.trim() ||
          "DEMO_MAP_ID";

        const map =
          new mapsLibrary
            .Map(
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

        clinicsRef.current =
          result.clinics ??
          [];

        mapRef.current =
          map;

        mapsLibraryRef.current =
          mapsLibrary;

        coreLibraryRef.current =
          coreLibrary;

        markerLibraryRef.current =
          markerLibrary;

        infoWindowRef.current =
          new mapsLibrary
            .InfoWindow();

        renderMap(
          activeSearchRef.current
        );

        if (isActive) {
          setIsLoading(
            false
          );
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
            : t(
                "mapLoadFailed"
              )
        );

        setIsLoading(
          false
        );
      }
    }

    void initializeMap();

    return () => {
      isActive = false;

      clearClinicMarkers();
      clearRenderedSearch();

      infoWindowRef.current
        ?.close();

      mapRef.current =
        null;

      mapsLibraryRef.current =
        null;

      coreLibraryRef.current =
        null;

      markerLibraryRef.current =
        null;
    };
  }, [
    clearClinicMarkers,
    clearRenderedSearch,
    renderMap,
    t,
  ]);

  return (
    <section
      aria-label={t(
        "ariaLabel"
      )}
      className="relative isolate overflow-hidden bg-gray-200"
    >
      <div
        ref={
          mapContainerRef
        }
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
              {t(
                "loading"
              )}
            </p>
          </div>
        </div>
      )}

      {!isLoading &&
        error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#F0EEE9] px-4">
            <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                {t(
                  "unavailableTitle"
                )}
              </h2>

              <p className="mt-2 text-sm leading-6 text-red-700">
                {error}
              </p>

              <Link
                href="/medici"
                className="romdoc-button romdoc-button-primary mt-5"
              >
                {t(
                  "viewDoctorList"
                )}
              </Link>
            </div>
          </div>
        )}

      {!isLoading &&
        !error && (
          <div className="pointer-events-none absolute left-4 top-4 max-w-[calc(100%-2rem)] sm:left-6 sm:top-6">
            <div className="rounded-2xl border border-white/70 bg-white/95 px-4 py-3 text-sm shadow-lg backdrop-blur">
              <p className="font-semibold text-gray-900">
                {activeSearch
                  ? t(
                      "clinicsInRadius",
                      {
                        count:
                          visibleClinicCount,
                        radius:
                          activeSearch
                            .radius,
                      }
                    )
                  : t(
                      "clinicCount",
                      {
                        count:
                          visibleClinicCount,
                      }
                    )}
              </p>

              {activeSearch && (
                <p className="mt-1 truncate text-xs text-gray-600">
                  {
                    activeSearch
                      .formattedAddress
                  }
                  {" · "}
                  {
                    activeSearch
                      .countryCode
                  }
                </p>
              )}
            </div>
          </div>
        )}

      <button
        type="button"
        onClick={
          scrollToFilters
        }
        className="romdoc-button romdoc-button-primary absolute bottom-5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap shadow-xl sm:bottom-7"
      >
        {t(
          "searchDoctors"
        )}
      </button>
    </section>
  );
}
