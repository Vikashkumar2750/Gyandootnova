import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Options = {
  table: string;
  filenamePrefix: string;
  /** Optional column subset/order. If omitted, all keys from first row are used. */
  columns?: string[];
  orderBy?: { column: string; ascending?: boolean };
};

const csvEscape = (v: unknown) => {
  const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return `"${s.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
};

/** Download ALL rows of a Supabase table as a CSV file (paginated, no row cap). */
export async function downloadTableAsCsv({ table, filenamePrefix, columns, orderBy }: Options) {
  const tid = toast.loading("Preparing download…");
  try {
    const pageSize = 1000;
    let from = 0;
    let all: Record<string, unknown>[] = [];
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let q = supabase.from(table as any).select("*").range(from, from + pageSize - 1);
      if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? false });
      const { data, error } = await q;
      if (error) throw error;
      const batch = ((data ?? []) as unknown) as Record<string, unknown>[];
      all = all.concat(batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }

    if (all.length === 0) {
      toast.error("No data to download", { id: tid });
      return;
    }

    const headers = columns ?? Object.keys(all[0]);
    const csv = [
      headers.join(","),
      ...all.map((r) => headers.map((h) => csvEscape(r[h])).join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.href = url;
    a.download = `${filenamePrefix}-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${all.length} rows`, { id: tid });
  } catch (e: any) {
    toast.error(e?.message ?? "Download failed", { id: tid });
  }
}
