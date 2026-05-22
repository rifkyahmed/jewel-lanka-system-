export const buildInvoicePdfUrl = (apiBase, invoiceNumber, token) => {
  const url = new URL(`${apiBase}/orders/${encodeURIComponent(invoiceNumber)}/pdf`)
  if (token) url.searchParams.set('token', token)
  return url.toString()
}

export const downloadPdfBlob = async (url, headers = {}) => {
  const response = await fetch(url, { headers })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || 'Failed to download PDF')
  }

  const blob = await response.blob()
  const blobUrl = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = blobUrl
  anchor.download = 'invoice.pdf'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(blobUrl)
}