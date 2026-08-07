// Generates a PDF invoice for a user's own purchase.
// Auth-required: verifies JWT and only returns invoices for the caller's own purchases.
// Reads customizable branding (business name, address, GSTIN, PAN, logo, footer) from public.settings.
// Supports ?preview=1 to serve inline for on-screen preview.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { jsPDF } from "npm:jspdf@2.5.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;
    const userEmail = userData.user.email ?? "";

    const url = new URL(req.url);
    const purchaseId = url.searchParams.get("purchase_id");
    const preview = url.searchParams.get("preview") === "1";
    if (!purchaseId) return json({ error: "purchase_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: purchase, error: pErr } = await admin
      .from("purchases")
      .select("id, user_id, book_id, razorpay_payment_id, razorpay_order_id, status, created_at, amount, currency, coupon_id")
      .eq("id", purchaseId)
      .eq("user_id", userId)
      .maybeSingle();

    if (pErr || !purchase) return json({ error: "Purchase not found" }, 404);
    if (purchase.status !== "completed") {
      return json({ error: "Invoice available only for completed purchases" }, 400);
    }

    const settingKeys = [
      "invoice_business_name",
      "invoice_business_address",
      "invoice_gstin",
      "invoice_pan",
      "invoice_logo_url",
      "invoice_footer_note",
    ];
    const [{ data: book }, { data: profile }, { data: coupon }, { data: settingsRows }] = await Promise.all([
      admin.from("books").select("title, author, price").eq("id", purchase.book_id).maybeSingle(),
      admin.from("profiles").select("display_name").eq("user_id", userId).maybeSingle(),
      purchase.coupon_id
        ? admin.from("coupons").select("code, discount_type, discount_value").eq("id", purchase.coupon_id).maybeSingle()
        : Promise.resolve({ data: null }),
      admin.from("settings").select("key, value").in("key", settingKeys),
    ]);

    const settings: Record<string, string> = {};
    (settingsRows ?? []).forEach((r: { key: string; value: string | null }) => {
      settings[r.key] = (r.value ?? "").trim();
    });

    // Fetch logo (best-effort) so we can embed it in the PDF.
    // Fallback to the same logo the website header uses so the invoice always
    // carries the brand mark even if admin hasn't uploaded a custom one.
    const SITE_LOGO_URL =
      "https://gyandootnova.in/__l5e/assets-v1/ea5dc66e-3ee7-4103-9ee8-c0c6f7f147a5/logo.jpeg";
    const logoSource = settings.invoice_logo_url || SITE_LOGO_URL;
    let logoDataUrl: string | null = null;
    try {
      const resp = await fetch(logoSource);
      if (resp.ok) {
        const ct = resp.headers.get("content-type") ?? "image/png";
        const buf = new Uint8Array(await resp.arrayBuffer());
        logoDataUrl = `data:${ct};base64,${base64Encode(buf)}`;
      }
    } catch {
      logoDataUrl = null;
    }

    const pdf = buildInvoicePdf({
      purchase,
      book,
      buyerName: profile?.display_name ?? userEmail.split("@")[0] ?? "Customer",
      buyerEmail: userEmail,
      coupon,
      settings,
      logoDataUrl,
    });

    const bytes = pdf.output("arraybuffer");
    const invoiceNo = makeInvoiceNumber(purchase.id, purchase.created_at);

    return new Response(bytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="${invoiceNo}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("generate-invoice error:", err);
    return json({ error: (err as Error).message ?? "Internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64Encode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  // deno-lint-ignore no-explicit-any
  return (globalThis as any).btoa(binary);
}

function makeInvoiceNumber(purchaseId: string, createdAt: string) {
  const year = new Date(createdAt).getFullYear();
  const suffix = purchaseId.replace(/-/g, "").slice(-8).toUpperCase();
  return `GN-${year}-${suffix}`;
}

function currencySymbol(code: string) {
  if (code === "INR") return "Rs. ";
  if (code === "USD") return "$";
  if (code === "EUR") return "EUR ";
  if (code === "GBP") return "GBP ";
  return `${code} `;
}

function buildInvoicePdf({
  purchase,
  book,
  buyerName,
  buyerEmail,
  coupon,
  settings,
  logoDataUrl,
}: {
  purchase: any;
  book: any;
  buyerName: string;
  buyerEmail: string;
  coupon: any;
  settings: Record<string, string>;
  logoDataUrl: string | null;
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const currency = purchase.currency || "INR";
  const sym = currencySymbol(currency);
  const amount = Number(purchase.amount ?? book?.price ?? 0);
  const invoiceNo = makeInvoiceNumber(purchase.id, purchase.created_at);
  const dateStr = new Date(purchase.created_at).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

  const businessName = settings.invoice_business_name || "GyandootNova";
  const businessAddress = settings.invoice_business_address || "";
  const gstin = settings.invoice_gstin || "";
  const pan = settings.invoice_pan || "";
  const footerNote = settings.invoice_footer_note || "Thank you for supporting original scriptures. — GyandootNova";

  // Brand colours (match the site's deep spiritual red)
  const BRAND: [number, number, number] = [183, 28, 28];
  const BRAND_SOFT: [number, number, number] = [252, 245, 240];
  const INK: [number, number, number] = [30, 30, 30];
  const MUTED: [number, number, number] = [110, 110, 110];

  // ---------- Top brand band ----------
  const bandH = 96;
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageW, bandH, "F");

  // Logo (square, aspect-preserved)
  const logoSize = 60;
  const logoX = margin;
  const logoY = (bandH - logoSize) / 2;
  if (logoDataUrl) {
    try {
      // white rounded plate behind logo for contrast against brand band
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(logoX - 6, logoY - 6, logoSize + 12, logoSize + 12, 8, 8, "F");
      const fmt = logoDataUrl.startsWith("data:image/jpeg") || logoDataUrl.startsWith("data:image/jpg") ? "JPEG" : "PNG";
      doc.addImage(logoDataUrl, fmt, logoX, logoY, logoSize, logoSize, undefined, "FAST");
    } catch { /* ignore */ }
  }

  const textLeft = logoX + logoSize + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(businessName, textLeft, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(255, 240, 235);
  doc.text("Original spiritual scriptures  •  gyandootnova.in", textLeft, 62);

  // Right side of band: TAX INVOICE label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("TAX INVOICE", pageW - margin, 46, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(255, 240, 235);
  doc.text(`Invoice #  ${invoiceNo}`, pageW - margin, 62, { align: "right" });
  doc.text(`Date  ${dateStr}`, pageW - margin, 76, { align: "right" });

  // ---------- Business + Bill To cards ----------
  const cardsTop = bandH + 28;
  const colW = (pageW - margin * 2 - 20) / 2;

  // From card
  doc.setFillColor(...BRAND_SOFT);
  doc.roundedRect(margin, cardsTop, colW, 110, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND);
  doc.text("FROM", margin + 14, cardsTop + 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(businessName, margin + 14, cardsTop + 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  let fy = cardsTop + 48;
  if (businessAddress) {
    const wrapped = doc.splitTextToSize(businessAddress, colW - 28);
    doc.text(wrapped, margin + 14, fy);
    fy += wrapped.length * 11;
  }
  doc.text("amrendra8765@gmail.com", margin + 14, fy); fy += 11;
  if (gstin) { doc.text(`GSTIN: ${gstin}`, margin + 14, fy); fy += 11; }
  if (pan) { doc.text(`PAN: ${pan}`, margin + 14, fy); fy += 11; }

  // Bill To card
  const billX = margin + colW + 20;
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(billX, cardsTop, colW, 110, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND);
  doc.text("BILL TO", billX + 14, cardsTop + 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(buyerName, billX + 14, cardsTop + 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(buyerEmail, billX + 14, cardsTop + 48);
  if (purchase.razorpay_payment_id) {
    doc.text(`Payment ID: ${purchase.razorpay_payment_id}`, billX + 14, cardsTop + 62);
  }
  if (purchase.razorpay_order_id) {
    doc.text(`Order ID: ${purchase.razorpay_order_id}`, billX + 14, cardsTop + 76);
  }

  // ---------- Line items ----------
  const tableTop = cardsTop + 140;
  doc.setFillColor(...BRAND);
  doc.rect(margin, tableTop, pageW - margin * 2, 28, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("DESCRIPTION", margin + 14, tableTop + 18);
  doc.text("QTY", pageW - margin - 180, tableTop + 18, { align: "right" });
  doc.text("AMOUNT", pageW - margin - 14, tableTop + 18, { align: "right" });

  const rowY = tableTop + 52;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  const title = book?.title ?? "Digital Book";
  const author = book?.author ? ` by ${book.author}` : "";
  const wrapped = doc.splitTextToSize(`${title}${author}`, pageW - margin * 2 - 220);
  doc.text(wrapped, margin + 14, rowY);
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("Digital eBook  •  lifetime access", margin + 14, rowY + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text("1", pageW - margin - 180, rowY, { align: "right" });
  doc.text(
    `${sym}${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    pageW - margin - 14, rowY, { align: "right" },
  );

  // ---------- Totals ----------
  const totalsBoxTop = rowY + 44;
  doc.setDrawColor(230);
  doc.setLineWidth(0.6);
  doc.line(margin, totalsBoxTop, pageW - margin, totalsBoxTop);

  let y = totalsBoxTop + 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text("Subtotal", pageW - margin - 140, y, { align: "right" });
  doc.setTextColor(...INK);
  doc.text(
    `${sym}${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    pageW - margin - 14, y, { align: "right" },
  );

  if (coupon) {
    y += 16;
    doc.setTextColor(...MUTED);
    doc.text(`Coupon (${coupon.code})`, pageW - margin - 140, y, { align: "right" });
    doc.setTextColor(...INK);
    doc.text("applied", pageW - margin - 14, y, { align: "right" });
  }

  // Total paid pill
  y += 30;
  doc.setFillColor(...BRAND);
  doc.roundedRect(pageW - margin - 260, y - 20, 260, 34, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 240, 235);
  doc.text("TOTAL PAID", pageW - margin - 250, y + 2);
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `${sym}${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    pageW - margin - 14, y + 2, { align: "right" },
  );

  // ---------- Notes ----------
  const notesY = y + 60;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text("Notes", margin, notesY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const notes = [
    "This is a computer-generated invoice for a digital publication and does not require a signature.",
    "Digital goods are non-refundable once access to the content has been granted.",
    "For any billing questions, contact amrendra8765@gmail.com with the Invoice # above.",
  ];
  const wrappedNotes = doc.splitTextToSize(notes.join("\n"), pageW - margin * 2);
  doc.text(wrappedNotes, margin, notesY + 16);

  // ---------- Footer ----------
  doc.setFillColor(...BRAND_SOFT);
  doc.rect(0, pageH - 46, pageW, 46, "F");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND);
  const footerWrapped = doc.splitTextToSize(footerNote, pageW - margin * 2);
  doc.text(footerWrapped, pageW / 2, pageH - 26, { align: "center" });

  return doc;
}
