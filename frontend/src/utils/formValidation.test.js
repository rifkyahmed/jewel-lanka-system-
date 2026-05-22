import { validateCustomerForm, validateLedgerForm, validateProductForm, validateRepairForm, validateSupplierForm } from './formValidation'

describe('formValidation helpers', () => {
  it('flags invalid product values', () => {
    const errors = validateProductForm({ sku: '', name: '', metalWeightGrams: 0, makingChargePerGram: -1, makingChargeFixed: -2 })
    expect(errors.sku).toBeDefined()
    expect(errors.name).toBeDefined()
    expect(errors.metalWeightGrams).toBeDefined()
    expect(errors.makingChargePerGram).toBeDefined()
    expect(errors.makingChargeFixed).toBeDefined()
  })

  it('accepts a valid customer form', () => {
    expect(validateCustomerForm({ name: 'Kamal', phone: '0771234567', email: 'kamal@example.com' })).toEqual({})
  })

  it('flags missing supplier and ledger fields', () => {
    const supplierErrors = validateSupplierForm({ name: '', phone: '', outstandingBalance: -1 })
    const ledgerErrors = validateLedgerForm({ amount: 0, description: '' })

    expect(supplierErrors.name).toBeDefined()
    expect(supplierErrors.phone).toBeDefined()
    expect(supplierErrors.outstandingBalance).toBeDefined()
    expect(ledgerErrors.amount).toBeDefined()
    expect(ledgerErrors.description).toBeDefined()
  })

  it('flags invalid repair form entries', () => {
    const errors = validateRepairForm({ customerId: '', itemName: '', description: '', estimatedCost: 0 })
    expect(errors.customerId).toBeDefined()
    expect(errors.itemName).toBeDefined()
    expect(errors.description).toBeDefined()
    expect(errors.estimatedCost).toBeDefined()
  })
})
