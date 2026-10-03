# Prompts.md — Sprint 02: Cash-Flow Tracker

## Project
Salary & Expense Tracker built in **Vanilla JavaScript** (no React, per Sprint 02 FAQ #3).

## Tech Stack
- HTML5 (semantic structure)
- Vanilla CSS (no framework — UI stack free per FAQ #9, logic is what's graded)
- Vanilla JS (ES6+)
- Chart.js v4.4.1 (CDN)
- jsPDF 2.5.1 (CDN)
- LocalStorage API
- Frankfurter API (keyless currency rates)

## Phase Coverage

### Phase 1 — Base MVP (P0)
- [x] Form capturing Total Salary, Expense Name, Expense Amount
- [x] Salary rendered to DOM on submit
- [x] Expenses pushed dynamically to list
- [x] Remaining Balance = Salary − Total Expenses
- [x] Validation: empty / negative inputs blocked with error state

### Phase 2 — Persistence & Visualization (P1)
- [x] LocalStorage for salary, expenses array, currency
- [x] JSON.stringify on save, JSON.parse on load
- [x] Delete expense → removes from DOM + LS + recalculates instantly
- [x] Chart.js Pie: Remaining Balance vs Total Expenses
- [x] Chart instance `.destroy()` before re-render (FAQ #8)

### Phase 3 — Stretch (P2)
- [x] jsPDF "Download Report" export
- [x] Frankfurter API currency toggle (INR ↔ USD)
- [x] Threshold alert: balance < 10% of salary → RED text + pulsing banner

## Key Engineering Decisions
1. **`Number()` parsing** on all inputs — FAQ #1 (string concatenation trap).
2. **Internal storage always in INR.** Currency toggle only affects display + input interpretation. This prevents rounding drift when toggling back and forth.
3. **`JSON.stringify` / `JSON.parse`** for all LocalStorage I/O — FAQ #2.
4. **`.destroy()` before chart re-render** — FAQ #8.
5. **Vanilla CSS** chosen over Tailwind — grading is on JS logic; fewer CDN dependencies = fewer failure points.

## Known Constraints
- Frankfurter is ECB-backed. Rates are business-day snapshots, not tick-level.
- Currency toggle requires network access for the first fetch (rate is cached in memory afterwards).
