# Meal Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current grocery planner into a planner-first meal app with a real recipe library, reviewable URL import, required recipe images, optional macros, and shopping-list generation from planned recipes.

**Architecture:** Keep local-first planner state in the client, but introduce a tiny server-side recipe-import adapter because arbitrary recipe URLs cannot be fetched reliably from a browser-only Vite app due to CORS. Refactor the current single-file app into focused planner, recipe, and shopping units so the first visible version is easier to iterate on.

**Tech Stack:** React 19, Vite 8, localStorage persistence, Node fetch for import adapter, ESLint, Vitest + React Testing Library for TDD

---

## File Structure

### Existing files to modify

- `package.json`
  - Add test scripts and a dev script that runs the client with the recipe-import adapter.
- `src/App.jsx`
  - Reduce to top-level screen switching and shared state wiring.
- `src/styles.css`
  - Add planner, recipe-library, import-review, and shopping-range styles.
- `src/utils/storage.js`
  - Migrate the planner state shape from `mealTemplates` to richer `recipes`, `plannedMeals`, and `shoppingRange`.
- `src/utils/recipes.js`
  - Keep seed data and shared recipe constants, but stop treating imported recipes as shallow templates.
- `src/utils/shopping.js`
  - Build shopping lists from planned recipe assignments and preserve recipe-source context.

### New files to create

- `vite.config.js`
  - Add test environment configuration.
- `src/components/PlanScreen.jsx`
  - Monthly planner view plus selected-day meal summary.
- `src/components/MealsScreen.jsx`
  - Recipe library browsing, meal-slot assignment, and recipe entry actions.
- `src/components/RecipeEditorModal.jsx`
  - Manual recipe creation and import review/edit UI with required image enforcement.
- `src/components/ShoppingScreen.jsx`
  - Weekly/default shopping generation plus manual range controls.
- `src/utils/plannerState.js`
  - Shared state helpers for recipes, planned meals, and range defaults.
- `src/utils/recipeImport.js`
  - Client-side import request wrapper and normalization helpers.
- `server/recipeImport.mjs`
  - Small server endpoint that fetches a recipe page and extracts JSON-LD data.
- `server/extractRecipeFromHtml.mjs`
  - HTML-to-recipe extraction logic, including macros when present.
- `src/test/recipeImport.test.js`
  - Parser normalization tests.
- `src/test/storage.test.js`
  - State migration tests.
- `src/test/shopping.test.js`
  - Shopping aggregation and source-context tests.

## Task 1: Establish the New Data Model and Test Harness

**Files:**
- Modify: `package.json`
- Modify: `vite.config.js`
- Create: `src/utils/plannerState.js`
- Modify: `src/utils/storage.js`
- Test: `src/test/storage.test.js`

- [ ] **Step 1: Write the failing storage migration tests**

```js
import { describe, expect, it } from 'vitest'
import { createPlannerState, migratePlannerState } from '../utils/storage'

describe('migratePlannerState', () => {
  it('upgrades legacy mealTemplates into recipes', () => {
    const legacy = {
      mealTemplates: [
        {
          id: 'meal-1',
          title: 'Turkey Chili',
          mealType: 'dinner',
          recipeUrl: 'https://example.com/chili',
          recipeImageUrl: 'https://img.example.com/chili.jpg',
          defaultServings: '4',
          ingredients: [{ id: 'ing-1', name: 'ground turkey', quantity: '1', unit: 'lb', sectionId: 'protein', notes: '' }],
        },
      ],
      weeklyPlan: {
        '2026-04-29': [{ id: 'planned-1', mealTemplateId: 'meal-1', mealType: 'dinner', servingsOverride: '' }],
      },
      pantryItems: {},
      storeSections: [],
      shopping: { checked: {}, adHocItems: [], mutationQueue: [] },
    }

    const migrated = migratePlannerState(legacy)

    expect(migrated.recipes).toHaveLength(1)
    expect(migrated.recipes[0]).toMatchObject({
      id: 'meal-1',
      title: 'Turkey Chili',
      image: 'https://img.example.com/chili.jpg',
      mealTypes: ['dinner'],
      sourceUrl: 'https://example.com/chili',
    })
    expect(migrated.plannedMeals['2026-04-29'][0]).toMatchObject({
      recipeId: 'meal-1',
      slot: 'dinner',
    })
  })

  it('creates defaults for shopping range and import metadata', () => {
    const state = createPlannerState([])

    expect(state.shoppingRange.mode).toBe('selected-week')
    expect(state.shoppingRange.startDate).toBe('')
    expect(state.shoppingRange.endDate).toBe('')
    expect(state.recipes).toEqual([])
  })
})
```

