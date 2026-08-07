# 🏛️ GyandootNova — Architecture Overview

Yeh document project ke **Frontend** aur **Backend** ko clearly separate karke explain karta hai. Code physically same repository me hai (Lovable platform requirement), lekin logically dono layers fully separated hain.

---

## 📐 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         USER (Browser)                       │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (src/)                            │
│   React 18 + Vite 5 + TypeScript + Tailwind CSS              │
│   - UI Components, Pages, Routing, State Management          │
└───────────────────────────┬─────────────────────────────────┘
                            │ Supabase JS SDK / fetch
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (supabase/)                             │
│   Lovable Cloud (Supabase) — Managed Backend                 │
│                                                              │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│   │  PostgreSQL  │  │ Edge Funcs   │  │  Auth & Storage  │  │
│   │  (Database)  │  │ (Deno)       │  │                  │  │
│   └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES                               │
│   Razorpay • PayPal • Resend • Lovable AI Gateway            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 FRONTEND — `src/`

Pure client-side React application. **Koi business logic nahi**, sirf UI rendering aur backend calls.

### Folder Structure

| Folder | Purpose |
|---|---|
| `src/pages/` | Route-level pages (Home, BookDetail, Profile, Admin, etc.) |
| `src/components/` | Reusable UI components (cards, dialogs, forms, layout) |
| `src/components/ui/` | shadcn/ui primitive components (Button, Input, etc.) |
| `src/components/layout/` | Header, Footer, Layout wrappers |
| `src/hooks/` | Custom React hooks (useAuth, useReferralCapture, etc.) |
| `src/lib/` | Utility functions (formatters, validators, helpers) |
| `src/integrations/supabase/` | **Auto-generated** Supabase client + DB types (DO NOT EDIT) |
| `src/assets/` | Static images, fonts |
| `src/index.css` | Design tokens, Tailwind base styles |

### Frontend Responsibilities
- ✅ Render UI
- ✅ Handle user input & validation (client-side)
- ✅ Manage local/UI state
- ✅ Call backend via Supabase SDK or `supabase.functions.invoke()`
- ✅ SEO meta tags, routing
- ❌ Never store secrets
- ❌ Never run business logic that affects payments/permissions

---

## 🔧 BACKEND — `supabase/`

Managed by **Lovable Cloud** (Supabase under the hood). All server-side logic lives here.

### Folder Structure

| Folder | Purpose |
|---|---|
| `supabase/functions/` | Deno-based Edge Functions (serverless API endpoints) |
| `supabase/migrations/` | SQL migrations (schema, RLS policies, DB functions) |
| `supabase/config.toml` | Supabase project configuration |

### Edge Functions (`supabase/functions/`)

| Function | Purpose | Auth |
|---|---|---|
| `admin-users/` | Admin user management (list, role changes) | Admin only |
| `ai-ask/` | GYANDOOTNOVA AI assistant (Hindu scripture Q&A) | Authenticated |
| `claim-free-book/` | Claim free books for users | Authenticated |
| `create-order/` | Create payment orders (Razorpay/PayPal) | Authenticated |
| `verify-payment/` | Verify payment signatures, mark purchase complete | Authenticated |
| `get-book-file-url/` | Generate signed URL for book PDF (secure reader) | Purchase verified |
| `send-contact-email/` | Send contact form via Resend | Public |
| `send-coupon-email/` | Send coupon codes via Resend | Admin |
| `send-welcome-email/` | Welcome email on signup | Trigger |
| `sitemap/` | Generate dynamic sitemap.xml for SEO | Public |

### Database Layer (PostgreSQL)

**Tables:** `profiles`, `books`, `purchases`, `donations`, `coupons`, `coupon_books`, `user_roles`, `posts`, `referrals`, etc.

**Security:** Row Level Security (RLS) enforced on every table. Roles stored in separate `user_roles` table (never on profiles). Privilege checks via `has_role()` security-definer function.

**Key DB Functions:**
- `has_role(user_id, role)` — Role check
- `has_purchased_book(user_id, book_id)` — Purchase verification
- `apply_coupon(code, amount, book_id)` — Coupon validation & discount calc
- `handle_new_user()` — Auto-create profile on signup

### Storage Buckets
| Bucket | Public | Use |
|---|---|---|
| `book-covers` | ✅ | Book cover images |
| `post-images` | ✅ | Blog post images |
| `book-files` | ❌ | PDF files (signed URLs only) |

### Backend Responsibilities
- ✅ All business logic (payments, permissions, pricing)
- ✅ Database queries via RLS-protected APIs
- ✅ Secret management (Razorpay, PayPal, Resend, AI keys)
- ✅ Server-side validation (Zod schemas in edge functions)
- ✅ Email dispatch
- ✅ AI gateway calls
- ❌ Never trust client input without validation

---

## 🔐 Security Boundary

| Concern | Frontend | Backend |
|---|---|---|
| Secrets / API keys | ❌ Never | ✅ Supabase Secrets |
| Payment verification | ❌ Display only | ✅ `verify-payment` |
| Role/permission checks | ✅ UI hint only | ✅ RLS + `has_role()` enforces |
| Book PDF access | ❌ No direct URL | ✅ Signed URL via edge function |
| Price calculation | ❌ Display only | ✅ `apply_coupon()` DB function |

**Golden Rule:** Frontend ke checks sirf UX ke liye hain. Real security backend (RLS + edge functions) me enforce hoti hai.

---

## 🔄 Data Flow Examples

### Example 1: User Buys a Book
```
1. [FE] User clicks "Buy" on BookDetail page
2. [FE] Calls supabase.functions.invoke('create-order', { book_id, coupon })
3. [BE] create-order validates user, applies coupon (DB function), creates Razorpay order
4. [FE] Razorpay checkout opens
5. [FE] On success → invoke('verify-payment', { signature, order_id })
6. [BE] verify-payment validates signature, inserts purchase row, increments count
7. [FE] Redirects to reader
```

### Example 2: User Asks AI a Question
```
1. [FE] User types question in AskScripture component (BookDetail page)
2. [FE] Sends to edge function 'ai-ask' with auth token
3. [BE] ai-ask validates JWT, checks Hindu-religion context filter
4. [BE] Calls Lovable AI Gateway (google/gemini-2.5-flash) with system prompt
5. [BE] Returns trusted-source response
6. [FE] Renders streamed answer in chat
```

---

## 🚀 Deployment

| Layer | Deployed To | How |
|---|---|---|
| Frontend | Lovable CDN | Auto on every code push |
| Edge Functions | Supabase (Deno Deploy) | Auto on save |
| Database Migrations | Supabase Postgres | Via `supabase--migration` tool |
| Static Assets | Lovable CDN | Bundled with frontend |

**Live URLs:**
- Production: https://gyandootnova.in
- Lovable: https://gyandoot-reader-forge.lovable.app

---

## 📝 Why Code Lives in One Repo

Lovable platform requires `package.json`, `vite.config.ts`, `index.html` at the **root**, and Supabase CLI requires `supabase/` at the root. Physically separating into `frontend/` and `backend/` folders would break the auto-deploy pipeline.

**Logical separation is what matters** — and it's strictly enforced:
- Frontend never imports from `supabase/functions/`
- Backend never imports from `src/`
- The only contract between them is: **Supabase SDK calls** + **edge function HTTP endpoints**

This is the same pattern used by Vercel + Next.js API routes, SvelteKit, Remix — modern full-stack frameworks colocate code but keep clear logical boundaries.
