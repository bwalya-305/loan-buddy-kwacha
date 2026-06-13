## Goal

On the "Record a new loan" page, add an optional **Installments** section (off by default). When toggled on, the user picks a number of installments and a frequency; the app generates equal installments with dates, saves them with the loan, and lets each installment be marked paid. The loan auto-marks paid when all installments are paid.

## UX on `loans/new`

- New `Switch` labeled **"Pay in installments"** under the date fields.
- When ON:
  - **Number of installments** (number input, 2–24).
  - **Frequency**: Weekly / Bi-weekly / Monthly (Select).
  - **First installment date** (defaults to borrow date + one interval).
  - Live preview table: # | Due date | Amount (K). Equal split of total repay; last row absorbs rounding.
  - The existing "Expected repay date" field becomes the **final** installment date (auto-synced; user can still override, which recomputes the schedule end).
- When OFF: form behaves exactly as today (single lump-sum repayment).

## Data model

New table `public.loan_installments`:
- `id uuid pk`
- `loan_id uuid` → `loans(id) on delete cascade`
- `user_id uuid` (for RLS, mirrors loan owner)
- `sequence int` (1..N)
- `due_date date`
- `amount_kwacha numeric`
- `paid boolean default false`, `paid_at timestamptz`
- `created_at timestamptz default now()`
- Unique `(loan_id, sequence)`
- RLS: owner-only (mirrors `loans` policies), with standard GRANTs.

`loans` table unchanged. A loan "has installments" iff rows exist in `loan_installments` for it.

## Server work

- Insert flow stays client-side (RLS-scoped). After inserting the loan row, if installments are enabled, insert the generated rows in one `.insert([...])` call referencing the new `loan_id`.
- Add a small DB trigger on `loan_installments`: after update, if all rows for a `loan_id` are `paid = true`, set the parent `loans.paid = true, paid_at = now()`; if any becomes unpaid, revert `paid = false, paid_at = null`.

## Display (minimal, scoped to support the new field)

- On the loans list and client detail, when a loan has installments, show a small "x/N paid" badge next to status (read-only here — full per-installment toggling lives on the loan detail, which is out of scope unless you want it now).

## Out of scope

- Custom (non-equal) installment amounts.
- Editing the schedule after the loan is created.
- A dedicated loan detail page for ticking installments paid (can be a follow-up; today loans are marked paid from the list).
- Changes to interest calculation, CSV export columns, or reminders.

## Technical notes

- Schedule generation helper in `src/lib/loan-utils.ts`: `generateSchedule(total, count, firstDate, frequency)` returning `{ sequence, due_date, amount }[]`, rounding to 2 dp with last-row remainder.
- Frequency → `addDays(7)`, `addDays(14)`, `addMonths(1)` via `date-fns`.
- Validation: count 2–24; first date ≥ borrow date; total of generated amounts === `calcRepay(amount)`.
