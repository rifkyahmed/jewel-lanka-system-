import { describe, it, expect, vi } from 'vitest'
import { buildInvoicePdfUrl, downloadPdfBlob } from './invoiceDownload'

describe('invoice download helpers', () => {
  it('builds an authenticated invoice PDF url', () => {
    const url = buildInvoicePdfUrl('http://localhost:5000/api', 'INV-123', 'token-value', 'premium')
    expect(url).toContain('/orders/INV-123/pdf')
    expect(url).toContain('token=token-value')
    expect(url).toContain('template=premium')
  })

  it('downloads a pdf blob using fetch and a temporary link', async () => {
    const click = vi.fn()
    const remove = vi.fn()
    const appendChild = vi.spyOn(document.body, 'appendChild').mockImplementation(() => ({}))
    const createElement = vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click,
      remove,
    })
    const originalCreateObjectURL = window.URL.createObjectURL
    const originalRevokeObjectURL = window.URL.revokeObjectURL
    window.URL.createObjectURL = vi.fn(() => 'blob:url')
    window.URL.revokeObjectURL = vi.fn()
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['pdf']),
    })

    await downloadPdfBlob('http://localhost:5000/api/orders/INV-123/pdf', { Authorization: 'Bearer token' })

    expect(fetchMock).toHaveBeenCalled()
    expect(createElement).toHaveBeenCalledWith('a')
    expect(click).toHaveBeenCalled()

    fetchMock.mockRestore()
    window.URL.createObjectURL = originalCreateObjectURL
    window.URL.revokeObjectURL = originalRevokeObjectURL
    createElement.mockRestore()
    appendChild.mockRestore()
  })
})