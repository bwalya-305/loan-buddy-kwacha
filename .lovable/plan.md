## Goal

Every day, email the logged-in lender a digest of their loans whose `repay_date` is exactly 3 days away (unpaid only).

## Prerequisite: sender domain

Lovable's app-email system needs a verified sender subdomain — there is no "default" sender for app emails. As the first step of implementation I'll open the email setup dialog so you can add one (e.g. `notify.yourdomain.com`). Reminders will start sending once DNS verifies; the rest of the wiring below works immediately and queues messages in the meantime.

If you'd rather not set up a domain, the alternative is in-app reminders only (a "Due soon" view / browser notification) — let me know and I'll replan.

## What gets built

### 1. Email infrastructure & template
- Run `setup_email_infra` and `scaffold_transactional_email` (creates queue, send route, suppression handling).
- Add one React Email template `loan-reminder.tsx` with a branded list of upcoming loans: client name, phone, amount, repay amount (K), repay date, days until due. Subject: `You have N loan(s) due in 3 days`.

### 2. Scheduled job
- New public route `src/routes/api/public/hooks/loan-reminders.ts` (POST). Verifies the `apikey` header against the anon key, then:
  - Uses `supabaseAdmin` to query `loans` joined to `clients` where `paid = false` and `repay_date = current_date + 3`.
  - Groups results by `user_id`.
  - For each user, looks up their email via `auth.admin.getUserById(user_id)` and enqueues one `loan-reminder` email with the grouped loans as `templateData`. Uses idempotency key `loan-reminder-{user_id}-{YYYY-MM-DD}` so reruns don't duplicate.
- Schedule via `pg_cron` to run daily at 08:00 Africa/Lusaka (06:00 UTC), hitting the stable `project--{id}.lovable.app` URL.

### 3. Settings toggle (lightweight)
- Add a `notification_prefs` table (`user_id` PK, `email_reminders boolean default true`) with RLS.
- New "Settings" page with a single switch: "Email me 3 days before a loan is due." The cron job skips users who opted out.

## Out of scope
- Client-facing emails (would need a `clients.email` column — can be added later).
- Multiple reminder windows (7/1 day) — easy to add once 3-day is working.
- SMS reminders.
- Changing interest/loan logic.

## Technical notes
- Queries the database with the service-role client inside the route handler (loaded via dynamic import per modern stack rules).
- Email send uses the internal `/lovable/email/transactional/send` route with one POST per user.
- Suppression list is respected automatically.
