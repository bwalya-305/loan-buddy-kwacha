## Goal
Replace the current CSV export on the Loans page with an Excel (.xlsx) export that:
- Names the file after the app (e.g. `MoWa-Loans-loans-2026-06-27.xlsx`).
- Opens with a bold "MoWa Loans" title row centered across all columns, plus a subtitle line ("Loan records · exported YYYY-MM-DD") and the existing column headers below.

## What changes
- **Loans page** (`src/routes/_authenticated/loans.index.tsx`)
  - Rename the toolbar button from "Export CSV" to "Export Excel".
  - Replace the `exportCsv` function with `exportXlsx`, keeping the same filter/empty-state behavior and the success toast.
- **New dependency**: install `xlsx` (SheetJS community build) via `bun add xlsx`. It works in the browser, produces real `.xlsx`, and supports merged + styled cells for the centered title.

## How the file will look when opened
```text
+--------------------------------------------------------------+
|                       MoWa Loans                             |  <- merged across all columns, bold, centered, larger font
|        Loan records · exported 2026-06-27                    |  <- merged, centered, muted
+--------+-------+----------+------------+------------+--------+
| Client | Phone | Amount(K)| Interest(K)| Repay(K)   | ...    |  <- existing headers, bold
+--------+-------+----------+------------+------------+--------+
| ...one row per loan, same columns as today...                |
+--------------------------------------------------------------+
```

Columns stay the same as the current CSV: Client, Phone, Amount (K), Interest (K), Repay total (K), Borrowed date, Repay date, Status, Paid, Paid at. Column widths will be auto-sized so the title and data are readable on open.

## Filename
`MoWa-Loans-loans-YYYY-MM-DD.xlsx` (date stamped like the current CSV).

## Out of scope
- No backend or schema changes.
- No change to which loans are exported (still respects the active search + status filter).
- CSV export is fully replaced, not kept alongside.
