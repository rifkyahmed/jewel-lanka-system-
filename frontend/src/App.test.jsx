import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import App from './App'

test('renders login when no token', () => {
  // ensure no token
  localStorage.removeItem('token')
  render(<App />)
  expect(screen.getByText(/Jewelry JMS Login/i)).toBeInTheDocument()
})
