## Codebase audit — what we'll fix

I ran a full read-only audit. Most of the codebase is healthy. Below is the prioritized set of fixes I want to make. I'm deliberately **not** doing speculative refactors (no pruning unused shadcn UI packages, no rewriting forms with react-hook-form) so I don't break anything.

### Critical

1. **Atomic loan + installments insert** (`src/routes/_authenticated/loans.new.tsx`)
   Today: loan inserts first, then installments. If the second insert fails, an orphan loan stays in the DB forever.
   Fix: wrap both writes in a Postgres RPC `create_loan_with_installments(...)` (SECURITY INVOKER so RLS still applies as the calling user) that runs both inserts in a single transaction and returns the new loan id. Client calls `supabase.rpc(...)` instead of two sequential inserts.

### High

2. **Month-end overflow in installment schedule** (`src/lib/loan-utils.ts`)
   `addInterval` uses `setMonth` which turns Jan 31 + 1 month into Mar 2/3. Swap to `addMonths` from `date-fns` (already imported in the file) so it correctly clamps to Feb 28/29.

3. **Cross-user installment RLS bypass** (new migration)
   Current INSERT/UPDATE/DELETE policies on `loan_installments` only check `auth.uid() = user_id`. A user who guesses another user's `loan_id` could insert rows against it. Tighten policies to also require `EXISTS (SELECT 1 FROM public.loans WHERE id = loan_id AND user_id = auth.uid())`.

4. **Auth flash on protected routes** (`src/routes/_authenticated.tsx`)
   Auth check is client-only `useEffect`, so the sidebar briefly renders for signed-out users. Add a `beforeLoad` that checks `supabase.auth.getSession()` and `throw redirect({ to: '/login' })` when missing. Keep the existing client effect as belt-and-braces.

### Medium

5. **Add `errorComponent` + `notFoundComponent`** to `_authenticated.tsx`, `loans.new.tsx`, `loans.index.tsx`, `clients.$id.tsx`, and use `throw notFound()` in `clients.$id.tsx` when the client doesn't exist (instead of inline JSX).

6. **`validateSearch` hardening** in `loans.new.tsx`: wrap with `.catch({})` so a bad `?client=...` query param doesn't crash the route.

7. **Stale cache after `togglePaid`** in `loans.index.tsx`: also invalidate `["client"]` queries so the client detail page updates.

8. **Negative-amount guard** in `loans.new.tsx`: clamp `amount` to `Math.max(0, …)` so the live repay preview can't go negative.

9. **Root `onAuthStateChange` filter** in `__root.tsx`: only `invalidateQueries()` on `SIGNED_IN`/`SIGNED_OUT`/`USER_UPDATED` so token refreshes don't thrash the cache.

### Low (small, safe polish)

10. Remove duplicate/stale "LoanEase Tracker" meta tags in `__root.tsx`.
11. Schema fix migration: `loan_installments.amount_kwacha` → `numeric(12,2)` to match `loans.amount_kwacha`.
12. Add explicit `GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients, public.loans TO authenticated` in a new migration for parity with `loan_installments`.
13. Fix Google sign-in spinner dead code in `login.tsx` (introduce a `googleBusy` state).

### Explicitly NOT doing (out of scope / risky)

- Moving `StatusBadge` out of `dashboard.tsx` into `src/components/` — touches imports across multiple files for cosmetic gain; deferred.
- Removing unused npm packages (`react-hook-form`, `recharts`, unused Radix primitives) — no runtime impact, and tree-shaking already excludes them from the bundle.
- Switching to `@supabase/ssr` cookie-based sessions — large architectural change; the `beforeLoad` fix in #4 is enough.
- Auto-generated files (`src/integrations/supabase/client.ts`, `auth-middleware.ts`, `types.ts`) — must not edit.
- Any change to `_authenticated/route.tsx` (Lovable Cloud manages auth gating there).

### Verification after build

- Manually test: record a loan with installments on / off, mark an installment paid → loan flips to paid, unmark → loan flips back.
- Try a monthly schedule starting Jan 31 → second row must be Feb 28.
- Hard-refresh `/dashboard` while signed out → straight to `/login`, no flash.
- Try a bad `/loans/new?client=garbage` URL → page renders normally, search ignored.
