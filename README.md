# Grocery & Meal Planner v1

Mobile-first planner for a single household with:

- Weekly 7-day meal planning
- Reusable meal templates with ingredient lines
- Pantry on-hand checklist
- Shopping list generation (aggregation + pantry subtraction + store section grouping)
- Shopping checkoff and ad hoc item additions
- Simple substitution suggestions from pantry + static close-swap rules

## Local v1 architecture in this repo

- Frontend: React + Vite (mobile-first UI)
- Persistence: localStorage cache
- Domain logic: `src/utils/shopping.js` and `src/utils/storage.js`

This implementation focuses on deterministic shopping logic and offline-first behavior locally. It is structured so Supabase and device SQLite sync adapters can be added without changing screen-level behavior.

## Run

```bash
npm install
npm run dev
```

## Validate

```bash
npm run lint
npm run build
```
