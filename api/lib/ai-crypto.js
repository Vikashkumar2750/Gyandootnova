// AES-GCM encryption for AI provider API keys — ported from _shared/ai-crypto.ts
const ENC_KEY_RAW = () => process.env.AI_PROVIDER_ENC_KEY || "";

async function getAesKey() {
  const raw = ENC_KEY_RAW();
  if (!raw) throw new Error("AI_PROVIDER_ENC_KEY not configured");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return await crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

const b64 = {
  enc: (buf) => {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let s = ""; for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  },
  dec: (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0)),
};

export async function encryptKey(plaintext) {
  const key = await getAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  return `v1.${b64.enc(iv)}.${b64.enc(ct)}`;
}

export async function decryptKey(payload) {
  if (!payload?.startsWith("v1.")) throw new Error("bad ciphertext");
  const [, ivB64, ctB64] = payload.split(".");
  const key = await getAesKey();
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64.dec(ivB64) }, key, b64.dec(ctB64));
  return new TextDecoder().decode(pt);
}

export function last4(key) {
  const s = key.replace(/\s+/g, "");
  return s.length <= 4 ? s : s.slice(-4);
}
