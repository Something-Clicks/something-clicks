import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { signIn } from "@/app/auth/actions";
import { SignInForm, SignUpForm } from "@/app/auth/auth-forms";
import { BookingForm, BookingResult } from "@/app/book/booking-form";
import { DashboardNotice } from "@/app/dashboard/dashboard-notice";
import RootLayout from "@/app/layout";
import { OnboardingForm } from "@/app/onboarding/onboarding-form";
import { PartnerApplicationForm } from "@/app/partners/application-form";
import { CheckboxGroup, ConsentCheckbox, FormMessage } from "@/components/form-fields";
import { SiteHeader } from "@/components/site-chrome";
import { initialFormState } from "@/lib/forms";

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8");

describe("skip link and main target", () => {
  const html = renderToStaticMarkup(<RootLayout>page</RootLayout>);

  it("puts a 'Skip to content' link before the header, pointing at main", () => {
    const skip = html.indexOf('href="#main-content"');
    expect(skip).toBeGreaterThan(-1);
    expect(skip).toBeLessThan(html.indexOf("<header"));
    expect(html).toContain(">Skip to content</a>");
    expect(html).toMatch(/<main id="main-content" tabindex="-1"/i);
  });

  it("is visually hidden until focused", () => {
    expect(html).toMatch(/class="sr-only focus:not-sr-only[^"]*"[^>]*>Skip to content/);
  });
});

describe("responsive navigation", () => {
  const header = renderToStaticMarkup(<SiteHeader />);

  it("switches to the desktop nav at lg and keeps labels on one line", () => {
    expect(header).toMatch(/<nav aria-label="Main" class="hidden[^"]*whitespace-nowrap[^"]*lg:flex"/);
    expect(header).toMatch(/<div class="lg:hidden"><button/);
    expect(header).not.toMatch(/\bmd:(flex|hidden)\b/);
  });

  it("returns focus to the menu button on Escape and closes on outside clicks", () => {
    const menu = read("src/components/mobile-menu.tsx");
    expect(menu).toMatch(/e\.key !== "Escape"[\s\S]*setOpen\(false\);\s*buttonRef\.current\?\.focus\(\)/);
    expect(menu).toMatch(/if \(!containerRef\.current\?\.contains\(e\.target as Node\)\) setOpen\(false\)/);
    expect(menu).toContain('document.addEventListener("pointerdown", onPointer)');
  });
});

