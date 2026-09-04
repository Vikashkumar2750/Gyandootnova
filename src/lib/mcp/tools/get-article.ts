import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAnon } from "../supabase";

const SITE = "https://gyandootnova.in";

export default defineTool({
  name: "get_article",
  title: "Get article",
  description: "Fetch the full text of one published GyandootNova article by its slug.",
  inputSchema: {
    slug: z.string().trim().min(1).describe("Article slug from its URL."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }) => {
    const supabase = supabaseAnon();
    const { data, error } = await supabase
      .from("posts")
      .select("title, slug, excerpt, content, category, author, published_at, reading_time_min")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data)
      return {
        content: [{ type: "text", text: `No published article found for slug "${slug}".` }],
        isError: true,
      };

    const article = { ...data, url: `${SITE}/articles/${data.slug}` };
    return {
      content: [{ type: "text", text: JSON.stringify(article, null, 2) }],
      structuredContent: { article },
    };
  },
});
