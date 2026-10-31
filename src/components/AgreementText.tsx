import type { AgreementVersion } from "@/content/agreements/planner-partner";

/** An agreement version rendered exactly as published. */
export function AgreementText({ a }: { a: AgreementVersion }) {
  const out: React.ReactNode[] = [];
  let items: string[] = [];
  const flush = (key: string) => {
    if (items.length) out.push(<ul key={key} className="mt-3 list-disc space-y-1.5 pl-6">{items.map((t) => <li key={t}>{t}</li>)}</ul>);
    items = [];
  };
  a.blocks.forEach(([kind, text], i) => {
    if (kind === "li") return void items.push(text);
    flush(`l${i}`);
    out.push(kind === "h" ? <h2 key={i} className="mt-8 text-xl font-bold">{text}</h2> : <p key={i} className="mt-3">{text}</p>);
  });
  flush("end");
  return <div className="leading-relaxed text-navy">{out}</div>;
}
