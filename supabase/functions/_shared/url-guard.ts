// SSRF guard for admin-supplied "custom AI provider" base URLs.
// Only https endpoints to non-private hosts are accepted.

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
  "169.254.169.254",
]);

function isPrivateIPv4(host: string): boolean {
  const m = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const [a, b] = [parseInt(m[1], 10), parseInt(m[2], 10)];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 0) return true;
  return false;
}

export function assertSafePublicHttpsUrl(raw: string): URL {
  let u: URL;
  try { u = new URL(raw); } catch { throw new Error("Invalid base_url"); }
  if (u.protocol !== "https:") throw new Error("base_url must use https://");
  const host = u.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host)) throw new Error("base_url host not allowed");
  if (host.endsWith(".local") || host.endsWith(".internal")) throw new Error("base_url host not allowed");
  if (isPrivateIPv4(host)) throw new Error("base_url host not allowed");
  if (host.startsWith("[")) throw new Error("Raw IPv6 hosts not allowed");
  return u;
}
