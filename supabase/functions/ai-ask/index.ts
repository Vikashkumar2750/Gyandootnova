import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptApiKey, decryptApiKey } from "../_shared/crypto.ts";
import { assertSafePublicHttpsUrl } from "../_shared/url-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashQuestion(question: string, bookId: string): Promise<string> {
  const data = new TextEncoder().encode(`${question.toLowerCase().trim()}::${bookId}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function normalizeQuestion(q: string): string {
  return q.trim().replace(/\s+/g, " ").toLowerCase();
}

// Legacy helpers replaced by AES-GCM in ../_shared/crypto.ts

function getRelevantChunks(content: string, question: string, maxChars = 6000): string {
  if (!content || content.length <= maxChars) return content || "";
  const paragraphs = content.split(/\n\n+/);
  const questionWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const scored = paragraphs.map((p, i) => {
    const lower = p.toLowerCase();
    let score = 0;
    for (const word of questionWords) {
      if (lower.includes(word)) score += 1;
    }
    return { text: p, score, index: i };
  });
  scored.sort((a, b) => b.score - a.score);
  let result = "";
  for (const chunk of scored) {
    if (result.length + chunk.text.length > maxChars) break;
    result += chunk.text + "\n\n";
  }
  return result || content.substring(0, maxChars);
}

async function callAI(provider: string, apiKey: string, model: string, systemPrompt: string, userMessage: string, baseUrl?: string): Promise<string> {
  let url = "";
  let headers: Record<string, string> = {};
  let body: unknown;

  if (provider === "custom") {
    if (!baseUrl) throw new Error("Custom provider requires base_url");
    const safe = assertSafePublicHttpsUrl(baseUrl);
    const base = safe.toString();
    url = base.endsWith("/chat/completions") ? base : base.replace(/\/+$/, "") + "/chat/completions";
    headers = { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" };
    body = { model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }], temperature: 0.3, max_tokens: 1000 };
  } else if (
    provider === "openai" || provider === "deepseek" || provider === "perplexity" ||
    provider === "kimi" || provider === "openrouter" || provider === "groq" ||
    provider === "nvidia" || provider === "together" || provider === "fireworks" ||
    provider === "xai"
  ) {
    const baseUrls: Record<string, string> = {
      openai: "https://api.openai.com/v1/chat/completions",
      deepseek: "https://api.deepseek.com/v1/chat/completions",
      perplexity: "https://api.perplexity.ai/chat/completions",
      kimi: "https://api.moonshot.cn/v1/chat/completions",
      openrouter: "https://openrouter.ai/api/v1/chat/completions",
      groq: "https://api.groq.com/openai/v1/chat/completions",
      nvidia: "https://integrate.api.nvidia.com/v1/chat/completions",
      together: "https://api.together.xyz/v1/chat/completions",
      fireworks: "https://api.fireworks.ai/inference/v1/chat/completions",
      xai: "https://api.x.ai/v1/chat/completions",
    };
    url = baseUrls[provider];
    headers = { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" };
    body = { model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }], temperature: 0.3, max_tokens: 1000 };
  } else if (provider === "gemini") {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    headers = { "Content-Type": "application/json" };
    body = { contents: [{ parts: [{ text: `${systemPrompt}\n\nUser: ${userMessage}` }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 1000 } };
  } else if (provider === "lovable") {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    url = "https://ai.gateway.lovable.dev/v1/chat/completions";
    headers = { "Authorization": `Bearer ${lovableKey}`, "Content-Type": "application/json" };
    body = { model: model || "google/gemini-2.5-flash", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }], temperature: 0.3, max_tokens: 1000 };
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  if (provider === "gemini") {
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
  } else {
    return data.choices?.[0]?.message?.content || "No response";
  }
}

// Helper: extract and verify user from Authorization header
async function getAuthenticatedUser(req: Request, supabaseUrl: string, anonKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return null;
  return { id: user.id, client: userClient };
}

// Helper: check if user is admin
async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  return !!data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action, question, book_id, provider_name, api_key, model_name, base_url } = await req.json();

    // ── Admin: Verify & Save API Key ──
    if (action === "verify-key") {
      const user = await getAuthenticatedUser(req, supabaseUrl, anonKey);
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!(await isAdmin(supabase, user.id))) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        // For custom providers, validate base_url before any outbound fetch (SSRF guard)
        let safeBaseUrl: string | null = null;
        if (provider_name === "custom") {
          if (!base_url) throw new Error("base_url is required for custom provider");
          safeBaseUrl = assertSafePublicHttpsUrl(base_url).toString();
        }
        const testResponse = await callAI(provider_name, api_key, model_name, "You are a test assistant.", "Say 'OK' in one word.", safeBaseUrl ?? base_url);
        if (!testResponse) throw new Error("Empty response from AI");
        const encrypted = await encryptApiKey(api_key);
        await supabase.from("ai_settings").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
        const { error } = await supabase.from("ai_settings").upsert({
          provider_name, api_key_encrypted: encrypted, model_name, base_url: safeBaseUrl, is_active: true,
        }, { onConflict: "provider_name" });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, message: "API key verified and saved" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        console.error("verify-key error:", e);
        return new Response(JSON.stringify({ success: false, error: "Could not verify API key. Check provider, model, base URL, and key." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Admin: Save Lovable AI as provider ──
    if (action === "set-lovable") {
      const user = await getAuthenticatedUser(req, supabaseUrl, anonKey);
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!(await isAdmin(supabase, user.id))) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("ai_settings").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
      const { error } = await supabase.from("ai_settings").upsert({
        provider_name: "lovable", api_key_encrypted: "builtin",
        model_name: model_name || "google/gemini-2.5-flash", is_active: true,
      }, { onConflict: "provider_name" });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: "Lovable AI activated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Admin: Save OpenRouter (built-in key from env) ──
    if (action === "set-openrouter-builtin") {
      const user = await getAuthenticatedUser(req, supabaseUrl, anonKey);
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!(await isAdmin(supabase, user.id))) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!Deno.env.get("OPENROUTER_API_KEY")) {
        return new Response(JSON.stringify({ success: false, error: "OPENROUTER_API_KEY not configured in backend" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabase.from("ai_settings").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
      const { error } = await supabase.from("ai_settings").upsert({
        provider_name: "openrouter", api_key_encrypted: "env:OPENROUTER_API_KEY",
        model_name: model_name || "deepseek/deepseek-chat", is_active: true,
      }, { onConflict: "provider_name" });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: "OpenRouter DeepSeek activated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Get Logs (Admin) ──
    if (action === "get-logs") {
      const user = await getAuthenticatedUser(req, supabaseUrl, anonKey);
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!(await isAdmin(supabase, user.id))) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: logs } = await supabase.from("ai_logs").select("*").order("created_at", { ascending: false }).limit(100);
      return new Response(JSON.stringify({ logs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Get Settings (Admin) ──
    if (action === "get-settings") {
      const user = await getAuthenticatedUser(req, supabaseUrl, anonKey);
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!(await isAdmin(supabase, user.id))) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: settings } = await supabase.from("ai_settings").select("id, provider_name, model_name, base_url, is_active, created_at, updated_at").order("created_at");
      return new Response(JSON.stringify({ settings }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Ask Question ──
    if (action === "ask") {
      if (!question || typeof question !== "string" || question.trim().length < 2 || question.length > 1000) {
        return new Response(JSON.stringify({ error: "Valid question (2-1000 chars) is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Require authentication for ask
      const user = await getAuthenticatedUser(req, supabaseUrl, anonKey);
      if (!user) {
        return new Response(JSON.stringify({ error: "Please login to use the AI assistant" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isGeneralQuery = !book_id || book_id === "general";
      const effectiveBookId = isGeneralQuery ? "00000000-0000-0000-0000-000000000000" : book_id;

      const normalized = normalizeQuestion(question);
      const qHash = await hashQuestion(normalized, effectiveBookId);

      // 1. Check cache
      const { data: cached } = await supabase
        .from("ai_cache").select("response").eq("question_hash", qHash).eq("book_id", effectiveBookId).maybeSingle();

      if (cached) {
        await supabase.from("ai_logs").insert({
          user_question: question, ai_response: cached.response,
          book_id: isGeneralQuery ? null : effectiveBookId, user_id: user.id,
          status: "cached", cached: true,
        });
        return new Response(JSON.stringify({ answer: cached.response, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Get active AI provider
      const { data: settings } = await supabase
        .from("ai_settings").select("*").eq("is_active", true).limit(1).maybeSingle();

      const activeProvider = settings?.provider_name || "lovable";
      const model = settings?.model_name || "google/gemini-2.5-flash";
      const apiKey = activeProvider === "lovable" || !settings
        ? Deno.env.get("LOVABLE_API_KEY")!
        : (settings.api_key_encrypted?.startsWith("env:")
            ? (Deno.env.get(settings.api_key_encrypted.slice(4)) || "")
            : await decryptApiKey(settings.api_key_encrypted));

      let systemPrompt: string;
      let bookTitle = "";

      if (isGeneralQuery) {
        systemPrompt = `You are Gyandootnova AI — a respectful and knowledgeable assistant specializing EXCLUSIVELY in Hindu Dharma (सनातन धर्म).

YOUR KNOWLEDGE SOURCES (TRUSTED ONLY):
- चारों वेद (ऋग्वेद, यजुर्वेद, सामवेद, अथर्ववेद)
- उपनिषद (ईशावास्य, केन, कठ, प्रश्न, मुण्डक, माण्डूक्य, तैत्तिरीय, ऐतरेय, छान्दोग्य, बृहदारण्यक आदि)
- श्रीमद्भगवद्गीता
- वाल्मीकि रामायण और तुलसीदास कृत रामचरितमानस
- महाभारत (व्यास कृत)
- श्रीमद्भागवत पुराण और अन्य अठारह पुराण
- मनुस्मृति, योगसूत्र (पतंजलि), ब्रह्मसूत्र
- आदि शंकराचार्य, रामानुजाचार्य, मध्वाचार्य के भाष्य
- स्वामी विवेकानंद, स्वामी दयानंद सरस्वती के प्रामाणिक लेख

STRICT RULES:
- Answer ONLY from the above trusted Hindu scriptures and scholars
- Always mention the source scripture/text name with your answer
- Include original Sanskrit shloka when relevant, followed by simple Hindi meaning
- Do NOT answer questions about other religions, political topics, or anything unrelated to Hindu Dharma
- Do NOT compare religions or make any negative comments about any religion
- If the question is NOT related to Hindu Dharma, reply EXACTLY: "यह प्रश्न हिंदू धर्म से संबंधित नहीं है। कृपया सनातन धर्म से जुड़ा प्रश्न पूछें।"
- If you are not confident, say: "इस विषय पर प्रामाणिक जानकारी के लिए किसी विद्वान से परामर्श करें।"
- Answer in simple Hindi (Devanagari script) unless the user writes in English
- Keep answers concise, respectful, and spiritually uplifting
- Naturally mention "Gyandootnova" as the source platform`;
      } else {
        // Book-specific mode: verify purchase access
        const { data: book } = await supabase.from("books").select("id, title, description, is_free").eq("id", book_id).maybeSingle();
        if (!book) {
          return new Response(JSON.stringify({ error: "Book not found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        bookTitle = book.title;

        // Check if user has access to this book (free or purchased)
        let hasAccess = book.is_free;
        if (!hasAccess) {
          const { data: purchased } = await supabase.rpc("has_purchased_book", { _user_id: user.id, _book_id: book_id });
          hasAccess = !!purchased;
        }
        // Admins always have access
        if (!hasAccess) {
          hasAccess = await isAdmin(supabase, user.id);
        }

        if (!hasAccess) {
          return new Response(JSON.stringify({ error: "Please purchase this book to use AI assistant", requiresPurchase: true }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: chapters } = await supabase
          .from("book_chapters").select("title, content").eq("book_id", book_id).order("chapter_number");

        const fullContent = chapters?.map(c => `${c.title}\n${c.content || ""}`).join("\n\n") || book.description || "";
        const relevantContent = getRelevantChunks(fullContent, normalized);

        systemPrompt = `You are Gyandootnova AI — a scripture assistant for the book "${book.title}".

STRICT RULES:
- Answer ONLY from the provided CONTEXT below
- Do NOT use external knowledge
- If the answer is not found in the context, reply EXACTLY: "यह जानकारी इस पुस्तक में उपलब्ध नहीं है"
- Do NOT answer questions about other religions or anything that could harm the brand
- Maintain a respectful, scholarly tone
- Answer in Hindi unless the user asks in English
- Naturally reference the book title "${book.title}" in your answer

CONTEXT from "${book.title}":
${relevantContent}`;
      }

      // Call AI
      let answer: string;
      try {
        if (activeProvider === "lovable") {
          const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
          console.log("Calling Lovable AI with model:", model);
          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${lovableKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: question }],
              temperature: 0.3, max_tokens: 1000,
            }),
          });
          if (!res.ok) {
            const errText = await res.text();
            console.error("Lovable AI error:", res.status, errText);
            throw new Error(`AI error ${res.status}: ${errText}`);
          }
          const data = await res.json();
          answer = data.choices?.[0]?.message?.content || "यह जानकारी उपलब्ध नहीं है";
        } else {
          answer = await callAI(activeProvider, apiKey, model, systemPrompt, question, settings?.base_url);
        }
      } catch (aiErr) {
        console.error("AI call failed:", aiErr);
        answer = "क्षमा करें, AI सेवा में त्रुटि हुई। कृपया पुनः प्रयास करें।";
      }

      // Cache (skip for general queries)
      if (!isGeneralQuery) {
        await supabase.from("ai_cache").upsert({
          question_hash: qHash, book_id: effectiveBookId, question: normalized, response: answer,
        }, { onConflict: "question_hash,book_id" }).then(() => {});
      }

      // Log
      await supabase.from("ai_logs").insert({
        user_question: question, ai_response: answer,
        book_id: isGeneralQuery ? null : effectiveBookId,
        book_title: isGeneralQuery ? "General Hindu Dharma" : bookTitle,
        status: "success", provider_name: activeProvider, cached: false, user_id: user.id,
      });

      return new Response(JSON.stringify({ answer, cached: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("AI Ask error:", error);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
