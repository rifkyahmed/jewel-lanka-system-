const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())

const positiveNumber = (value) => Number(value) > 0
const nonNegativeNumber = (value) => value === '' || Number(value) >= 0
const nonNegativeInteger = (value) => String(value || '').trim() !== '' && Number.isInteger(Number(value)) && Number(value) >= 0

export const validateProductForm = (product) => {
  const errors = {}

  if (!String(product.sku || '').trim()) errors.sku = 'SKU is required'
  if (!String(product.name || '').trim()) errors.name = 'Product name is required'
  if (!positiveNumber(product.metalWeightGrams)) errors.metalWeightGrams = 'Weight must be greater than 0'
  if (!nonNegativeInteger(product.stockQuantity)) errors.stockQuantity = 'Stock quantity must be 0 or more'
  if (!nonNegativeNumber(product.makingChargePerGram)) errors.makingChargePerGram = 'Making charge per gram must be 0 or more'
  if (!nonNegativeNumber(product.makingChargeFixed)) errors.makingChargeFixed = 'Fixed making charge must be 0 or more'

  return errors
}

export const validateCustomerForm = (customer) => {
  const errors = {}

  if (!String(customer.name || '').trim()) errors.name = 'Customer name is required'
  if (!String(customer.phone || '').trim()) errors.phone = 'Phone number is required'
  if (customer.email && !isEmail(customer.email)) errors.email = 'Enter a valid email address'

  return errors
}

export const validateSupplierForm = (supplier) => {
  const errors = {}

  if (!String(supplier.name || '').trim()) errors.name = 'Supplier name is required'
  if (!String(supplier.phone || '').trim()) errors.phone = 'Phone number is required'
  if (!nonNegativeNumber(supplier.outstandingBalance)) errors.outstandingBalance = 'Balance must be 0 or more'

  return errors
}

export const validateRepairForm = (repair) => {
  const errors = {}

  if (!String(repair.customerId || '').trim()) errors.customerId = 'Customer is required'
  if (!String(repair.itemName || '').trim()) errors.itemName = 'Item name is required'
  if (!String(repair.description || '').trim()) errors.description = 'Description is required'
  if (!positiveNumber(repair.estimatedCost)) errors.estimatedCost = 'Service cost must be greater than 0'

  return errors
}

export const validateLedgerForm = (ledger) => {
  const errors = {}

  if (!positiveNumber(ledger.amount)) errors.amount = 'Amount must be greater than 0'
  if (!String(ledger.description || '').trim()) errors.description = 'Description is required'

  return errors
}
