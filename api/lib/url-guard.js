// URL guard — ported from _shared/url-guard.ts
export function assertSafePublicHttpsUrl(urlString) {
  if (!urlString) throw new Error("URL is required");
  let url;
  try { url = new URL(urlString); } catch { throw new Error(`Invalid URL: ${urlString}`); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error(`Unsafe protocol: ${url.protocol}`);
  const host = url.hostname.toLowerCase();
  const blocked = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "metadata.google.internal"];
  if (blocked.some(b => host === b || host.endsWith(`.${b}`))) throw new Error(`Blocked host: ${host}`);
  if (/^10\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\./.test(host)) throw new Error(`Private IP: ${host}`);
  return url.href;
}
