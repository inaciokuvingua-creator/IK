import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ─── VAPID config ─────────────────────────────────────────────────────────────
const VAPID_SUBJECT = "mailto:notifications@ikfinance.app";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "QSx5wDY7pYa_6lUk938nJ8LM8y_qh_O4lrzph2lfaauyre85qBNJklOE-FZV9zvqmDr2bJqYREOVKGjVVzswWw";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "sq3vOagTSZJThPhWVfc76pg69myamERDlSho1Vc7MFs";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function b64urlToUint8(b64: string): Uint8Array {
  const pad = b64.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(pad);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function uint8ToB64url(u8: Uint8Array): string {
  let bin = "";
  u8.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function importVapidPrivate(rawB64url: string): Promise<CryptoKey> {
  // Build PKCS#8 DER wrapping for prime256v1 raw private key (32 bytes)
  const rawKey = b64urlToUint8(rawB64url);
  // PKCS#8 header for P-256 EC key
  const header = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06,
    0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
    0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01,
    0x01, 0x04, 0x20,
  ]);
  const pkcs8 = new Uint8Array(header.length + rawKey.length);
  pkcs8.set(header);
  pkcs8.set(rawKey, header.length);
  return crypto.subtle.importKey("pkcs8", pkcs8, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

async function makeVapidAuthHeader(endpoint: string): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const now = Math.floor(Date.now() / 1000);

  const header = uint8ToB64url(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = uint8ToB64url(
    new TextEncoder().encode(JSON.stringify({ aud: audience, exp: now + 12 * 3600, sub: VAPID_SUBJECT }))
  );
  const signing = `${header}.${payload}`;
  const privKey = await importVapidPrivate(VAPID_PRIVATE_KEY);
  const sigDER = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privKey, new TextEncoder().encode(signing))
  );
  // Convert DER to raw r||s (64 bytes)
  const sig = derToRawSig(sigDER);
  const token = `${signing}.${uint8ToB64url(sig)}`;
  return `vapid t=${token}, k=${VAPID_PUBLIC_KEY}`;
}

function derToRawSig(der: Uint8Array): Uint8Array {
  // DER sequence: 30 len 02 rlen r... 02 slen s...
  let offset = 2; // skip 30 len
  const rLen = der[offset + 1];
  const r = der.slice(offset + 2, offset + 2 + rLen);
  offset += 2 + rLen;
  const sLen = der[offset + 1];
  const s = der.slice(offset + 2, offset + 2 + sLen);
  // Pad r and s to 32 bytes
  const rPad = new Uint8Array(32);
  const sPad = new Uint8Array(32);
  rPad.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
  sPad.set(s.length > 32 ? s.slice(s.length - 32) : s, 32 - Math.min(s.length, 32));
  const out = new Uint8Array(64);
  out.set(rPad);
  out.set(sPad, 32);
  return out;
}

async function encryptPayload(
  p256dh: string,
  authKey: string,
  payload: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const receiverPublicKey = await crypto.subtle.importKey(
    "raw",
    b64urlToUint8(p256dh),
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );

  const { privateKey: serverPrivKey, publicKey: serverPubKey } = await crypto.subtle.generateKeyPair(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );

  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverPubKey)
  );

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: receiverPublicKey },
      serverPrivKey,
      256
    )
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const authKeyBytes = b64urlToUint8(authKey);

  // HKDF to derive content encryption key and nonce
  const prk = await hkdfExtract(authKeyBytes, sharedSecret);
  const context = buildContext(serverPublicKeyRaw, b64urlToUint8(p256dh));

  const cekInfo = concat(new TextEncoder().encode("Content-Encoding: aesgcm\0"), context);
  const nonceInfo = concat(new TextEncoder().encode("Content-Encoding: nonce\0"), context);

  const saltPrk = await hkdfExtract(salt, prk);
  const cek = await hkdfExpand(saltPrk, cekInfo, 16);
  const nonce = await hkdfExpand(saltPrk, nonceInfo, 12);

  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const encoded = new TextEncoder().encode(payload);
  // Padding: 2 bytes zero padding length + payload
  const padded = new Uint8Array(2 + encoded.length);
  padded.set(encoded, 2);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded));

  return { ciphertext, salt, serverPublicKey: serverPublicKeyRaw };
}

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, ikm));
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const t = new Uint8Array(await crypto.subtle.sign("HMAC", key, concat(info, new Uint8Array([1]))));
  return t.slice(0, length);
}

