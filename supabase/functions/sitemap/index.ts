import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

<<<<<<< HEAD
const headers = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
  "Access-Control-Allow-Origin": "*",
=======
const corsHeaders = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600",
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
};

const BASE_URL = "https://gyandootnova.in";

<<<<<<< HEAD
const encPath = (path: string) =>
  "/" + path.split("/").filter(Boolean).map(encodeURIComponent).join("/");

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!
  );

  const [booksRes, postsRes] = await Promise.all([
    supabase.from("books").select("id, slug, updated_at").order("created_at", { ascending: false }),
=======
Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  // Fetch books and posts
  const [booksRes, postsRes] = await Promise.all([
    supabase.from("books").select("slug, updated_at").order("created_at", { ascending: false }),
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
    supabase.from("posts").select("slug, updated_at").eq("is_published", true).order("created_at", { ascending: false }),
  ]);

  const books = booksRes.data ?? [];
  const posts = postsRes.data ?? [];

  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "daily" },
    { loc: "/books", priority: "0.9", changefreq: "daily" },
    { loc: "/articles", priority: "0.9", changefreq: "daily" },
<<<<<<< HEAD
    { loc: "/our-story", priority: "0.7", changefreq: "monthly" },
    { loc: "/library", priority: "0.4", changefreq: "weekly" },
    { loc: "/about", priority: "0.7", changefreq: "monthly" },
    { loc: "/services", priority: "0.7", changefreq: "monthly" },
    { loc: "/contact", priority: "0.6", changefreq: "monthly" },
    { loc: "/faq", priority: "0.5", changefreq: "monthly" },
    { loc: "/donate", priority: "0.6", changefreq: "monthly" },
    { loc: "/testimonials", priority: "0.5", changefreq: "monthly" },
    { loc: "/portfolio", priority: "0.5", changefreq: "monthly" },
    { loc: "/careers", priority: "0.4", changefreq: "monthly" },
    { loc: "/support", priority: "0.4", changefreq: "monthly" },
    { loc: "/support-us", priority: "0.5", changefreq: "monthly" },
    { loc: "/sitemap", priority: "0.3", changefreq: "monthly" },
    { loc: "/keywords", priority: "0.7", changefreq: "weekly" },
    { loc: "/privacy-policy", priority: "0.3", changefreq: "yearly" },
    { loc: "/terms-conditions", priority: "0.3", changefreq: "yearly" },
    { loc: "/refund-policy", priority: "0.3", changefreq: "yearly" },
    { loc: "/shipping-policy", priority: "0.3", changefreq: "yearly" },
    { loc: "/texts/bhagavad-gita", priority: "0.9", changefreq: "monthly" },
    { loc: "/texts/vedas", priority: "0.9", changefreq: "monthly" },
    { loc: "/texts/upanishads", priority: "0.9", changefreq: "monthly" },
    { loc: "/texts/rig-veda", priority: "0.9", changefreq: "monthly" },
    { loc: "/hindi/upanishad-meaning-in-hindi", priority: "0.85", changefreq: "monthly" },
    { loc: "/hindi/vedas-meaning-in-hindi", priority: "0.85", changefreq: "monthly" },
    { loc: "/hindi/dhyan-kaise-karein", priority: "0.9", changefreq: "monthly" },
    { loc: "/how-to-read/bhagavad-gita", priority: "0.8", changefreq: "monthly" },
    { loc: "/meditation/techniques-compared", priority: "0.85", changefreq: "monthly" },
    { loc: "/meditation/for-anxiety", priority: "0.8", changefreq: "monthly" },
    { loc: "/meditation/for-stress", priority: "0.8", changefreq: "monthly" },
    { loc: "/qa/who-wrote-bhagavad-gita", priority: "0.85", changefreq: "monthly" },
    { loc: "/qa/who-wrote-vedas", priority: "0.8", changefreq: "monthly" },
    { loc: "/qa/how-many-vedas", priority: "0.8", changefreq: "monthly" },
    { loc: "/qa/how-many-upanishads", priority: "0.8", changefreq: "monthly" },
    { loc: "/qa/how-many-slokas-in-bhagavad-gita", priority: "0.8", changefreq: "monthly" },
  ];

  const today = new Date().toISOString().split("T")[0];
  const urls: string[] = staticPages.map(
    (p) => `  <url><loc>${BASE_URL}${p.loc}</loc><lastmod>${today}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`
  );

  for (const book of books) {
    const lastmod = book.updated_at ? book.updated_at.split("T")[0] : today;
    urls.push(`  <url><loc>${BASE_URL}${encPath(`/books/${book.slug}`)}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`);
  }

  // Chapter reader URLs are intentionally omitted from the sitemap — chapter
  // content is premium and should not rank; only the book detail page should
  // appear in search. The reader itself also emits <meta name="robots" noindex>.


  for (const post of posts) {
    const lastmod = post.updated_at ? post.updated_at.split("T")[0] : today;
    urls.push(`  <url><loc>${BASE_URL}${encPath(`/articles/${post.slug}`)}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`);
=======
    { loc: "/about", priority: "0.7", changefreq: "monthly" },
    { loc: "/contact", priority: "0.6", changefreq: "monthly" },
    { loc: "/services", priority: "0.7", changefreq: "monthly" },
    { loc: "/faq", priority: "0.5", changefreq: "monthly" },
    { loc: "/donate", priority: "0.6", changefreq: "monthly" },
    { loc: "/testimonials", priority: "0.5", changefreq: "monthly" },
  ];

  let urls = staticPages.map(
    (p) => `  <url><loc>${BASE_URL}${p.loc}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`
  );

  for (const book of books) {
    const lastmod = book.updated_at ? `<lastmod>${book.updated_at.split("T")[0]}</lastmod>` : "";
    urls.push(`  <url><loc>${BASE_URL}/books/${book.slug}</loc>${lastmod}<changefreq>weekly</changefreq><priority>0.8</priority></url>`);
  }

  for (const post of posts) {
    const lastmod = post.updated_at ? `<lastmod>${post.updated_at.split("T")[0]}</lastmod>` : "";
    urls.push(`  <url><loc>${BASE_URL}/articles/${post.slug}</loc>${lastmod}<changefreq>weekly</changefreq><priority>0.7</priority></url>`);
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

<<<<<<< HEAD
  return new Response(xml, { headers });
=======
  return new Response(xml, { headers: corsHeaders });
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
});
