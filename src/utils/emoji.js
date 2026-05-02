// Curated food-emoji library used by the planner-grid emoji picker
// and the auto-picker that runs when a recipe is created.

export const EMOJI_CATEGORIES = [
  {
    id: 'fish',
    label: 'Fish',
    emojis: ['🐟', '🍣', '🍤', '🦞', '🦀', '🐙', '🦑', '🐡', '🍱', '🥡'],
  },
  {
    id: 'meat',
    label: 'Meat',
    emojis: ['🍖', '🍗', '🥩', '🥓', '🦃', '🍔', '🌭', '🌮', '🌯', '🥙'],
  },
  {
    id: 'pasta',
    label: 'Pasta',
    emojis: ['🍝', '🍜', '🥟', '🍙', '🍚', '🥘', '🍕'],
  },
  {
    id: 'veg',
    label: 'Veg',
    emojis: ['🥗', '🥦', '🥕', '🥒', '🍅', '🥑', '🌽', '🥬', '🥔', '🍠', '🍆', '🌶️'],
  },
  {
    id: 'soup',
    label: 'Soup',
    emojis: ['🍲', '🍜', '🥣', '🍵', '🫕', '🍛'],
  },
  {
    id: 'breakfast',
    label: 'Breakfast',
    emojis: ['🥞', '🧇', '🍳', '🥐', '🥯', '🥖', '🥪', '🥣', '🍞', '🥚', '🥛', '🥑'],
  },
  {
    id: 'sweet',
    label: 'Sweet',
    emojis: ['🍰', '🧁', '🍪', '🍩', '🍮', '🍫', '🍦', '🍨', '🍯', '🥧'],
  },
  {
    id: 'drinks',
    label: 'Drinks',
    emojis: ['☕', '🍵', '🧃', '🥤', '🍹', '🍷', '🍺', '🥛'],
  },
]

/**
 * Ordered keyword → emoji rules. Earlier rules win, so put more specific
 * keywords (carbonara) before more general ones (pasta).
 */
