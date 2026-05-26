## Goal

1. After confirming the signup email, send the user back into MoWa Loans (the Login page) with a clear "Email confirmed — please sign in" message.
2. Remove the duplicated action button on the Clients and Loans pages so each page has only one primary "Add client" / "New loan" button.

## Changes

### 1. Email confirmation redirect → Login page with success message

**`src/routes/login.tsx`**
- Update the `signUp()` call so `emailRedirectTo` points to the login page specifically:
  `emailRedirectTo: ${window.location.origin}/login?confirmed=1`
- On mount, read the `confirmed` query param. If present:
  - Show a green success banner above the form: "Email confirmed. Please sign in to continue."
  - Make sure the form is in "Sign in" mode (not Sign up).
  - Clean the param from the URL afterwards so refreshes don't keep showing the banner.
- Keep the existing "already signed in → /dashboard" redirect untouched (so if Supabase auto-signs them in after confirmation, they still go straight to the app; otherwise they see the friendly message).

Tiny addition to `createFileRoute("/login")`: add `validateSearch` to type the optional `confirmed` flag.

### 2. Remove duplicate buttons

**`src/routes/_authenticated/clients.tsx`**
- Header keeps the single "Add client" button (top right).
- Empty state ("No clients yet") removes its own "Add client" button — keep only the icon, title, and helper text. The user can use the header button.

**`src/routes/_authenticated/loans.tsx`**
- Header keeps the single "New loan" button.
- Empty state ("No loans to show") removes its own "New loan" button.

No other UI, copy, or behavior changes.

## Out of scope

- No changes to authentication providers, auto-confirm settings, or email templates.
- No changes to the sidebar "New loan" shortcut (that lives in the layout, not on the Loans page itself, so it isn't a duplicate).
- No business-logic, schema, or interest-calculation changes.
