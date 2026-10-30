"use client";

import { useEffect } from "react";
import { trackGa, type TrackedForm } from "@/lib/attribution";

/** Sends GA's form_submit once a submission has been saved (thanks pages). */
export function TrackSubmit({ form }: { form: TrackedForm }) {
  useEffect(() => trackGa("form_submit", form), [form]);
  return null;
}
