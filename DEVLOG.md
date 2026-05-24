# Budgeter — Development Log

Personal budgeting desktop app built with Electron + React + TypeScript. Local JSON storage only — no cloud, no accounts.

---

## Stack

- **Electron 33** + **React 19** + **TypeScript** + **Vite** (electron-vite)
- **Tailwind CSS v3** + PostCSS
- **Recharts** for charts
- Data stored at `%APPDATA%\budgeter\budgeter-data.json` (never inside the project directory)
- `.gitignore` blocks `*.csv` and `*.json` (except package/tsconfig files) to keep bank data out of git

---

## Commit History

### `e978ba2` — Initial scaffold
Electron + React + TypeScript budgeting app. Basic project structure with electron-vite.

### `cb43eaa` — Simplify CSV import and harden .gitignore
Locked down `.gitignore` so bank CSV exports and data files can never be accidentally committed.

### `64e1927` — Fix date parsing for bank CSV import
Handled `MM/DD/YYYY` → `YYYY-MM-DD` normalization for bank export formats.

### `f289aa8` — Fix date handling, dashboard month defaulting, and auto-categorization
`normalizeDate` covers edge cases. Dashboard defaults to current month. Auto-categorization (`guessCategory`) added.

### `474798c` — Improve auto-categorization and re-categorize existing transactions
Expanded keyword rules in `guessCategory` for grocery stores, gas stations, restaurants, subscriptions, utilities, etc.

### `0d221d8` — Fix CSV parser dropping empty fields
Root cause of missing import rows — `parseCsvLine` now correctly handles trailing empty fields.

### `a34be18` — Add duplicate detection on import and all-time totals on dashboard
Import preview skips rows that already exist (matched by date + description + amount). Dashboard shows all-time earned/spent.

### `9f10449` — Rework Budget page as zero-based budgeting (EveryDollar-style)
Zero-based philosophy: every dollar assigned to a category. Monthly budget goals with Set/edit per category.

### `e900d1e` — Visual overhaul, fix pie chart labels, compact date column
Full UI redesign to light mode palette. Pie chart label fix. Compact table columns.

### `bbe7fa3` — Unify budget category list and improve space utilization
Budget page layout improvements, category list consistency.

### `2e5c89d` — Add category management, drill-down review, savings balance, and expanded default categories
- Custom category creation and deletion
- Click-through drill-down on budget rows to review transactions
- `savingsBalance` field added to app data
- Expanded default category list (25+ categories)

### `62a9480` — Fix review scroll, pie tooltip names, and add savings rate + top merchants charts
- Charts page: Savings Rate bar chart + Top Merchants
- Pie chart tooltip shows category names correctly

### `f081e25` — Add custom category delete with confirmation, fix chart hover highlight
Confirmation dialog before deleting a custom category. Chart hover state fixed.

### `2bbbc55` — Light mode, date range label, savings-rate drill-down, merchant all-time drill-down
- Full light mode color system applied consistently
- Date range label on Dashboard
- Click a month bar to drill down into transactions
- Click a merchant to see all-time spend grouped by year

### `fd554b8` — Dashboard year tiles + drill-down, merchant popup year grouping
Dashboard shows per-year summary tiles. Click a year to see income/spent breakdown.

### `010a7c1` — Add Transfer category to exclude internal bank transfers
Internal bank-to-bank transfers (e.g. checking → savings) were inflating income and expense totals. Added `transfer: true` flag on Category. Transfer-flagged categories are excluded from all income/expense calculations.

### `64420ad` — Add Transfer review panel to Budget page
Budget page footer shows unreviewed Transfer transactions so the user can reassign any that were miscategorized.

### `1ab02e7` — Separate Saved from Spent across Dashboard
Added `savings: true` flag on Category. Savings deposits (Savings, Emergency Fund, Investments) are now tracked as "Saved" separately from "Spent". Dashboard shows 4 stat cards: Income / Spent / Saved / Left to Assign.

### `2af4321` — Fix Charts and Transactions to separate Saved from Spent
- Charts pie excludes savings categories (they aren't spending)
- Trend chart separates Saved from Expenses
- Transactions list shows savings amounts in teal instead of red

### `6167eba` — UI polish pass
Spacing, copy, and visual consistency fixes across all pages.

### `ce280fd` — Add Savings Withdrawal category
Added "Savings Withdrawal" category (`transfer: true`) for money pulled from savings back to checking. Auto-detected from CSV descriptions matching "from savings" patterns. Shown in Budget page even though it's a transfer category.

### `7782991` — Fix silent write failures
`write-data` IPC handler now calls `mkdirSync` with `recursive: true` before every write, so the data directory is always created if missing. Added error logging.

### `f7ab58a` — Stop migration from overriding manual categorizations
Critical bug: every app restart, the migration was re-running `guessCategory` on all existing transactions and overwriting manual categorizations. Fixed by making migration non-destructive — it only renames the legacy `'Other'` label to `'Uncategorized'` and fixes transactions wrongly typed as `expense` under Savings Withdrawal (should be `income`).

### `45372ed` — Add save status indicator and Save button to sidebar
Sidebar footer shows `✓ Saved` / `● Saving…` / `⚠ Not saved` with a manual Save button, similar to a word processor.

### `645753d` — Fix savings deposits disappearing from CSV import
The Savings Withdrawal auto-detection regex (`/\bfrom\b.{0,25}\bsav/`) was matching "Transfer from Checking to Savings" — a savings *deposit* — as a Savings Withdrawal. Fixed by making `guessCategory` type-aware: the Savings Withdrawal rule only fires for `income` transactions.

### `1593185` — Show Savings Withdrawal row in Budget page
Savings Withdrawal had `transfer: true` so it was filtered out of the Budget category list. Fixed `visibleCategories` to explicitly allow Savings Withdrawal through, showing the withdrawn amount in blue-grey with no "Set Goal" button.

### `cd1a5ad` — Fix Monthly Savings Rate going negative when withdrawing from savings
The savings rate formula was `saved / income`, which is always ≥ 0. Savings Withdrawal transactions (pulling money back from savings) were being ignored entirely. Updated `trendData` to track withdrawals separately and compute `(saved - withdrawn) / income` so the rate correctly goes negative (red bar) in months where more was withdrawn than deposited.

---

## Architecture Notes

### Category Flags
| Flag | Meaning |
|------|---------|
| `transfer: true` | Excluded from all income/expense totals. Internal bank transfers. |
| `savings: true` | Counted as "Saved", not "Spent". Shown as its own budget line. |
| `hidden: true` | Hidden from the budget table (user-controlled). |
| `custom: true` | User-created category (can be deleted). |

### Key Categories
| Category | Flags | Notes |
|----------|-------|-------|
| Transfer | `transfer` | Internal bank-to-bank moves, ignored everywhere |
| Savings | `savings` | Money deposited into savings account |
| Emergency Fund | `savings` | Same as Savings but separate tracking |
| Investments | `savings` | Brokerage/retirement contributions |
| Savings Withdrawal | `transfer` | Pulling money from savings back to checking — shown in Budget, counted in Savings Rate |

### Savings Rate Formula
```
Savings Rate = (totalSaved - totalWithdrawn) / totalIncome × 100
```
- Goes negative (red) when more was withdrawn from savings than deposited
- Yellow when 0–9%
- Teal when ≥ 10%

### Data File Location
`%APPDATA%\budgeter\budgeter-data.json` — never inside the project directory, never committed to git.
