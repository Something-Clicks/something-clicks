const styles: Record<string, string> = {
  new: "bg-royal text-white",
  reviewing: "bg-ice text-navy ring-1 ring-royal",
  contacted: "bg-ice text-navy ring-1 ring-royal",
  accepted: "bg-success text-white",
  waitlisted: "bg-[#fff4d6] text-navy ring-1 ring-[#e0b44a]",
  declined: "bg-white text-navy-soft ring-1 ring-field",
  closed: "bg-white text-navy-soft ring-1 ring-field",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${styles[status] ?? ""}`}>
      {status}
    </span>
  );
}
