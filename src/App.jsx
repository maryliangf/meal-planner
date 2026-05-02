import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  createPlannerState,
  defaultStoreSections,
  getWeekDays,
  loadPlannerState,
  persistPlannerState,
} from './utils/storage'
import {
  addAdHocItem,
  buildShoppingList,
  getSubstitutionSuggestions,
  queueShoppingMutation,
  toggleCheckedState,
} from './utils/shopping'
import {
  createTemplateFromRecipe,
  DEFAULT_MEAL_EMOJI,
  DISCOVER_CUISINES,
  DISCOVER_DIETS,
  makeRecipeKey,
  MEAL_TYPES,
  ONLINE_RECIPE_CATALOG,
} from './utils/recipes'
import {
  countRecipesUnlocked,
  ingredientInPantry,
  recipePantryStats,
} from './utils/pantryMatch'
import { EMOJI_CATEGORIES, pickEmojiForRecipe } from './utils/emoji'
import {
  extractIngredientLinesFromMarkdown,
  fetchRecipePagePlainText,
  parseIngredientLine,
  parseIngredientPaste,
  guessStoreSectionId,
} from './utils/ingredientParse'
import './styles.css'

const TABS = ['Plan', 'Meals', 'Pantry', 'Shop', 'Settings']

const NAV_TABS = [
  { id: 'Meals', label: 'Discover', icon: 'discover' },
  { id: 'Plan', label: 'Planner', icon: 'planner' },
  { id: 'Pantry', label: 'Pantry', icon: 'pantry' },
  { id: 'Shop', label: 'Shopping', icon: 'shopping' },
]

function NavIcon({ name }) {
  if (name === 'discover') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    )
  }
  if (name === 'pantry') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M3 2h18v6H3zM3 10h18v12H3z" />
        <line x1="3" y1="15" x2="21" y2="15" />
      </svg>
    )
  }
  if (name === 'planner') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    )
  }
  if (name === 'shopping') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    )
  }
  return null
}

function formatFilterSummary(values) {
  if (!values || values.length === 0) return 'Any'
  if (values.length === 1) return values[0]
  if (values.length === 2) return values.join(', ')
  return `${values[0]} +${values.length - 1}`
}

function ensureTemplateForRecipe(state, recipe, mealType) {
  const key = makeRecipeKey({
    catalogId: recipe.id,
    recipeUrl: recipe.url,
    title: recipe.title,
  })
  const existing = state.mealTemplates.find((meal) => meal.recipeKey === key)
  if (existing) {
    return { state, template: existing }
  }
  const template = createTemplateFromRecipe(recipe, mealType)
  return {
    state: { ...state, mealTemplates: [template, ...state.mealTemplates] },
    template,
  }
}