function buildContext(serverPublic: Uint8Array, receiverPublic: Uint8Array): Uint8Array {
  const label = new TextEncoder().encode("P-256\0");
  const sLen = new Uint8Array(2);
  new DataView(sLen.buffer).setUint16(0, serverPublic.length);
  const rLen = new Uint8Array(2);
  new DataView(rLen.buffer).setUint16(0, receiverPublic.length);
  return concat(label, sLen, serverPublic, rLen, receiverPublic);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

async function sendPush(sub: { endpoint: string; p256dh: string; auth_key: string }, title: string, body: string, url = "/") {
  const payload = JSON.stringify({ title, body, url, icon: "/icon-192x192.png", badge: "/icon-96x96.png" });
  const { ciphertext, salt, serverPublicKey } = await encryptPayload(sub.p256dh, sub.auth_key, payload);

  const authHeader = await makeVapidAuthHeader(sub.endpoint);

  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aesgcm",
      Encryption: `salt=${uint8ToB64url(salt)}`,
      "Crypto-Key": `dh=${uint8ToB64url(serverPublicKey)};vapid=${VAPID_PUBLIC_KEY}`,
      TTL: "86400",
    },
    body: ciphertext,
  });

  return res.status;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY not set" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "IK Finance <notificacoes@ikfinance.app>",
      to: [to],
      subject,
      html,
    }),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const body = await req.json() as {
      titulo: string;
      corpo: string;
      tipo?: "transaction" | "cofre" | "negocio" | "patrimonio" | "meta";
      url?: string;
    };

    const { titulo, corpo, url = "/" } = body;

    // Load preferences
    const { data: prefs } = await supabaseAdmin
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const results: { push: number[]; email: boolean } = { push: [], email: false };

    // ── Push ─────────────────────────────────────────────────────────────────
    if (!prefs || prefs.push_enabled) {
      const { data: subs } = await supabaseAdmin
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth_key")
        .eq("user_id", user.id);

      if (subs?.length) {
        for (const sub of subs) {
          const status = await sendPush(sub, titulo, corpo, url);
          results.push.push(status);
          // Remove stale subscriptions (410 Gone or 404)
          if (status === 410 || status === 404) {
            await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
        }
      }
    }

    // ── Email ────────────────────────────────────────────────────────────────
    if (prefs?.email_enabled && user.email) {
      const html = `
        <!DOCTYPE html>
        <html lang="pt">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><title>${titulo}</title></head>
        <body style="margin:0;padding:0;background:#0f172a;font-family:system-ui,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 16px;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;max-width:560px;width:100%;">
                <tr>
                  <td style="background:linear-gradient(135deg,#059669,#10b981);padding:28px 32px;">
                    <p style="margin:0;color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">IK Finance</p>
                    <p style="margin:6px 0 0;color:#a7f3d0;font-size:13px;">Gestor Financeiro Inteligente</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <h2 style="margin:0 0 12px;color:#f1f5f9;font-size:18px;font-weight:600;">${titulo}</h2>
                    <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">${corpo}</p>
                    <a href="${Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "") ?? "#"}"
                       style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;">
                      Abrir IK Finance
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 32px 24px;border-top:1px solid #334155;">
                    <p style="margin:0;color:#475569;font-size:12px;">Esta é uma notificação automática do IK Finance. Você pode desativar notificações nas configurações do app.</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `;
      const emailResult = await sendEmail(user.email, titulo, html);
      results.email = emailResult.ok;
    }

    // ── Log ──────────────────────────────────────────────────────────────────
    await supabaseAdmin.from("notification_log").insert({
      user_id: user.id,
      tipo: "in_app",
      titulo,
      corpo,
      lida: false,
    });

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-notification]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
