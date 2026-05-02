# Meal Planner Design

## Overview

This app is a planner-first meal planning experience. The primary interaction is choosing dates on a monthly calendar, assigning saved recipes to meal slots for a selected day, and generating a shopping list from the active plan.

The product should feel calm and approachable, like a digital version of a physical planner, while still providing modern conveniences such as recipe import, reusable recipe storage, and automated shopping-list generation.

## Product Direction

- Keep the planner as the center of the experience.
- Use recipes to support planning, not to turn the app into a full recipe-management platform.
- Make the recipe library the source of truth for anything assignable to the calendar.
- Default shopping behavior to the currently selected week, with a manual range override available when needed.

## Core Structure

### Plan Window

- Default view is a monthly calendar.
- Clicking a date selects that day.
- The calendar should stay visually calm and scannable.
- Dates may show lightweight indicators that meals are planned, but not full meal details.

### Meals Window

- The meals window updates based on the selected date.
- Each day contains separate meal slots:
  - breakfast
  - lunch
  - dinner
- Meal assignment happens only in the meals window.
- The current interaction model remains in place: the user selects a day, then edits meal slots from the meals area.

### Recipe Library

- The recipe library stores all reusable recipes.
- Only recipes already saved in the library can be assigned to meal slots.
- Users can create recipes manually or import them from a URL.

### Shopping List

- The shopping list is generated from planned recipes.
- The default scope is the currently selected week.
- Users can also choose a custom manual range before generating the list.

## Recipe Capture Flow

### Manual Recipe Creation

- Users can create recipes manually.
- Every recipe must include an image before it can be saved.

Required recipe fields:

- image
- title
- meal type
- servings
- ingredients
- instructions

Optional recipe fields:

- notes
- macros

Meal type should support one or more of:

- breakfast
- lunch
- dinner
- snack

### Recipe Import From URL

- Users can paste a recipe link into the app.
- The app attempts to import:
  - title
  - image
  - servings
  - ingredients
  - instructions
  - macros, when available from the source
- Imported recipes should go through a review/edit step before saving.
- Save should be blocked until the recipe has a usable image.
- If import data is messy or incomplete, the user can edit it before saving.
- If the source includes macro data, the app should preserve it on the saved recipe.

### Imported Recipe Ownership

- After review, imported recipes are saved as normal editable library recipes.
- The user owns the saved version and can edit it freely.
- The app should quietly preserve source metadata in the background:
  - sourceUrl
  - sourceName
  - importedAt

This keeps the product feeling like a personal notebook while still preserving provenance for future use.

## Meal Planning Behavior

- A selected day shows breakfast, lunch, and dinner slots.
- Each slot is assigned from the saved recipe library only.
- The meals view should stay clean and focused on the selected day.
- The recipe library should support selecting among multiple recipes appropriate for a meal.

Recommended UI behavior:

- Select a date in the calendar.
- Show its meal slots in the meals window.
- Assign or replace meals from saved recipes.
- Keep the meals view simpler than the recipe library itself.

## Shopping List Behavior

- Shopping list generation defaults to the selected current week.
- Users can switch to a manual range before generating the list.
- Ingredients from multiple planned recipes should be merged where practical.
- Each ingredient line should still preserve recipe context so users understand why it appears.
- Users must be able to manually remove or check off shopping items.

Because imported recipe data may be inconsistent, the shopping list should be editable rather than fully locked to recipe structure.

## UX Principles

- Planner-first, not database-first.
- Calm monthly planning view.
- Recipe assignment should be clear and low-friction.
- Imports should be forgiving and reviewable.
- Saved recipes should feel personal and editable.
- Images should always be present so the recipe library feels warm, visual, and easy to scan.
- Macros should be included when available from a source, but remain optional for recipes overall.

## Data Model Guidance

### Recipe

- id
- title
- image
- mealTypes
- servings
- ingredients
- instructions
- notes
- macros
- sourceUrl
- sourceName
- importedAt
- createdAt
- updatedAt

### Planned Meal

- id
- date
- slot
- recipeId
- createdAt
- updatedAt

### Shopping List Item

- id
- label
- normalizedLabel
- quantityText
- recipeIds
- checked
- removed

## Out of Scope For This Phase

- syncing recipes back to the original source
- automatic source refresh
- advanced pantry tracking
- nutrition analysis
- deep recipe taxonomy beyond basic meal types

## Recommended Build Order

1. Create the recipe library model and screens.
2. Add manual recipe creation with required image support.
3. Add recipe URL import with review/edit before save.
4. Connect saved recipes to daily meal slots.
5. Add shopping list generation for the selected week.
6. Add manual date-range shopping generation.
7. Refine ingredient merging and shopping list edit behavior.
