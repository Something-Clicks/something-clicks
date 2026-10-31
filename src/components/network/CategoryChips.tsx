"use client";

import { useState } from "react";
import { activeJourneys } from "@/content/journeys";
import { CategoryIcon } from "./CategoryIcon";

const categories = activeJourneys().flatMap((j) => j.categories.filter((c) => !c.broad));

/**
 * One tap fills "What you do" with a category. Progressive enhancement: the
 * form works without it, and without JavaScript the chips simply do nothing.
 */
export function CategoryChips({ inputId, selected = "" }: { inputId: string; selected?: string }) {
  const [picked, setPicked] = useState(selected.trim().toLowerCase());
  return (
    <div
      role="group"
      aria-label="What you do"
      className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0"
    >
      {categories.map((c) => {
        const on = picked === c.label.toLowerCase();
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={on}
            onClick={() => {
              const input = document.getElementById(inputId) as HTMLInputElement | null;
              if (input) {
                input.value = c.label;
                input.form?.querySelector<HTMLInputElement>("input[name=where]")?.focus();
              }
              setPicked(c.label.toLowerCase());
            }}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-navy ring-1 ring-line hover:ring-royal aria-pressed:bg-navy aria-pressed:text-white aria-pressed:ring-navy"
          >
            <CategoryIcon id={c.id} className="h-4 w-4" />
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
