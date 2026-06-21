let googleMapsPromise:
  | Promise<void>
  | null = null;

const SCRIPT_ID =
  "romdoc-google-maps-script";

const CALLBACK_NAME =
  "__romdocGoogleMapsLoaded";

const INITIALIZATION_TIMEOUT_MS =
  15000;

type PlaceAutocompleteElementConstructor =
  new (
    options?: {
      includedRegionCodes?:
        string[];
    }
  ) => HTMLElement;

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

function hasPlacesAutocompleteElement() {
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
      GoogleMapsRuntime["importLibrary"]
    >
  > {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const startedAt =
        Date.now();

      const checkAvailability =
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
            checkAvailability,
            50
          );
        };

      checkAvailability();
    }
  );
}

async function importPlacesLibrary() {
  if (
    hasPlacesAutocompleteElement()
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
  const script =
    document.getElementById(
      SCRIPT_ID
    );

  script?.remove();
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

      let hasFinished =
        false;

      let timeoutId:
        | number
        | null = null;

      const finishSuccessfully =
        async () => {
          if (hasFinished) {
            return;
          }

          try {
            await importPlacesLibrary();

            hasFinished =
              true;

            if (
              timeoutId !== null
            ) {
              window.clearTimeout(
                timeoutId
              );
            }

            delete googleWindow[
              CALLBACK_NAME
            ];

            resolve();
          } catch (error) {
            finishWithError(
              error
            );
          }
        };

      const finishWithError =
        (
          error: unknown
        ) => {
          if (hasFinished) {
            return;
          }

          hasFinished =
            true;

          if (
            timeoutId !== null
          ) {
            window.clearTimeout(
              timeoutId
            );
          }

          delete googleWindow[
            CALLBACK_NAME
          ];

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

      if (
        hasPlacesAutocompleteElement()
      ) {
        resolve();
        return;
      }

      if (
        getImportLibrary()
      ) {
        void finishSuccessfully();
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
        void finishSuccessfully();
      };

      timeoutId =
        window.setTimeout(
          () => {
            finishWithError(
              new Error(
                "Google Maps nu a răspuns în timpul permis."
              )
            );
          },
          INITIALIZATION_TIMEOUT_MS
        );

      if (existingScript) {
        existingScript.addEventListener(
          "error",
          () => {
            finishWithError(
              new Error(
                "Google Maps nu a putut fi încărcat."
              )
            );
          },
          {
            once: true,
          }
        );

        /*
         * During development, the script may already have loaded
         * before the current React effect attached its listeners.
         * Poll for importLibrary in addition to waiting for callback.
         */
        void waitForImportLibrary()
          .then(() =>
            finishSuccessfully()
          )
          .catch(() => {
            /*
             * The main timeout handles the final error.
             */
          });

        return;
      }

      const script =
        document.createElement(
          "script"
        );

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

          language:
            "ro",

          region:
            "RO",
        });

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
          finishWithError(
            new Error(
              "Google Maps nu a putut fi încărcat. Verifică cheia API și restricțiile Google Cloud."
            )
          );
        },
        {
          once: true,
        }
      );

      document.head.appendChild(
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
      .NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return Promise.reject(
      new Error(
        "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY nu este configurată."
      )
    );
  }

  if (
    hasPlacesAutocompleteElement()
  ) {
    return Promise.resolve();
  }

  if (!googleMapsPromise) {
    googleMapsPromise =
      loadGoogleMapsScript(
        apiKey
      ).catch((error) => {
        googleMapsPromise =
          null;

        throw error;
      });
  }

  return googleMapsPromise;
}