- [ ] **Step 2: Run the storage test to verify it fails**

Run: `npm test -- src/test/storage.test.js`
Expected: FAIL with missing test runner and/or missing `migratePlannerState`

- [ ] **Step 3: Add the test tooling**

```json
{
  "scripts": {
    "dev": "vite",
    "dev:full": "node server/recipeImport.mjs",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@testing-library/react": "^16.3.0",
    "@testing-library/jest-dom": "^6.6.3",
    "jsdom": "^26.1.0",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 4: Add the planner-state helpers and storage migration**

```js
// src/utils/plannerState.js
export function createEmptyRecipe() {
  return {
    id: crypto.randomUUID(),
    title: '',
    image: '',
    mealTypes: ['dinner'],
    servings: '2',
    ingredients: [{ id: crypto.randomUUID(), name: '', quantity: '', unit: '', sectionId: '', notes: '' }],
    instructions: [''],
    notes: '',
    macros: null,
    sourceUrl: '',
    sourceName: '',
    importedAt: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export function createDefaultShoppingRange() {
  return { mode: 'selected-week', startDate: '', endDate: '' }
}
```

```js
// src/utils/storage.js
import { createDefaultShoppingRange } from './plannerState'

export function migratePlannerState(parsed) {
  const recipes = (parsed.recipes ?? parsed.mealTemplates ?? []).map((item) => ({
    id: item.id,
    title: item.title ?? '',
    image: item.image ?? item.recipeImageUrl ?? '',
    mealTypes: item.mealTypes ?? [item.mealType ?? 'dinner'],
    servings: item.servings ?? item.defaultServings ?? '2',
    ingredients: item.ingredients ?? [],
    instructions: item.instructions ?? [''],
    notes: item.notes ?? '',
    macros: item.macros ?? null,
    sourceUrl: item.sourceUrl ?? item.recipeUrl ?? '',
    sourceName: item.sourceName ?? '',
    importedAt: item.importedAt ?? '',
    createdAt: item.createdAt ?? Date.now(),
    updatedAt: item.updatedAt ?? Date.now(),
  }))

  const plannedMeals = parsed.plannedMeals ?? Object.fromEntries(
    Object.entries(parsed.weeklyPlan ?? {}).map(([date, meals]) => [
      date,
      (meals ?? []).map((meal) => ({
        id: meal.id,
        recipeId: meal.recipeId ?? meal.mealTemplateId,
        slot: meal.slot ?? meal.mealType ?? 'dinner',
        servingsOverride: meal.servingsOverride ?? '',
        createdAt: meal.createdAt ?? Date.now(),
        updatedAt: meal.updatedAt ?? Date.now(),
      })),
    ]),
  )

  return {
    ...parsed,
    recipes,
    plannedMeals,
    shoppingRange: parsed.shoppingRange ?? createDefaultShoppingRange(),
  }
}
```

- [ ] **Step 5: Run the storage test to verify it passes**

Run: `npm test -- src/test/storage.test.js`
Expected: PASS

- [ ] **Step 6: Do not commit yet**

Run: `git status`
Expected: FAIL with `fatal: not a git repository`, so skip commit in this workspace

## Task 2: Build the Recipe Library and Editor UI

**Files:**
- Modify: `src/App.jsx`
- Create: `src/components/MealsScreen.jsx`
- Create: `src/components/RecipeEditorModal.jsx`
- Modify: `src/styles.css`
- Test: `src/test/recipeEditor.test.jsx`

- [ ] **Step 1: Write the failing recipe editor test**

```jsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import RecipeEditorModal from '../components/RecipeEditorModal'

describe('RecipeEditorModal', () => {
  it('blocks save until the recipe has an image', () => {
    render(
      <RecipeEditorModal
        open
        recipe={{ title: 'Soup', image: '', mealTypes: ['dinner'], servings: '2', ingredients: [], instructions: [''] }}
        mode="manual"
        onClose={() => {}}
        onSave={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /save recipe/i }))

    expect(screen.getByText(/image is required/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the editor test to verify it fails**

Run: `npm test -- src/test/recipeEditor.test.jsx`
Expected: FAIL with missing component

- [ ] **Step 3: Create the recipe editor modal**

```jsx
// src/components/RecipeEditorModal.jsx
import { useState } from 'react'

export default function RecipeEditorModal({ open, recipe, mode, onClose, onSave }) {
  const [draft, setDraft] = useState(recipe)
  const [error, setError] = useState('')

  if (!open) return null

  const handleSave = () => {
    if (!draft.image.trim()) {
      setError('Image is required before saving.')
      return
    }
    onSave(draft)
  }

  return (
    <dialog open className="modal recipe-modal">
      <h3>{mode === 'import' ? 'Review Imported Recipe' : 'New Recipe'}</h3>
      <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Recipe name" />
      <input value={draft.image} onChange={(e) => setDraft({ ...draft, image: e.target.value })} placeholder="Image URL" />
      {error ? <p className="error-text">{error}</p> : null}
      <button onClick={handleSave}>Save recipe</button>
      <button onClick={onClose}>Cancel</button>
    </dialog>
  )
}
```

- [ ] **Step 4: Extract the meals screen from `src/App.jsx`**

```jsx
// src/components/MealsScreen.jsx
export default function MealsScreen({
  recipes,
  selectedDate,
  plannedMeals,
  onAssignRecipe,
  onCreateRecipe,
  onImportRecipe,
}) {
  return (
    <div className="screen">
      <article className="card">
        <div className="list-row">
          <h2>Recipe Library</h2>
          <div className="filter-row">
            <button onClick={onCreateRecipe}>Add recipe</button>
            <button onClick={onImportRecipe}>Import from link</button>
          </div>
        </div>
      </article>
    </div>
  )
}
```

- [ ] **Step 5: Run the editor test to verify it passes**

Run: `npm test -- src/test/recipeEditor.test.jsx`
Expected: PASS

- [ ] **Step 6: Run lint on the extracted UI**

Run: `npm run lint`
Expected: PASS

## Task 3: Add the Reviewable URL Import Flow

**Files:**
- Create: `src/utils/recipeImport.js`
- Create: `server/extractRecipeFromHtml.mjs`
- Create: `server/recipeImport.mjs`
- Create: `src/test/recipeImport.test.js`
- Modify: `src/components/RecipeEditorModal.jsx`
- Modify: `src/components/MealsScreen.jsx`

- [ ] **Step 1: Write the failing recipe import normalization test**

```js
import { describe, expect, it } from 'vitest'
import { normalizeImportedRecipe } from '../utils/recipeImport'

describe('normalizeImportedRecipe', () => {
  it('keeps macros when the source provides nutrition data', () => {
    const normalized = normalizeImportedRecipe({
      title: 'Protein Oats',
      image: 'https://img.example.com/oats.jpg',
      recipeYield: '2 servings',
      nutrition: { calories: '320 calories', proteinContent: '18 g', carbohydrateContent: '42 g', fatContent: '9 g' },
      recipeIngredient: ['1 cup oats'],
      recipeInstructions: ['Mix', 'Chill'],
    })

    expect(normalized.macros).toEqual({
      calories: '320 calories',
      protein: '18 g',
      carbs: '42 g',
      fat: '9 g',
    })
  })
})
```

- [ ] **Step 2: Run the import test to verify it fails**

Run: `npm test -- src/test/recipeImport.test.js`
Expected: FAIL with missing normalizer

- [ ] **Step 3: Implement HTML extraction and normalization**

```js
// server/extractRecipeFromHtml.mjs
export function extractRecipeFromHtml(html, sourceUrl) {
  const matches = [...html.matchAll(/<script type="application\\/ld\\+json">([\\s\\S]*?)<\\/script>/g)]
  for (const [, rawJson] of matches) {
    const parsed = JSON.parse(rawJson)
    const candidates = Array.isArray(parsed) ? parsed : [parsed, ...(parsed['@graph'] ?? [])]
    const recipe = candidates.find((item) => item?.['@type'] === 'Recipe')
    if (!recipe) continue
    return {
      title: recipe.name ?? '',
      image: Array.isArray(recipe.image) ? recipe.image[0] : recipe.image ?? '',
      recipeYield: recipe.recipeYield ?? '',
      recipeIngredient: recipe.recipeIngredient ?? [],
      recipeInstructions: (recipe.recipeInstructions ?? []).map((step) => step.text ?? step),
      nutrition: recipe.nutrition ?? null,
      sourceUrl,
    }
  }
  throw new Error('No recipe metadata found on this page.')
}
```

```js
// src/utils/recipeImport.js
export function normalizeImportedRecipe(raw) {
  return {
    title: raw.title ?? '',
    image: raw.image ?? '',
    servings: raw.recipeYield ?? '',
    ingredients: (raw.recipeIngredient ?? []).map((line, index) => ({
      id: `import-${index}`,
      name: line,
      quantity: '',
      unit: '',
      sectionId: '',
      notes: '',
    })),
    instructions: raw.recipeInstructions?.length ? raw.recipeInstructions : [''],
    notes: '',
    macros: raw.nutrition
      ? {
          calories: raw.nutrition.calories ?? '',
          protein: raw.nutrition.proteinContent ?? '',
          carbs: raw.nutrition.carbohydrateContent ?? '',
          fat: raw.nutrition.fatContent ?? '',
        }
      : null,
    sourceUrl: raw.sourceUrl ?? '',
    sourceName: raw.sourceUrl ? new URL(raw.sourceUrl).hostname.replace(/^www\\./, '') : '',
    importedAt: new Date().toISOString(),
  }
}
```

- [ ] **Step 4: Add the tiny import endpoint**

```js
// server/recipeImport.mjs
import http from 'node:http'
import { extractRecipeFromHtml } from './extractRecipeFromHtml.mjs'

http
  .createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/api/import-recipe') {
      res.writeHead(404).end()
      return
    }

    const body = await new Promise((resolve) => {
      let raw = ''
      req.on('data', (chunk) => (raw += chunk))
      req.on('end', () => resolve(JSON.parse(raw)))
    })

    const response = await fetch(body.url)
    const html = await response.text()
    const recipe = extractRecipeFromHtml(html, body.url)

    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify(recipe))
  })
  .listen(4174)
```

- [ ] **Step 5: Run the import test to verify it passes**

Run: `npm test -- src/test/recipeImport.test.js`
Expected: PASS

- [ ] **Step 6: Verify the endpoint manually**

Run: `node server/recipeImport.mjs`
Expected: Server starts on port `4174` without throwing

## Task 4: Wire Recipes Into the Planner and Assignment Flow

**Files:**
- Modify: `src/App.jsx`
- Create: `src/components/PlanScreen.jsx`
- Modify: `src/components/MealsScreen.jsx`
- Modify: `src/utils/recipes.js`
- Modify: `src/styles.css`
- Test: `src/test/plannerAssignments.test.jsx`

- [ ] **Step 1: Write the failing planner assignment test**

```jsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PlanScreen from '../components/PlanScreen'

describe('PlanScreen', () => {
  it('shows the assigned recipe title for the selected day slot', () => {
    render(
      <PlanScreen
        selectedDate="2026-04-29"
        monthCells={[new Date('2026-04-29T00:00:00')]}
        recipes={[{ id: 'recipe-1', title: 'Turkey Chili' }]}
        plannedMeals={{ '2026-04-29': [{ id: 'planned-1', recipeId: 'recipe-1', slot: 'dinner' }] }}
        onSelectDate={() => {}}
      />,
    )

    expect(screen.getByText(/turkey chili/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the planner assignment test to verify it fails**

Run: `npm test -- src/test/plannerAssignments.test.jsx`
Expected: FAIL with missing `PlanScreen`

- [ ] **Step 3: Create the planner screen and switch `weeklyPlan` usage to `plannedMeals`**

```jsx
// src/components/PlanScreen.jsx
import { MEAL_TYPES } from '../utils/recipes'

export default function PlanScreen({ selectedDate, monthCells, plannedMeals, recipes, onSelectDate }) {
  const dayMeals = plannedMeals[selectedDate] ?? []
  const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]))

  return (
    <div className="screen">
      <article className="card">
        <div className="calendar-grid">
          {monthCells.map((cellDate) => {
            if (!cellDate) return <div key={`empty-${Math.random()}`} className="calendar-cell empty-cell" />
            const iso = cellDate.toISOString().split('T')[0]
            return (
              <button key={iso} className={`calendar-cell ${iso === selectedDate ? 'selected-cell' : ''}`} onClick={() => onSelectDate(iso)}>
                <span>{cellDate.getDate()}</span>
                {(plannedMeals[iso] ?? []).length > 0 ? <small>{(plannedMeals[iso] ?? []).length} meal(s)</small> : null}
              </button>
            )
          })}
        </div>
      </article>

      <article className="card">
        <h3>{selectedDate}</h3>
        {MEAL_TYPES.map((slot) => {
          const planned = dayMeals.find((meal) => meal.slot === slot)
          const recipe = planned ? recipeMap.get(planned.recipeId) : null
          return <div key={slot} className="list-row"><strong>{slot}</strong><span>{recipe?.title ?? 'Not planned'}</span></div>
        })}
      </article>
    </div>
  )
}
```

- [ ] **Step 4: Run the planner assignment test to verify it passes**

Run: `npm test -- src/test/plannerAssignments.test.jsx`
Expected: PASS

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Start the UI and verify the visible slice**

Run: `npm run dev`
Expected: Vite serves the app and the `Plan` + `Meals` tabs show the new recipe-library and selected-day assignment flow

## Task 5: Generate Shopping Lists From the Selected Week or Manual Range

**Files:**
- Modify: `src/utils/shopping.js`
- Create: `src/components/ShoppingScreen.jsx`
- Modify: `src/App.jsx`
- Test: `src/test/shopping.test.js`

- [ ] **Step 1: Write the failing shopping-range test**

```js
import { describe, expect, it } from 'vitest'
import { buildShoppingListForRange } from '../utils/shopping'

describe('buildShoppingListForRange', () => {
  it('includes recipe source titles when combining ingredients', () => {
    const state = {
      recipes: [
        {
          id: 'recipe-1',
          title: 'Turkey Chili',
          servings: '4',
          ingredients: [{ id: 'ing-1', name: 'onion', quantity: '1', unit: '', sectionId: 'produce', notes: '' }],
        },
      ],
      plannedMeals: {
        '2026-04-29': [{ id: 'planned-1', recipeId: 'recipe-1', slot: 'dinner', servingsOverride: '' }],
      },
      pantryItems: {},
      storeSections: [{ id: 'produce', name: 'Produce', sortOrder: 0 }],
      shopping: { checked: {}, adHocItems: [], mutationQueue: [] },
    }

    const sections = buildShoppingListForRange(state, ['2026-04-29'])
    expect(sections[0].items[0].sourceRecipes).toEqual(['Turkey Chili'])
  })
})
```

- [ ] **Step 2: Run the shopping test to verify it fails**

Run: `npm test -- src/test/shopping.test.js`
Expected: FAIL with missing `buildShoppingListForRange`

- [ ] **Step 3: Update shopping aggregation and range controls**

```js
// src/utils/shopping.js
export function buildShoppingListForRange(state, dateRange) {
  const buckets = new Map()

  for (const day of dateRange) {
    for (const planned of state.plannedMeals[day] ?? []) {
      const recipe = state.recipes.find((item) => item.id === planned.recipeId)
      if (!recipe) continue

      for (const ingredient of recipe.ingredients) {
        const key = `${ingredient.name.trim().toLowerCase()}::${(ingredient.unit ?? '').trim().toLowerCase()}`
        const existing = buckets.get(key)
        const sourceRecipes = existing ? [...new Set([...existing.sourceRecipes, recipe.title])] : [recipe.title]

        buckets.set(key, {
          ...(existing ?? {
            id: key,
            normalizedName: ingredient.name.trim().toLowerCase(),
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            sectionId: ingredient.sectionId,
          }),
          sourceRecipes,
        })
      }
    }
  }

  return mapBucketsToSections(state, Array.from(buckets.values()))
}
```

```jsx
// src/components/ShoppingScreen.jsx
export default function ShoppingScreen({ sections, rangeMode, startDate, endDate, onRangeModeChange, onStartDateChange, onEndDateChange }) {
  return (
    <div className="screen">
      <article className="card">
        <div className="filter-row">
          <button className={rangeMode === 'selected-week' ? 'active-filter' : ''} onClick={() => onRangeModeChange('selected-week')}>
            Selected week
          </button>
          <button className={rangeMode === 'manual' ? 'active-filter' : ''} onClick={() => onRangeModeChange('manual')}>
            Custom range
          </button>
        </div>
        {rangeMode === 'manual' ? (
          <div className="ingredient-grid">
            <input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} />
            <input type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} />
          </div>
        ) : null}
      </article>
    </div>
  )
}
```

- [ ] **Step 4: Run the shopping test to verify it passes**

Run: `npm test -- src/test/shopping.test.js`
Expected: PASS

- [ ] **Step 5: Run lint and build**

Run: `npm run lint`
Expected: PASS

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Verify the visible behavior in the app**

Run: `npm run dev`
Expected: The `Shop` tab defaults to the selected week and can switch to a manual date range

## Self-Review

### Spec coverage

- Monthly planner view: covered in Task 4.
- Meals window assignment flow: covered in Tasks 2 and 4.
- Recipe library with manual create: covered in Task 2.
- URL import with review/edit: covered in Task 3.
- Required image: covered in Task 2.
- Optional macros from imports: covered in Task 3.
- Shopping list from selected week with manual override: covered in Task 5.
- Recipe-source context in shopping items: covered in Task 5.

### Placeholder scan

- No `TBD` or `TODO` placeholders remain.
- Commands, files, and code-entry points are specified.

### Type consistency

- `recipes` is the canonical recipe collection.
- `plannedMeals[date][]` stores `{ recipeId, slot }`.
- `shoppingRange` stores `{ mode, startDate, endDate }`.

## Notes Before Execution

- This workspace is not currently a Git repository, so commit steps are intentionally skipped.
- The import adapter is designed for a local prototype. If this app is deployed later, the adapter should move into the chosen hosting platform’s server runtime.

Plan complete and saved to `docs/superpowers/plans/2026-04-29-meal-planner-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
