import { isPlaceholder, type Placeholder } from "@/content/site";

/** Renders a placeholder value with a visible marker so it can't ship unnoticed. */
export function P({ value }: { value: Placeholder | string }) {
  if (!isPlaceholder(value)) return <>{value}</>;
  return (
    <span data-placeholder className="rounded bg-[#fff4d6] px-1 text-navy ring-1 ring-[#e0b44a]">
      {value.text}
      <span className="sr-only"> (placeholder)</span>
    </span>
  );
}

export const plain = (value: Placeholder | string) => (isPlaceholder(value) ? value.text : value);
