import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import ConfirmDialog from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renders the dialog content when open', () => {
    render(
      <ConfirmDialog
        open
        title="Delete product?"
        message="This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Delete product?')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })
})
