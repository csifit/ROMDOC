let googleMapsPromise:
  | Promise<void>
  | null = null;

type GoogleMapsWindow = Window & {
  google?: {
    maps?: {
      importLibrary?: (
        libraryName: string
      ) => Promise<unknown>;
    };
  };
};

function hasGoogleMapsLoaded() {
  const googleWindow =
    window as GoogleMapsWindow;

  return Boolean(
    googleWindow.google?.maps
      ?.importLibrary
  );
}

function loadGoogleMapsScript(
  apiKey: string
): Promise<void> {
  return new Promise(
    (resolve, reject) => {
      if (hasGoogleMapsLoaded()) {
        resolve();
        return;
      }

      const existingScript =
        document.querySelector<HTMLScriptElement>(
          'script[data-romdoc-google-maps="true"]'
        );

      if (existingScript) {
        const handleExistingLoad =
          () => {
            if (
              hasGoogleMapsLoaded()
            ) {
              resolve();
              return;
            }

            reject(
              new Error(
                "Google Maps a fost încărcat, dar API-ul Maps nu este disponibil."
              )
            );
          };

        const handleExistingError =
          () => {
            reject(
              new Error(
                "Google Maps nu a putut fi încărcat."
              )
            );
          };

        existingScript.addEventListener(
          "load",
          handleExistingLoad,
          {
            once: true,
          }
        );

        existingScript.addEventListener(
          "error",
          handleExistingError,
          {
            once: true,
          }
        );

        return;
      }

      const script =
        document.createElement(
          "script"
        );

      const query =
        new URLSearchParams({
          key: apiKey,
          v: "weekly",
          loading: "async",
          language: "ro",
          region: "RO",
        });

      script.src =
        `https://maps.googleapis.com/maps/api/js?${query.toString()}`;

      script.async = true;
      script.defer = true;

      script.dataset
        .romdocGoogleMaps =
        "true";

      script.addEventListener(
        "load",
        () => {
          if (
            hasGoogleMapsLoaded()
          ) {
            resolve();
            return;
          }

          reject(
            new Error(
              "Google Maps a fost încărcat fără biblioteca necesară."
            )
          );
        },
        {
          once: true,
        }
      );

      script.addEventListener(
        "error",
        () => {
          reject(
            new Error(
              "Google Maps nu a putut fi încărcat."
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
  const apiKey =
    process.env
      .NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;

  if (!apiKey) {
    return Promise.reject(
      new Error(
        "NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY nu este configurată."
      )
    );
  }

  if (!googleMapsPromise) {
    googleMapsPromise =
      loadGoogleMapsScript(
        apiKey
      ).catch((error) => {
        googleMapsPromise = null;
        throw error;
      });
  }

  return googleMapsPromise;
}