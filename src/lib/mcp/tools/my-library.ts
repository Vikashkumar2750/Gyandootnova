import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

const SITE = "https://gyandootnova.in";

export default defineTool({
  name: "my_library",
  title: "My library",
  description:
    "List the books the signed-in GyandootNova user owns, with access validity and purchase details.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    const supabase = supabaseForUser(ctx);
    const { data: purchases, error } = await supabase.rpc("get_user_purchases", {
      _user_id: ctx.getUserId(),
    });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const rows = (purchases ?? []) as Array<Record<string, unknown>>;
    const bookIds = rows.map((r) => String(r.book_id)).filter(Boolean);

    let titles: Record<string, { title: string; slug: string; author: string }> = {};
    if (bookIds.length) {
      const { data: books } = await supabase
        .from("books")
        .select("id, title, slug, author")
        .in("id", bookIds);
      titles = Object.fromEntries(
        (books ?? []).map((b) => [b.id, { title: b.title, slug: b.slug, author: b.author }]),
      );
    }

    const library = rows.map((r) => {
      const meta = titles[String(r.book_id)];
      return {
        ...meta,
        url: meta ? `${SITE}/books/${meta.slug}` : undefined,
        amount: r.amount,
        purchased_at: r.created_at,
        access_validity_days: r.access_validity_days,
      };
    });

    return {
      content: [{ type: "text", text: JSON.stringify(library, null, 2) }],
      structuredContent: { library },
    };
  },
});
