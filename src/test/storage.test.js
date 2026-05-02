import { describe, expect, it } from 'vitest'
import { createEmptyRecipe } from '../utils/plannerState'
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

  it('keeps modern canonical planner state without rebuilding legacy mirrors', () => {
    const parsed = {
      recipes: [
        {
          id: 'recipe-1',
          title: 'Sheet Pan Salmon',
          image: '',
          mealTypes: ['dinner'],
          servings: '2',
          ingredients: [],
          instructions: [''],
          notes: '',
          macros: null,
          sourceUrl: '',
          sourceName: '',
          importedAt: '',
          createdAt: 1,
          updatedAt: 2,
        },
      ],
      plannedMeals: {
        '2026-04-29': [{ id: 'planned-1', recipeId: 'recipe-1', slot: 'dinner' }],
      },
      shoppingRange: { mode: 'selected-week', startDate: '2026-04-27', endDate: '2026-05-03' },
    }

    const migrated = migratePlannerState(parsed)

    expect(migrated.recipes).toEqual(parsed.recipes)
    expect(migrated.plannedMeals).toEqual(parsed.plannedMeals)
    expect(migrated.shoppingRange).toEqual(parsed.shoppingRange)
    expect(migrated.mealTemplates).toBeUndefined()
    expect(migrated.weeklyPlan).toBeUndefined()
  })

  it('prefers legacy meal templates when modern recipes are present but still empty', () => {
    const parsed = {
      recipes: [],
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
      plannedMeals: {},
      weeklyPlan: {
        '2026-04-29': [{ id: 'planned-1', mealTemplateId: 'meal-1', mealType: 'dinner', servingsOverride: '' }],
      },
    }

    const migrated = migratePlannerState(parsed)

    expect(migrated.recipes).toHaveLength(1)
    expect(migrated.recipes[0]).toMatchObject({
      id: 'meal-1',
      title: 'Turkey Chili',
      mealTypes: ['dinner'],
    })
    expect(migrated.plannedMeals['2026-04-29'][0]).toMatchObject({
      recipeId: 'meal-1',
      slot: 'dinner',
    })
  })
})

describe('createEmptyRecipe', () => {
  it('creates a recipe shell with required defaults and empty import metadata', () => {
    const recipe = createEmptyRecipe()

    expect(recipe).toMatchObject({
      title: '',
      image: '',
      mealTypes: ['dinner'],
      servings: '2',
      notes: '',
      macros: null,
      sourceUrl: '',
      sourceName: '',
      importedAt: '',
    })
    expect(recipe.ingredients).toHaveLength(1)
    expect(recipe.ingredients[0]).toMatchObject({
      name: '',
      quantity: '',
      unit: '',
      sectionId: '',
      notes: '',
    })
    expect(recipe.instructions).toEqual([''])
  })
})
