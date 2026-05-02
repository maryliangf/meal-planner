import React from 'react'

export default function MealsScreen({
  recipes,
  browseRecipes,
  selectedDate,
  plannedMeals,
  onPlanRecipe,
  onClearPlannedRecipe,
  onCreateRecipe,
  onImportRecipe,
  onSaveCatalogRecipe,
}) {
  const selectedPlans = plannedMeals?.[selectedDate] ?? []
  const recipeLookup = new Map(recipes.map((recipe) => [recipe.id, recipe]))
  const savedRecipeIds = new Set(recipes.map((recipe) => recipe.id))
  const browseRecipeLookup = new Map(browseRecipes.map((recipe) => [recipe.id, recipe]))
  const planOptionsByMealType = new Map(
    ['breakfast', 'lunch', 'dinner'].map((mealType) => [
      mealType,
      buildPlanOptions(recipes, browseRecipes, mealType),
    ]),
  )

  return (
    <div className="screen">
      <article className="card">
        <div className="list-row">
          <div>
            <h2>Recipe Library</h2>
            <p className="muted">Build a reusable recipe list for your meal plan.</p>
          </div>
          <div className="filter-row">
            <button type="button" onClick={onCreateRecipe}>
              Add recipe
            </button>
            <button type="button" onClick={onImportRecipe}>
              Import from link
            </button>
          </div>
        </div>
      </article>

      <article className="card">
        <div className="list-row">
          <h3>Planned for {formatSelectedDate(selectedDate)}</h3>
          <span className="muted">{selectedPlans.length} meal(s)</span>
        </div>
        <div className="recipe-list">
          {['breakfast', 'lunch', 'dinner'].map((slot) => {
            const plannedMeal = selectedPlans.find((meal) => meal.slot === slot)
            const recipe =
              (plannedMeal && recipeLookup.get(plannedMeal.recipeId)) ||
              (plannedMeal && browseRecipeLookup.get(plannedMeal.recipeId))
            const optionValue = plannedMeal ? `${plannedMeal.recipeId}::${slot}` : ''

            return (
              <div key={slot} className="planned-slot-card">
                <div>
                  <strong>{slot}</strong>
                  <p className="muted">{recipe?.title || 'Nothing planned yet'}</p>
                </div>
                <div className="planned-slot-actions">
                  <select
                    value={optionValue}
                    onChange={(event) => {
                      if (!event.target.value) return
                      const [recipeId] = event.target.value.split('::')
                      const nextRecipe =
                        recipeLookup.get(recipeId) || browseRecipeLookup.get(recipeId)
                      if (nextRecipe) onPlanRecipe(nextRecipe, slot)
                    }}
                  >
                    <option value="">Change {slot}</option>
                    {planOptionsByMealType.get(slot)?.map((option) => (
                      <option key={`${slot}-${option.id}`} value={`${option.id}::${slot}`}>
                        {option.title}
                      </option>
                    ))}
                  </select>
                  {plannedMeal ? (
                    <button type="button" onClick={() => onClearPlannedRecipe(slot)}>
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </article>

      <article className="card">
        <div className="list-row">
          <h3>Recipes</h3>
          <span className="muted">{recipes.length} saved</span>
        </div>
        {recipes.length === 0 ? (
          <p>Add your first recipe to start planning meals from the library.</p>
        ) : (
          <div className="recipe-grid">
            {recipes.map((recipe) => {
              const mealType = recipe.mealTypes?.[0] ?? 'dinner'

              return (
                <article key={recipe.id} className="recipe-card">
                  {recipe.image ? (
                    <img src={recipe.image} alt={recipe.title || 'Recipe'} className="recipe-image" />
                  ) : (
                    <div className="recipe-image recipe-image-placeholder">No image</div>
                  )}
                  <div className="recipe-row recipe-card-footer">
                    <div>
                    <strong>{recipe.title || 'Untitled recipe'}</strong>
                    <p className="muted">
                      {mealType} • serves {recipe.servings || '2'}
                    </p>
                  </div>
                    <button type="button" onClick={() => onPlanRecipe(recipe, mealType)}>
                      Plan
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </article>

      <article className="card">
        <div className="list-row">
          <div>
            <h3>Browse recipes</h3>
            <p className="muted">Built-in web recipes users can browse before saving.</p>
          </div>
          <span className="muted">{browseRecipes.length} available</span>
        </div>
        <div className="recipe-grid">
          {browseRecipes.map((recipe) => {
            const isSaved = savedRecipeIds.has(recipe.id)

            return (
              <article key={recipe.id} className="recipe-card">
                <a href={recipe.url} target="_blank" rel="noreferrer">
                  <img src={recipe.imageUrl} alt={recipe.title} className="recipe-image" />
                </a>
                <div className="recipe-row recipe-card-footer">
                  <div>
                    <strong>{recipe.title}</strong>
                    <p className="muted">
                      {recipe.mealType} • serves {recipe.defaultServings || '2'}
                    </p>
                  </div>
                  {isSaved ? (
                    <button type="button" onClick={() => onPlanRecipe(recipe, recipe.mealType)}>
                      Plan
                    </button>
                  ) : (
                    <div className="filter-row">
                      <button type="button" onClick={() => onPlanRecipe(recipe, recipe.mealType)}>
                        Plan
                      </button>
                      <button type="button" onClick={() => onSaveCatalogRecipe(recipe)}>
                        Save
                      </button>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </article>
    </div>
  )
}

function buildPlanOptions(recipes, browseRecipes, mealType) {
  const savedOptions = recipes
    .filter((recipe) => (recipe.mealTypes ?? []).includes(mealType))
    .map((recipe) => ({ id: recipe.id, title: recipe.title || 'Untitled recipe' }))
  const seenIds = new Set(savedOptions.map((recipe) => recipe.id))
  const browseOptions = browseRecipes
    .filter((recipe) => recipe.mealType === mealType && !seenIds.has(recipe.id))
    .map((recipe) => ({ id: recipe.id, title: `${recipe.title} (browse)` }))
  return [...savedOptions, ...browseOptions]
}

function formatSelectedDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
