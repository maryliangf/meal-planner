/**
 * Parse pasted recipe lines and guess store sections for shopping list grouping.
 * URL "pull" uses a plain-text reader when the network allows; otherwise paste is required.
 */

const INGREDIENT_HEADER = /^(#{1,4}\s*ingredients|ingredients\s*$|\*\*ingredients\*\*)/i

const COMMON_UNITS = new Set([
  'cup',
  'cups',
  'tbsp',
  'tsp',
  'tablespoon',
  'tablespoons',
  'teaspoon',
  'teaspoons',
  'oz',
  'lb',
  'lbs',
  'g',
  'kg',
  'ml',
  'l',
  'clove',
  'cloves',
  'slice',
  'slices',
  'can',
  'cans',
  'package',
  'pkg',
  'bunch',
  'head',
  'stalk',
  'stalks',
  'piece',
  'pieces',
])

const SECTION_KEYWORDS = [
  { id: 'produce', keys: ['lettuce', 'tomato', 'onion', 'garlic', 'lemon', 'lime', 'cilantro', 'parsley', 'basil', 'oregano', 'spinach', 'kale', 'broccoli', 'carrot', 'celery', 'cucumber', 'avocado', 'potato', 'sweet potato', 'zucchini', 'pepper', 'jalapeño', 'mushroom', 'apple', 'banana', 'berry', 'berries', 'fruit', 'herb', 'greens', 'salad', 'ginger', 'scallion', 'chive', 'radish', 'beet', 'corn', 'peas', 'asparagus', 'cabbage', 'cauliflower'] },
  { id: 'dairy', keys: ['milk', 'cream', 'butter', 'cheese', 'yogurt', 'yoghurt', 'mozzarella', 'parmesan', 'feta', 'ricotta', 'egg', 'eggs', 'half and half', 'buttermilk', 'sour cream', 'cheddar', 'greek yogurt'] },
  { id: 'protein', keys: ['chicken', 'beef', 'pork', 'turkey', 'salmon', 'tuna', 'fish', 'shrimp', 'prawn', 'tofu', 'bacon', 'sausage', 'lamb', 'steak', 'ground', 'fillet', 'tenderloin', 'ham'] },
  { id: 'bakery', keys: ['bread', 'bun', 'roll', 'tortilla', 'pita', 'bagel', 'croissant', 'breadcrumbs'] },
  { id: 'pantry', keys: ['oil', 'olive', 'vinegar', 'sauce', 'stock', 'broth', 'honey', 'sugar', 'salt', 'pepper', 'spice', 'cumin', 'paprika', 'flour', 'baking', 'pasta', 'rice', 'quinoa', 'lentil', 'lentils', 'beans', 'chickpea', 'couscous', 'oats', 'cereal', 'soy sauce', 'worcestershire', 'mustard', 'mayo', 'mayonnaise', 'ketchup', 'syrup', 'vanilla', 'cornstarch', 'nut', 'almond', 'walnut', 'peanut'] },
  { id: 'frozen', keys: ['frozen', 'ice cream'] },
  { id: 'snacks', keys: ['cracker', 'chips', 'granola', 'popcorn', 'chocolate bar'] },
  { id: 'beverages', keys: ['juice', 'wine', 'beer', 'soda', 'water', 'tea', 'coffee', 'broth concentrate'] },
  { id: 'household', keys: ['foil', 'wrap', 'bag', 'soap', 'paper towel'] },
]

function normalizeLine(line) {
  return line
    .trim()
    .replace(/^[-*•]\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
    .replace(/^▢\s*/, '')
    .trim()
}

export function parseIngredientLine(line) {
  const raw = normalizeLine(line)
  if (!raw) return { name: '', quantity: '', unit: '' }

  const parts = raw.split(/\s+/)
  if (parts.length === 1) {
    return { name: raw, quantity: '', unit: '' }
  }

  const qtyMatch = parts[0].match(/^([\d./]+|\d+\s+\d\/\d)$/)
  if (!qtyMatch) {
    return { name: raw, quantity: '', unit: '' }
  }

  let quantity = parts[0]
  let unit = ''
  let nameStart = 1

  if (parts.length > 1 && COMMON_UNITS.has(parts[1].toLowerCase().replace(/[,.]$/, ''))) {
    unit = parts[1].replace(/[,.]$/, '')
    nameStart = 2
  } else if (parts.length > 1 && /^[\d./]+$/.test(parts[1])) {
    quantity = `${parts[0]} ${parts[1]}`
    nameStart = 2
    if (parts.length > 2 && COMMON_UNITS.has(parts[2].toLowerCase().replace(/[,.]$/, ''))) {
      unit = parts[2].replace(/[,.]$/, '')
      nameStart = 3
    }
  }

  const name = parts.slice(nameStart).join(' ').replace(/^[,–-]\s*/, '').trim()
  return {
    name: name || raw,
    quantity,
    unit,
  }
}

export function guessStoreSectionId(ingredientName, storeSections) {
  const ids = new Set(storeSections.map((s) => s.id))
  const n = ingredientName.toLowerCase()
  for (const { id, keys } of SECTION_KEYWORDS) {
    if (!ids.has(id)) continue
    if (keys.some((k) => n.includes(k))) return id
  }
  if (ids.has('other')) return 'other'
  return storeSections[0]?.id ?? ''
}

export function parseIngredientPaste(text, storeSections) {
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  return lines.map((line) => {
    const parsed = parseIngredientLine(line)
    const name = parsed.name.trim()
    return {
      id: crypto.randomUUID(),
      name,
      quantity: parsed.quantity,
      unit: parsed.unit,
      sectionId: name ? guessStoreSectionId(name, storeSections) : '',
      notes: '',
    }
  })
}

export function extractIngredientLinesFromMarkdown(markdown) {
  const lines = markdown.split('\n')
  let i = 0
  while (i < lines.length && !INGREDIENT_HEADER.test(lines[i].trim())) {
    i += 1
  }
  if (i >= lines.length) return []
  i += 1
  const out = []
  while (i < lines.length) {
    const raw = lines[i]
    const line = raw.trim()
    if (/^#{1,4}\s+\S/.test(line)) break
    if (/^\*\*[^*]+\*\*\s*$/.test(line) && line.length < 48 && !/^ingredients/i.test(line)) break

    if (line === '') {
      if (out.length > 0) break
      i += 1
      continue
    }

    const cleaned = normalizeLine(line)
    if (cleaned && (cleaned.length > 2 || /\d/.test(cleaned))) {
      out.push(cleaned)
    }
    i += 1
  }
  return out
}

/**
 * Fetches a readable text version of a page (for ingredient extraction).
 * May fail due to CORS or rate limits; callers should fall back to paste.
 */
export async function fetchRecipePagePlainText(url) {
  const trimmed = url.trim()
  if (!trimmed) throw new Error('Enter a recipe URL.')
  const target = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
  const readerUrl = `https://r.jina.ai/${encodeURIComponent(target)}`
  const response = await fetch(readerUrl)
  if (!response.ok) throw new Error(`Could not read page (${response.status}). Paste ingredients instead.`)
  return response.text()
}
