# Gabriel Academics — Production Setup Guide

**The Academic Uber. Clients and consultants never meet. You are the centre.**

---

## What You Have

| File | Purpose |
|------|---------|
| `index.html` | Complete single-file production app (Admin + Client + Consultant portals) |
| `schema.sql` | Full Supabase database schema with RLS anonymisation firewall |
| `README.md` | This guide |

---

## Step 1 — Apply the Database Schema

1. Go to your Supabase dashboard: **https://supabase.com/dashboard/project/vgxjikgmttwflqxezbxd**
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open `schema.sql`, copy the entire contents, paste it in
5. Click **Run** (or press Ctrl+Enter)
6. You should see: `Success. No rows returned`

> If you get an error about a table already existing, run `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` first, then re-run the schema.

---

## Step 2 — Create Your Admin Account

1. Open the app (locally or deployed — see Step 3)
2. Click **Register**
3. Fill in your details — **select "Client"** for now (you'll fix the role in Step 4)
4. Use: `admin@gabrielacademics.co.za` or your preferred admin email
5. Check your email and click the verification link

### Fix your role to Admin

1. Go back to Supabase → **Table Editor** → `profiles`
2. Find your row
3. Change `role` from `client` to `admin`
4. Change `masked_id` to `ADM-001`
5. Set `is_verified` to `true`
6. Click **Save**

Now sign in — you will land on the full Admin Command Centre.

---

## Step 3 — Deploy to Cloudflare Pages (Recommended — Free)

### Option A: Drag & Drop (Fastest — 2 minutes)

1. Go to **https://pages.cloudflare.com**
2. Click **Create a project** → **Upload assets**
3. Name it: `gabriel-academics`
4. Drag and drop `index.html`
5. Click **Deploy**
6. Your app is live at: `gabriel-academics.pages.dev`

### Option B: Custom Domain

After deploying to Cloudflare Pages:
1. Go to your project → **Custom Domains**
2. Add: `app.gabrielacademics.co.za` (or `portal.gabrielacademics.co.za`)
3. Follow the DNS instructions (add CNAME record in your domain registrar)

### Option C: Netlify Drop

1. Go to **https://app.netlify.com/drop**
2. Drag `index.html` onto the page
3. Done — you get a free `.netlify.app` URL instantly

---

## Step 4 — Configure Supabase Auth

### Allow your domain in Supabase

1. Go to Supabase → **Authentication** → **URL Configuration**
2. Under **Site URL** add your deployed URL: `https://gabriel-academics.pages.dev`
3. Under **Redirect URLs** add: `https://gabriel-academics.pages.dev/**`
4. Click **Save**

### Email verification (optional — disable for easy testing)

1. Go to Supabase → **Authentication** → **Providers** → **Email**
2. Toggle **Confirm email** OFF for testing, ON for production
3. Click **Save**

---

## Step 5 — Enable Realtime (for live notifications)

1. Go to Supabase → **Database** → **Replication**
2. Enable realtime for: `jobs`, `messages`, `notifications`
3. This makes job status updates and messages appear live without page refresh

---

## Step 6 — Share the Portals

Everyone uses the **same URL** — the app detects their role from the database after login.

| Who | What they see after login |
|-----|--------------------------|
| You (Admin) | Full command centre — all jobs, all people, finances, QA |
| Client | Their orders only — can submit requests, track, message you |
| Consultant | Available jobs board — can accept, submit, earn |

### Onboarding clients
- Send them your URL
- They click **Register** → select **"I need academic assistance"**
- After signup, they can immediately submit a request

### Onboarding consultants
- Send them your URL
- They click **Register** → select **"I provide academic work"**
- They enter their qualification and subjects
- After signup, **you must verify them** in Admin → Consultants → click "Verify"
- Only verified consultants appear as active

---

## How the Job Flow Works

```
CLIENT submits request
        ↓
ADMIN receives notification → reviews → sets rate → posts to board
        ↓
CONSULTANTS see anonymised brief → accept or pass
        ↓
CONSULTANT works on assignment → submits file URL for QA
        ↓
ADMIN reviews submission → Pass QA (delivers to client) or Fail (returns to consultant)
        ↓
CLIENT receives delivery notification → downloads work → rates (anonymous)
        ↓
ADMIN releases payout to consultant (escrow → paid)
```

**At no point do client and consultant ever see each other's identity.**

---

## Payment Integration (Next Step)

The app currently tracks payments manually. To add real payment collection:

### PayFast (South Africa)
1. Sign up at **payfast.co.za**
2. Get your Merchant ID and Key
3. Add a PayFast payment button to the New Request form
4. PayFast posts payment confirmation to your webhook
5. Your webhook updates the `payments` table to `cleared`

### Ozow (EFT — South Africa)
- Best for EFT payments
- Sign up at **ozow.com**
- Similar webhook integration

### Manual (Current)
- Client pays you via EFT to your business account
- You log the payment in Admin → Payments → mark as Cleared
- Job then moves forward

---

## Admin Quick Reference

| Action | Where |
|--------|-------|
| Post a job manually | Dashboard → Post Job button |
| Approve a consultant | Stakeholders → Consultants → Verify |
| Review submitted work | Quality → QA Review |
| Release consultant payout | Finances → Payouts → Release |
| See full pipeline | Command → Pipeline |
| Change consultant rate on a job | View job → edit rate field |
| Mark payment cleared | Finances → Payments In → Clear |

---

## Security Notes

- **Row Level Security is ON** — enforced at database level, not just app level
- A client logging in **cannot query consultant data** even with browser dev tools
- A consultant logging in **cannot query client data** even directly via Supabase API
- All cross-party anonymisation is enforced in the PostgreSQL RLS policies
- Admin is the **only role** with full SELECT across all tables

---

## Customisation

### Change brand name
Search `Gabriel Academics` in `index.html` and replace with your preferred display name.

### Change default consultant rate
In `renderSettings()` or directly in the Post Job modal, change `value="60"` to your preferred default.

### Add more subjects
In the subject dropdowns, add/remove `<option>` items to match your offering.

### Add a logo
Replace the `GA` text in `.brand-mark` and `.auth-logo-mark` with an `<img>` tag pointing to your logo URL.

---

## Support

Built by Claude for George — Gabriel Academics Platform v1.0
Supabase Project: `vgxjikgmttwflqxezbxd`
