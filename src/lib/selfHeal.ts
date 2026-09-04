import { supabase } from "@/integrations/supabase/client";

type AutoFix = "reload" | "retry" | "refresh-session" | "clear-cache" | null;

const seen = new Set<string>();
const FIX_GUARD_KEY = "gn_autofix_guard";

function guardAllows(fix: string) {
  try {
    const raw = sessionStorage.getItem(FIX_GUARD_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    const count = map[fix] ?? 0;
    if (count >= 1) return false;
    map[fix] = count + 1;
    sessionStorage.setItem(FIX_GUARD_KEY, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

async function applyAutoFix(fix: AutoFix) {
  if (!fix) return;
  try {
    switch (fix) {
      case "reload":
        if (guardAllows("reload")) window.location.reload();
        break;
      case "refresh-session":
        if (guardAllows("refresh-session")) await supabase.auth.refreshSession();
        break;
      case "clear-cache":
        if (guardAllows("clear-cache")) {
          Object.keys(localStorage)
            .filter((k) => k.startsWith("gn_") || k.includes("cache"))
            .forEach((k) => localStorage.removeItem(k));
          window.location.reload();
        }
        break;
      case "retry":
      default:
        break;
    }
  } catch {
    /* never let the healer throw */
  }
}

/** Report a runtime error and apply the self-heal action the server suggests. */
export async function reportError(
  error: unknown,
  source: "client" | "boundary" = "client",
) {
  try {
    const err = error as Error | undefined;
    const message = String((err && err.message) || error || "Unknown error").slice(0, 1000);
    if (!message || message === "Script error." ) return;

    const key = `${message}|${location.pathname}`;
    if (seen.has(key)) return;
    seen.add(key);

    const { data } = await supabase.functions.invoke("app-error-report", {
      body: {
        message,
        stack: err?.stack ?? "",
        route: location.pathname + location.search,
        source,
      },
    });
    await applyAutoFix((data as { auto_fix?: AutoFix })?.auto_fix ?? null);
  } catch {
    /* reporting must never break the app */
  }
}

let installed = false;

/** Installs global listeners so any uncaught bug is reported and self-healed. */
export function installSelfHealing() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (e) => {
    void reportError(e.error ?? e.message, "client");
  });

  window.addEventListener("unhandledrejection", (e) => {
    void reportError((e as PromiseRejectionEvent).reason, "client");
  });
}
