import type {
  Metadata,
} from "next";
import {
  notFound,
} from "next/navigation";
import NearbyDoctorResults from "@/components/public/nearby-doctor-results";
import PublicLayout from "@/components/public/public-layout";

type SearchPageProps = {
  searchParams: Promise<{
    specialty?: string;
    lat?: string;
    lng?: string;
    radius?: string;
    location?: string;
    country?: string;
    verified?: string;
    online?: string;
  }>;
};

export const metadata: Metadata = {
  title:
    "Medici în apropiere",
  description:
    "Caută medici și clinici aprobate în apropierea unei adrese sau localități.",
  robots: {
    index: false,
    follow: true,
  },
};

function parseCoordinate(
  value:
    | string
    | undefined,
  minimum: number,
  maximum: number
) {
  if (!value) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < minimum ||
    parsed > maximum
  ) {
    return null;
  }

  return parsed;
}

export default async function GeographicDoctorSearchPage({
  searchParams,
}: SearchPageProps) {
  const params =
    await searchParams;

  const specialty =
    params.specialty
      ?.trim()
      .toLowerCase();

  const latitude =
    parseCoordinate(
      params.lat,
      -90,
      90
    );

  const longitude =
    parseCoordinate(
      params.lng,
      -180,
      180
    );

  const parsedRadius =
    Number(
      params.radius
    );

  const radius =
    parsedRadius === 10 ||
    parsedRadius === 50
      ? parsedRadius
      : null;

  const locationLabel =
    params.location?.trim();

  if (
    !specialty ||
    latitude === null ||
    longitude === null ||
    radius === null ||
    !locationLabel
  ) {
    notFound();
  }

  return (
    <PublicLayout>
      <main className="min-h-screen bg-[#F0EEE9] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <NearbyDoctorResults
            specialty={
              specialty
            }
            latitude={
              latitude
            }
            longitude={
              longitude
            }
            radius={
              radius
            }
            locationLabel={
              locationLabel
            }
            countryCode={
              params.country
                ?.trim()
                .toUpperCase() ??
              null
            }
            verifiedOnly={
              params.verified ===
              "true"
            }
            onlineOnly={
              params.online ===
              "true"
            }
          />
        </div>
      </main>
    </PublicLayout>
  );
}
