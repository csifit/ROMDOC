"use client";

import { useEffect } from "react";

import {
  addRecentlyViewedDoctor,
} from "@/lib/doctors/recently-viewed-doctors";

type Props = {
  doctor: {
    id: string;
    slug: string;
    name: string;
    title: string;
    specialtyName: string;
    clinicName: string | null;
    photoUrl: string | null;
    isVerified: boolean;
  };
};

export default function RecordRecentlyViewedDoctor({
  doctor,
}: Props) {
  useEffect(() => {
    addRecentlyViewedDoctor(doctor);
  }, [doctor]);

  return null;
}
