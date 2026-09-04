// Fire-and-forget dispatcher for long-running SEO commands with:
//  - duplicate-run guard (in-flight OR already succeeded today)
//  - retries with exponential backoff on transient errors
//  - full job-run tracking in seo_job_runs
//  - in-app admin notifications on completion / failure
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
import { createClient } from "@supabase/supabase-js";
import { assertSeoAuthorized } from "../lib/seo-auth.js";

const ALLOWED = new Set([
  "seo-daily-publisher",
  "seo-queue-topup",
  "seo-book-kb-refresh",
  "seo-blog-agent",
  "seo-gsc-sync",
  "seo-post-publish-hook",
  "seo-social-captions",
  "seo-auto-run",
  "seo-rank-optimizer",
]);

// Commands where "already succeeded today" should block a re-run.
// Cheap/idempotent hooks are excluded so admins can trigger them repeatedly.
const ONCE_PER_DAY = new Set([
  "seo-daily-publisher",
  "seo-book-kb-refresh",
  "seo-gsc-sync",
  "seo-rank-optimizer",
]);

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [0, 15_000, 60_000]; // 0s, 15s, 60s

// deno-lint-ignore no-explicit-any
// runtime check removed - Node.js environment

// Lazy admin client - initialized on first request to allow startup without env vars
let _admin = null;
const getAdmin = () => {
  if (!_admin) {
    const url = process.env.SUPABASE_URL;
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
    _admin = createClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return _admin;
};

const isTransient = (status, err) => {
  if (status === 408 || status === 429) return true;
  if (status >= 500) return true;
  const e = (err || "").toLowerCase();
  return /timeout|econnreset|network|fetch failed|temporar|unavailable/.test(e);
};

const notify = async (
  level,
  fn,
  title,
  message,
  jobRunId,
) => {
  await getAdmin().from("seo_notifications").insert({
    level, fn, title, message, job_run_id: jobRunId ?? null,
  });
};

const handler = async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const unauthorized = await assertSeoAuthorized(req);
  if (unauthorized) return unauthorized;

  let payload = {};
  try { payload = await req.json(); } catch { /* empty body ok */ }

  const fn = String(payload.fn || "");
  const force = !!payload.force;
  if (!ALLOWED.has(fn)) {
    return new Response(JSON.stringify({ error: `Unknown or disallowed function: ${fn}` }), {
      status: 400, headers,
    });
  }

  // Duplicate guard --------------------------------------------------------
  if (!force) {
    const { data: inflight } = await admin
      .from("seo_job_runs")
      .select("id, started_at")
      .eq("fn", fn)
      .in("status", ["queued", "running"])
      .order("started_at", { ascending: false })
      .limit(1);
    if (inflight && inflight.length > 0) {
      return new Response(JSON.stringify({
        blocked: true,
        reason: "in_flight",
        message: `${fn} is already running (started ${inflight[0].started_at}). Wait for it to finish or pass force=true.`,
        job_run_id: inflight[0].id,
      }), { status: 409, headers });
    }

    if (ONCE_PER_DAY.has(fn)) {
      const today = new Date(new Date().getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
      const { data: doneToday } = await admin
        .from("seo_job_runs")
        .select("id, finished_at")
        .eq("fn", fn)
        .eq("status", "success")
        .eq("run_date", today)
        .limit(1);
      if (doneToday && doneToday.length > 0) {
        return new Response(JSON.stringify({
          blocked: true,
          reason: "already_succeeded_today",
          message: `${fn} already succeeded today. Pass force=true to run again.`,
          job_run_id: doneToday[0].id,
        }), { status: 409, headers });
      }
    }
  }

  // Create job-run row -----------------------------------------------------
  const { data: jobRow, error: insErr } = await admin
    .from("seo_job_runs")
    .insert({
      fn,
      status: "queued",
      attempt: 1,
      max_attempts: MAX_ATTEMPTS,
      payload: (payload.body ?? {}),
    })
    .select("id")
    .single();

  if (insErr || !jobRow) {
    return new Response(JSON.stringify({ error: `Failed to create job row: ${insErr?.message}` }), {
      status: 500, headers,
    });
  }
  const jobRunId = jobRow.id ;

  // Background execution with retries -------------------------------------
  const task = (async () => {
    const startAll = Date.now();
    let attempt = 0;
    let lastError = "";
    let lastStatus = 0;
    let lastResult = null;

    while (attempt < MAX_ATTEMPTS) {
      attempt += 1;
      const attemptStarted = new Date().toISOString();
      await getAdmin().from("seo_job_runs").update({
        status: "running",
        attempt,
        started_at: attemptStarted,
      }).eq("id", jobRunId);

      if (BACKOFF_MS[attempt - 1] > 0) {
        await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1]));
      }

      try {
        const r = await fetch(`${url}/functions/v1/${fn}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${svc}`,
            apikey: svc,
            "x-cron-secret": process.env.SEO_CRON_TOKEN ?? "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload.body ?? {}),
        });
        lastStatus = r.status;
        const text = await r.text().catch(() => "");
        try { lastResult = text ? JSON.parse(text) : null; } catch { lastResult = { raw: text.slice(0, 500) }; }

        if (r.ok) {
          const dur = Date.now() - startAll;
          await getAdmin().from("seo_job_runs").update({
            status: "success",
            finished_at: new Date().toISOString(),
            duration_ms: dur,
            http_status: r.status,
            result: lastResult,
            error,
          }).eq("id", jobRunId);
          await notify("success", fn, `${fn} completed`,
            `Finished in ${(dur / 1000).toFixed(1)}s${attempt > 1 ? ` (attempt ${attempt})` : ""}.`,
            jobRunId);
          return;
        }
        lastError = `HTTP ${r.status}: ${text.slice(0, 300)}`;
        if (!isTransient(r.status, lastError)) break; // non-retryable
      } catch (e) {
        lastError = e?.message || String(e);
        lastStatus = 0;
        if (!isTransient(0, lastError)) break;
      }
    }

    const dur = Date.now() - startAll;
    await getAdmin().from("seo_job_runs").update({
      status: "failed",
      finished_at: new Date().toISOString(),
      duration_ms: dur,
      http_status: lastStatus || null,
      error: lastError.slice(0, 2000),
      result: lastResult,
    }).eq("id", jobRunId);
    await notify("error", fn, `${fn} failed`,
      `After ${attempt} attempt(s): ${lastError.slice(0, 200)}`,
      jobRunId);
  })();

  if (runtime?.waitUntil) runtime.waitUntil(task);

  return new Response(
    JSON.stringify({ queued: true, fn, job_run_id: jobRunId, started_at: new Date().toISOString() }),
    { status: 202, headers },
  );
};

export default handler;
