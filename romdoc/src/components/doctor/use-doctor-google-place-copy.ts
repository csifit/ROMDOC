"use client";

import {
  useTranslations,
} from "next-intl";

import type {
  GooglePlaceAutocompleteCopy,
} from "@/components/clinic/google-place-autocomplete";

export default function useDoctorGooglePlaceCopy():
  GooglePlaceAutocompleteCopy {
  const t =
    useTranslations(
      "DoctorConfiguration.googlePlaces"
    );

  return {
    placeholder:
      t(
        "placeholder"
      ),

    importUnavailable:
      t(
        "importUnavailable"
      ),

    elementUnavailable:
      t(
        "elementUnavailable"
      ),

    predictionMissing:
      t(
        "predictionMissing"
      ),

    placeIdMissing:
      t(
        "placeIdMissing"
      ),

    verifyError:
      t(
        "verifyError"
      ),

    loadError:
      t(
        "loadError"
      ),

    label:
      t(
        "label"
      ),

    help:
      t(
        "help"
      ),

    loading:
      t(
        "loading"
      ),

    verifying:
      t(
        "verifying"
      ),

    selected:
      t(
        "selected"
      ),

    city:
      t(
        "city"
      ),

    region:
      t(
        "region"
      ),

    postalCode:
      t(
        "postalCode"
      ),

    country:
      t(
        "country"
      ),
  };
}
