import React, { useState } from 'react'
import { MEAL_TYPES } from '../utils/recipes'

export default function RecipeEditorModal({ open, recipe, mode, onClose, onSave }) {
  const [draft, setDraft] = useState(recipe)
  const [error, setError] = useState('')

  if (!open) return null

  const handleSave = () => {
    if (!draft.image.trim()) {
      setError('Image is required before saving.')
      return
    }

    onSave(draft)
  }

  const handleFieldChange = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }))
    setError('')
  }

  return (
    <dialog open className="modal recipe-modal">
      <div className="list-row">
        <h3>{mode === 'import' ? 'Review Imported Recipe' : 'New Recipe'}</h3>
        <button type="button" onClick={onClose} aria-label="Close recipe editor">
          Close
        </button>
      </div>
      <div className="recipe-editor-fields">
        <input
          value={draft.title}
          onChange={(event) => handleFieldChange('title', event.target.value)}
          placeholder="Recipe name"
        />
        <input
          value={draft.image}
          onChange={(event) => handleFieldChange('image', event.target.value)}
          placeholder="Image URL"
        />
        <input
          value={draft.servings}
          onChange={(event) => handleFieldChange('servings', event.target.value)}
          placeholder="Servings"
        />
        <select
          value={draft.mealTypes?.[0] ?? 'dinner'}
          onChange={(event) => handleFieldChange('mealTypes', [event.target.value])}
        >
          {MEAL_TYPES.map((mealType) => (
            <option key={mealType} value={mealType}>
              {mealType}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="filter-row">
        <button type="button" onClick={handleSave}>
          Save recipe
        </button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </dialog>
  )
}
