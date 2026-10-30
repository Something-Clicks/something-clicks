import { getAdmin } from "@/lib/admin-auth";
import { csvColumns, formatRowForCsv, isKind, pickFilters } from "@/lib/admin-fields";
import { toCsv } from "@/lib/csv";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/** CSV of the current filtered view: /admin/export?kind=applications&status=new… */
export async function GET(request: Request) {
  if (!(await getAdmin())) return new Response("Unauthorized", { status: 401 });

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const kind = params.kind ?? "";
  if (!isKind(kind)) return new Response("Unknown kind", { status: 400 });

  const rows = await getStore().list(kind, { ...pickFilters(params), limit: 10_000 });
  const csv = toCsv(csvColumns(kind), rows.map((r) => formatRowForCsv(kind, r)));
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="something-clicks-${kind}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
