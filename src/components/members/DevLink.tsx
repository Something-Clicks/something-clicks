import { devOutbox } from "@/lib/mailer";

/** Local development only: email isn't sent, so show the link the email would have contained. */
export function DevLink({ email }: { email?: string }) {
  const msg = email ? devOutbox()?.get(email.toLowerCase()) : undefined;
  const url = msg?.text.match(/https?:\/\/\S+\/auth\/verify\?\S+/)?.[0];
  if (!url) return null;
  return (
    <p className="mt-8 rounded-xl bg-white p-4 text-left text-sm ring-1 ring-line">
      <strong>Development:</strong> email isn&rsquo;t configured, so here is the link it would contain.{" "}
      <a href={url} className="break-all font-semibold text-royal" data-dev-link>
        Open sign-in link
      </a>
    </p>
  );
}
