export type OwnerDecisionItem = { id: string; title: string; question: string };

/** Banner shown while any owner decision on a terms page is still open. */
export function DraftTermsNotice({ version, pending }: { version: string; pending: OwnerDecisionItem[] }) {
  if (pending.length === 0) return null;
  return (
    <div className="mb-8 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <strong>Draft (version {version}): not yet in effect as final terms.</strong> {pending.length} point
      {pending.length === 1 ? " is" : "s are"} still waiting on a decision from Something Clicks and{" "}
      {pending.length === 1 ? "is" : "are"} marked below. These terms have not been reviewed by a lawyer.
    </div>
  );
}

/** Inline note marking a policy that has not been decided yet. */
export function OwnerDecision({ id, decisions }: { id: string; decisions: OwnerDecisionItem[] }) {
  const item = decisions.find((d) => d.id === id);
  if (!item) return null;
  return (
    <div
      data-owner-decision={item.id}
      className="mt-3 rounded-md border border-dashed border-amber-400 bg-amber-50 p-3 text-sm text-amber-900"
    >
      <strong>Not yet decided: {item.title}.</strong> {item.question}
    </div>
  );
}
