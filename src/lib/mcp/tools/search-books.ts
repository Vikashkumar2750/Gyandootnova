import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAnon } from "../supabase";

const SITE = "https://gyandootnova.in";

export default defineTool({
  name: "search_books",
  title: "Search books",
  description:
    "Search the GyandootNova library of spiritual and devotional books by title, author, description or category.",
  inputSchema: {
    query: z.string().trim().describe("Search text; pass an empty string to list featured books."),
    limit: z.number().int().min(1).max(50).describe("Maximum number of books to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }) => {
    const supabase = supabaseAnon();
    let q = supabase
      .from("books")
      .select("title, slug, author, category, description, price, is_free, cover_url")
      .limit(limit);

    if (query) {
      const like = `%${query.replace(/[%,]/g, " ")}%`;
      q = q.or(
        `title.ilike.${like},author.ilike.${like},category.ilike.${like},description.ilike.${like}`,
      );
    } else {
      q = q.order("is_featured", { ascending: false }).order("purchase_count", { ascending: false });
    }

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const books = (data ?? []).map((b) => ({ ...b, url: `${SITE}/books/${b.slug}` }));
    return {
      content: [{ type: "text", text: JSON.stringify(books, null, 2) }],
      structuredContent: { books },
    };
  },
});
