const CLOSE_SWAPS = {
  'greek yogurt': ['sour cream'],
  spinach: ['kale'],
  kale: ['spinach'],
  buttermilk: ['milk', 'greek yogurt'],
  cilantro: ['parsley'],
}

function parseQuantity(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function normalizeName(name) {
  return (name ?? '').trim().toLowerCase()
}

function toDisplayQuantity(quantity, unit) {
  if (!quantity && !unit) return ''
  if (!quantity) return unit
  if (!unit) return quantity
  return `${quantity} ${unit}`
}

function aggregateIngredients(state, weekDays) {
  const buckets = new Map()

  for (const day of weekDays) {
    const plannedMeals = state.weeklyPlan[day] ?? []
    for (const planned of plannedMeals) {
      const meal = state.mealTemplates.find((item) => item.id === planned.mealTemplateId)
      if (!meal) continue

      const baseServings = Number(meal.defaultServings) || 1
      const targetServings = Number(planned.servingsOverride) || baseServings
      const multiplier = targetServings / baseServings

      for (const ingredient of meal.ingredients) {
        const normalizedName = normalizeName(ingredient.name)
        if (!normalizedName) continue

        const unit = normalizeName(ingredient.unit)
        const key = `${normalizedName}::${unit}`
        const previous = buckets.get(key)
        const parsed = parseQuantity(ingredient.quantity)
        const multiplied = parsed !== null ? String(parsed * multiplier) : ingredient.quantity

        if (!previous) {
          buckets.set(key, {
            id: key,
            normalizedName,
            quantity: multiplied || '',
            unit: ingredient.unit || '',
            sectionId: ingredient.sectionId || '',
            sourceMeals: [meal.title || 'Untitled meal'],
          })
          continue
        }

        const prevQty = parseQuantity(previous.quantity)
        const nextQty = parseQuantity(multiplied)
        previous.quantity =
          prevQty !== null && nextQty !== null ? String(prevQty + nextQty) : [previous.quantity, multiplied].filter(Boolean).join(' + ')
        previous.sourceMeals = [...new Set([...previous.sourceMeals, meal.title || 'Untitled meal'])]
      }
    }
  }

  return Array.from(buckets.values())
}

export function buildShoppingList(state, weekDays) {
  const aggregated = aggregateIngredients(state, weekDays)
  const pantrySet = new Set(
    Object.entries(state.pantryItems)
      .filter(([, onHand]) => onHand)
      .map(([name]) => name),
  )

  const sectionMap = new Map(
    [...state.storeSections]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((section) => [section.id, { ...section, items: [] }]),
  )
  const fallbackSection = state.storeSections.find((section) => section.name.toLowerCase() === 'other')

  for (const item of aggregated) {
    if (pantrySet.has(item.normalizedName)) continue
    const sectionId = item.sectionId || fallbackSection?.id || state.storeSections[0]?.id
    if (!sectionMap.has(sectionId)) continue
    sectionMap.get(sectionId).items.push({
      ...item,
      display: `${item.normalizedName} ${toDisplayQuantity(item.quantity, item.unit)}`.trim(),
    })
  }

  for (const adHoc of state.shopping.adHocItems) {
    const sectionId = adHoc.sectionId || fallbackSection?.id || state.storeSections[0]?.id
    if (!sectionMap.has(sectionId)) continue
    sectionMap.get(sectionId).items.push({
      id: adHoc.id,
      normalizedName: normalizeName(adHoc.label),
      quantity: '',
      unit: '',
      sourceMeals: ['Ad hoc'],
      display: adHoc.label,
    })
  }

  return Array.from(sectionMap.values()).filter((section) => section.items.length > 0)
}

export function toggleCheckedState(checkedMap, itemId) {
  return {
    ...checkedMap,
    [itemId]: !checkedMap[itemId],
  }
}

export function queueShoppingMutation(state, type) {
  return {
    ...state,
    shopping: {
      ...state.shopping,
      mutationQueue: [
        ...state.shopping.mutationQueue,
        {
          id: crypto.randomUUID(),
          type,
          createdAt: Date.now(),
        },
      ],
    },
  }
}

export function addAdHocItem(state, label, sectionId) {
  return queueShoppingMutation(
    {
      ...state,
      shopping: {
        ...state.shopping,
        adHocItems: [
          ...state.shopping.adHocItems,
          {
            id: `adhoc-${crypto.randomUUID()}`,
            label: label.trim(),
            sectionId,
          },
        ],
      },
    },
    'add-ad-hoc',
  )
}

export function getSubstitutionSuggestions(itemName, pantryItems) {
  const normalized = normalizeName(itemName)
  const pantrySet = new Set(
    Object.entries(pantryItems)
      .filter(([, onHand]) => onHand)
      .map(([name]) => normalizeName(name)),
  )
  const exact = pantrySet.has(normalized) ? [`Use pantry ${normalized}`] : []
  const mapped = (CLOSE_SWAPS[normalized] ?? []).filter((candidate) => pantrySet.has(candidate))
  return [...exact, ...mapped]
}
