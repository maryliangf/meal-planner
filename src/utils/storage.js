import { makeRecipeKey, ONLINE_RECIPE_CATALOG } from './recipes'

const STORAGE_KEY = 'grocery-planner-v1'

const CATALOG_KEY_BY_TITLE = (() => {
  const m = new Map()
  for (const list of Object.values(ONLINE_RECIPE_CATALOG)) {
    for (const recipe of list) {
      const key = makeRecipeKey({
        catalogId: recipe.id,
        recipeUrl: recipe.url,
        title: recipe.title,
      })
      m.set(String(recipe.title).trim().toLowerCase(), key)
    }
  }
  return m
})()

function backfillTemplateKey(meal) {
  if (meal?.recipeKey) return meal.recipeKey
  const titleLower = String(meal?.title ?? '').trim().toLowerCase()
  const catalogMatch = CATALOG_KEY_BY_TITLE.get(titleLower)
  if (catalogMatch) return catalogMatch
  return makeRecipeKey({ recipeUrl: meal?.recipeUrl, title: meal?.title })
}

const DEFAULT_SECTIONS = [
  'Produce',
  'Dairy',
  'Protein',
  'Bakery',
  'Pantry',
  'Frozen',
  'Snacks',
  'Beverages',
  'Household',
  'Other',
]

export const defaultStoreSections = DEFAULT_SECTIONS.map((name, index) => ({
  id: name.toLowerCase(),
  name,
  sortOrder: index,
}))

export function getWeekDays(today) {
  const date = new Date(today)
  const day = date.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + mondayOffset)

  return Array.from({ length: 7 }).map((_, index) => {
    const copy = new Date(date)
    copy.setDate(date.getDate() + index)
    return copy.toISOString().split('T')[0]
  })
}

export function createMealTemplate() {
  return {
    id: crypto.randomUUID(),
    recipeKey: makeRecipeKey({}),
    title: '',
    mealType: 'dinner',
    recipeUrl: '',
    recipeImageUrl: '',
    defaultServings: '2',
    tags: [],
    ingredients: [{ id: crypto.randomUUID(), name: '', quantity: '', unit: '', sectionId: '', notes: '' }],
  }
}

export function createPlannerState(sections) {
  return {
    user: { id: 'local-user', email: 'demo@example.com' },
    household: { id: 'local-household', name: 'My Household' },
    mealTemplates: [],
    weeklyPlan: {},
    pantryItems: {},
    pantryItemMeta: {},
    discoverPrefs: {
      cuisines: [],
      diets: [],
      usePantryBoost: false,
    },
    storeSections: sections,
    shopping: {
      checked: {},
      adHocItems: [],
      mutationQueue: [],
    },
  }
}

export function loadPlannerState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)

    const rawTemplates = (parsed.mealTemplates ?? []).map((meal) => ({
      ...meal,
      mealType: meal.mealType ?? 'dinner',
      recipeUrl: meal.recipeUrl ?? '',
      recipeImageUrl: meal.recipeImageUrl ?? '',
      tags: Array.isArray(meal.tags)
        ? meal.tags.filter((tag) => tag !== 'catalog-assign')
        : [],
      recipeKey: backfillTemplateKey(meal),
    }))

    const keepers = new Map()
    const idRemap = new Map()
    for (const meal of rawTemplates) {
      const existing = keepers.get(meal.recipeKey)
      if (existing) {
        idRemap.set(meal.id, existing.id)
      } else {
        keepers.set(meal.recipeKey, meal)
      }
    }
    const mealTemplates = Array.from(keepers.values())

    const weeklyPlan = Object.fromEntries(
      Object.entries(parsed.weeklyPlan ?? {}).map(([date, meals]) => [
        date,
        (meals ?? []).map((planned) => ({
          ...planned,
          mealType: planned.mealType ?? 'dinner',
          mealTemplateId:
            idRemap.get(planned.mealTemplateId) ?? planned.mealTemplateId,
        })),
      ]),
    )

    const rawPrefs = parsed.discoverPrefs ?? {}
    const discoverPrefs = {
      cuisines: Array.isArray(rawPrefs.cuisines)
        ? rawPrefs.cuisines
        : rawPrefs.cuisine
          ? [rawPrefs.cuisine]
          : [],
      diets: Array.isArray(rawPrefs.diets)
        ? rawPrefs.diets
        : rawPrefs.diet
          ? [rawPrefs.diet]
          : [],
      usePantryBoost: Boolean(rawPrefs.usePantryBoost),
    }

    const pantryItemMeta = parsed.pantryItemMeta ?? {}

    return { ...parsed, mealTemplates, weeklyPlan, discoverPrefs, pantryItemMeta }
  } catch {
    return null
  }
}

export function persistPlannerState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Keep UX responsive when storage fails in private mode.
  }
}
