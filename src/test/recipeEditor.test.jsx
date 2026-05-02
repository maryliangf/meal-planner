import '@testing-library/jest-dom/vitest'
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import RecipeEditorModal from '../components/RecipeEditorModal'

afterEach(() => {
  cleanup()
})

describe('RecipeEditorModal', () => {
  it('blocks save until the recipe has an image', () => {
    render(
      <RecipeEditorModal
        open
        recipe={{
          title: 'Soup',
          image: '',
          mealTypes: ['dinner'],
          servings: '2',
          ingredients: [],
          instructions: [''],
        }}
        mode="manual"
        onClose={() => {}}
        onSave={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /save recipe/i }))

    expect(screen.getByText(/image is required/i)).toBeInTheDocument()
  })

  it('calls onSave when an image is present', () => {
    const handleSave = vi.fn()

    render(
      <RecipeEditorModal
        open
        recipe={{
          title: 'Soup',
          image: 'https://images.example.com/soup.jpg',
          mealTypes: ['dinner'],
          servings: '2',
          ingredients: [],
          instructions: [''],
        }}
        mode="manual"
        onClose={() => {}}
        onSave={handleSave}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /save recipe/i }))

    expect(handleSave).toHaveBeenCalledTimes(1)
    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Soup',
        image: 'https://images.example.com/soup.jpg',
      }),
    )
  })

  it('shows import review mode when opened for imported recipes', () => {
    render(
      <RecipeEditorModal
        open
        recipe={{
          title: 'Fresh pasta',
          image: 'https://images.example.com/pasta.jpg',
          mealTypes: ['dinner'],
          servings: '4',
          ingredients: [],
          instructions: [''],
        }}
        mode="import"
        onClose={() => {}}
        onSave={() => {}}
      />,
    )

    expect(screen.getByRole('heading', { name: /review imported recipe/i })).toBeInTheDocument()
  })
})
