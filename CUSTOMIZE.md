# 🎨 CUSTOMIZE.md — Rebranding Guide

> **Duplicate this app for any restaurant in under 30 minutes.**
>
> This guide covers every customization point, from a 2-minute name change
> to a full rebrand with new colors, logo, menu, and games.

---

## Table of Contents

1. [The 2-Minute Rebrand (Name & Tagline)](#1-the-2-minute-rebrand-name--tagline)
2. [Change the Logo](#2-change-the-logo)
3. [Change Brand Colors](#3-change-brand-colors)
4. [Menu Categories (No Code — Admin Panel)](#4-menu-categories-no-code--admin-panel)
5. [Menu Items & Prices (No Code — Admin Panel)](#5-menu-items--prices-no-code--admin-panel)
6. [Rewards Store (No Code — Admin Panel)](#6-rewards-store-no-code--admin-panel)
7. [Games: Show/Hide, Costs & Cooldowns (No Code — Admin Panel)](#7-games-showhide-costs--cooldowns-no-code--admin-panel)
8. [Points Settings (No Code — Admin Panel)](#8-points-settings-no-code--admin-panel)
9. [Sign-up Approval Workflow](#9-sign-up-approval-workflow)
10. [Languages & Translations](#10-languages--translations)
11. [Game Winnings & Wheel Segments](#11-game-winnings--wheel-segments)
12. [Full Cloning Checklist (New Restaurant)](#12-full-cloning-checklist-new-restaurant)
13. [File Reference — What Lives Where](#13-file-reference--what-lives-where)

---

## 1. The 2-Minute Rebrand (Name & Tagline)

**Edit one file:** `src/lib/brand.ts`

```ts
export const BRAND = {
  name: "Uno Cafe' Lounge",           // ← change to your restaurant name
  nameAr: "أونو كافيه لاونج",          // ← Arabic name (for RTL mode)
  tagline: 'Earn. Play. Reward.',      // ← your tagline
  taglineAr: 'اكسب. العب. استبدل.',     // ← Arabic tagline
  description: "Earn points, play...", // ← SEO meta description
  emailDomain: 'flavorpoints.local',   // ← internal (see note below)
  storageBucket: 'menu-images',        // ← must match schema.sql
} as const
```

This single file controls the restaurant name everywhere it appears:
- Browser tab title (SEO)
- Login screen header
- Employee portal header ("Uno Cafe' Lounge Staff")
- Admin panel header ("Uno Cafe' Lounge Management")
- Loading screen ("Loading Uno Cafe' Lounge...")
- Setup guide title

> **⚠️ `emailDomain` note:** This is an internal fake email domain used for
> phone-based login (Supabase Auth requires an email, but this app uses phone
> numbers). Users never see it. **Do not change it after going live** —
> existing customer accounts are keyed to it. For a brand-new deployment you
> can set it to anything, e.g. `yourrestaurant.local`.

After editing, rebuild and redeploy:
```bash
npm run build   # or: bun run build
```

---

## 2. Change the Logo

Replace the file `public/logo.svg` with your own logo.

**Requirements:**
- Format: SVG (recommended) or PNG
- Size: 64×64 px (or any square ratio; it scales)
- Background: transparent
- The filename must stay `logo.svg`

The logo appears on:
- The login screen
- The browser tab (favicon)
- The customer dashboard header

**Quick SVG template** (if you don't have a designer):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="14" fill="#d97706"/>
  <text x="32" y="42" font-size="32" font-weight="bold" fill="white"
        text-anchor="middle" font-family="sans-serif">M</text>
</svg>
```
Replace `M` with your restaurant's initial and `#d97706` with your brand color.

---

## 3. Change Brand Colors

**Edit:** `src/app/globals.css` → the `:root` block (lines ~57–92)

The app uses **OKLCH colors** (a modern color format). You only need to change
a few key variables to completely retheme the app:

```css
:root {
  --primary:        oklch(0.72 0.17 55);   /* ← main brand color (buttons, accents) */
  --accent:         oklch(0.6 0.14 35);    /* ← secondary accent */
  --ring:           oklch(0.72 0.17 55);   /* ← focus ring (usually same as primary) */
  --sidebar-primary: oklch(0.72 0.17 55);  /* ← sidebar accent */
}
```

### Color Presets

| Vibe             | `--primary`         | `--accent`          |
|------------------|---------------------|---------------------|
| ☕ Coffee/Amber   | `oklch(0.72 0.17 55)` | `oklch(0.6 0.14 35)`  |
| 🍕 Pizza Red      | `oklch(0.62 0.22 25)` | `oklch(0.55 0.18 45)` |
| 🥗 Fresh Green    | `oklch(0.7 0.15 145)` | `oklch(0.6 0.12 170)` |
| 🍣 Sushi Teal     | `oklch(0.7 0.1 200)`  | `oklch(0.55 0.08 220)`|
| 🍰 Bakery Pink    | `oklch(0.7 0.15 350)` | `oklch(0.6 0.12 30)`  |
| 🌮 Taco Orange    | `oklch(0.7 0.17 50)`  | `oklch(0.6 0.18 20)`  |
| 🍔 Burger Purple  | `oklch(0.6 0.2 290)`  | `oklch(0.5 0.15 320)` |

> **OKLCH crash course:** The 3 numbers are `lightness chroma hue`.
> - Lightness: `0` (black) → `1` (white). Buttons look best at `0.6–0.75`.
> - Chroma: `0` (gray) → `0.25` (vivid). Brand colors use `0.12–0.22`.
> - Hue: `0` = red, `55` = amber, `145` = green, `200` = teal, `290` = purple, `350` = pink.

Also update the **glass-button gradient** in the same file (search for `.glass-button`)
to match your new primary color — replace the `rgba(217, 119, 6, ...)` amber values
with your color's RGB equivalent.

---

## 4. Menu Categories (No Code — Admin Panel)

Menu categories (e.g. "Burgers", "Coffee", "Desserts") are fully manageable
from the admin panel — **no code changes needed**.

### How to manage categories

1. Sign in as **Admin** (`000000` / `admin123`)
2. Go to **Admin Panel** → **Menu Management**
3. The **"Menu Categories"** card at the top lets you:

| Action          | How                                                              |
|-----------------|------------------------------------------------------------------|
| **Add category**    | Enter name, display name, pick an icon + color → "Create Category" |
| **Edit category**   | Click the ✏️ Edit button on any category row                      |
| **Delete category** | Click the 🗑️ Delete button (warns you if items use it)            |
| **Show/Hide**       | Toggle the Visible/Hidden switch (hidden categories disappear from customer menu) |
| **Reorder**         | Use the ↑ / ↓ arrows to change sort order                        |

### What the customer sees

The customer **Menu** tab reads your category config and shows:
- Only **visible** categories, in your configured **order**
- Each category with its **icon** and **color** (from your picks)
- Items grouped under their category
- An "All" filter chip at the start

### Available icons (22 options)
`UtensilsCrossed, Beef, Coffee, Salad, Flame, Cake, Pizza, Fish, Soup, Drumstick,`
`Sandwich, IceCream, Croissant, Cookie, Wine, Beer, Martini, CupSoda, Apple,`
`Carrot, Egg, Donut`

### Available colors (8 gradients)
Amber, Green, Rose, Fuchsia, Sky, Violet, Orange, Slate

> **Default categories** (seeded by `schema.sql`): Main, Burgers, Coffee,
> Salads, Sides, Desserts. Delete or rename these to match your restaurant.

---

## 5. Menu Items & Prices (No Code — Admin Panel)

1. Sign in as **Admin** → **Menu Management**
2. Scroll past the categories card to the **"Add Menu Item"** form
3. Fill in: name, description, price, category (dropdown from your categories), image
4. Click **Add Item**
5. Existing items show in a list below — edit or delete with the buttons

### Menu images
- Upload images directly in the admin panel (they go to the Supabase
  `menu-images` Storage bucket)
- Recommended: 400×400 px, JPG or PNG, under 500 KB
- If you skip the image, a placeholder icon shows instead

### Public menu (no login required)
Anyone can browse your menu without signing in — this is the "Menu Preview"
accessible from the login screen. It respects your category visibility settings.

---

## 6. Rewards Store (No Code — Admin Panel)

1. Sign in as **Admin** → **Reward Management**
2. Add rewards: name, description, points cost, optional image
3. Edit or delete existing rewards

Customers see available rewards in their **Rewards** tab. To redeem, they ask
staff (employees/admins can redeem on behalf of customers — customers can't
self-redeem, which prevents fraud).

---

## 7. Games: Show/Hide, Costs & Cooldowns (No Code — Admin Panel)

The app includes **6 mini-games**:

| Game                | Internal ID        | Description                                    |
|---------------------|--------------------|------------------------------------------------|
| 🍔 Cup Catch        | `burger_catch`     | Catch falling items in a basket                |
| ☕ Bean Shooter     | `coffee_shooter`   | Shoot coffee beans at targets                  |
| 🎡 Lounge Wheel     | `grand_wheel`      | Spin the wheel for instant prizes              |
| ⚽ Predict the Match | `predict_match`    | Predict a football match result                |
| 🥅 Shoot on Target   | `shoot_target`     | 5 penalty shots vs a diving keeper             |
| 🎟️ Lucky Scratch    | `lucky_scratch`    | Scratch card instant win                       |

### Show/Hide a game

1. Sign in as **Admin** → **Settings** → **Game Settings**
2. Each game card has a **Visible/Hidden** toggle (👁️ Eye icon)
3. Toggle it → click **"Save All Settings"**
4. Hidden games instantly disappear from the customer Games hub AND are
   blocked from being played (even via direct API call)

### Change game cost (entry points)

In the same Game Settings section, each game has a **Cost** field (how many
points a customer pays to play). Edit and save.

### Change game cooldown

Each game has a **Cooldown** field (how many hours a customer must wait
between plays). Edit and save.

> **Example:** Set "Predict the Match" to cost 60 points with a 7-hour
> cooldown, or make "Lucky Scratch" free with a 3-hour cooldown.

---

## 8. Points Settings (No Code — Admin Panel)

Sign in as **Admin** → **Settings**:

| Setting              | What it controls                                           |
|----------------------|------------------------------------------------------------|
| **Points per $**     | How many points a customer earns per currency unit spent   |
| **Signup bonus**     | Points awarded to new customers on registration            |
| **Daily sign-in**    | Points for daily app check-in (with streak multiplier)     |

---

## 9. Sign-up Approval Workflow

New customer sign-ups are **pending** until a staff member approves them.
This prevents spam/fake accounts from accessing your loyalty program.

### How it works

1. A customer signs up with their name, phone, and password
2. Their account is created with status = `pending`
3. They see: *"Account pending approval — please wait for our staff to approve your signup"*
4. An **employee** or **admin** signs in → sees an **"Approvals"** tab
5. Staff reviews pending signups → **Approve** ✓ or **Reject** ✗
6. Approved customers can now log in normally
7. Rejected customers see: *"Account not approved — please contact us for help"*

### To disable approval (auto-approve everyone)

If you'd rather let anyone sign up instantly without approval, you can
set all new accounts to `approved` by default. Edit the `handleSignup`
function in `src/lib/api.ts`:

```ts
// Find this line in the signup function:
status: 'pending'

// Change to:
status: 'approved'
```

> **Recommended:** Keep approval ON for the first few weeks to filter out
> spam, then turn it off once you're comfortable.

---

## 10. Languages & Translations

The app supports **English** and **Arabic** with full RTL (right-to-left)
support. Customers switch languages via the 🌐 button in the top-right.

### Change a translation

Edit `src/lib/i18n/locales/en.ts` (English) or `src/lib/i18n/locales/ar.ts` (Arabic).
Find the key you want to change and update its value:

```ts
  signIn: 'Sign In',           // ← English
  signIn: 'تسجيل الدخول',       // ← Arabic
```

### Add a third language

1. Copy `src/lib/i18n/locales/en.ts` → `src/lib/i18n/locales/fr.ts` (for French)
2. Translate all the values
3. Edit `src/lib/i18n/index.ts`:
   ```ts
   import fr from '@/lib/i18n/locales/fr'
   const translations = { en, ar, fr }
   export type Locale = 'en' | 'ar' | 'fr'
   ```
4. Add a language button in `src/components/ui/language-switcher.tsx`

### Remove a language

Delete the locale file and remove it from `index.ts` and the language switcher.

---

## 11. Game Winnings & Wheel Segments

### Spin wheel segments (Lounge Wheel)

The wheel's prize segments are configurable:

1. Sign in as **Admin** → **Settings** → **Game Winnings Config**
2. Edit the tiers: label, points amount, probability (weight), color
3. Save — the wheel redraws with your new segments

### Game winnings tiers

For each game, you can configure how many points are won for different
score thresholds. In the same Game Winnings Config section, adjust the
tier boundaries and payout amounts.

---

## 12. Full Cloning Checklist (New Restaurant)

Follow this checklist to create a completely new deployment for a new client.

### Step 1 — Rebrand the code (15 min)

- [ ] Copy this entire project folder to a new name (e.g. `bella-pizza-loyalty`)
- [ ] Edit `src/lib/brand.ts` → change `name`, `nameAr`, `tagline`, `description`
- [ ] Replace `public/logo.svg` with the client's logo
- [ ] Edit `src/app/globals.css` → change `--primary` and `--accent` colors
  (see [Color Presets](#3-change-brand-colors))
- [ ] (Optional) Edit `.github/workflows/deploy.yml` if you want to use Bun
  instead of npm

### Step 2 — Set up the database (5 min)

- [ ] Create a new Supabase project (supabase.com → New Project) — free tier
- [ ] Go to **SQL Editor** → paste & run `supabase/schema.sql`
  (creates all tables + the `menu-images` storage bucket + seeds default menu/rewards/categories)
- [ ] (Optional) Run `supabase/seed.sql` for demo users
- [ ] Go to **Authentication → Providers → Email** → turn OFF "Confirm email"
- [ ] Verify the `menu-images` bucket exists in Storage (auto-created by schema.sql)

### Step 3 — Deploy (10 min)

- [ ] Create a new GitHub repo (name it after the restaurant) — Public for free Pages
- [ ] Push the code:
  ```bash
  cd bella-pizza-loyalty
  git init && git add . && git commit -m "initial"
  git remote add origin https://github.com/YOU/bella-pizza-loyalty.git
  git push -u origin main
  ```
- [ ] Add GitHub Secrets (Settings → Secrets → Actions):
  - `NEXT_PUBLIC_SUPABASE_URL` = the new Supabase URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the new anon key
  - `NEXT_PUBLIC_BASE_PATH` = `/bella-pizza-loyalty` (repo name with leading slash)
  - (Optional, for custom domain) `CUSTOM_DOMAIN` = `bellapizza.com` + set `NEXT_PUBLIC_BASE_PATH` to empty
- [ ] Enable GitHub Pages (Settings → Pages → Source: GitHub Actions)

### Step 3b — Custom domain (optional, recommended for production)

- [ ] At your DNS provider, add a CNAME record: `Name: app` (or `www`), `Target: USERNAME.github.io`
- [ ] GitHub repo: Settings → Pages → Custom domain → enter `app.bellapizza.com` → Save
- [ ] Update the `NEXT_PUBLIC_BASE_PATH` GitHub secret to **empty** (important!)
- [ ] (Optional) Set `CUSTOM_DOMAIN` secret = `app.bellapizza.com` for automated CNAME
- [ ] Re-run the deploy workflow (Actions → Run workflow)
- [ ] Once DNS propagates, check "Enforce HTTPS" in GitHub Pages settings

### Step 4 — Customize content (no code, 10 min)

Sign in as admin and configure:
- [ ] **Menu Management** → delete default items, add the client's menu
- [ ] **Menu Categories** → rename/reorder to match the client's menu structure
- [ ] **Reward Management** → add the client's rewards (free coffee, discount, etc.)
- [ ] **Settings** → set points-per-$, signup bonus, daily sign-in points
- [ ] **Settings → Game Settings** → hide games the client doesn't want,
  adjust costs/cooldowns
- [ ] **Settings → Game Winnings** → configure prize tiers

### Step 5 — Create real staff accounts

**Easiest method (recommended):**
1. Sign up via the app with the admin's real phone number
2. Have an existing admin/employee approve the signup (or run the SQL below)
3. Run this SQL in Supabase SQL Editor to promote them:
  ```sql
  UPDATE customers SET role='admin', status='approved' WHERE phone='ADMIN_PHONE';
  ```

**Direct SQL method** (for the very first admin, if you didn't run seed.sql):
```sql
-- 1. Create the auth user (replace PHONE and PASSWORD)
INSERT INTO auth.users (instanceid, id, aud, role, email,
  encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(),
  'authenticated', 'authenticated', 'PHONE@flavorpoints.local',
  crypt('PASSWORD', gen_salt('bf')), now(), now(), now());

-- 2. Create the auth.identity row (required for login)
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at)
SELECT gen_random_uuid(), id, id, 'email',
  jsonb_build_object('sub', id::text, 'email', 'PHONE@flavorpoints.local', 'email_verified', true),
  now(), now()
FROM auth.users WHERE email = 'PHONE@flavorpoints.local';

-- 3. Create the customer profile (admin role, approved status)
INSERT INTO public.customers (id, phone, email, name, role, status, points)
SELECT id, 'PHONE', 'PHONE@flavorpoints.local', 'Manager Name', 'admin', 'approved', 0
FROM auth.users WHERE email = 'PHONE@flavorpoints.local';
```
> Replace `PHONE` with the real phone number (no spaces) and `PASSWORD` with
> a strong password. The `@flavorpoints.local` domain comes from `brand.ts`
> — change it there if you customized `emailDomain`.

- [ ] Delete the demo users (`000000`, `111111`, `123456`, `654321`) if you
  ran `seed.sql`:
  ```sql
  DELETE FROM customers WHERE phone IN ('123456','654321');
  -- Keep 000000 (admin) and 111111 (employee) only if you want demo access
  ```

🎉 **Done!** The new restaurant's loyalty app is live at
`https://USERNAME.github.io/bella-pizza-loyalty/`
(or your custom domain if you configured one)

---

## 13. File Reference — What Lives Where

| What you want to change         | File to edit                              |
|---------------------------------|-------------------------------------------|
| Restaurant name, tagline        | `src/lib/brand.ts`                        |
| Logo                            | `public/logo.svg`                         |
| Brand colors                    | `src/app/globals.css` (`:root` block)     |
| Browser tab title / SEO         | `src/app/layout.tsx` (uses `brand.ts`)    |
| English UI text                 | `src/lib/i18n/locales/en.ts`              |
| Arabic UI text                  | `src/lib/i18n/locales/ar.ts`              |
| Database tables & seed data     | `supabase/schema.sql`                     |
| Demo users                      | `supabase/seed.sql`                       |
| Menu categories migration       | `supabase/migrate-add-menu-categories.sql`|
| Signup approval migration       | `supabase/migrate-add-signup-approval.sql`|
| More games migration            | `supabase/migrate-add-more-games.sql`     |
| Deploy workflow                 | `.github/workflows/deploy.yml`            |
| Environment variables template  | `.env.example`                            |
| Supabase client + auth helper   | `src/lib/supabase.ts`                     |
| All API/database functions      | `src/lib/api.ts`                          |
| Admin panel UI                  | `src/components/admin/admin-dashboard.tsx`|
| Employee portal UI              | `src/components/employee/employee-dashboard.tsx`|
| Customer dashboard UI           | `src/components/dashboard/customer-dashboard.tsx`|
| Games hub UI                    | `src/components/dashboard/games-hub.tsx`  |
| Menu view (customer)            | `src/components/dashboard/menu-view.tsx`  |
| Game components                 | `src/components/games/*.tsx`              |

---

## Need help?

- See **README.md** for the full deployment walkthrough
- See **SETUP_GUIDE.md** for a quick-start summary
- The app shows a built-in setup guide if Supabase isn't configured yet
  (visit the site before adding env variables to see it)
