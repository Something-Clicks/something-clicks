import type { ReactNode } from "react";
import { CircleCheck } from "lucide-react";
import { ButtonLink } from "./ui";

export function ThanksPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-cloud">
      <div className="container-page max-w-2xl py-20 sm:py-28">
        <CircleCheck aria-hidden="true" className="h-12 w-12 text-success" />
        <h1 className="mt-6 text-4xl">{title}</h1>
        <div className="mt-6 space-y-4 text-lg text-navy-soft">{children}</div>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/">Back to home</ButtonLink>
          <ButtonLink href="/how-it-works" variant="secondary">
            How it works
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