const EMOJI_RULES = [
  // Specific dishes / cuisines
  { match: ['carbonara', 'spaghetti', 'lasagna', 'lasagne', 'penne', 'fettuccine', 'linguine', 'ravioli', 'gnocchi', 'pasta'], emoji: '🍝' },
  { match: ['ramen', 'pho', 'udon', 'soba', 'noodle'], emoji: '🍜' },
  { match: ['sushi', 'sashimi', 'maki', 'nigiri'], emoji: '🍣' },
  { match: ['onigiri', 'rice ball'], emoji: '🍙' },
  { match: ['bento'], emoji: '🍱' },
  { match: ['risotto', 'paella'], emoji: '🥘' },
  { match: ['fried rice', 'rice bowl', 'jasmine rice', 'basmati', 'pilaf'], emoji: '🍚' },
  { match: ['curry', 'tikka', 'masala', 'butter chicken'], emoji: '🍛' },
  { match: ['pizza'], emoji: '🍕' },
  { match: ['burger', 'cheeseburger'], emoji: '🍔' },
  { match: ['hot dog', 'frank'], emoji: '🌭' },
  { match: ['taco'], emoji: '🌮' },
  { match: ['burrito', 'wrap', 'quesadilla'], emoji: '🌯' },
  { match: ['gyro', 'shawarma', 'kebab', 'souvlaki'], emoji: '🥙' },
  { match: ['falafel', 'hummus', 'pita'], emoji: '🧆' },
  { match: ['dumpling', 'pierogi', 'gyoza', 'wonton'], emoji: '🥟' },
  { match: ['stir fry', 'stir-fry', 'lo mein', 'chow mein', 'wok', 'takeout'], emoji: '🥡' },
  { match: ['fondue', 'hot pot'], emoji: '🫕' },

  // Proteins
  { match: ['salmon', 'tuna', 'cod', 'bass', 'tilapia', 'trout', 'snapper', 'halibut', 'sardine', 'fish'], emoji: '🐟' },
  { match: ['shrimp', 'prawn'], emoji: '🍤' },
  { match: ['lobster'], emoji: '🦞' },
  { match: ['crab'], emoji: '🦀' },
  { match: ['octopus'], emoji: '🐙' },
  { match: ['squid', 'calamari'], emoji: '🦑' },
  { match: ['turkey'], emoji: '🦃' },
  { match: ['steak', 'beef', 'brisket', 'sirloin'], emoji: '🥩' },
  { match: ['bacon'], emoji: '🥓' },
  { match: ['chicken', 'poultry'], emoji: '🍗' },
  { match: ['pork', 'ham', 'ribs'], emoji: '🍖' },

  // Salads & soups
  { match: ['greek salad', 'caesar', 'cobb', 'salad'], emoji: '🥗' },
  { match: ['chili', 'stew', 'goulash', 'gumbo'], emoji: '🍲' },
  { match: ['soup', 'broth', 'bisque', 'chowder', 'minestrone'], emoji: '🍜' },
  { match: ['porridge', 'oatmeal', 'oats', 'congee'], emoji: '🥣' },

  // Breakfast / breads
  { match: ['avocado toast', 'avocado'], emoji: '🥑' },
  { match: ['toast', 'sandwich', 'sub', 'panini', 'grilled cheese'], emoji: '🥪' },
  { match: ['bagel'], emoji: '🥯' },
  { match: ['croissant'], emoji: '🥐' },
  { match: ['baguette', 'bread', 'loaf'], emoji: '🥖' },
  { match: ['pancake', 'crepe', 'crêpe'], emoji: '🥞' },
  { match: ['waffle'], emoji: '🧇' },
  { match: ['egg', 'omelette', 'omelet', 'frittata', 'scramble', 'shakshuka', 'quiche'], emoji: '🍳' },

  // Sides & snacks
  { match: ['fries', 'french fry'], emoji: '🍟' },
  { match: ['cheese plate', 'cheese board', 'cheese'], emoji: '🧀' },
  { match: ['popcorn'], emoji: '🍿' },
  { match: ['nuts', 'almond', 'cashew', 'peanut'], emoji: '🥜' },
  { match: ['pot pie', 'meat pie', 'shepherd'], emoji: '🥧' },

  // Veg
  { match: ['broccoli'], emoji: '🥦' },
  { match: ['carrot'], emoji: '🥕' },
  { match: ['cucumber'], emoji: '🥒' },
  { match: ['tomato'], emoji: '🍅' },
  { match: ['corn'], emoji: '🌽' },
  { match: ['lettuce', 'kale', 'spinach'], emoji: '🥬' },
  { match: ['potato'], emoji: '🥔' },
  { match: ['sweet potato', 'yam'], emoji: '🍠' },
  { match: ['eggplant', 'aubergine'], emoji: '🍆' },
  { match: ['mushroom'], emoji: '🍄' },
  { match: ['pepper', 'chili pepper', 'jalapeno'], emoji: '🌶️' },

  // Sweet
  { match: ['cake'], emoji: '🍰' },
  { match: ['cupcake', 'muffin'], emoji: '🧁' },
  { match: ['cookie', 'biscuit'], emoji: '🍪' },
  { match: ['donut', 'doughnut'], emoji: '🍩' },
  { match: ['ice cream', 'gelato', 'sorbet'], emoji: '🍨' },
  { match: ['pudding', 'custard', 'flan'], emoji: '🍮' },
  { match: ['chocolate', 'brownie'], emoji: '🍫' },
  { match: ['honey'], emoji: '🍯' },

  // Drinks
  { match: ['smoothie', 'juice', 'shake'], emoji: '🧃' },
  { match: ['coffee', 'latte', 'espresso', 'mocha'], emoji: '☕' },
  { match: ['matcha', 'tea'], emoji: '🍵' },
  { match: ['cocktail', 'mojito', 'margarita'], emoji: '🍹' },
  { match: ['wine'], emoji: '🍷' },
  { match: ['beer', 'lager', 'ale'], emoji: '🍺' },
]

const FALLBACK_BY_MEAL_TYPE = {
  breakfast: '🥞',
  lunch: '🥗',
  dinner: '🍽️',
}

/**
 * Given a recipe name + ingredient list (and optional meal type),
 * return the single most representative food emoji from the curated set.
 */
export function pickEmojiForRecipe({ title, ingredients = [], mealType } = {}) {
  const ingredientText = (ingredients ?? [])
    .map((ingredient) => String(ingredient?.name ?? ''))
    .join(' ')
  const blob = `${String(title ?? '')} ${ingredientText}`.toLowerCase()
  if (!blob.trim()) {
    return FALLBACK_BY_MEAL_TYPE[mealType] || '🍽️'
  }
  for (const rule of EMOJI_RULES) {
    if (rule.match.some((keyword) => blob.includes(keyword))) {
      return rule.emoji
    }
  }
  return FALLBACK_BY_MEAL_TYPE[mealType] || '🍽️'
}
