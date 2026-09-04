// Runs an AI-powered originality/plagiarism check on a post or chapter.
// Writes the score + flagged passages back to the row and logs an audit event.
// Admin/authenticated only. No user-provided model, no PII in payload.

import { createClient } from "@supabase/supabase-js";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

const stripHtml = (html) =>
  html.replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

const AI_MODEL = "google/gemini-2.5-flash";

async function runOriginalityCheck(text) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");

  const truncated = text.slice(0, 18000);

  const systemPrompt =
    "You are an originality and plagiarism reviewer for a Hindi-first spiritual publishing platform (GyandootNova). " +
    "You assess whether prose was written originally for this publisher, or borrowed/paraphrased from well-known " +
    "external sources (Gita Press editions, Wikipedia, popular blog posts, other publishers, AI slop, etc). " +
    "Sanskrit shlokas, mantras, verse quotations, and short scriptural excerpts are PUBLIC-DOMAIN and do NOT count " +
    "as borrowed — only judge the surrounding commentary, translation phrasing, and prose. Be strict but fair. " +
    "Respond ONLY with a compact JSON object matching the schema in the user prompt.";

  const userPrompt = `Analyse the following content and return a JSON object:
{
  "score": <integer 0-100, 100 = fully original prose>,
  "verdict": "original" | "borrowed" | "uncertain",
  "summary": "<1-2 sentence overall judgement in English>",
  "flagged_passages": [
    { "text": "<exact snippet up to ~200 chars>", "reason": "<why flagged>", "likely_source": "<optional>" }
  ]
}

Rules:
- score >= 85 -> verdict "original"
- score 60-84 -> "uncertain"
- score < 60 -> "borrowed"
- flagged_passages MAY be empty
- Do not flag verbatim Sanskrit shlokas / mantras
- Return ONLY valid JSON, no markdown fences

CONTENT:
"""
${truncated}
"""`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI gateway ${res.status}: ${body.slice(0, 400)}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? "{}";
  let parsed = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Try to salvage JSON from the response
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]);
  }

  const score = Number.isFinite(parsed.score) ? Math.max(0, Math.min(100, Math.round(parsed.score))) : 50;
  const verdict =
    parsed.verdict === "original" || parsed.verdict === "borrowed" || parsed.verdict === "uncertain"
      ? parsed.verdict
      : score >= 85 ? "original" : score < 60 ? "borrowed" : "uncertain";

  const flagged = Array.isArray(parsed.flagged_passages)
    ? parsed.flagged_passages
        .filter((p) => p && typeof p.text === "string")
        .slice(0, 20)
        .map((p) => ({
          text: String(p.text).slice(0, 400),
          reason: String(p.reason ?? "similar to known source").slice(0, 200),
          likely_source: p.likely_source ? String(p.likely_source).slice(0, 200) : undefined,
        }))
    : [];

  return {
    score,
    verdict,
    summary: String(parsed.summary ?? "").slice(0, 500),
    flagged_passages: flagged,
    model: AI_MODEL,
    checked_at: new Date().toISOString(),
  };
}

const handler = async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers,
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey     = process.env.SUPABASE_ANON_KEY;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Auth: verify caller
    const supaAuthed = createClient(supabaseUrl, anonKey, {
      global: { headers },
    });
    const { data: userData, error: userErr } = await supaAuthed.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers,
      });
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email ?? null;

    // Role check: must be admin / seo_manager / books_manager
    const svcRole = createClient(supabaseUrl, serviceKey);
    const [{ data: isAdmin }, { data: isSeo }, { data: isBooks }] = await Promise.all([
      svcRole.rpc("has_role", { _user_id: userId, _role: "admin" }),
      svcRole.rpc("has_role", { _user_id: userId, _role: "seo_manager" }),
      svcRole.rpc("has_role", { _user_id: userId, _role: "books_manager" }),
    ]);
    if (!(isAdmin === true || isSeo === true || isBooks === true)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers,
      });
    }

    const body = await req.json();
    if (!body?.entity_type || !body?.entity_id) {
      return new Response(JSON.stringify({ error: "entity_type and entity_id required" }), {
        status: 400, headers,
      });
    }
    if (body.entity_type !== "post" && body.entity_type !== "chapter") {
      return new Response(JSON.stringify({ error: "entity_type must be post or chapter" }), {
        status: 400, headers,
      });
    }

    // Service client for writes (bypass RLS to also insert audit log)
    const svc = createClient(supabaseUrl, serviceKey);

    // Load content
    const table = body.entity_type === "post" ? "posts" : "book_chapters";
    const { data: row, error: loadErr } = await svc
      .from(table)
      .select("id, title, content, approval_status")
      .eq("id", body.entity_id)
      .maybeSingle();

    if (loadErr || !row) {
      return new Response(JSON.stringify({ error: "Content not found" }), {
        status: 404, headers,
      });
    }

    const plain = stripHtml(String(row.content ?? ""));
    if (plain.length < 50) {
      return new Response(JSON.stringify({ error: "Content too short to check (need >= 50 chars)" }), {
        status: 400, headers,
      });
    }

    const report = await runOriginalityCheck(plain);

    // Decide new approval status: flagged if score < 70 OR any flagged passage
    const shouldFlag = report.score < 70 || report.flagged_passages.length > 0;
    const nextStatus =
      shouldFlag ? "flagged"
      : (row.approval_status === "draft" ? "pending_review" : row.approval_status);

    const { error: updErr } = await svc
      .from(table)
      .update({
        originality_score: report.score,
        originality_report: report,
        originality_checked_at: report.checked_at,
        approval_status: nextStatus,
      })
      .eq("id", body.entity_id);

    if (updErr) {
      return new Response(JSON.stringify({ error: `Update failed: ${updErr.message}` }), {
        status: 500, headers,
      });
    }

    await svc.from("content_audit_log").insert({
      entity_type: body.entity_type,
      entity_id: body.entity_id,
      action: shouldFlag ? "flagged" : "check_run",
      actor_id: userId,
      actor_email: userEmail,
      notes: `Originality ${report.score}/100 — ${report.verdict}`,
      payload,
    });

    return new Response(
      JSON.stringify({ success: true, report, approval_status: nextStatus }),
      { headers },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers,
    });
  }
};

export default handler;
