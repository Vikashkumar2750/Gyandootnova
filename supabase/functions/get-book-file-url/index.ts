import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader ?? "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();

    const { book_id } = await req.json();
    if (!book_id) {
      return new Response(JSON.stringify({ error: "book_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get book details
    const { data: book, error: bookErr } = await supabase
      .from("books")
      .select("id, is_free, file_url, file_type")
      .eq("id", book_id)
      .single();

    if (bookErr || !book) {
      return new Response(JSON.stringify({ error: "Book not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!book.file_url) {
      return new Response(JSON.stringify({ error: "No file attached to this book" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check access: free book, or user has purchased, or user is admin
    let hasAccess = book.is_free;

    if (!hasAccess && user) {
      // Check purchase
      const { data: purchased } = await supabase.rpc("has_purchased_book", {
        _user_id: user.id,
        _book_id: book_id,
      });
      if (purchased) hasAccess = true;

      // Check admin
      if (!hasAccess) {
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });
        if (isAdmin) hasAccess = true;
      }
    }

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Purchase required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract storage path from file_url
    let storagePath: string | undefined;
    try {
      const urlObj = new URL(book.file_url);
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/book-files\/(.+)/);
      storagePath = pathMatch?.[1] ?? book.file_url.split("/book-files/").pop();
    } catch {
      // file_url is a relative path like "book-files/filename.pdf"
      storagePath = book.file_url.startsWith("book-files/")
        ? book.file_url.slice("book-files/".length)
        : book.file_url;
    }

    if (!storagePath) {
      return new Response(JSON.stringify({ error: "Invalid file path" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate signed URL (valid for 5 minutes only - short-lived for security)
    const { data: signedData, error: signErr } = await supabase.storage
      .from("book-files")
      .createSignedUrl(storagePath, 300);

    if (signErr || !signedData?.signedUrl) {
      return new Response(JSON.stringify({ error: "Could not generate URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ url: signedData.signedUrl, file_type: book.file_type }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("get-book-file-url error:", e);
    return new Response(JSON.stringify({ error: "Could not generate file URL" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
