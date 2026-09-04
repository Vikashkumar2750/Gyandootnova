import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAnon } from "../supabase";

const SITE = "https://gyandootnova.in";

export default defineTool({
  name: "search_articles",
  title: "Search articles",
  description:
    "Search published GyandootNova articles and blog posts on Hindu scriptures, meditation and spirituality.",
  inputSchema: {
    query: z.string().trim().describe("Search text; pass an empty string for the newest articles."),
    limit: z.number().int().min(1).max(50).describe("Maximum number of articles to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }) => {
    const supabase = supabaseAnon();
    let q = supabase
      .from("posts")
      .select("title, slug, excerpt, category, published_at, reading_time_min")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (query) {
      const like = `%${query.replace(/[%,]/g, " ")}%`;
      q = q.or(`title.ilike.${like},excerpt.ilike.${like},category.ilike.${like}`);
    }

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const articles = (data ?? []).map((p) => ({ ...p, url: `${SITE}/articles/${p.slug}` }));
    return {
      content: [{ type: "text", text: JSON.stringify(articles, null, 2) }],
      structuredContent: { articles },
    };
  },
});
