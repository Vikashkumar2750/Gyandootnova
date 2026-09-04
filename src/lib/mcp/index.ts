import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchBooks from "./tools/search-books";
import getBook from "./tools/get-book";
import searchArticles from "./tools/search-articles";
import getArticle from "./tools/get-article";
import myLibrary from "./tools/my-library";
import myReadingProgress from "./tools/my-reading-progress";

// Issuer must be the direct Supabase host, built from the project ref that Vite
// inlines at build time (never from SUPABASE_URL, which is a Cloud proxy URL).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "gyandootnova",
  title: "GyandootNova",
  version: "0.1.0",
  instructions:
    "Tools for GyandootNova, a Hindi-first spiritual publication. Use `search_books` and `get_book` to explore the devotional book library, `search_articles` and `get_article` for published articles on scriptures and meditation, and `my_library` / `my_reading_progress` for the signed-in reader's own purchases and reading position.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchBooks, getBook, searchArticles, getArticle, myLibrary, myReadingProgress],
});
