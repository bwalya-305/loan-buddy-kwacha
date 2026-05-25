
# MoWa Loans — Loan Client Tracker

A simple, private dashboard for tracking borrowers, loans, and repayment amounts (40% flat interest), built for users of any tech background.

## What you'll get

- **Secure login** (email + password) so only you see client data
- **Clients list** with full name, NRC number, phone
- **Loans** linked to clients: amount (ZMW), date borrowed, expected repay date, auto-calculated repay amount (amount × 1.4)
- **Dashboard** with totals: active loans, total lent, total expected back, overdue count
- **Status badges** on each loan: Active / Due soon (≤7 days) / Overdue / Paid
- **Mark as paid** with one click
- **Search & filter** by name, NRC, or status

## Design direction

- Palette: **Emerald Prestige** — deep emerald (#064e3b), emerald (#0d7a5f), gold accent (#c9a84c), cream surface (#f5f0e0). Trustworthy, premium finance feel.
- Typography: **Sora** (headings) + **Manrope** (body) — modern, highly legible
- UX principles for mixed tech skill levels:
  - Big tap targets, plain-English labels ("Amount borrowed (ZMW)", not "Principal")
  - ZMW currency formatted with thousands separators (K 5,000.00)
  - Empty states explain the next step ("No clients yet — add your first client")
  - Confirmation dialogs before delete / mark paid
  - Mobile-friendly cards on small screens, table on desktop
  - Toast feedback after every action

## Pages

```
/login           — sign in / sign up
/                — dashboard (KPIs + recent loans)
/clients         — list, add, edit, delete clients
/clients/:id     — client profile + their loan history
/loans           — all loans with filters
/loans/new       — add loan form (auto-shows repay amount as you type)
```

## Technical details

- **Auth**: Lovable Cloud email/password. Protected routes under `_authenticated/`. Public `/login` only.
- **Database** (Lovable Cloud, RLS-protected so each user only sees their own records):
  - `clients` — id, user_id, full_name, nrc_number, phone, created_at
  - `loans` — id, user_id, client_id, amount_kwacha (numeric), borrowed_date, repay_date, paid (bool), paid_at, created_at
  - Interest is fixed at 40%, computed in the UI as `amount × 1.4` (no need to store; easy to change later)
- **Validation**: Zod on all forms (NRC format, phone min length, amount > 0, repay_date ≥ borrowed_date)
- **Data fetching**: TanStack Query + server functions
- **No profile table needed** (no usernames/avatars — just the auth account)

## Out of scope (can add later)

- Payment history / partial payments
- SMS reminders to borrowers
- Exports (CSV/PDF)
- Multi-user roles (loan officers)
