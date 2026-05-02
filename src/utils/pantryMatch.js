/** Loose match: ingredient name vs pantry keys that are marked on-hand (truthy). */
export function ingredientInPantry(ingredientName, pantryItems) {
  const ing = String(ingredientName ?? '')
    .toLowerCase()
    .trim()
  if (!ing) return false
  const keys = Object.keys(pantryItems ?? {}).filter((k) => pantryItems[k])
  for (const k of keys) {
    const key = String(k).toLowerCase().trim()
    if (!key) continue
    if (ing === key || ing.includes(key) || key.includes(ing)) return true
    const ingWords = ing.split(/\s+/).filter((w) => w.length > 2)
    for (const w of ingWords) {
      if (key.includes(w) || w.includes(key)) return true
    }
  }
  return false
}

export function recipePantryStats(recipe, pantryItems) {
  const list = recipe?.ingredients ?? []
  const total = list.filter((i) => String(i?.name ?? '').trim()).length
  if (total === 0) return { matched: 0, total: 0, ratio: 0, missing: [] }
  const missing = []
  let matched = 0
  for (const ing of list) {
    const name = String(ing?.name ?? '').trim()
    if (!name) continue
    if (ingredientInPantry(name, pantryItems)) matched += 1
    else missing.push(name)
  }
  return {
    matched,
    total,
    ratio: matched / total,
    missing,
  }
}

export function countRecipesUnlocked(browseRecipes, pantryItems, minRatio = 0.5) {
  let n = 0
  for (const recipe of browseRecipes) {
    const { ratio, total } = recipePantryStats(recipe, pantryItems)
    if (total > 0 && ratio >= minRatio) n += 1
  }
  return n
}
