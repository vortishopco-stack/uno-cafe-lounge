# ☕ Uno Cafe' Lounge — Loyalty & Rewards Platform

A complete, production-ready restaurant loyalty platform for **Uno Cafe' Lounge**.
Customers earn points on visits, play mini-games, complete missions, and redeem rewards.
Staff manage customers, visits, and redemptions. Admins manage everything.

Built with **Next.js 16 + Supabase**, configured for **GitHub Pages** static deployment.

---

## ✨ Features

- **Customer app**: points dashboard, daily sign-in streaks, menu browsing (no login needed), 3 arcade games, missions, rewards store, visit history
- **Employee portal**: search customers by phone, add visits, redeem rewards on behalf of customers
- **Admin panel**: analytics, menu management (with image upload), rewards CRUD, missions, settings (points per $, game costs, cooldowns)
- **Configurable game winnings**: admin sets how many points players win at each score level for Cup Catch & Bean Shooter (editable win tiers)
- **Configurable prize wheel**: admin edits the label, point value, and color of every segment on the Lounge Wheel — with live preview
- **Bilingual**: English + Arabic with full RTL support
- **Staff-only redemption**: only employees/admins can redeem rewards (customers see an "ask staff" badge)
- **Public menu**: anyone can browse the menu without signing in
- **Mobile-first** responsive design with sticky footer

---

## 📦 What's in this ZIP

```
uno-cafe-lounge/
├── .github/workflows/deploy.yml   # GitHub Pages auto-deploy workflow
├── .gitignore
├── README.md                       # <- you are here
├── package.json                    # Dependencies (run: bun install)
├── bun.lock                        # Locked versions (for bun install --frozen-lockfile)
├── next.config.ts                  # Static export config for GitHub Pages
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── components.json
├── public/
│   ├── logo.svg                    # Uno Cafe coffee cup logo
│   └── robots.txt
├── src/
│   ├── app/                        # Next.js app (page.tsx, layout.tsx, globals.css)
│   ├── components/                 # All UI + dashboard + games + admin components
│   ├── lib/                        # Supabase client, API, i18n, utils
│   ├── store/                      # Zustand state
│   └── hooks/                      # React hooks
└── supabase/
    ├── schema.sql                  # <- Run this first (tables + Uno Cafe menu/rewards)
    ├── seed.sql                    # <- Run this second (demo users)
    └── uno-cafe-seed.sql           # Standalone menu/rewards (for existing projects)
```

---

## 🚀 Deploy to GitHub Pages — Full Guide

### Prerequisites

