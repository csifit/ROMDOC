let googleMapsPromise:
  | Promise<void>
  | null = null;

const SCRIPT_ID =
  "romdoc-google-maps-script";

const CALLBACK_NAME =
  "__romdocGoogleMapsLoaded";

const INITIALIZATION_TIMEOUT_MS =
  15000;

type PlacesLibrary = {
  PlaceAutocompleteElement?:
    new () => HTMLElement;
};

type GoogleMapsRuntime = {
  importLibrary?: (
    libraryName: string
  ) => Promise<unknown>;

  places?: {
    PlaceAutocompleteElement?:
      new () => HTMLElement;
  };
};

type GoogleMapsWindow =
  Window & {
    google?: {
      maps?: GoogleMapsRuntime;
    };

    __romdocGoogleMapsLoaded?:
      () => void;
  };

function getGoogleWindow() {
  return window as
    GoogleMapsWindow;
}

function getImportLibrary() {
  return getGoogleWindow()
    .google
    ?.maps
    ?.importLibrary;
}

function hasAutocompleteElement() {
  return Boolean(
    getGoogleWindow()
      .google
      ?.maps
      ?.places
      ?.PlaceAutocompleteElement
  );
}

function waitForImportLibrary():
  Promise<
    NonNullable<
      GoogleMapsRuntime[
        "importLibrary"
      ]
    >
  > {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const startedAt =
        Date.now();

      const check =
        () => {
          const importLibrary =
            getImportLibrary();

          if (importLibrary) {
            resolve(
              importLibrary
            );
            return;
          }

          if (
            Date.now() -
              startedAt >=
            INITIALIZATION_TIMEOUT_MS
          ) {
            reject(
              new Error(
                "Google Maps s-a încărcat, dar funcția importLibrary nu a devenit disponibilă."
              )
            );
            return;
          }

          window.setTimeout(
            check,
            50
          );
        };

      check();
    }
  );
}

async function ensurePlacesLibrary() {
  if (
    hasAutocompleteElement()
  ) {
    return;
  }

  const importLibrary =
    await waitForImportLibrary();

  const placesLibrary =
    (await importLibrary(
      "places"
    )) as PlacesLibrary;

  const constructor =
    placesLibrary
      .PlaceAutocompleteElement ??
    getGoogleWindow()
      .google
      ?.maps
      ?.places
      ?.PlaceAutocompleteElement;

  if (!constructor) {
    throw new Error(
      "Biblioteca Google Places s-a încărcat, dar PlaceAutocompleteElement nu este disponibil."
    );
  }
}

function removeFailedScript() {
  document
    .getElementById(
      SCRIPT_ID
    )
    ?.remove();
}

function loadGoogleMapsScript(
  apiKey: string
): Promise<void> {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const googleWindow =
        getGoogleWindow();

      let finished =
        false;

      let timeoutId:
        | number
        | null = null;

      const clearState =
        () => {
          if (
            timeoutId !==
            null
          ) {
            window.clearTimeout(
              timeoutId
            );
          }

          delete googleWindow[
            CALLBACK_NAME
          ];
        };

      const fail =
        (
          error: unknown
        ) => {
          if (finished) {
            return;
          }

          finished =
            true;

          clearState();
          removeFailedScript();

          reject(
            error instanceof
              Error
              ? error
              : new Error(
                  "Google Maps nu a putut fi inițializat."
                )
          );
        };

      const succeed =
        async () => {
          if (finished) {
            return;
          }

          try {
            await ensurePlacesLibrary();

            finished =
              true;

            clearState();
            resolve();
          } catch (
            error
          ) {
            fail(error);
          }
        };

      if (
        hasAutocompleteElement()
      ) {
        resolve();
        return;
      }

      if (
        getImportLibrary()
      ) {
        void succeed();
        return;
      }

      const existingScript =
        document.getElementById(
          SCRIPT_ID
        ) as
          | HTMLScriptElement
          | null;

      googleWindow[
        CALLBACK_NAME
      ] = () => {
        void succeed();
      };

      timeoutId =
        window.setTimeout(
          () => {
            fail(
              new Error(
                "Google Maps nu a răspuns în timpul permis."
              )
            );
          },
          INITIALIZATION_TIMEOUT_MS
        );

      if (existingScript) {
        existingScript
          .addEventListener(
            "error",
            () => {
              fail(
                new Error(
                  "Google Maps nu a putut fi încărcat."
                )
              );
            },
            {
              once: true,
            }
          );

        void waitForImportLibrary()
          .then(
            () =>
              succeed()
          )
          .catch(
            () => {
              /*
               * The main timeout reports the final error.
               */
            }
          );

        return;
      }

      const query =
        new URLSearchParams({
          key:
            apiKey,

          v:
            "weekly",

          loading:
            "async",

          libraries:
            "places",

          callback:
            CALLBACK_NAME,
        });

      /*
       * Do not force language=ro or region=RO.
       *
       * The browser may load the international Maps interface
       * without a Romania-specific bias. Selected Place Details
       * are localized separately by the RomDoc API.
       */
      const script =
        document.createElement(
          "script"
        );

      script.id =
        SCRIPT_ID;

      script.src =
        `https://maps.googleapis.com/maps/api/js?${query.toString()}`;

      script.async =
        true;

      script.defer =
        true;

      script.dataset
        .romdocGoogleMaps =
        "true";

      script.addEventListener(
        "error",
        () => {
          fail(
            new Error(
              "Google Maps nu a putut fi încărcat. Verifică cheia API și restricțiile Google Cloud."
            )
          );
        },
        {
          once: true,
        }
      );

      document.head
        .appendChild(
          script
        );
    }
  );
}

export function loadGoogleMaps():
  Promise<void> {
  if (
    typeof window ===
      "undefined" ||
    typeof document ===
      "undefined"
  ) {
    return Promise.reject(
      new Error(
        "Google Maps poate fi încărcat numai în browser."
      )
    );
  }

  const apiKey =
    process.env
      .NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      ?.trim();

  if (!apiKey) {
    return Promise.reject(
      new Error(
        "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY nu este configurată."
      )
    );
  }

  if (
    hasAutocompleteElement()
  ) {
    return Promise.resolve();
  }

  if (!googleMapsPromise) {
    googleMapsPromise =
      loadGoogleMapsScript(
        apiKey
      ).catch(
        (
          error
        ) => {
          googleMapsPromise =
            null;

          throw error;
        }
      );
  }

  return googleMapsPromise;
}
