import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="container-page max-w-2xl py-24">
        <h1 className="mt-2 text-4xl">We couldn&rsquo;t find that page.</h1>
        <p className="mt-4 text-lg text-navy-soft">It may have moved, or the link may be mistyped.</p>
        <ButtonLink href="/" className="mt-8">
          Go to the home page
        </ButtonLink>
      </main>
      <Footer />
    </>
  );
}