function App() {
  const [tab, setTab] = useState('Meals')
  const [state, setState] = useState(() =>
    loadPlannerState() ?? createPlannerState(defaultStoreSections),
  )
  const [selectedItem, setSelectedItem] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [browseQuery, setBrowseQuery] = useState('')
  const [mealFilter, setMealFilter] = useState('all')
  const [pantrySuggestionSeed, setPantrySuggestionSeed] = useState(0)
  const [planMonth, setPlanMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [planView, setPlanView] = useState('grid')
  const [mealAssignmentDate, setMealAssignmentDate] = useState(() =>
    new Date().toISOString().split('T')[0],
  )
  const [mealExplorer, setMealExplorer] = useState(null)
  const [explorerQuery, setExplorerQuery] = useState('')
  const [explorerRecipeFilter, setExplorerRecipeFilter] = useState('all')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [linkMealType, setLinkMealType] = useState('dinner')
  const [linkServings, setLinkServings] = useState('4')
  const [linkPaste, setLinkPaste] = useState('')
  const [linkBusy, setLinkBusy] = useState(false)
  const [linkError, setLinkError] = useState('')
  const [ownRecipeOpen, setOwnRecipeOpen] = useState(false)
  const [discoverSheet, setDiscoverSheet] = useState(null)
  const [sheetCuisinePick, setSheetCuisinePick] = useState([])
  const [sheetDietPick, setSheetDietPick] = useState([])
  const [discoverDetailRecipe, setDiscoverDetailRecipe] = useState(null)
  const [pantryListQuery, setPantryListQuery] = useState('')
  const [discoverToast, setDiscoverToast] = useState(null)
  const [plannerSlotAction, setPlannerSlotAction] = useState(null)
  const [replaceFlow, setReplaceFlow] = useState(null)

  const weekDays = useMemo(() => getWeekDays(new Date()), [])
  const shoppingList = useMemo(() => buildShoppingList(state, weekDays), [state, weekDays])
  const shopSummary = useMemo(() => {
    let mealCount = 0
    for (const day of weekDays) {
      mealCount += (state.weeklyPlan[day] ?? []).length
    }
    let itemCount = 0
    for (const section of shoppingList) {
      itemCount += section.items.length
    }
    return { mealCount, itemCount }
  }, [shoppingList, state.weeklyPlan, weekDays])
  const browseRecipes = useMemo(
    () =>
      MEAL_TYPES.flatMap((mealType) =>
        (ONLINE_RECIPE_CATALOG[mealType] ?? []).map((recipe) => ({ ...recipe, mealType })),
      ),
    [],
  )

  const availableCuisines = useMemo(() => {
    const set = new Set()
    for (const recipe of browseRecipes) {
      if (recipe.cuisine) set.add(recipe.cuisine)
    }
    return DISCOVER_CUISINES.filter((c) => set.has(c))
  }, [browseRecipes])

  const availableDiets = useMemo(() => {
    const set = new Set()
    for (const recipe of browseRecipes) {
      for (const tag of recipe.dietTags ?? []) set.add(tag)
    }
    return DISCOVER_DIETS.filter((d) => set.has(d))
  }, [browseRecipes])

  const discoverPrefs = useMemo(() => {
    const raw = state.discoverPrefs ?? {}
    return {
      cuisines: Array.isArray(raw.cuisines)
        ? raw.cuisines
        : raw.cuisine
          ? [raw.cuisine]
          : [],
      diets: Array.isArray(raw.diets)
        ? raw.diets
        : raw.diet
          ? [raw.diet]
          : [],
      usePantryBoost: Boolean(raw.usePantryBoost),
    }
  }, [state.discoverPrefs])

  /** Map of recipeKey -> plannedMealId for meals planned on the current assignment date.
   *  Lets the Discover `+` button toggle: show ✓ + remove if already assigned. */
  const assignedOnDateByRecipeKey = useMemo(() => {
    const dayPlans = state.weeklyPlan[mealAssignmentDate] ?? []
    const templateById = new Map(state.mealTemplates.map((tpl) => [tpl.id, tpl]))
    const map = new Map()
    for (const planned of dayPlans) {
      const tpl = templateById.get(planned.mealTemplateId)
      if (tpl?.recipeKey) {
        map.set(tpl.recipeKey, planned.id)
      }
    }
    return map
  }, [state.weeklyPlan, state.mealTemplates, mealAssignmentDate])

  const discoverCatalogList = useMemo(() => {
    const query = browseQuery.trim().toLowerCase()
    let list = browseRecipes.filter((recipe) => {
      const mealTypeMatches = mealFilter === 'all' || recipe.mealType === mealFilter
      const queryMatches =
        query.length === 0 ||
        recipe.title.toLowerCase().includes(query) ||
        (recipe.ingredients ?? []).some((ingredient) =>
          ingredient.name.toLowerCase().includes(query),
        )
      if (!mealTypeMatches || !queryMatches) return false
      if (
        discoverPrefs.cuisines.length > 0 &&
        !discoverPrefs.cuisines.includes(recipe.cuisine)
      ) {
        return false
      }
      if (
        discoverPrefs.diets.length > 0 &&
        !discoverPrefs.diets.some((d) => (recipe.dietTags ?? []).includes(d))
      ) {
        return false
      }
      return true
    })
    if (discoverPrefs.usePantryBoost) {
      list = [...list].sort((a, b) => {
        const sa = recipePantryStats(a, state.pantryItems)
        const sb = recipePantryStats(b, state.pantryItems)
        if (sb.ratio !== sa.ratio) return sb.ratio - sa.ratio
        return a.title.localeCompare(b.title)
      })
    }
    return list
  }, [
    browseRecipes,
    browseQuery,
    mealFilter,
    discoverPrefs.cuisines,
    discoverPrefs.diets,
    discoverPrefs.usePantryBoost,
    state.pantryItems,
  ])

  const recipesUnlockedCount = useMemo(
    () => countRecipesUnlocked(browseRecipes, state.pantryItems, 0.5),
    [browseRecipes, state.pantryItems],
  )

  const pantryItemCount = useMemo(
    () => Object.keys(state.pantryItems).filter((k) => state.pantryItems[k]).length,
    [state.pantryItems],
  )

  const filteredPantryEntries = useMemo(() => {
    const q = pantryListQuery.trim().toLowerCase()
    return Object.entries(state.pantryItems).filter(([name]) =>
      q ? name.includes(q) : true,
    )
  }, [state.pantryItems, pantryListQuery])

  const discoverDateLabel = useMemo(() => {
    const d = new Date(`${mealAssignmentDate}T12:00:00`)
    if (Number.isNaN(d.getTime())) return mealAssignmentDate
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
  }, [mealAssignmentDate])
  const pantrySuggestions = (() => {
    const suggestedNames = new Set([
      'milk',
      'eggs',
      'bread',
      'olive oil',
      'butter',
      'rice',
      'pasta',
      'onion',
      'garlic',
      'spinach',
    ])

    for (const recipe of browseRecipes) {
      for (const ingredient of recipe.ingredients ?? []) {
        if (ingredient.name?.trim()) {
          suggestedNames.add(ingredient.name.trim().toLowerCase())
        }
      }
    }

    const available = Array.from(suggestedNames).filter((name) => !state.pantryItems[name])
    const offset = available.length === 0 ? 0 : pantrySuggestionSeed % available.length
    const rotated = [...available.slice(offset), ...available.slice(0, offset)]
    return rotated.slice(0, 8)
  })()

  const updateState = (updater) => {
    setState((current) => {
      const next = updater(current)
      persistPlannerState(next)
      return next
    })
  }

  const updateDiscoverPrefs = (patch) => {
    updateState((current) => ({
      ...current,
      discoverPrefs: {
        cuisines: [],
        diets: [],
        usePantryBoost: false,
        ...(current.discoverPrefs ?? {}),
        ...patch,
      },
    }))
  }

  const assignMeal = (date, mealTemplateId, mealType) => {
    if (!mealTemplateId) return
    updateState((current) => ({
      ...current,
      weeklyPlan: {
        ...current.weeklyPlan,
        [date]: [
          ...(current.weeklyPlan[date] ?? []).filter((meal) => meal.mealType !== mealType),
          { id: crypto.randomUUID(), mealTemplateId, mealType, servingsOverride: '' },
        ],
      },
    }))
  }

  const addRecipeAndAssignToDate = (date, recipe, slotMealType) => {
    updateState((current) => {
      const { state: nextState, template } = ensureTemplateForRecipe(current, recipe, slotMealType)
      return {
        ...nextState,
        weeklyPlan: {
          ...nextState.weeklyPlan,
          [date]: [
            ...(nextState.weeklyPlan[date] ?? []).filter(
              (meal) => meal.mealType !== slotMealType,
            ),
            {
              id: crypto.randomUUID(),
              mealTemplateId: template.id,
              mealType: slotMealType,
              servingsOverride: '',
            },
          ],
        },
      }
    })
  }

  const quickAddRecipeToPlan = (recipe) => {
    const slotMealType = recipe.mealType ?? 'dinner'
    addRecipeAndAssignToDate(mealAssignmentDate, recipe, slotMealType)
    setDiscoverToast({
      id: crypto.randomUUID(),
      message: `Added ${recipe.title} to ${formatDateBadge(mealAssignmentDate)} ${slotMealType}`,
    })
  }

  const quickRemoveRecipeFromPlan = (plannedMealId, recipeTitle) => {
    removePlannedMeal(mealAssignmentDate, plannedMealId)
    setDiscoverToast({
      id: crypto.randomUUID(),
      message: `Removed ${recipeTitle} from ${formatDateBadge(mealAssignmentDate)}`,
    })
  }

  useEffect(() => {
    if (!discoverToast) return undefined
    const t = setTimeout(() => setDiscoverToast(null), 2400)
    return () => clearTimeout(t)
  }, [discoverToast])

  const removePlannedMeal = (date, plannedMealId) => {
    updateState((current) => ({
      ...current,
      weeklyPlan: {
        ...current.weeklyPlan,
        [date]: (current.weeklyPlan[date] ?? []).filter((meal) => meal.id !== plannedMealId),
      },
    }))
  }

  /** Move an existing planned meal to a different date+slot, preserving the template id. */
  const movePlannedMeal = (fromDate, plannedMealId, toDate, toMealType) => {
    updateState((current) => {
      const fromList = current.weeklyPlan[fromDate] ?? []
      const meal = fromList.find((m) => m.id === plannedMealId)
      if (!meal) return current
      const nextFromList = fromList.filter((m) => m.id !== plannedMealId)
      const toList = current.weeklyPlan[toDate] ?? []
      const dedupedToList = toList.filter((m) => m.mealType !== toMealType)
      const movedMeal = { ...meal, mealType: toMealType }
      const sameDay = fromDate === toDate
      const baseList = sameDay
        ? nextFromList.filter((m) => m.mealType !== toMealType)
        : nextFromList
      return {
        ...current,
        weeklyPlan: {
          ...current.weeklyPlan,
          [fromDate]: sameDay ? [...baseList, movedMeal] : baseList,
          ...(sameDay
            ? {}
            : { [toDate]: [...dedupedToList, movedMeal] }),
        },
      }
    })
  }

  const setTemplateEmoji = (templateId, nextEmoji) => {
    updateState((current) => ({
      ...current,
      mealTemplates: current.mealTemplates.map((meal) =>
        meal.id === templateId ? { ...meal, emoji: nextEmoji } : meal,
      ),
    }))
  }

  const togglePantryItem = (name) => {
    updateState((current) => {
      const key = name.trim().toLowerCase()
      const exists = current.pantryItems[key]
      return {
        ...current,
        pantryItems: {
          ...current.pantryItems,
          [key]: !exists,
        },
      }
    })
  }

  const removePantryItem = (nameKey) => {
    updateState((current) => {
      const { [nameKey]: _omitItem, ...restItems } = current.pantryItems
      const { [nameKey]: _omitMeta, ...restMeta } = current.pantryItemMeta ?? {}
      return { ...current, pantryItems: restItems, pantryItemMeta: restMeta }
    })
  }

  const setPantryItemQty = (nameKey, qty) => {
    updateState((current) => {
      const meta = { ...(current.pantryItemMeta ?? {}) }
      const trimmed = String(qty ?? '').trim()
      if (!trimmed) {
        delete meta[nameKey]
      } else {
        meta[nameKey] = { ...(meta[nameKey] ?? {}), qty: trimmed }
      }
      return { ...current, pantryItemMeta: meta }
    })
  }

  const refreshPantrySuggestions = () => {
    setPantrySuggestionSeed((current) => current + 3)
  }

  const toggleShoppingItem = (itemId) => {
    updateState((current) => {
      const checked = toggleCheckedState(current.shopping.checked, itemId)
      return queueShoppingMutation({ ...current, shopping: { ...current.shopping, checked } }, 'toggle')
    })
  }

  const addShoppingItem = (label, sectionId) => {
    if (!label.trim()) return
    updateState((current) => addAdHocItem(current, label, sectionId))
  }

  const updateStoreSection = (sectionId, field, value) => {
    updateState((current) => ({
      ...current,
      storeSections: current.storeSections.map((section) =>
        section.id === sectionId ? { ...section, [field]: value } : section,
      ),
    }))
  }

  const monthLabel = planMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
  const monthCells = getMonthCells(planMonth)
  const weekAnchor = selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date()
  const weekCells = getWeekFromDate(weekAnchor)
  const weekLabel = getWeekLabel(weekCells)
  const planSelectedIso = selectedDate || new Date().toISOString().split('T')[0]

  const weekStats = useMemo(() => {
    const slots = weekCells.length * MEAL_TYPES.length
    let planned = 0
    let cookSum = 0
    let cookCount = 0
    for (const dayDate of weekCells) {
      const iso = toIsoDate(dayDate)
      const meals = state.weeklyPlan[iso] ?? []
      for (const planned1 of meals) {
        if (!planned1?.mealTemplateId) continue
        planned += 1
        const tpl = state.mealTemplates.find((t) => t.id === planned1.mealTemplateId)
        const minutes = Number(tpl?.prepMinutes)
        if (Number.isFinite(minutes) && minutes > 0) {
          cookSum += minutes
          cookCount += 1
        }
      }
    }
    return {
      slots,
      planned,
      avgCookMinutes: cookCount > 0 ? Math.round(cookSum / cookCount) : null,
    }
  }, [weekCells, state.weeklyPlan, state.mealTemplates])

  const explorerFilteredRecipes = useMemo(() => {
    if (!mealExplorer) return []
    const q = explorerQuery.trim().toLowerCase()
    const savedKeys = new Set(
      state.mealTemplates.map((meal) => meal.recipeKey).filter(Boolean),
    )
    return browseRecipes.filter((recipe) => {
      const typeOk = explorerRecipeFilter === 'all' || recipe.mealType === explorerRecipeFilter
      const qOk =
        !q ||
        recipe.title.toLowerCase().includes(q) ||
        (recipe.ingredients ?? []).some((ingredient) =>
          ingredient.name.toLowerCase().includes(q),
        )
      const key = makeRecipeKey({
        catalogId: recipe.id,
        recipeUrl: recipe.url,
        title: recipe.title,
      })
      return typeOk && qOk && !savedKeys.has(key)
    })
  }, [browseRecipes, explorerQuery, explorerRecipeFilter, mealExplorer, state.mealTemplates])

  const explorerFilteredTemplates = useMemo(() => {
    if (!mealExplorer) return []
    const q = explorerQuery.trim().toLowerCase()
    return state.mealTemplates.filter((meal) => {
      if (meal.mealType !== mealExplorer.slotMealType) return false
      if (!q) return true
      return (meal.title || '').toLowerCase().includes(q)
    })
  }, [explorerQuery, mealExplorer, state.mealTemplates])

  const selectTab = (next) => {
    if (next !== 'Meals') {
      setDiscoverDetailRecipe(null)
      setDiscoverSheet(null)
    }
    setTab(next)
  }

  const openMealsForDayEdit = (dateIso, mealType) => {
    setMealAssignmentDate(dateIso)
    setExplorerQuery('')
    setExplorerRecipeFilter(mealType ?? 'all')
    setMealExplorer({ slotMealType: mealType ?? 'dinner' })
  }


  const closeMealExplorer = () => {
    setMealExplorer(null)
  }

  const pickTemplateForSlot = (slotMealType, templateId) => {
    assignMeal(mealAssignmentDate, templateId, slotMealType)
    closeMealExplorer()
  }

  const pickRecipeForSlot = (slotMealType, recipe) => {
    addRecipeAndAssignToDate(mealAssignmentDate, recipe, slotMealType)
    closeMealExplorer()
  }

  const addMealFromLink = async ({ alsoAssignToDate } = {}) => {
    setLinkError('')
    setLinkBusy(true)
    try {
      let ingredients = []
      if (linkPaste.trim()) {
        ingredients = parseIngredientPaste(linkPaste, state.storeSections).filter((row) => row.name.trim())
      } else if (linkUrl.trim()) {
        let lines = []
        const markdown = await fetchRecipePagePlainText(linkUrl)
        lines = extractIngredientLinesFromMarkdown(markdown)
        if (lines.length === 0) {
          lines = markdown
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 2 && /^[-*•\d]/.test(l))
            .slice(0, 40)
            .map((l) => l.replace(/^[-*•\d.)]+\s*/, ''))
        }
        if (lines.length === 0) {
          throw new Error(
            'Could not find ingredients on that page. Paste the ingredient list from the recipe (one line per item).',
          )
        }
        ingredients = lines
          .map((line) => {
            const parsed = parseIngredientLine(line)
            const name = parsed.name.trim()
            if (!name) return null
            return {
              id: crypto.randomUUID(),
              name,
              quantity: parsed.quantity,
              unit: parsed.unit,
              sectionId: guessStoreSectionId(name, state.storeSections),
              notes: '',
            }
          })
          .filter(Boolean)
      } else {
        throw new Error('Add a recipe URL, or paste ingredients below.')
      }

      if (ingredients.length === 0) {
        throw new Error('No ingredients parsed. Check the format (one ingredient per line).')
      }

      const title = linkTitle.trim() || 'Recipe from link'
      const recipeUrl = linkUrl.trim()
      const recipeKey = makeRecipeKey({ recipeUrl, title })
      const newTemplateId = crypto.randomUUID()
      let resolvedTemplateId = newTemplateId

      updateState((current) => {
        const existing = current.mealTemplates.find((meal) => meal.recipeKey === recipeKey)
        let nextTemplates
        if (existing) {
          resolvedTemplateId = existing.id
          nextTemplates = current.mealTemplates.map((meal) =>
            meal.id === existing.id
              ? {
                  ...meal,
                  title,
                  mealType: linkMealType,
                  recipeUrl,
                  defaultServings: linkServings.trim() || meal.defaultServings || '4',
                  ingredients,
                }
              : meal,
          )
        } else {
          const template = {
            id: newTemplateId,
            recipeKey,
            title,
            mealType: linkMealType,
            recipeUrl,
            recipeImageUrl: '',
            defaultServings: linkServings.trim() || '4',
            emoji: pickEmojiForRecipe({ title, ingredients, mealType: linkMealType }),
            tags: ['from link'],
            ingredients,
          }
          nextTemplates = [template, ...current.mealTemplates]
        }

        let nextWeeklyPlan = current.weeklyPlan
        if (alsoAssignToDate) {
          nextWeeklyPlan = {
            ...current.weeklyPlan,
            [alsoAssignToDate]: [
              ...(current.weeklyPlan[alsoAssignToDate] ?? []).filter(
                (meal) => meal.mealType !== linkMealType,
              ),
              {
                id: crypto.randomUUID(),
                mealTemplateId: resolvedTemplateId,
                mealType: linkMealType,
                servingsOverride: '',
              },
            ],
          }
        }
        return { ...current, mealTemplates: nextTemplates, weeklyPlan: nextWeeklyPlan }
      })

      setLinkUrl('')
      setLinkTitle('')
      setLinkPaste('')
      setLinkError('')
      if (alsoAssignToDate) {
        setOwnRecipeOpen(false)
      }
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLinkBusy(false)
    }
  }

  return (
    <main className="app">
      <header className="topbar">
        <h1>Grocery & Meal Planner</h1>
        </header>

      <section className="content">
        {tab === 'Plan' && (
          <div className="screen plan-screen">
            <header className="plan-header">
              <div className="plan-header-titles">
                <p className="plan-title">
                  {planView === 'month' ? 'This month' : 'This week'}
                </p>
                <p className="plan-subtitle">
                  {planView === 'month' ? monthLabel : weekLabel}
                </p>
              </div>
              <div className="plan-header-controls">
                <div className="plan-segments">
                  <button
                    type="button"
                    className={planView === 'grid' ? 'plan-segment plan-segment--active' : 'plan-segment'}
                    onClick={() => setPlanView('grid')}
                  >
                    Week
                  </button>
                  <button
                    type="button"
                    className={planView === 'month' ? 'plan-segment plan-segment--active' : 'plan-segment'}
                    onClick={() => setPlanView('month')}
                  >
                    Month
                  </button>
                </div>
                {planView === 'month' ? (
                  <div className="plan-nav">
                    <button
                      type="button"
                      className="plan-nav-btn"
                      onClick={() =>
                        setPlanMonth(
                          (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
                        )
                      }
                      aria-label="Previous month"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      className="plan-nav-btn"
                      onClick={() =>
                        setPlanMonth(
                          (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
                        )
                      }
                      aria-label="Next month"
                    >
                      →
                    </button>
                  </div>
                ) : (
                  <div className="plan-nav">
                    <button
                      type="button"
                      className="plan-nav-btn"
                      onClick={() =>
                        setSelectedDate((current) => {
                          const base = current ? new Date(`${current}T00:00:00`) : new Date()
                          base.setDate(base.getDate() - 7)
                          return toIsoDate(base)
                        })
                      }
                      aria-label="Previous week"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      className="plan-nav-btn"
                      onClick={() =>
                        setSelectedDate((current) => {
                          const base = current ? new Date(`${current}T00:00:00`) : new Date()
                          base.setDate(base.getDate() + 7)
                          return toIsoDate(base)
                        })
                      }
                      aria-label="Next week"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
            </header>
            <section className="plan-panel plan-panel--calendar">
              {planView === 'grid' ? (
                <PlannerWeekGrid
                  weekCells={weekCells}
                  weeklyPlan={state.weeklyPlan}
                  templates={state.mealTemplates}
                  selectedIso={planSelectedIso}
                  onSelectDate={setSelectedDate}
                  onPickEmpty={(iso, mealType) => openMealsForDayEdit(iso, mealType)}
                  onPickFilled={({ iso, mealType, plannedMealId }) =>
                    setPlannerSlotAction({ iso, mealType, plannedMealId, view: 'menu' })
                  }
                />
              ) : (
                <>
                  <div className="calendar-grid-header">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <strong key={day}>{day}</strong>
                    ))}
                  </div>
                  <div className="calendar-grid">
                    {monthCells.map((cellDate, cellIndex) => {
                      if (!cellDate)
                        return <div key={`empty-${cellIndex}`} className="calendar-cell empty-cell" />
                      const iso = toIsoDate(cellDate)
                      const isCurrentMonth = cellDate.getMonth() === planMonth.getMonth()
                      const isSelected = iso === planSelectedIso
                      const plannedCount = (state.weeklyPlan[iso] ?? []).length
                      return (
                        <button
                          key={iso}
                          className={`calendar-cell ${isSelected ? 'selected-cell' : ''}`}
                          onClick={() => setSelectedDate(iso)}
                        >
                          <span className={isCurrentMonth ? '' : 'muted'}>{cellDate.getDate()}</span>
                          {plannedCount > 0 && <small>{plannedCount} meal(s)</small>}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </section>
            <section className="plan-week-summary">
              <div className="plan-stat-card">
                <p className="plan-stat-label">Meals planned</p>
                <p className="plan-stat-value">
                  {weekStats.planned}
                  <span className="plan-stat-sub"> / {weekStats.slots}</span>
                </p>
              </div>
              <div className="plan-stat-card">
                <p className="plan-stat-label">Avg. cook time</p>
                <p className="plan-stat-value">
                  {weekStats.avgCookMinutes != null ? weekStats.avgCookMinutes : '—'}
                  <span className="plan-stat-sub"> min</span>
                </p>
              </div>
            </section>
            <button
              type="button"
              className="plan-shop-cta"
              onClick={() => selectTab('Shop')}
            >
              View shopping list →
            </button>
          </div>
        )}

        {tab === 'Meals' && (
          <div className="screen discover-screen">
            <header className="discover-screen-header">
              <div>
                <h2 className="discover-screen-title">Discover</h2>
                <label className="discover-screen-date">
                  <span className="discover-screen-date-label">{discoverDateLabel}</span>
                  <input
                    className="discover-screen-date-input"
                    type="date"
                    value={mealAssignmentDate}
                    onChange={(e) => setMealAssignmentDate(e.target.value)}
                    aria-label="Planning date"
                  />
                  <svg
                    className="discover-screen-date-icon"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </label>
              </div>
              <button
                type="button"
                className="discover-add-recipe-btn"
                onClick={() => setOwnRecipeOpen((open) => !open)}
                aria-expanded={ownRecipeOpen}
              >
                {ownRecipeOpen ? 'Close' : '+ Add my recipe'}
              </button>
            </header>

            {ownRecipeOpen ? (
              <section className="meals-panel meals-panel--accent discover-add-recipe-form">
                <h4 className="meals-subheading">Add my recipe</h4>
                <p className="meals-panel-hint">
                  Paste the ingredient block from any recipe page (one line per item), or try a URL — we read a
                  text version of the page when possible. Each line is parsed for quantity, unit, and store
                  section. We&rsquo;ll auto-pick a planner emoji from the title and ingredients.
                </p>
                <div className="meals-form-grid">
                  <label className="meals-field">
                    <span>Recipe link</span>
                    <input
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      type="url"
                      placeholder="https://…"
                    />
                  </label>
                  <label className="meals-field">
                    <span>Title</span>
                    <input
                      value={linkTitle}
                      onChange={(e) => setLinkTitle(e.target.value)}
                      placeholder="e.g. Sunday night pasta"
                    />
                  </label>
                  <label className="meals-field">
                    <span>Meal type</span>
                    <select
                      value={linkMealType}
                      onChange={(e) => setLinkMealType(e.target.value)}
                    >
                      {MEAL_TYPES.map((mt) => (
                        <option key={mt} value={mt}>
                          {mt}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="meals-field">
                    <span>Servings</span>
                    <input
                      value={linkServings}
                      onChange={(e) => setLinkServings(e.target.value)}
                      placeholder="4"
                    />
                  </label>
                </div>
                <label className="meals-field meals-field--block">
                  <span>Ingredients (paste from site — optional if URL works)</span>
                  <textarea
                    className="meals-textarea"
                    value={linkPaste}
                    onChange={(e) => setLinkPaste(e.target.value)}
                    rows={5}
                    placeholder={'1 cup milk\n2 tbsp olive oil\n1 lb chicken breast'}
                  />
                </label>
                {linkError ? <p className="meals-error">{linkError}</p> : null}
                <div className="meals-actions">
                  <button
                    type="button"
                    className="meals-btn-primary"
                    disabled={linkBusy}
                    onClick={() => addMealFromLink({ alsoAssignToDate: mealAssignmentDate })}
                  >
                    {linkBusy ? 'Working…' : `Save & assign to ${discoverDateLabel}`}
                  </button>
                  <button
                    type="button"
                    className="meals-btn-outline"
                    disabled={linkBusy}
                    onClick={() => addMealFromLink()}
                  >
                    Save only
                  </button>
                </div>
              </section>
            ) : null}

            <section className="meals-panel meals-panel--discover">
              <article className="meals-panel-inner discover-inner">
                <label className="discover-search-bar">
                  <svg
                    className="discover-search-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    value={browseQuery}
                    onChange={(e) => setBrowseQuery(e.target.value)}
                    placeholder="Search recipes, ingredients…"
                    type="search"
                  />
                </label>
                <div className="discover-chips">
                  <button
                    type="button"
                    className={`discover-chip ${mealFilter === 'all' ? 'discover-chip--on' : ''}`}
                    onClick={() => setMealFilter('all')}
                  >
                    All
                  </button>
                  {MEAL_TYPES.map((mealType) => (
                    <button
                      key={mealType}
                      type="button"
                      className={`discover-chip ${mealFilter === mealType ? 'discover-chip--on' : ''}`}
                      onClick={() => setMealFilter(mealType)}
                    >
                      {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="discover-filter-row">
                  <button
                    type="button"
                    className={`discover-filter-btn ${discoverPrefs.cuisines.length > 0 ? 'discover-filter-btn--on' : ''}`}
                    onClick={() => {
                      setSheetCuisinePick(discoverPrefs.cuisines)
                      setDiscoverSheet('cuisine')
                    }}
                  >
                    <svg viewBox="0 0 24 24" className="discover-filter-icon" aria-hidden>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    Cuisine: {formatFilterSummary(discoverPrefs.cuisines)}
                  </button>
                  <button
                    type="button"
                    className={`discover-filter-btn ${discoverPrefs.diets.length > 0 ? 'discover-filter-btn--on' : ''}`}
                    onClick={() => {
                      setSheetDietPick(discoverPrefs.diets)
                      setDiscoverSheet('diet')
                    }}
                  >
                    <svg viewBox="0 0 24 24" className="discover-filter-icon" aria-hidden>
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    Diet: {formatFilterSummary(discoverPrefs.diets)}
                  </button>
                </div>
                <button
                  type="button"
                  className={`discover-pantry-toggle ${discoverPrefs.usePantryBoost ? 'discover-pantry-toggle--on' : ''}`}
                  onClick={() =>
                    updateDiscoverPrefs({ usePantryBoost: !discoverPrefs.usePantryBoost })
                  }
                >
                  <span className="discover-toggle-track" aria-hidden>
                    <span className="discover-toggle-thumb" />
                  </span>
                  <span className="discover-pantry-toggle-text">
                    <span className="discover-pantry-toggle-title">
                      {discoverPrefs.usePantryBoost ? 'Using my pantry' : 'Use my pantry'}
                    </span>
                    <span className="discover-pantry-toggle-sub">
                      Show pantry match on cards and sort by what you can make
                    </span>
                  </span>
                </button>
                <p className="discover-section-title">Suggested for tonight</p>
                <p className="discover-section-sub">
                  Tap a card to see ingredients · use <strong>+</strong> to add it to your plan for{' '}
                  {discoverDateLabel}.
                </p>
                <div className="discover-recipe-grid">
                  {discoverCatalogList.map((recipe) => {
                    const stats = recipePantryStats(recipe, state.pantryItems)
                    const showBadge = discoverPrefs.usePantryBoost && stats.total > 0
                    const metaBits = [
                      recipe.prepMinutes != null ? `${recipe.prepMinutes} min` : null,
                      recipe.cuisine,
                      stats.total > 0
                        ? `${stats.total} ingredient${stats.total === 1 ? '' : 's'}`
                        : null,
                    ].filter(Boolean)
                    const fallbackEmoji =
                      recipe.emoji || DEFAULT_MEAL_EMOJI[recipe.mealType] || '🍽️'
                    const recipeKey = makeRecipeKey({
                      catalogId: recipe.id,
                      recipeUrl: recipe.url,
                      title: recipe.title,
                    })
                    const assignedPlannedMealId = assignedOnDateByRecipeKey.get(recipeKey)
                    const isAssigned = Boolean(assignedPlannedMealId)
                    return (
                      <article key={recipe.id} className="discover-card">
                        <button
                          type="button"
                          className="discover-card-media"
                          onClick={() => setDiscoverDetailRecipe(recipe)}
                          aria-label={`See details for ${recipe.title}`}
                        >
                          {recipe.imageUrl ? (
                            <img
                              src={recipe.imageUrl}
                              alt={recipe.title}
                              className="discover-card-img"
                              loading="lazy"
                            />
                          ) : (
                            <div
                              className="discover-card-img discover-card-img--emoji"
                              style={recipe.tileBg ? { background: recipe.tileBg } : undefined}
                              aria-hidden
                            >
                              {fallbackEmoji}
                            </div>
                          )}
                          {showBadge ? (
                            <span className="discover-card-match">
                              {stats.matched}/{stats.total} ingredients
                            </span>
                          ) : null}
                          <span className="discover-card-meal">{recipe.mealType}</span>
                        </button>
                        <div className="discover-card-body">
                          <div className="discover-card-text">
                            <p className="discover-card-title">{recipe.title}</p>
                            <p className="discover-card-meta">
                              {metaBits.length > 0 ? metaBits.join(' · ') : 'Quick recipe'}
                            </p>
                          </div>
                          <button
                            type="button"
                            className={`discover-card-addbtn ${
                              isAssigned ? 'discover-card-addbtn--added' : ''
                            }`}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (isAssigned) {
                                quickRemoveRecipeFromPlan(assignedPlannedMealId, recipe.title)
                              } else {
                                quickAddRecipeToPlan(recipe)
                              }
                            }}
                            aria-pressed={isAssigned}
                            aria-label={
                              isAssigned
                                ? `Remove ${recipe.title} from ${discoverDateLabel}`
                                : `Add ${recipe.title} to ${discoverDateLabel}`
                            }
                            title={
                              isAssigned
                                ? `Tap to remove from ${discoverDateLabel}`
                                : `Add to ${discoverDateLabel}`
                            }
                          >
                            <span className="discover-card-addbtn-glyph" aria-hidden>
                              {isAssigned ? (
                                <>
                                  <svg className="discover-card-addbtn-icon discover-card-addbtn-icon--check" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="5 12 10 17 19 8" />
                                  </svg>
                                  <svg className="discover-card-addbtn-icon discover-card-addbtn-icon--x" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                  </svg>
                                </>
                              ) : (
                                <svg className="discover-card-addbtn-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19" />
                                  <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                              )}
                            </span>
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
                {discoverCatalogList.length === 0 && (
                  <p className="discover-empty">No recipes match. Try clearing filters.</p>
                )}
              </article>
            </section>

            {discoverSheet === 'cuisine' && (
              <div
                className="discover-sheet-overlay"
                role="presentation"
                onClick={() => setDiscoverSheet(null)}
              >
                <div
                  className="discover-sheet"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="discover-sheet-cuisine-title"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="discover-sheet-handle" />
                  <h3 id="discover-sheet-cuisine-title" className="discover-sheet-title">
                    Cuisine
                  </h3>
                  <p className="discover-sheet-sub">
                    Pick any number to match. Leave empty for all cuisines.
                  </p>
                  <div className="discover-option-grid">
                    <button
                      type="button"
                      className={`discover-opt ${sheetCuisinePick.length === 0 ? 'discover-opt--on' : ''}`}
                      onClick={() => setSheetCuisinePick([])}
                    >
                      Any
                    </button>
                    {availableCuisines.map((c) => {
                      const on = sheetCuisinePick.includes(c)
                      return (
                        <button
                          key={c}
                          type="button"
                          className={`discover-opt ${on ? 'discover-opt--on' : ''}`}
                          onClick={() =>
                            setSheetCuisinePick((prev) =>
                              prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
                            )
                          }
                        >
                          {c}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    type="button"
                    className="discover-sheet-apply"
                    onClick={() => {
                      updateDiscoverPrefs({ cuisines: sheetCuisinePick })
                      setDiscoverSheet(null)
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}

            {discoverSheet === 'diet' && (
              <div
                className="discover-sheet-overlay"
                role="presentation"
                onClick={() => setDiscoverSheet(null)}
              >
                <div
                  className="discover-sheet"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="discover-sheet-diet-title"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="discover-sheet-handle" />
                  <h3 id="discover-sheet-diet-title" className="discover-sheet-title">
                    Dietary preferences
                  </h3>
                  <p className="discover-sheet-sub">
                    Pick any number of tags. Recipes matching at least one will show.
                  </p>
                  <div className="discover-option-grid">
                    <button
                      type="button"
                      className={`discover-opt ${sheetDietPick.length === 0 ? 'discover-opt--on' : ''}`}
                      onClick={() => setSheetDietPick([])}
                    >
                      Any
                    </button>
                    {availableDiets.map((d) => {
                      const on = sheetDietPick.includes(d)
                      return (
                        <button
                          key={d}
                          type="button"
                          className={`discover-opt ${on ? 'discover-opt--on' : ''}`}
                          onClick={() =>
                            setSheetDietPick((prev) =>
                              prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
                            )
                          }
                        >
                          {d}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    type="button"
                    className="discover-sheet-apply"
                    onClick={() => {
                      updateDiscoverPrefs({ diets: sheetDietPick })
                      setDiscoverSheet(null)
                    }}
                  >
                    Save preferences
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {tab === 'Pantry' && (
          <div className="screen pantry-screen">
            <p className="pantry-kicker">My pantry</p>
            <p className="pantry-sub">Ingredients you already have — used for Discover pantry match.</p>
            <label className="discover-search-bar pantry-search-bar">
              <svg
                className="discover-search-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={pantryListQuery}
                onChange={(e) => setPantryListQuery(e.target.value)}
                placeholder="Search pantry…"
                type="search"
              />
            </label>
            <div className="pantry-stat-row">
              <div className="pantry-stat-card">
                <p className="pantry-stat-label">Items in pantry</p>
                <p className="pantry-stat-value">{pantryItemCount}</p>
              </div>
              <div className="pantry-stat-card pantry-stat-card--accent">
                <p className="pantry-stat-label pantry-stat-label--accent">Recipes unlocked</p>
                <p className="pantry-stat-value pantry-stat-value--accent">{recipesUnlockedCount}</p>
                <p className="pantry-stat-hint">≥ half ingredients on hand</p>
              </div>
            </div>
            <article className="card pantry-suggest-card">
              <div className="list-row">
                <strong>Suggested items</strong>
                <button type="button" onClick={refreshPantrySuggestions}>
                  Refresh
                </button>
              </div>
              <div className="filter-row">
                {pantrySuggestions.map((name) => (
                  <button key={name} type="button" onClick={() => togglePantryItem(name)}>
                    + {name}
                  </button>
                ))}
              </div>
            </article>
            <p className="discover-section-title pantry-add-title">
              Add items <span className="pantry-add-hint">type a name and press Enter</span>
            </p>
            <PantryQuickAdd onAdd={togglePantryItem} />
            <p className="discover-section-title">In your pantry</p>
            {filteredPantryEntries.length === 0 ? (
              <p className="muted">Nothing here yet. Add from suggestions or the field above.</p>
            ) : (
              <ul className="pantry-item-list">
                {filteredPantryEntries.map(([name, onHand]) => {
                  const qty = state.pantryItemMeta?.[name]?.qty ?? ''
                  return (
                    <li key={name} className="pantry-item-row">
                      <label className="pantry-item-check">
                        <input
                          type="checkbox"
                          checked={Boolean(onHand)}
                          onChange={() => togglePantryItem(name)}
                        />
                        <span className="pantry-item-name">{name}</span>
                      </label>
                      <input
                        className="pantry-item-qty"
                        value={qty}
                        placeholder="qty"
                        onChange={(e) => setPantryItemQty(name, e.target.value)}
                      />
                      <button
                        type="button"
                        className="pantry-item-remove"
                        aria-label={`Remove ${name}`}
                        onClick={() => removePantryItem(name)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        {tab === 'Shop' && (
          <div className="screen shop-screen">
            <p className="shop-kicker">Shopping list</p>
            <p className="shop-sub">
              {shopSummary.mealCount} meal{shopSummary.mealCount === 1 ? '' : 's'} ·{' '}
              {shopSummary.itemCount} item{shopSummary.itemCount === 1 ? '' : 's'}
            </p>
            {shoppingList.length === 0 ? (
              <p className="muted">Nothing to buy yet — plan some meals to populate your list.</p>
            ) : (
              shoppingList.map((section) => (
                <section key={section.id} className="shop-section">
                  <h3 className="shop-section-title">{section.name}</h3>
                  {section.items.map((item) => {
                    const checked = Boolean(state.shopping.checked[item.id])
                    return (
                      <div key={item.id} className={`shop-row ${checked ? 'shop-row--done' : ''}`}>
                        <button
                          type="button"
                          className={`shop-checkbox ${checked ? 'shop-checkbox--on' : ''}`}
                          onClick={() => toggleShoppingItem(item.id)}
                          aria-pressed={checked}
                          aria-label={checked ? `Uncheck ${item.normalizedName}` : `Check ${item.normalizedName}`}
                        >
                          {checked ? (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : null}
                        </button>
                        <span className="shop-name">{item.normalizedName}</span>
                        <span className="shop-amt">
                          {[item.quantity, item.unit].filter(Boolean).join(' ')}
                        </span>
                        <button
                          type="button"
                          className="shop-subs-btn"
                          onClick={() => setSelectedItem(item)}
                        >
                          Subs
                        </button>
                      </div>
                    )
                  })}
                </section>
              ))
            )}
            <ShopQuickAdd sections={state.storeSections} onAdd={addShoppingItem} />
            {selectedItem && (
              <SubstitutionsModal
                item={selectedItem}
                pantryItems={state.pantryItems}
                onClose={() => setSelectedItem(null)}
              />
            )}
          </div>
        )}

        {tab === 'Settings' && (
          <div className="screen">
            <h2>Store Sections</h2>
            {state.storeSections.map((section) => (
              <div key={section.id} className="ingredient-grid">
                <input
                  value={section.name}
                  onChange={(e) => updateStoreSection(section.id, 'name', e.target.value)}
                />
                <input
                  value={section.sortOrder}
                  onChange={(e) => updateStoreSection(section.id, 'sortOrder', Number(e.target.value))}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {mealExplorer && (
        <MealExplorerModal
          dateLabel={mealAssignmentDate}
          slotMealType={mealExplorer.slotMealType}
          explorerQuery={explorerQuery}
          onExplorerQueryChange={setExplorerQuery}
          explorerRecipeFilter={explorerRecipeFilter}
          onExplorerRecipeFilterChange={setExplorerRecipeFilter}
          recipes={explorerFilteredRecipes}
          templates={explorerFilteredTemplates}
          onPickTemplate={(templateId) => pickTemplateForSlot(mealExplorer.slotMealType, templateId)}
          onPickRecipe={(recipe) => pickRecipeForSlot(mealExplorer.slotMealType, recipe)}
          onClose={closeMealExplorer}
        />
      )}

      {discoverDetailRecipe && (
        <RecipeDiscoverDetailModal
          recipe={discoverDetailRecipe}
          pantryItems={state.pantryItems}
          assignmentDate={mealAssignmentDate}
          onClose={() => setDiscoverDetailRecipe(null)}
          onAdd={(dateIso, mealType) => {
            setMealAssignmentDate(dateIso)
            addRecipeAndAssignToDate(dateIso, discoverDetailRecipe, mealType)
          }}
        />
      )}

      {plannerSlotAction ? (
        <PlannerSlotSheet
          action={plannerSlotAction}
          template={(() => {
            const planned = (state.weeklyPlan[plannerSlotAction.iso] ?? []).find(
              (m) => m.id === plannerSlotAction.plannedMealId,
            )
            return planned
              ? state.mealTemplates.find((t) => t.id === planned.mealTemplateId)
              : null
          })()}
          onClose={() => setPlannerSlotAction(null)}
          onChangeView={(view) =>
            setPlannerSlotAction((current) => (current ? { ...current, view } : current))
          }
          onViewRecipe={(template) => {
            setDiscoverDetailRecipe(templateToRecipe(template))
            setPlannerSlotAction(null)
          }}
          onReplace={(iso, mealType, plannedMealId, fromTemplate) => {
            setPlannerSlotAction(null)
            setReplaceFlow({
              fromIso: iso,
              fromMealType: mealType,
              fromPlannedMealId: plannedMealId,
              fromTemplate,
              view: 'pick',
              candidate: null,
            })
          }}
          onMove={(toIso, toMealType) => {
            movePlannedMeal(
              plannerSlotAction.iso,
              plannerSlotAction.plannedMealId,
              toIso,
              toMealType,
            )
            setDiscoverToast({
              id: crypto.randomUUID(),
              message: `Moved to ${formatDateBadge(toIso)} ${toMealType}`,
            })
            setPlannerSlotAction(null)
          }}
          onSaveEmoji={(templateId, nextEmoji) => {
            setTemplateEmoji(templateId, nextEmoji)
            setDiscoverToast({
              id: crypto.randomUUID(),
              message: `Emoji updated to ${nextEmoji}`,
            })
            setPlannerSlotAction(null)
          }}
          onRemove={(iso, plannedMealId, title) => {
            removePlannedMeal(iso, plannedMealId)
            setDiscoverToast({
              id: crypto.randomUUID(),
              message: `Removed ${title} from ${formatDateBadge(iso)}`,
            })
            setPlannerSlotAction(null)
          }}
        />
      ) : null}

      {replaceFlow ? (
        <ReplaceMealModal
          flow={replaceFlow}
          recipes={browseRecipes}
          onClose={() => setReplaceFlow(null)}
          onPickCandidate={(recipe) =>
            setReplaceFlow((current) =>
              current ? { ...current, candidate: recipe, view: 'confirm' } : current,
            )
          }
          onBackToPick={() =>
            setReplaceFlow((current) =>
              current ? { ...current, view: 'pick', candidate: null } : current,
            )
          }
          onConfirmSwap={() => {
            const flow = replaceFlow
            if (!flow?.candidate) return
            removePlannedMeal(flow.fromIso, flow.fromPlannedMealId)
            addRecipeAndAssignToDate(flow.fromIso, flow.candidate, flow.fromMealType)
            setDiscoverToast({
              id: crypto.randomUUID(),
              message: `Swapped to ${flow.candidate.title} on ${formatDateBadge(flow.fromIso)} ${flow.fromMealType}`,
            })
            setReplaceFlow(null)
          }}
        />
      ) : null}

      {discoverToast ? (
        <div key={discoverToast.id} className="discover-toast" role="status" aria-live="polite">
          <span className="discover-toast-check" aria-hidden>
            ✓
          </span>
          <span>{discoverToast.message}</span>
        </div>
      ) : null}

      <nav className="tabs nav-bottom">
        {NAV_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-tab ${item.id === tab ? 'nav-tab--active' : ''}`}
            onClick={() => selectTab(item.id)}
            aria-pressed={item.id === tab}
          >
            <NavIcon name={item.icon} />
            <span className="nav-tab-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </main>
  )
}

function PlannerWeekGrid({
  weekCells,
  weeklyPlan,
  templates,
  selectedIso,
  onSelectDate,
  onPickEmpty,
  onPickFilled,
}) {
  const todayIso = toIsoDate(new Date())
  const templateById = new Map(templates.map((t) => [t.id, t]))
  return (
    <div className="planner-grid" role="grid" aria-label="Week meal grid">
      <div className="planner-grid-corner" aria-hidden />
      {MEAL_TYPES.map((mt) => (
        <div key={`h-${mt}`} className="planner-grid-head" role="columnheader">
          {mt}
        </div>
      ))}
      {weekCells.map((dayDate) => {
        const iso = toIsoDate(dayDate)
        const isToday = iso === todayIso
        const isSelected = iso === selectedIso
        const meals = weeklyPlan[iso] ?? []
        return (
          <Fragment key={iso}>
            <button
              type="button"
              className={`planner-grid-day ${isToday ? 'planner-grid-day--today' : ''} ${
                isSelected ? 'planner-grid-day--selected' : ''
              }`}
              onClick={() => onSelectDate(iso)}
            >
              <span className="planner-grid-day-name">
                {dayDate.toLocaleDateString(undefined, { weekday: 'short' })}
              </span>
              <span className="planner-grid-day-num">{dayDate.getDate()}</span>
            </button>
            {MEAL_TYPES.map((mealType) => {
              const planned = meals.find((m) => m.mealType === mealType)
              const tpl = planned ? templateById.get(planned.mealTemplateId) : null
              const filled = Boolean(tpl)
              if (filled) {
                const emoji = tpl.emoji || DEFAULT_MEAL_EMOJI[mealType] || '🍽️'
                const bg = tpl.tileBg || ''
                return (
                  <button
                    key={`${iso}-${mealType}`}
                    type="button"
                    className="planner-grid-slot planner-grid-slot--filled"
                    style={bg ? { background: bg } : undefined}
                    onClick={() => onPickFilled({ iso, mealType, plannedMealId: planned.id })}
                    title={tpl.title || 'Untitled meal'}
                  >
                    <span className="planner-grid-slot-emoji">{emoji}</span>
                    <span className="planner-grid-slot-title">
                      {tpl.title || 'Untitled meal'}
                    </span>
                  </button>
                )
              }
              return (
                <button
                  key={`${iso}-${mealType}`}
                  type="button"
                  className="planner-grid-slot planner-grid-slot--empty"
                  onClick={() => onPickEmpty(iso, mealType)}
                  aria-label={`Add ${mealType} on ${iso}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              )
            })}
          </Fragment>
        )
      })}
    </div>
  )
}

const MEAL_PICKER_OPTIONS = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'lunch', label: 'Lunch', emoji: '☀️' },
  { id: 'dinner', label: 'Dinner', emoji: '🌙' },
]

function formatPickedDayLabel(dateIso) {
  if (!dateIso) return ''
  const d = new Date(`${dateIso}T12:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'long' })
}

/** Convert a saved meal template back into the "recipe" shape consumed by the
 *  Discover detail modal so it can be reused for "View recipe" from the planner. */
function templateToRecipe(template) {
  if (!template) return null
  return {
    id: template.id,
    title: template.title || 'Untitled meal',
    cuisine: template.cuisine ?? '',
    prepMinutes: template.prepMinutes ?? null,
    calories: template.calories ?? null,
    emoji: template.emoji ?? '',
    tileBg: template.tileBg ?? '',
    dietTags: template.dietTags ?? [],
    url: template.recipeUrl ?? '',
    imageUrl: template.recipeImageUrl ?? '',
    mealType: template.mealType,
    defaultServings: template.defaultServings,
    ingredients: template.ingredients ?? [],
  }
}

function PlannerSlotSheet({
  action,
  template,
  onClose,
  onChangeView,
  onViewRecipe,
  onReplace,
  onMove,
  onSaveEmoji,
  onRemove,
}) {
  const initialEmoji = template?.emoji || '🍽️'
  const initialCategoryId =
    EMOJI_CATEGORIES.find((cat) => cat.emojis.includes(initialEmoji))?.id ??
    EMOJI_CATEGORIES[0].id
  const [pickedEmoji, setPickedEmoji] = useState(initialEmoji)
  const [pickedCategory, setPickedCategory] = useState(initialCategoryId)
  const [movePickedDate, setMovePickedDate] = useState(action.iso)
  const [movePickedMeal, setMovePickedMeal] = useState(action.mealType)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (action.view !== 'menu') {
        onChangeView('menu')
        return
      }
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [action.view, onChangeView, onClose])

  const moveDayOptions = useMemo(() => {
    const out = []
    const anchor = new Date()
    anchor.setHours(0, 0, 0, 0)
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(anchor)
      d.setDate(d.getDate() + i)
      out.push({
        iso: toIsoDate(d),
        weekday: d.toLocaleDateString(undefined, { weekday: 'short' }),
        day: d.getDate(),
      })
    }
    if (!out.some((o) => o.iso === movePickedDate)) {
      const extra = new Date(`${movePickedDate}T12:00:00`)
      out.unshift({
        iso: movePickedDate,
        weekday: extra.toLocaleDateString(undefined, { weekday: 'short' }),
        day: extra.getDate(),
      })
    }
    return out
  }, [movePickedDate])

  if (!template) {
    return (
      <div className="recipe-detail-overlay" role="presentation" onClick={onClose}>
        <div
          className="planner-slot-sheet"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="planner-slot-empty-msg">This meal is no longer in your planner.</p>
          <button type="button" className="planner-slot-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    )
  }

  const dayLabel = new Date(`${action.iso}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
  })
  const heroEmoji = template.emoji || DEFAULT_MEAL_EMOJI[template.mealType] || '🍽️'

  return (
    <div className="recipe-detail-overlay" role="presentation" onClick={onClose}>
      <div
        className="planner-slot-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="planner-slot-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="planner-slot-handle" aria-hidden />
        {action.view === 'menu' && (
          <>
            <header className="planner-slot-head">
              <div
                className="planner-slot-emoji-tile"
                style={template.tileBg ? { background: template.tileBg } : undefined}
                aria-hidden
              >
                {heroEmoji}
              </div>
              <div className="planner-slot-head-text">
                <h3 id="planner-slot-title" className="planner-slot-title">
                  {template.title || 'Untitled meal'}
                </h3>
                <p className="planner-slot-sub">
                  {dayLabel} · {action.mealType}
                  {template.prepMinutes ? ` · ${template.prepMinutes} min` : ''}
                </p>
              </div>
            </header>

            <ul className="planner-slot-actions">
              <li>
                <button
                  type="button"
                  className="planner-slot-action"
                  onClick={() => onViewRecipe(template)}
                >
                  <span className="planner-slot-action-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </span>
                  <span className="planner-slot-action-text">
                    <span className="planner-slot-action-title">View recipe</span>
                    <span className="planner-slot-action-sub">Ingredients, steps, nutrition</span>
                  </span>
                  <span className="planner-slot-action-chev" aria-hidden>
                    ›
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="planner-slot-action"
                  onClick={() =>
                    onReplace(action.iso, action.mealType, action.plannedMealId, template)
                  }
                >
                  <span className="planner-slot-action-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="1 4 1 10 7 10" />
                      <polyline points="23 20 23 14 17 14" />
                      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                    </svg>
                  </span>
                  <span className="planner-slot-action-text">
                    <span className="planner-slot-action-title">Replace</span>
                    <span className="planner-slot-action-sub">Swap for a different recipe</span>
                  </span>
                  <span className="planner-slot-action-chev" aria-hidden>
                    ›
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="planner-slot-action"
                  onClick={() => onChangeView('move')}
                >
                  <span className="planner-slot-action-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </span>
                  <span className="planner-slot-action-text">
                    <span className="planner-slot-action-title">Move to another slot</span>
                    <span className="planner-slot-action-sub">Change day or meal time</span>
                  </span>
                  <span className="planner-slot-action-chev" aria-hidden>
                    ›
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="planner-slot-action"
                  onClick={() => onChangeView('emoji')}
                >
                  <span className="planner-slot-action-icon planner-slot-action-icon--emoji" aria-hidden>
                    {heroEmoji}
                  </span>
                  <span className="planner-slot-action-text">
                    <span className="planner-slot-action-title">Change planner emoji</span>
                    <span className="planner-slot-action-sub">How it appears in the grid</span>
                  </span>
                  <span className="planner-slot-action-chev" aria-hidden>
                    ›
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="planner-slot-action planner-slot-action--danger"
                  onClick={() => onRemove(action.iso, action.plannedMealId, template.title)}
                >
                  <span className="planner-slot-action-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                    </svg>
                  </span>
                  <span className="planner-slot-action-text">
                    <span className="planner-slot-action-title">Remove from planner</span>
                    <span className="planner-slot-action-sub">Clears this slot</span>
                  </span>
                </button>
              </li>
            </ul>
          </>
        )}

        {action.view === 'emoji' && (
          <div className="planner-slot-emoji-picker">
            <button
              type="button"
              className="planner-slot-back"
              onClick={() => onChangeView('menu')}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back to options
            </button>
            <h3 className="planner-slot-picker-title">Change planner emoji</h3>
            <div className="planner-slot-cat-row">
              {EMOJI_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`planner-slot-cat ${
                    pickedCategory === cat.id ? 'planner-slot-cat--on' : ''
                  }`}
                  onClick={() => setPickedCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="planner-slot-emoji-grid">
              {(EMOJI_CATEGORIES.find((c) => c.id === pickedCategory)?.emojis ?? []).map(
                (emoji, idx) => {
                  const on = pickedEmoji === emoji
                  return (
                    <button
                      key={`${emoji}-${idx}`}
                      type="button"
                      className={`planner-slot-emoji-cell ${
                        on ? 'planner-slot-emoji-cell--on' : ''
                      }`}
                      onClick={() => setPickedEmoji(emoji)}
                      aria-pressed={on}
                    >
                      {emoji}
                    </button>
                  )
                },
              )}
            </div>
            <button
              type="button"
              className="planner-slot-emoji-use"
              onClick={() => onSaveEmoji(template.id, pickedEmoji)}
            >
              Use {pickedEmoji}
            </button>
          </div>
        )}

        {action.view === 'move' && (
          <div className="planner-slot-move">
            <button
              type="button"
              className="planner-slot-back"
              onClick={() => onChangeView('menu')}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back to options
            </button>
            <h3 className="planner-slot-picker-title">Move to another slot</h3>
            <div className="add-sheet-day-row" role="radiogroup" aria-label="Pick a day">
              {moveDayOptions.map((d) => {
                const on = d.iso === movePickedDate
                return (
                  <button
                    key={d.iso}
                    type="button"
                    className={`add-sheet-day ${on ? 'add-sheet-day--on' : ''}`}
                    onClick={() => setMovePickedDate(d.iso)}
                    role="radio"
                    aria-checked={on}
                  >
                    {d.weekday} {d.day}
                  </button>
                )
              })}
            </div>
            <div
              className="add-sheet-meal-row"
              role="radiogroup"
              aria-label="Pick a meal slot"
            >
              {[
                { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
                { id: 'lunch', label: 'Lunch', emoji: '☀️' },
                { id: 'dinner', label: 'Dinner', emoji: '🌙' },
              ].map((m) => {
                const on = m.id === movePickedMeal
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`add-sheet-meal ${on ? 'add-sheet-meal--on' : ''}`}
                    onClick={() => setMovePickedMeal(m.id)}
                    role="radio"
                    aria-checked={on}
                  >
                    <span className="add-sheet-meal-emoji" aria-hidden>
                      {m.emoji}
                    </span>
                    <span className="add-sheet-meal-label">{m.label}</span>
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              className="add-sheet-cta"
              onClick={() => onMove(movePickedDate, movePickedMeal)}
            >
              Move to{' '}
              {new Date(`${movePickedDate}T12:00:00`).toLocaleDateString(undefined, {
                weekday: 'long',
              })}{' '}
              {movePickedMeal}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ReplaceMealModal({
  flow,
  recipes,
  onClose,
  onPickCandidate,
  onBackToPick,
  onConfirmSwap,
}) {
  const fromTpl = flow.fromTemplate
  const fromEmoji =
    fromTpl?.emoji || DEFAULT_MEAL_EMOJI[flow.fromMealType] || '🍽️'
  const dayLong = new Date(`${flow.fromIso}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
  })
  const slotLabel = `${dayLong} · ${flow.fromMealType.charAt(0).toUpperCase()}${flow.fromMealType.slice(1)}`

  // Default chip = current slot meal type. State holds either a meal type id or a diet tag id.
  const [filter, setFilter] = useState(flow.fromMealType)
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return recipes.filter((recipe) => {
      const isMealType = MEAL_TYPES.includes(filter)
      const typeOk = isMealType ? recipe.mealType === filter : true
      const dietOk = !isMealType ? (recipe.dietTags ?? []).includes(filter) : true
      const qOk =
        !q ||
        recipe.title.toLowerCase().includes(q) ||
        (recipe.ingredients ?? []).some((ingredient) =>
          ingredient.name.toLowerCase().includes(q),
        )
      const isCurrent =
        fromTpl?.recipeKey &&
        makeRecipeKey({
          catalogId: recipe.id,
          recipeUrl: recipe.url,
          title: recipe.title,
        }) === fromTpl.recipeKey
      return typeOk && dietOk && qOk && !isCurrent
    })
  }, [recipes, filter, query, fromTpl])

  const sectionTitle =
    filter === flow.fromMealType
      ? `Suggested for ${dayLong} ${flow.fromMealType}`
      : MEAL_TYPES.includes(filter)
        ? `${filter.charAt(0).toUpperCase()}${filter.slice(1)} ideas`
        : `${filter.charAt(0).toUpperCase()}${filter.slice(1)} ideas`

  return (
    <div className="recipe-detail-overlay" role="presentation" onClick={onClose}>
      <div
        className="replace-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="replace-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {flow.view === 'pick' && (
          <>
            <header className="replace-banner">
              <span
                className="replace-banner-icon"
                style={fromTpl?.tileBg ? { background: fromTpl.tileBg } : undefined}
                aria-hidden
              >
                {fromEmoji}
              </span>
              <div className="replace-banner-text">
                <p className="replace-banner-title">Replacing {slotLabel}</p>
                <p className="replace-banner-sub">
                  {fromTpl?.title || 'Untitled meal'} · pick something else
                </p>
              </div>
              <button
                type="button"
                className="replace-banner-close"
                onClick={onClose}
                aria-label="Close replace flow"
              >
                ×
              </button>
            </header>

            <div className="replace-body">
              <div className="replace-titlebar">
                <button
                  type="button"
                  className="replace-back"
                  onClick={onClose}
                  aria-label="Back"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <h2 id="replace-modal-title" className="replace-title">
                  Choose a recipe
                </h2>
              </div>

              <label className="discover-search-bar replace-search">
                <svg
                  className="discover-search-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search recipes…"
                  type="search"
                />
              </label>

              <div className="replace-chips">
                {MEAL_TYPES.map((mt) => (
                  <button
                    key={mt}
                    type="button"
                    className={`replace-chip ${filter === mt ? 'replace-chip--on' : ''}`}
                    onClick={() => setFilter(mt)}
                  >
                    {mt.charAt(0).toUpperCase()}{mt.slice(1)}
                  </button>
                ))}
                {DISCOVER_DIETS.map((diet) => (
                  <button
                    key={diet}
                    type="button"
                    className={`replace-chip ${filter === diet ? 'replace-chip--on' : ''}`}
                    onClick={() => setFilter(diet)}
                  >
                    {diet.charAt(0).toUpperCase()}{diet.slice(1)}
                  </button>
                ))}
              </div>

              <h3 className="replace-section-title">{sectionTitle}</h3>

              {matches.length === 0 ? (
                <p className="discover-empty">No recipes match. Try another filter.</p>
              ) : (
                <div className="replace-grid">
                  {matches.map((recipe) => {
                    const recipeEmoji =
                      recipe.emoji || DEFAULT_MEAL_EMOJI[recipe.mealType] || '🍽️'
                    return (
                      <button
                        key={recipe.id}
                        type="button"
                        className="replace-card"
                        onClick={() => onPickCandidate(recipe)}
                      >
                        <div
                          className="replace-card-media"
                          style={recipe.tileBg ? { background: recipe.tileBg } : undefined}
                        >
                          {recipe.imageUrl ? (
                            <img
                              src={recipe.imageUrl}
                              alt=""
                              className="replace-card-img"
                              loading="lazy"
                            />
                          ) : (
                            <span className="replace-card-emoji" aria-hidden>
                              {recipeEmoji}
                            </span>
                          )}
                          <span className="replace-card-badge" aria-hidden>
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="1 4 1 10 7 10" />
                              <polyline points="23 20 23 14 17 14" />
                              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                            </svg>
                          </span>
                        </div>
                        <div className="replace-card-body">
                          <p className="replace-card-title">{recipe.title}</p>
                          <p className="replace-card-meta">
                            {recipe.prepMinutes ? `${recipe.prepMinutes} min` : '—'}
                            {recipe.cuisine ? ` · ${recipe.cuisine}` : ''}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {flow.view === 'confirm' && flow.candidate ? (
          <>
            <header className="replace-banner replace-banner--confirm">
              <span
                className="replace-banner-icon"
                style={
                  flow.candidate.tileBg ? { background: flow.candidate.tileBg } : undefined
                }
                aria-hidden
              >
                {flow.candidate.imageUrl ? (
                  <img
                    src={flow.candidate.imageUrl}
                    alt=""
                    className="replace-banner-img"
                    loading="lazy"
                  />
                ) : (
                  flow.candidate.emoji ||
                  DEFAULT_MEAL_EMOJI[flow.candidate.mealType] ||
                  '🍽️'
                )}
              </span>
              <div className="replace-banner-text">
                <p className="replace-banner-title">Replacing {slotLabel}</p>
                <p className="replace-banner-sub">Confirm the swap below</p>
              </div>
              <button
                type="button"
                className="replace-banner-close"
                onClick={onClose}
                aria-label="Close replace flow"
              >
                ×
              </button>
            </header>

            <div className="replace-confirm-body">
              <div className="replace-swap-row">
                <div
                  className="replace-swap-card replace-swap-card--from"
                  style={fromTpl?.tileBg ? { background: fromTpl.tileBg } : undefined}
                >
                  <span className="replace-swap-emoji" aria-hidden>
                    {fromEmoji}
                  </span>
                  <span className="replace-swap-title">
                    {fromTpl?.title || 'Untitled meal'}
                  </span>
                </div>
                <span className="replace-swap-arrow" aria-hidden>
                  →
                </span>
                <div
                  className="replace-swap-card replace-swap-card--to"
                  style={
                    flow.candidate.tileBg ? { background: flow.candidate.tileBg } : undefined
                  }
                >
                  {flow.candidate.imageUrl ? (
                    <img
                      src={flow.candidate.imageUrl}
                      alt=""
                      className="replace-swap-img"
                      loading="lazy"
                    />
                  ) : (
                    <span className="replace-swap-emoji" aria-hidden>
                      {flow.candidate.emoji ||
                        DEFAULT_MEAL_EMOJI[flow.candidate.mealType] ||
                        '🍽️'}
                    </span>
                  )}
                  <span className="replace-swap-title">{flow.candidate.title}</span>
                </div>
              </div>

              <p className="replace-confirm-text">
                {slotLabel} will be updated.
                <br />
                Your shopping list will adjust automatically.
              </p>

              <div className="replace-confirm-actions">
                <button
                  type="button"
                  className="replace-confirm-btn replace-confirm-btn--primary"
                  onClick={onConfirmSwap}
                >
                  Confirm swap
                </button>
                <button
                  type="button"
                  className="replace-confirm-btn"
                  onClick={onBackToPick}
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function RecipeDiscoverDetailModal({ recipe, pantryItems, assignmentDate, onClose, onAdd }) {
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [pickedDate, setPickedDate] = useState(assignmentDate)
  const [pickedMeal, setPickedMeal] = useState(
    MEAL_PICKER_OPTIONS.some((m) => m.id === recipe.mealType) ? recipe.mealType : 'dinner',
  )

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (showAddSheet) {
          setShowAddSheet(false)
          return
        }
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, showAddSheet])

  const dayOptions = useMemo(() => {
    const out = []
    const anchor = new Date()
    anchor.setHours(0, 0, 0, 0)
    for (let i = 0; i < 7; i++) {
      const d = new Date(anchor)
      d.setDate(d.getDate() + i)
      out.push({
        iso: toIsoDate(d),
        weekday: d.toLocaleDateString(undefined, { weekday: 'short' }),
        day: d.getDate(),
      })
    }
    if (!out.some((o) => o.iso === pickedDate)) {
      const extra = new Date(`${pickedDate}T12:00:00`)
      out.unshift({
        iso: pickedDate,
        weekday: extra.toLocaleDateString(undefined, { weekday: 'short' }),
        day: extra.getDate(),
      })
    }
    return out
  }, [pickedDate])

  const stats = recipePantryStats(recipe, pantryItems)
  const missingNames = stats.missing
  let matchSub
  if (stats.total === 0) {
    matchSub = 'No ingredients listed yet.'
  } else if (missingNames.length === 0) {
    matchSub = 'You have everything listed — nice.'
  } else if (missingNames.length === 1) {
    matchSub = `Only ${missingNames[0]} needed from the shop`
  } else {
    matchSub = `Missing: ${missingNames.slice(0, 3).join(', ')}${
      missingNames.length > 3 ? '…' : ''
    }`
  }

  const confirmAdd = () => {
    onAdd(pickedDate, pickedMeal)
    setConfirmation({ dateIso: pickedDate, mealType: pickedMeal })
    setShowAddSheet(false)
  }

  const dayLabel = formatPickedDayLabel(pickedDate)
  const ctaLabel = dayLabel ? `Add to ${dayLabel} ${pickedMeal}` : `Add to ${pickedMeal}`

  return (
    <div className="recipe-detail-overlay" role="presentation" onClick={onClose}>
      <div
        className="recipe-detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recipe-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="recipe-detail-hero"
          style={!recipe.imageUrl && recipe.tileBg ? { background: recipe.tileBg } : undefined}
        >
          {recipe.imageUrl ? (
            <img src={recipe.imageUrl} alt={recipe.title} className="recipe-detail-hero-img" />
          ) : (
            <div className="recipe-detail-hero-placeholder" aria-hidden>
              {recipe.emoji || DEFAULT_MEAL_EMOJI[recipe.mealType] || '🍽️'}
            </div>
          )}
          <button type="button" className="recipe-detail-back" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
        <div className="recipe-detail-body">
          <h2 id="recipe-detail-title" className="recipe-detail-title">
            {recipe.title}
          </h2>
          <div className="recipe-detail-tags">
            {recipe.prepMinutes != null ? (
              <span className="recipe-detail-tag">{recipe.prepMinutes} min</span>
            ) : null}
            {recipe.cuisine ? <span className="recipe-detail-tag">{recipe.cuisine}</span> : null}
            {recipe.calories != null ? (
              <span className="recipe-detail-tag">{recipe.calories} kcal</span>
            ) : null}
            {(recipe.dietTags ?? []).map((t) => (
              <span key={t} className="recipe-detail-tag">
                {t}
              </span>
            ))}
          </div>
          {stats.total > 0 ? (
            <div className="recipe-detail-match-bar">
              <svg
                className="recipe-detail-match-icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M3 2h18v6H3zM3 10h18v12H3z" />
                <line x1="3" y1="15" x2="21" y2="15" />
              </svg>
              <div>
                <p className="recipe-detail-match-title">
                  You have {stats.matched} of {stats.total} ingredients
                </p>
                <span className="recipe-detail-match-sub">{matchSub}</span>
              </div>
            </div>
          ) : null}
          <p className="recipe-detail-ingr-heading">Ingredients</p>
          <ul className="recipe-detail-ingr-list">
            {(recipe.ingredients ?? [])
              .filter((ing) => String(ing?.name ?? '').trim())
              .map((ing, idx) => {
                const name = String(ing.name).trim()
                const have = ingredientInPantry(name, pantryItems)
                return (
                  <li key={ing.id ?? `${name}-${idx}`} className="recipe-detail-ingr-row">
                    <span className={`recipe-detail-dot ${have ? 'recipe-detail-dot--have' : ''}`} />
                    <span className="recipe-detail-ingr-name">{name}</span>
                    <span className={`recipe-detail-ingr-label ${have ? 'recipe-detail-ingr-label--have' : ''}`}>
                      {have ? 'in pantry' : 'need to buy'}
                    </span>
                    <span className="recipe-detail-ingr-amt">
                      {[ing.quantity, ing.unit].filter(Boolean).join(' ')}
                    </span>
                  </li>
                )
              })}
          </ul>
          <a href={recipe.url} className="recipe-detail-link" target="_blank" rel="noreferrer">
            Open full recipe
          </a>
        </div>
        <div className="recipe-detail-footer">
          {confirmation ? (
            <div className="recipe-detail-confirm">
              <span className="recipe-detail-confirm-check" aria-hidden>
                ✓
              </span>
              <div className="recipe-detail-confirm-text">
                <p className="recipe-detail-confirm-title">
                  {formatPickedDayLabel(confirmation.dateIso)} ·{' '}
                  {MEAL_PICKER_OPTIONS.find((m) => m.id === confirmation.mealType)?.label ??
                    confirmation.mealType}
                </p>
                <p className="recipe-detail-confirm-sub">Added to your planner</p>
              </div>
              <button
                type="button"
                className="recipe-detail-confirm-change"
                onClick={() => {
                  setConfirmation(null)
                  setShowAddSheet(true)
                }}
              >
                Change
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="recipe-detail-btn-add"
              onClick={() => setShowAddSheet(true)}
            >
              Add to a day
            </button>
          )}
        </div>

        {showAddSheet ? (
          <div
            className="add-sheet-overlay"
            role="presentation"
            onClick={() => setShowAddSheet(false)}
          >
            <div
              className="add-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-sheet-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="add-sheet-handle" aria-hidden />
              <h3 id="add-sheet-title" className="add-sheet-title">
                Add to a day
              </h3>
              <div className="add-sheet-day-row" role="radiogroup" aria-label="Pick a day">
                {dayOptions.map((d) => {
                  const on = d.iso === pickedDate
                  return (
                    <button
                      key={d.iso}
                      type="button"
                      className={`add-sheet-day ${on ? 'add-sheet-day--on' : ''}`}
                      onClick={() => setPickedDate(d.iso)}
                      role="radio"
                      aria-checked={on}
                    >
                      {d.weekday} {d.day}
                    </button>
                  )
                })}
              </div>
              <div
                className="add-sheet-meal-row"
                role="radiogroup"
                aria-label="Pick a meal slot"
              >
                {MEAL_PICKER_OPTIONS.map((m) => {
                  const on = m.id === pickedMeal
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`add-sheet-meal ${on ? 'add-sheet-meal--on' : ''}`}
                      onClick={() => setPickedMeal(m.id)}
                      role="radio"
                      aria-checked={on}
                    >
                      <span className="add-sheet-meal-emoji" aria-hidden>
                        {m.emoji}
                      </span>
                      <span className="add-sheet-meal-label">{m.label}</span>
                    </button>
                  )
                })}
              </div>
              <p className="add-sheet-flex-hint">
                Any recipe can go in any slot — lunch and dinner often overlap.
              </p>
              <button type="button" className="add-sheet-cta" onClick={confirmAdd}>
                {ctaLabel}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function MealExplorerModal({
  dateLabel,
  slotMealType,
  explorerQuery,
  onExplorerQueryChange,
  explorerRecipeFilter,
  onExplorerRecipeFilterChange,
  recipes,
  templates,
  onPickTemplate,
  onPickRecipe,
  onClose,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="meal-explorer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meal-explorer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="meal-explorer-header">
          <div>
            <h3 id="meal-explorer-title">Explore recipes</h3>
            <p className="muted">
              {dateLabel} · assigning <strong>{slotMealType}</strong>
            </p>
          </div>
          <button type="button" className="meal-explorer-close" onClick={onClose}>
            Close
          </button>
        </div>
        <input
          className="assign-meal-search-input"
          value={explorerQuery}
          onChange={(e) => onExplorerQueryChange(e.target.value)}
          placeholder="Search recipes by name or ingredient…"
        />
        <div className="filter-row">
          <button
            type="button"
            className={explorerRecipeFilter === 'all' ? 'active-filter' : ''}
            onClick={() => onExplorerRecipeFilterChange('all')}
          >
            All recipes
          </button>
          {MEAL_TYPES.map((mealType) => (
            <button
              key={mealType}
              type="button"
              className={explorerRecipeFilter === mealType ? 'active-filter' : ''}
              onClick={() => onExplorerRecipeFilterChange(mealType)}
            >
              {mealType}
            </button>
          ))}
        </div>
        <div className="meal-explorer-scroll">
          <h4 className="meal-explorer-section-title">Your meals ({slotMealType})</h4>
          {templates.length === 0 ? (
            <p className="muted">No saved meals match this search.</p>
          ) : (
            <ul className="meal-explorer-template-list">
              {templates.map((meal) => (
                <li key={meal.id}>
                  <button type="button" className="meal-explorer-row" onClick={() => onPickTemplate(meal.id)}>
                    <span>{meal.title || 'Untitled meal'}</span>
                    <span className="muted">Use</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <h4 className="meal-explorer-section-title">Online recipes</h4>
          {recipes.length === 0 ? (
            <p className="muted">No online recipes match.</p>
          ) : (
            <div className="recipe-grid meal-explorer-recipe-grid">
              {recipes.map((recipe) => (
                <article key={recipe.id} className="recipe-card">
                  <a href={recipe.url} target="_blank" rel="noreferrer">
                    <img src={recipe.imageUrl} alt={recipe.title} className="recipe-image" />
                  </a>
                  <div className="recipe-row">
                    <div>
                      <strong>{recipe.title}</strong>
                      <p className="muted">{recipe.mealType}</p>
                    </div>
                    <button type="button" onClick={() => onPickRecipe(recipe)}>
                      Add &amp; assign
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PantryQuickAdd({ onAdd }) {
  const [value, setValue] = useState('')
  return (
    <form
      className="pantry-add-row"
      onSubmit={(e) => {
        e.preventDefault()
        onAdd(value)
        setValue('')
      }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. eggs, olive oil…"
      />
      <button type="submit" className="pantry-add-submit">
        Add
      </button>
    </form>
  )
}

function ShopQuickAdd({ sections, onAdd }) {
  const [label, setLabel] = useState('')
  const [sectionId, setSectionId] = useState('')
  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault()
        onAdd(label, sectionId)
        setLabel('')
      }}
    >
      <h3>Add item while shopping</h3>
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Item name" />
      <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
        <option value="">Other</option>
        {sections.map((section) => (
          <option key={section.id} value={section.id}>
            {section.name}
          </option>
        ))}
      </select>
      <button type="submit">Add</button>
    </form>
  )
}

function SubstitutionsModal({ item, pantryItems, onClose }) {
  const suggestions = getSubstitutionSuggestions(item.normalizedName, pantryItems)
  return (
    <dialog open className="modal">
      <h3>Substitutions for {item.normalizedName}</h3>
      {suggestions.length === 0 ? (
        <p>No valid substitutions from pantry.</p>
      ) : (
        <ul>
          {suggestions.map((suggestion) => (
            <li key={suggestion}>{suggestion}</li>
          ))}
        </ul>
      )}
      <button onClick={onClose}>Close</button>
    </dialog>
  )
}

function toIsoDate(date) {
  return date.toISOString().split('T')[0]
}

function formatDateBadge(dateIso) {
  const value = new Date(`${dateIso}T12:00:00`)
  return value
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .toUpperCase()
}

function getMonthCells(monthDate) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const firstDow = firstDay.getDay()
  // Convert Sunday(0)…Saturday(6) into 6,0,1,2,3,4,5 so Monday is the first column.
  const leading = firstDow === 0 ? 6 : firstDow - 1
  const daysInMonth = lastDay.getDate()
  const cells = []

  for (let index = 0; index < leading; index += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function getWeekFromDate(anchorDate) {
  const start = new Date(anchorDate)
  const day = start.getDay()
  // 0 = Sunday → step back 6, otherwise step back to Monday (day 1).
  const mondayOffset = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + mondayOffset)
  return Array.from({ length: 7 }).map((_, index) => {
    const value = new Date(start)
    value.setDate(start.getDate() + index)
    return value
  })
}

function getWeekLabel(weekDates) {
  if (weekDates.length === 0) return ''
  const start = weekDates[0]
  const end = weekDates[weekDates.length - 1]
  const startLabel = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const endLabel = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${startLabel} - ${endLabel}`
}

export default App
