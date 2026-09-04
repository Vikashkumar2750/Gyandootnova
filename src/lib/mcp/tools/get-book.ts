import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAnon } from "../supabase";

const SITE = "https://gyandootnova.in";

export default defineTool({
  name: "get_book",
  title: "Get book details",
  description:
    "Fetch full details and the chapter list of one GyandootNova book by its slug (e.g. 'rigved').",
  inputSchema: {
    slug: z.string().trim().min(1).describe("Book slug from its URL, e.g. 'bhagavad-gita'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }) => {
    const supabase = supabaseAnon();
    const { data: book, error } = await supabase
      .from("books")
      .select(
        "id, title, slug, author, category, description, price, is_free, cover_url, preview_chapters, access_validity_days",
      )
      .eq("slug", slug)
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!book) return { content: [{ type: "text", text: `No book found for slug "${slug}".` }], isError: true };

    const { data: chapters } = await supabase
      .from("chapters")
      .select("chapter_number, title")
      .eq("book_id", book.id)
      .order("chapter_number", { ascending: true });

    const result = {
      ...book,
      url: `${SITE}/books/${book.slug}`,
      chapters: chapters ?? [],
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: { book: result },
    };
  },
});
