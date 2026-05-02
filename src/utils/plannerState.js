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
