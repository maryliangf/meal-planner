export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner']

export const DISCOVER_CUISINES = [
  'Italian',
  'Japanese',
  'Mexican',
  'Indian',
  'Mediterranean',
  'Thai',
  'French',
  'American',
  'Chinese',
  'Middle Eastern',
]

export const DEFAULT_MEAL_EMOJI = {
  breakfast: '🥞',
  lunch: '🥗',
  dinner: '🍽️',
}

export const DISCOVER_DIETS = [
  'Vegetarian',
  'Vegan',
  'Gluten-free',
  'Dairy-free',
  'Nut-free',
  'Halal',
  'Kosher',
  'Keto',
  'Low-carb',
  'High-protein',
]

export const ONLINE_RECIPE_CATALOG = {
  breakfast: [
    {
      id: 'breakfast-overnight-oats',
      title: 'Overnight Oats',
      cuisine: 'American',
      prepMinutes: 5,
      calories: 320,
      emoji: '🥣',
      tileBg: '#fff3e0',
      dietTags: ['Vegetarian', 'Dairy-free'],
      url: 'https://www.loveandlemons.com/overnight-oats-recipe/',
      imageUrl: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?auto=format&fit=crop&w=900&q=80',
      defaultServings: '2',
      ingredients: [
        { name: 'rolled oats', quantity: '1', unit: 'cup', sectionId: 'pantry', notes: '' },
        { name: 'milk', quantity: '1', unit: 'cup', sectionId: 'dairy', notes: '' },
        { name: 'plain yogurt', quantity: '0.5', unit: 'cup', sectionId: 'dairy', notes: '' },
        { name: 'chia seeds', quantity: '1', unit: 'tbsp', sectionId: 'pantry', notes: '' },
        { name: 'maple syrup', quantity: '2', unit: 'tbsp', sectionId: 'pantry', notes: '' },
        { name: 'vanilla extract', quantity: '0.5', unit: 'tsp', sectionId: 'pantry', notes: '' },
        { name: 'banana', quantity: '1', unit: '', sectionId: 'produce', notes: '' },
        { name: 'berries', quantity: '0.5', unit: 'cup', sectionId: 'produce', notes: '' },
      ],
    },
    {
      id: 'breakfast-avocado-toast',
      title: 'Avocado Toast',
      cuisine: 'American',
      prepMinutes: 10,
      calories: 280,
      emoji: '🥑',
      tileBg: '#eef6ee',
      dietTags: ['Vegetarian', 'Vegan', 'Dairy-free'],
      url: 'https://www.simplyrecipes.com/recipes/avocado_toast/',
      imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=80',
      defaultServings: '2',
      ingredients: [
        { name: 'sourdough bread', quantity: '4', unit: 'slices', sectionId: 'bakery', notes: '' },
        { name: 'avocado', quantity: '2', unit: '', sectionId: 'produce', notes: '' },
        { name: 'lemon', quantity: '1', unit: '', sectionId: 'produce', notes: '' },
        { name: 'cherry tomatoes', quantity: '1', unit: 'cup', sectionId: 'produce', notes: '' },
        { name: 'olive oil', quantity: '1', unit: 'tbsp', sectionId: 'pantry', notes: '' },
        { name: 'red pepper flakes', quantity: '0.25', unit: 'tsp', sectionId: 'pantry', notes: '' },
        { name: 'flaky sea salt', quantity: '1', unit: 'pinch', sectionId: 'pantry', notes: '' },
      ],
    },
  ],
  lunch: [
    {
      id: 'lunch-chicken-salad',
      title: 'Chicken Salad Sandwich',
      cuisine: 'American',
      prepMinutes: 20,
      calories: 480,
      emoji: '🥪',
      tileBg: '#fef3e2',
      dietTags: ['High-protein'],
      url: 'https://www.budgetbytes.com/chicken-salad-sandwiches/',
      imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=80',
      defaultServings: '4',
      ingredients: [
        { name: 'cooked chicken', quantity: '2', unit: 'cups', sectionId: 'protein', notes: '' },
        { name: 'celery', quantity: '2', unit: 'stalks', sectionId: 'produce', notes: '' },
        { name: 'red onion', quantity: '0.25', unit: '', sectionId: 'produce', notes: '' },
        { name: 'red grapes', quantity: '0.5', unit: 'cup', sectionId: 'produce', notes: '' },
        { name: 'mayonnaise', quantity: '0.5', unit: 'cup', sectionId: 'pantry', notes: '' },
        { name: 'dijon mustard', quantity: '1', unit: 'tsp', sectionId: 'pantry', notes: '' },
        { name: 'lemon juice', quantity: '1', unit: 'tbsp', sectionId: 'produce', notes: '' },
        { name: 'sandwich bread', quantity: '8', unit: 'slices', sectionId: 'bakery', notes: '' },
        { name: 'lettuce', quantity: '1', unit: 'cup', sectionId: 'produce', notes: '' },
      ],
    },
    {
      id: 'lunch-greek-salad',
      title: 'Greek Salad',
      cuisine: 'Mediterranean',
      prepMinutes: 15,
      calories: 360,
      emoji: '🥗',
      tileBg: '#eef6ee',
      dietTags: ['Vegetarian', 'Gluten-free', 'Keto'],
      url: 'https://www.loveandlemons.com/greek-salad/',
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80',
      defaultServings: '4',
      ingredients: [
        { name: 'cucumber', quantity: '1', unit: '', sectionId: 'produce', notes: '' },
        { name: 'tomatoes', quantity: '2', unit: 'cups', sectionId: 'produce', notes: '' },
        { name: 'red onion', quantity: '0.5', unit: '', sectionId: 'produce', notes: '' },
        { name: 'kalamata olives', quantity: '0.5', unit: 'cup', sectionId: 'pantry', notes: '' },
        { name: 'feta', quantity: '0.5', unit: 'cup', sectionId: 'dairy', notes: '' },
        { name: 'extra virgin olive oil', quantity: '3', unit: 'tbsp', sectionId: 'pantry', notes: '' },
        { name: 'red wine vinegar', quantity: '1', unit: 'tbsp', sectionId: 'pantry', notes: '' },
        { name: 'dried oregano', quantity: '1', unit: 'tsp', sectionId: 'pantry', notes: '' },
      ],
    },
  ],
  dinner: [
    {
      id: 'dinner-sheet-pan-salmon',
      title: 'Sheet Pan Salmon and Veggies',
      cuisine: 'American',
      prepMinutes: 35,
      calories: 540,
      emoji: '🐟',
      tileBg: '#e8f0fe',
      dietTags: ['High-protein', 'Gluten-free', 'Keto', 'Dairy-free'],
      url: 'https://www.eatingwell.com/recipe/269820/sheet-pan-salmon-with-sweet-potatoes-broccoli/',
      imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=80',
      defaultServings: '4',
      ingredients: [
        { name: 'salmon fillets', quantity: '4', unit: '', sectionId: 'protein', notes: '' },
        { name: 'broccoli', quantity: '1', unit: 'head', sectionId: 'produce', notes: '' },
        { name: 'sweet potato', quantity: '2', unit: '', sectionId: 'produce', notes: '' },
        { name: 'olive oil', quantity: '3', unit: 'tbsp', sectionId: 'pantry', notes: '' },
        { name: 'garlic', quantity: '3', unit: 'cloves', sectionId: 'produce', notes: '' },
        { name: 'lemon', quantity: '1', unit: '', sectionId: 'produce', notes: '' },
        { name: 'paprika', quantity: '1', unit: 'tsp', sectionId: 'pantry', notes: '' },
        { name: 'salt', quantity: '1', unit: 'tsp', sectionId: 'pantry', notes: '' },
        { name: 'black pepper', quantity: '0.5', unit: 'tsp', sectionId: 'pantry', notes: '' },
      ],
    },
    {
      id: 'dinner-turkey-chili',
      title: 'Turkey Chili',
      cuisine: 'Mexican',
      prepMinutes: 45,
      calories: 520,
      emoji: '🌶️',
      tileBg: '#fef3e2',
      dietTags: ['High-protein', 'Dairy-free', 'Gluten-free'],
      url: 'https://www.spendwithpennies.com/turkey-chili-recipe/',
      imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=80',
      defaultServings: '6',
      ingredients: [
        { name: 'ground turkey', quantity: '1', unit: 'lb', sectionId: 'protein', notes: '' },
        { name: 'kidney beans', quantity: '2', unit: 'cans', sectionId: 'pantry', notes: '' },
        { name: 'diced tomatoes', quantity: '1', unit: 'can', sectionId: 'pantry', notes: '' },
        { name: 'tomato paste', quantity: '2', unit: 'tbsp', sectionId: 'pantry', notes: '' },
        { name: 'yellow onion', quantity: '1', unit: '', sectionId: 'produce', notes: '' },
        { name: 'bell pepper', quantity: '1', unit: '', sectionId: 'produce', notes: '' },
        { name: 'garlic', quantity: '4', unit: 'cloves', sectionId: 'produce', notes: '' },
        { name: 'chili powder', quantity: '2', unit: 'tbsp', sectionId: 'pantry', notes: '' },
        { name: 'cumin', quantity: '1', unit: 'tbsp', sectionId: 'pantry', notes: '' },
        { name: 'chicken broth', quantity: '1', unit: 'cup', sectionId: 'pantry', notes: '' },
      ],
    },
  ],
}