describe("focus ring and button sizes", () => {
  const css = read("src/app/globals.css");

  it("defines one visible focus ring in the existing brand blue", () => {
    expect(css).toMatch(/:focus-visible\s*\{\s*outline: 2px solid var\(--color-brand-600\);\s*outline-offset: 2px;/);
  });

  it("uses a shared large-button size instead of one-off overrides", () => {
    expect(css).toMatch(/\.btn-lg\s*\{\s*@apply px-5 py-3 text-base;/);
    for (const file of ["src/app/page.tsx", "src/app/cleaning-companies/page.tsx", "src/app/not-found.tsx", "src/app/book/booking-form.tsx", "src/components/mobile-menu.tsx"]) {
      expect(read(file)).not.toMatch(/!py-3|!px-5|!text-base/);
      expect(read(file)).toContain("btn-lg");
    }
  });
});

describe("announcements and focus after submitting", () => {
  it("announces errors as alerts and successes as status, both focusable", () => {
    const err = renderToStaticMarkup(<FormMessage state={{ status: "error", message: "Please fix the highlighted fields." }} />);
    const ok = renderToStaticMarkup(<FormMessage state={{ status: "success", message: "Thanks" }} />);
    expect(err).toMatch(/role="alert" tabindex="-1" data-form-message=""/i);
    expect(ok).toMatch(/role="status" tabindex="-1" data-form-message=""/i);
  });

  it("makes the booking result focusable and announced", () => {
    expect(renderToStaticMarkup(<BookingResult />)).toMatch(/role="status" tabindex="-1"/i);
  });

  it("focuses the first invalid field (or the message) on error and the result on success", () => {
    const hook = read("src/components/use-form-focus.ts");
    expect(hook).toContain(`'[aria-invalid="true"], fieldset[data-invalid] input'`);
    expect(hook).toContain('"[data-form-message]"');
    expect(hook).toMatch(/state\.status === "success"[\s\S]*resultRef\.current\?\.focus\(\)/);
    for (const file of ["src/app/book/booking-form.tsx", "src/app/partners/application-form.tsx", "src/app/auth/auth-forms.tsx", "src/app/onboarding/onboarding-form.tsx"]) {
      expect(read(file)).toContain("useFormFocus(state)");
      expect(read(file)).toMatch(/<form ref=\{formRef\}/);
    }
  });

  it("keeps the pending submit button focusable but blocks duplicate submissions", () => {
    const button = read("src/components/submit-button.tsx");
    expect(button).not.toMatch(/\bdisabled=\{pending\}/);
    expect(button).toContain("aria-disabled={pending || undefined}");
    expect(button).toMatch(/if \(pending\) e\.preventDefault\(\)/);
  });

  it("announces dashboard notices and focuses them once", () => {
    expect(renderToStaticMarkup(<DashboardNotice tone="ok">Done</DashboardNotice>)).toMatch(/role="status" tabindex="-1"/i);
    expect(renderToStaticMarkup(<DashboardNotice tone="warn">Problem</DashboardNotice>)).toMatch(/role="alert" tabindex="-1"/i);
  });
});

describe("consistent, accessible validation", () => {
  const forms = {
    booking: renderToStaticMarkup(<BookingForm urlCode={null} />),
    partner: renderToStaticMarkup(<PartnerApplicationForm />),
    signup: renderToStaticMarkup(<SignUpForm />),
    signin: renderToStaticMarkup(<SignInForm next="/dashboard" />),
    onboarding: renderToStaticMarkup(<OnboardingForm defaults={{}} isNew />),
  };

  it.each(Object.entries(forms))("%s form uses inline messages and explains required fields", (_name, html) => {
    expect(html).toMatch(/<form[^>]*noValidate=""/);
    expect(html.replace(/<[^>]+>/g, "")).toContain("Fields marked * are required.");
  });

  it("links checkbox-group errors to their group", () => {
    const state = { ...initialFormState, status: "error" as const, fieldErrors: { service_areas: "Choose at least one service area" } };
    const html = renderToStaticMarkup(
      <CheckboxGroup name="service_areas" label="Cities you serve" options={[{ value: "Sandy", label: "Sandy" }]} state={state} />,
    );
    expect(html).toMatch(/<fieldset aria-describedby="service_areas-error" data-invalid="true">/);
    expect(html).toContain('id="service_areas-error"');
  });

  it("enlarges the consent checkbox to 24px", () => {
    expect(renderToStaticMarkup(<ConsentCheckbox name="consent">I agree</ConsentCheckbox>)).toMatch(/type="checkbox"[^>]*class="[^"]*\bh-6 w-6\b/);
  });

  it("sign-in returns field errors for empty fields, with the same rule and message", async () => {
    const empty = await signIn(initialFormState, new FormData());
    expect(empty).toMatchObject({
      status: "error",
      message: "Enter your email and password.",
      fieldErrors: { email: "Enter your email", password: "Enter your password" },
    });
    const form = new FormData();
    form.set("email", "a@example.com");
    expect(await signIn(initialFormState, form)).toMatchObject({ fieldErrors: { password: "Enter your password" } });
  });
});

describe("dashboard honesty", () => {
  const dashboard = read("src/app/dashboard/page.tsx");

  it("shows only the counter that works today", () => {
    expect(dashboard).toContain('<Stat label="Available credits" value={balance.available} />');
    expect(dashboard).not.toMatch(/Held for scheduled walkthroughs|Walkthroughs completed|balance\.reserved|balance\.consumed/);
  });

  it("doesn't send people to a contact method that doesn't exist", () => {
    expect(dashboard).not.toMatch(/contact us/i);
  });
});
