// AES-GCM key encryption helpers backed by a dedicated AI_KEY_ENC_SECRET.
// Falls back to SUPABASE_SERVICE_ROLE_KEY only to keep historic ciphertexts
// decryptable; new writes always use the dedicated secret when set.

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64encode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function b64decode(str: string): Uint8Array {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function getPrimarySecret(): string {
  const s = Deno.env.get("AI_KEY_ENC_SECRET");
  if (s && s.length >= 16) return s;
  // Last-resort fallback — kept for backward compatibility only.
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "fallback-secret-please-set-AI_KEY_ENC_SECRET";
}

// Encrypted payload format: "v2:<base64(iv|ciphertext)>"
export async function encryptApiKey(plain: string): Promise<string> {
  const key = await deriveKey(getPrimarySecret());
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plain))
  );
  const merged = new Uint8Array(iv.length + ct.length);
  merged.set(iv, 0);
  merged.set(ct, iv.length);
  return "v2:" + b64encode(merged);
}

export async function decryptApiKey(stored: string): Promise<string> {
  if (!stored) return "";
  if (stored.startsWith("v2:")) {
    const raw = b64decode(stored.slice(3));
    const iv = raw.slice(0, 12);
    const ct = raw.slice(12);
    const key = await deriveKey(getPrimarySecret());
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return dec.decode(pt);
  }
  // Legacy XOR/base64 fallback — only used to migrate old rows on read.
  try {
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "fallback";
    const data = atob(stored);
    let result = "";
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(data.charCodeAt(i) ^ secret.charCodeAt(i % secret.length));
    }
    return result;
  } catch {
    return stored;
  }
}