export function normalizeUrl(rawUrl) {
  if (!rawUrl) return ''
  const trimmed = String(rawUrl).trim()
  if (!trimmed) return ''
  try {
    const u = new URL(trimmed)
    const host = u.hostname.toLowerCase().replace(/^www\./, '')
    let path = u.pathname.replace(/\/+$/, '')
    if (!path) path = '/'
    return `${host}${path}`
  } catch {
    return trimmed.toLowerCase().replace(/\/+$/, '')
  }
}

export function slugify(text) {
  return String(text ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function makeRecipeKey({ catalogId, recipeUrl, title } = {}) {
  if (catalogId) return `catalog:${catalogId}`
  const normalized = normalizeUrl(recipeUrl)
  if (normalized) return `url:${normalized}`
  const slug = slugify(title)
  if (slug) return `custom:${slug}`
  return `blank:${crypto.randomUUID()}`
}

import { pickEmojiForRecipe } from './emoji.js'

export function createTemplateFromRecipe(recipe, mealType) {
  const emoji =
    recipe.emoji ||
    pickEmojiForRecipe({
      title: recipe.title,
      ingredients: recipe.ingredients,
      mealType,
    })
  return {
    id: crypto.randomUUID(),
    recipeKey: makeRecipeKey({ catalogId: recipe.id, recipeUrl: recipe.url, title: recipe.title }),
    title: recipe.title,
    mealType,
    recipeUrl: recipe.url,
    recipeImageUrl: recipe.imageUrl ?? '',
    defaultServings: recipe.defaultServings,
    cuisine: recipe.cuisine ?? '',
    prepMinutes: recipe.prepMinutes ?? null,
    calories: recipe.calories ?? null,
    emoji,
    tileBg: recipe.tileBg ?? '',
    dietTags: recipe.dietTags ?? [],
    tags: ['online recipe'],
    ingredients: recipe.ingredients.map((ingredient) => ({
      id: crypto.randomUUID(),
      ...ingredient,
    })),
  }
}
