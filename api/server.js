/**
 * Express API server for GyandootNova.
 * Mounts all 43 ported Supabase Edge Functions as /api/<function-name> routes.
 */
import express from "express";
import cors from "cors";
import { wrapHandler } from "./adapter.js";

// Import all function handlers
import createOrder from "./functions/create-order.js";
import verifyPayment from "./functions/verify-payment.js";
import generateInvoice from "./functions/generate-invoice.js";
import adminUsers from "./functions/admin-users.js";
import adminOtpSend from "./functions/admin-otp-send.js";
import adminOtpVerify from "./functions/admin-otp-verify.js";
import adminDataExport from "./functions/admin-data-export.js";
import claimFreeBook from "./functions/claim-free-book.js";
import getBookFileUrl from "./functions/get-book-file-url.js";
import agentArticle from "./functions/agent-article.js";
import agentArticles from "./functions/agent-articles.js";
import aiAsk from "./functions/ai-ask.js";
import aiProvidersManage from "./functions/ai-providers-manage.js";
import verseAnalyze from "./functions/verse-analyze.js";
import sendContactEmail from "./functions/send-contact-email.js";
import sendCouponEmail from "./functions/send-coupon-email.js";
import sendWelcomeEmail from "./functions/send-welcome-email.js";
import trackEvent from "./functions/track-event.js";
import trackVisit from "./functions/track-visit.js";
import appErrorReport from "./functions/app-error-report.js";
import contentOriginalityCheck from "./functions/content-originality-check.js";
import otpProvidersManage from "./functions/otp-providers-manage.js";
import phoneOtpSend from "./functions/phone-otp-send.js";
import phoneOtpVerify from "./functions/phone-otp-verify.js";
import sitemap from "./functions/sitemap.js";
import mysqlSync from "./functions/mysql-sync.js";
import mcp from "./functions/mcp.js";
import seoBlogAgent from "./functions/seo-blog-agent.js";
import seoAutoRewrite from "./functions/seo-auto-rewrite.js";
import seoAutoRun from "./functions/seo-auto-run.js";
import seoDailyPublisher from "./functions/seo-daily-publisher.js";
import seoDailyReport from "./functions/seo-daily-report.js";
import seoDispatch from "./functions/seo-dispatch.js";
import seoEditorialAgent from "./functions/seo-editorial-agent.js";
import seoGscSync from "./functions/seo-gsc-sync.js";
import seoPostPublishHook from "./functions/seo-post-publish-hook.js";
import seoPrerenderData from "./functions/seo-prerender-data.js";
import seoQueueTopup from "./functions/seo-queue-topup.js";
import seoRankOptimizer from "./functions/seo-rank-optimizer.js";
import seoSocialCaptions from "./functions/seo-social-captions.js";
import seoAgentHealthReport from "./functions/seo-agent-health-report.js";
import seoBookKbRefresh from "./functions/seo-book-kb-refresh.js";
import submitSitemapGsc from "./functions/submit-sitemap-gsc.js";

const app = express();

// Middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "authorization", "x-client-info", "apikey", "content-type",
    "x-cron-secret", "x-supabase-client-platform",
    "x-supabase-client-platform-version",
    "x-supabase-client-runtime",
    "x-supabase-client-runtime-version",
  ],
}));
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "gyandootnova-api", timestamp: new Date().toISOString() });
});

// Mount all function handlers
const routes = [
  // Payment
  ["create-order", createOrder],
  ["verify-payment", verifyPayment],
  ["generate-invoice", generateInvoice],
  // Auth & Admin
  ["admin-users", adminUsers],
  ["admin-otp-send", adminOtpSend],
  ["admin-otp-verify", adminOtpVerify],
  ["admin-data-export", adminDataExport],
  ["claim-free-book", claimFreeBook],
  // Books
  ["get-book-file-url", getBookFileUrl],
  ["agent-article", agentArticle],
  ["agent-articles", agentArticles],
  // AI
  ["ai-ask", aiAsk],
  ["ai-providers-manage", aiProvidersManage],
  ["verse-analyze", verseAnalyze],
  // Email
  ["send-contact-email", sendContactEmail],
  ["send-coupon-email", sendCouponEmail],
  ["send-welcome-email", sendWelcomeEmail],
  // Tracking
  ["track-event", trackEvent],
  ["track-visit", trackVisit],
  ["app-error-report", appErrorReport],
  // Admin tools
  ["content-originality-check", contentOriginalityCheck],
  ["otp-providers-manage", otpProvidersManage],
  ["phone-otp-send", phoneOtpSend],
  ["phone-otp-verify", phoneOtpVerify],
  // SEO
  ["seo-blog-agent", seoBlogAgent],
  ["seo-auto-rewrite", seoAutoRewrite],
  ["seo-auto-run", seoAutoRun],
  ["seo-daily-publisher", seoDailyPublisher],
  ["seo-daily-report", seoDailyReport],
  ["seo-dispatch", seoDispatch],
  ["seo-editorial-agent", seoEditorialAgent],
  ["seo-gsc-sync", seoGscSync],
  ["seo-post-publish-hook", seoPostPublishHook],
  ["seo-prerender-data", seoPrerenderData],
  ["seo-queue-topup", seoQueueTopup],
  ["seo-rank-optimizer", seoRankOptimizer],
  ["seo-social-captions", seoSocialCaptions],
  ["seo-agent-health-report", seoAgentHealthReport],
  ["seo-book-kb-refresh", seoBookKbRefresh],
  ["submit-sitemap-gsc", submitSitemapGsc],
  // Misc
  ["sitemap", sitemap],
  ["mysql-sync", mysqlSync],
  ["mcp", mcp],
];

for (const [name, handler] of routes) {
  const wrapped = wrapHandler(handler);
  app.all(`/api/${name}`, wrapped);
  // Also handle OPTIONS preflight
  app.options(`/api/${name}`, (req, res) => res.sendStatus(204));
}

// 404 for unknown API routes
app.use("/api/*path", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

export default app;