- A **GitHub** account (free)
- A **Supabase** account (free tier is fine) — [supabase.com](https://supabase.com)
- **Node.js 18+** installed locally (only needed if you want to test locally)

---

### Step 1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → sign in → **New Project**
2. Name it `uno-cafe-lounge` (or anything you like)
3. Set a database password and pick a region close to you
4. Wait ~2 minutes for it to provision

---

### Step 2 — Get your API keys

1. In your Supabase project, go to **Project Settings** (gear icon) → **API**
2. Copy these two values — you'll need them later:
   - **Project URL**: `https://xxxxxxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOi...` (a long JWT string)

---

### Step 3 — Run the database schema

1. In Supabase, open **SQL Editor** (left sidebar) → **New query**
2. Open the file `supabase/schema.sql` from this ZIP
3. Copy the **entire contents** and paste it into the SQL Editor
4. Click **Run** — this creates all tables, RLS policies, functions, and seeds your menu + rewards (24 cafe items + 12 rewards)

---

### Step 4 — Create demo users (optional but recommended)

1. In Supabase, go to **Authentication** → **Providers** → **Email**
2. Turn **OFF** "Confirm email" → **Save**
3. Back in **SQL Editor** → **New query**
4. Open `supabase/seed.sql` from this ZIP, copy everything, paste, **Run**
5. This creates 4 demo accounts:

| Role     | Phone    | Password   |
|----------|----------|------------|
| Admin    | `000000` | `admin123` |
| Employee | `111111` | `emp123`   |
| Customer | `123456` | `cust123`  |
| Customer | `654321` | `cust123`  |

> The SQL inserts directly into `auth.users`, so it must be run from the Supabase SQL Editor (not the psql CLI).

---

### Step 5 — Create the Storage bucket for menu images

1. In Supabase, go to **Storage** (left sidebar) → **New bucket**
2. Name: `menu-images`
3. Toggle **Public bucket** = ON (so menu images load without auth)
4. **Save**

> The RLS policies for this bucket are already in `schema.sql` (Step 3). Admins can upload; everyone can read.

---

### Step 6 — Push this code to GitHub

1. Go to [github.com](https://github.com) → **New repository**
2. Name it `uno-cafe-lounge` (or any name)
3. Set it to **Public** (GitHub Pages free tier requires public repos) — or **Pro** for private
4. **Don't** initialize with README/license (this ZIP already has files)
5. Unzip this ZIP locally, then:

```bash
cd uno-cafe-lounge
git init
git add .
git commit -m "Uno Cafe' Lounge - initial deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/uno-cafe-lounge.git
git push -u origin main
```

> Or use GitHub's web interface: **Add file -> Upload files** and drag the unzipped contents.

---

### Step 7 — Configure GitHub Secrets

Your repo needs 3 secrets for the deploy workflow to build with your Supabase credentials.

1. In your GitHub repo, go to **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
2. Add these three:

| Secret name | Value |
|-------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL (from Step 2) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon public key (from Step 2) |
| `NEXT_PUBLIC_BASE_PATH` | `/uno-cafe-lounge` <- your repo name, with a leading slash |

> **About `NEXT_PUBLIC_BASE_PATH`**: GitHub Pages serves your site at `https://USERNAME.github.io/REPO_NAME/`. The base path tells Next.js where to find its assets. Set it to `/your-repo-name`. If you later use a custom domain, set this to empty `""`.

---

### Step 8 — Enable GitHub Pages

1. In your GitHub repo, go to **Settings** → **Pages**
2. Under **Build and deployment** → **Source**, select **GitHub Actions**
3. That's it — the workflow in `.github/workflows/deploy.yml` will handle the rest

---

### Step 9 — Trigger the first deploy

1. Go to the **Actions** tab in your GitHub repo
2. You should see a workflow run named **"Deploy to GitHub Pages"** (triggered by your push)
3. Wait ~3-5 minutes for it to build
4. When it's done, go to **Settings -> Pages** → you'll see: **Your site is live at `https://USERNAME.github.io/uno-cafe-lounge/`**

🎉 **Done!** Click that link and your Uno Cafe' Lounge platform is live.

---

## 🧪 Test locally (optional)

```bash
cd uno-cafe-lounge
bun install

# Create a .env.local file with:
#   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

bun run dev
# Open http://localhost:3000
```

---

## 🌐 Custom domain (optional)

To use `unocafe.yourdomain.com` instead of the GitHub URL:

1. In your GitHub repo: **Settings -> Pages -> Custom domain** → enter `unocafe.yourdomain.com` → **Save**
2. At your DNS provider, add a **CNAME** record:
   - **Name/Host**: `unocafe` (or `www`)
   - **Value/Target**: `USERNAME.github.io`
3. Wait for DNS to propagate (5 min – 24 hrs)
4. Back in GitHub Pages settings, check **Enforce HTTPS**
5. **Important**: update the `NEXT_PUBLIC_BASE_PATH` GitHub secret to **empty** (no value), then re-trigger a deploy (push any commit or go to Actions → Run workflow). With a custom domain, the site lives at the root, so no base path is needed.

---

## 🔧 Customization

### Change the logo
Replace `public/logo.svg` with your own SVG (recommended 64x64, transparent background).

### Change brand colors
Edit the `:root` CSS variables in `src/app/globals.css`. The default theme is warm coffee/amber. See the file's comments for color presets.

### Edit menu & rewards
After deploying, sign in as admin (`000000` / `admin123`) → **Admin Panel** → Menu Management or Reward Management. You can add/edit/delete items, upload images, and toggle availability — no code changes needed.

### Edit game names
The games are internally named `burger_catch`, `coffee_shooter`, `grand_wheel` (kept for database compatibility). Display names are in `src/lib/i18n/locales/en.ts` and `ar.ts` — currently "Cup Catch", "Bean Shooter", "Lounge Wheel".

### Edit game winnings & prize wheel (no code needed)
After deploying, sign in as admin (`000000` / `admin123`) → **Admin Panel** → **Settings**:
- **Game Winnings Configuration** — for each skill game (Cup Catch, Bean Shooter), add/edit/remove win tiers. Each tier has a *Min. Score* and a *Reward (pts)*. Tiers are evaluated from highest to lowest — the first tier the player reaches decides their winnings.
- **Lounge Wheel Segments** — edit the *Label*, *Value (pts)*, and *Color* of every segment on the prize wheel. A live preview shows the wheel colors and values as you type. Players win the value of whatever segment the wheel lands on.

These settings are stored as JSON in the `app_settings` table (`game_tiers_burger_catch`, `game_tiers_coffee_shooter`, `grand_wheel_segments`) and are seeded with sane defaults in `schema.sql`. Each game falls back to built-in defaults if no admin config exists, so the app keeps working even before you save anything.

---

## 📋 Deployment checklist

- [ ] Supabase project created
- [ ] `schema.sql` run in Supabase SQL Editor
- [ ] `seed.sql` run (for demo users)
- [ ] Email confirmation disabled in Supabase Auth
- [ ] `menu-images` Storage bucket created (public)
- [ ] Code pushed to GitHub repo
- [ ] 3 GitHub Secrets set (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_BASE_PATH`)
- [ ] GitHub Pages source set to "GitHub Actions"
- [ ] First deploy succeeded
- [ ] Site opens at `https://USERNAME.github.io/uno-cafe-lounge/`
- [ ] Can log in with admin (`000000` / `admin123`)

---

## 🆘 Troubleshooting

**Blank page after deploy**
→ Check that `NEXT_PUBLIC_BASE_PATH` secret matches your repo name exactly (e.g. `/uno-cafe-lounge`). Re-run the workflow after fixing.

**"Supabase not configured" message**
→ The secrets aren't reaching the build. Verify all 3 secrets exist in GitHub Settings → Secrets. The workflow log will show if they're empty.

**Can't log in with demo accounts**
→ You skipped Step 4 (running `seed.sql`), or email confirmation is still ON. Re-check Authentication → Providers → Email.

**Menu images don't upload**
→ The `menu-images` Storage bucket wasn't created or isn't public. Re-do Step 5.

**404 on page refresh**
→ This is handled by the `404.html` SPA fallback in the workflow. If it still happens, ensure the workflow ran the "Add 404.html" step successfully.

---

## 📝 Tech stack

- **Framework**: Next.js 16 (App Router, static export)
- **Backend**: Supabase (Auth + PostgreSQL + Storage + RLS + RPC functions)
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York)
- **State**: Zustand
- **Icons**: Lucide
- **i18n**: Custom (English + Arabic, RTL-aware)
- **Deploy**: GitHub Pages via GitHub Actions

---

## 📄 License

This is your copy — modify and deploy freely for Uno Cafe' Lounge.

Enjoy your loyalty platform! ☕🎉
