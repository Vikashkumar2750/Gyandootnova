import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

const SITE = "https://gyandootnova.in";

export default defineTool({
  name: "my_reading_progress",
  title: "My reading progress",
  description:
    "Show where the signed-in GyandootNova user left off in each book they are reading.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("reading_progress")
      .select("book_id, chapter_number, scroll_percent, updated_at")
      .order("updated_at", { ascending: false })
      .limit(25);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const rows = data ?? [];
    let titles: Record<string, { title: string; slug: string }> = {};
    if (rows.length) {
      const { data: books } = await supabase
        .from("books")
        .select("id, title, slug")
        .in("id", rows.map((r) => r.book_id));
      titles = Object.fromEntries((books ?? []).map((b) => [b.id, { title: b.title, slug: b.slug }]));
    }

    const progress = rows.map((r) => {
      const meta = titles[r.book_id];
      return {
        title: meta?.title,
        url: meta ? `${SITE}/books/${meta.slug}` : undefined,
        chapter_number: r.chapter_number,
        scroll_percent: r.scroll_percent,
        updated_at: r.updated_at,
      };
    });

    return {
      content: [{ type: "text", text: JSON.stringify(progress, null, 2) }],
      structuredContent: { progress },
    };
  },
});
