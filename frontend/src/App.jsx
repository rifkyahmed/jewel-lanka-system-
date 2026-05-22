import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  FileText,
  Gem,
  TrendingUp,
  Users,
  Truck,
  Wrench,
  BookOpen,
  LogOut,
  Bell,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  PenTool,
  Sparkles
} from 'lucide-react';
import ConfirmDialog from './components/ConfirmDialog';
import Analytics from './components/Analytics';
import JewelBot from './components/JewelBot';
import { buildInvoicePdfUrl, downloadPdfBlob } from './utils/invoiceDownload';
import {
  validateCustomerForm,
  validateLedgerForm,
  validateProductForm,
  validateRepairForm,
  validateSupplierForm,
} from './utils/formValidation';

// If testing locally, use: const API_BASE = 'http://localhost:5000/api';
const API_BASE = 'https://jewel-lanka-system.vercel.app/api';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [activeTab, setActiveTab] = useState('Dashboard');

  // Auth state
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [loginError, setLoginError] = useState('');

  // Data states
  const [dashboard, setDashboard] = useState({ kpis: {} });
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [customOrders, setCustomOrders] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [rates, setRates] = useState({ gold_24k: 50000, gold_22k: 45835, gold_20k: 41665, gold_18k: 37500 });

  // Modal / Form states
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showAddRepairModal, setShowAddRepairModal] = useState(false);
  const [showAddCustomOrderModal, setShowAddCustomOrderModal] = useState(false);
  const [showAddLedgerModal, setShowAddLedgerModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // Forms inputs
  const [newProduct, setNewProduct] = useState({
    sku: '', name: '', category: 'Ring', metalType: 'gold_22k',
    metalWeightGrams: '', makingChargePerGram: '', makingChargeFixed: '',
    stockQuantity: 1,
    gems: [], tempGem: { gemType: 'Diamond', carats: '', cut: 'Round', clarity: 'VVS1', cost: '' },
    specifications: { ringSize: '', certNumber: '' }
  });

  const [cart, setCart] = useState([]);
  const [checkoutCustomer, setCheckoutCustomer] = useState('');
  const [checkoutGoldExchange, setCheckoutGoldExchange] = useState({ weightGrams: '', rateApplied: '' });
  const [checkoutDiscount, setCheckoutDiscount] = useState('');
  const [checkoutTax, setCheckoutTax] = useState('');
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState('Cash');

  const [rateForm, setRateForm] = useState({ gold_24k: '50000', gold_22k: '45835', gold_20k: '41665', gold_18k: '37500' });
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', email: '', address: '', birthday: '', notes: '' });
  const [supplierForm, setSupplierForm] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '', metalTypeSupplied: 'Gold', outstandingBalance: '' });
  const [repairForm, setRepairForm] = useState({ customerId: '', itemName: '', description: '', estimatedWeight: '', estimatedCost: '' });
  const [customOrderForm, setCustomOrderForm] = useState({ customerId: '', customerName: '', itemName: '', category: 'Ring', designNotes: '', metalType: 'gold_22k', estimatedWeight: '', quotedPrice: '', advancePayment: '', paymentStatus: 'Unpaid' });
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [ledgerForm, setLedgerForm] = useState({ type: 'Expense', category: 'Salary', amount: '', description: '', paymentMethod: 'Cash' });
  const [showViewOrderModal, setShowViewOrderModal] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [ordersSearch, setOrdersSearch] = useState('');
  const [ordersStatusFilter, setOrdersStatusFilter] = useState('All');
  const [ordersStartDate, setOrdersStartDate] = useState('');
  const [ordersEndDate, setOrdersEndDate] = useState('');
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [editingSupplierId, setEditingSupplierId] = useState(null);
  const [editingCustomOrderId, setEditingCustomOrderId] = useState(null);
  const [ordersPage, setOrdersPage] = useState(1);
  const ORDERS_PER_PAGE = 20;

  const hasRole = (...roles) => {
    if (!user || !user.role) return false;
    return roles.includes(user.role);
  };

  // Simple toast notifications
  const [notifications, setNotifications] = useState([]);
  const notificationIdRef = useRef(0);
  const addNotification = (type, message, timeout = 4000) => {
    notificationIdRef.current += 1;
    const id = notificationIdRef.current;
    setNotifications(n => [...n, { id, type, message }]);
    setTimeout(() => setNotifications(n => n.filter(x => x.id !== id)), timeout);
  };

  // Setup headers helper
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });

  const generateProductSku = (category, metalType) => {
    const categoryCode = String(category || 'item').replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'ITM';
    const metalCode = String(metalType || 'gold').replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'GLD';
    const suffix = Date.now().toString().slice(-6);
    return `${categoryCode}-${metalCode}-${suffix}`;
  };

  const getEffectiveStockQuantity = (product) => {
    if (product.stockQuantity === 0) return 0;
    if (Number.isFinite(Number(product.stockQuantity))) return Number(product.stockQuantity);
    return product.status === 'Sold' ? 0 : 1;
  };

  // Effects
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetchUserData();
      fetchAllData();
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (token && activeTab === 'Dashboard') {
      const interval = setInterval(() => {
        fetchDashboard();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [token, activeTab]);

  function fetchUserData() {
    return (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/profile`, { headers: getHeaders() });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          setToken('');
        }
      } catch (err) {
        console.error(err);
      }
    })();
  }

  function fetchAllData() {
    return (async () => {
      try {
        fetchDashboard();
        fetchInventory();
        fetchOrders();
        fetchCustomers();
        fetchSuppliers();
        fetchRepairs();
        fetchCustomOrders();
        fetchLedger();
      } catch (err) {
        console.error(err);
      }
    })();
  }

  function fetchDashboard() {
    return (async () => {
      const res = await fetch(`${API_BASE}/dashboard`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
        if (data.activeRates) {
          setRates(data.activeRates.rates);
          setRateForm(data.activeRates.rates);
        }
      }
    })();
  }

  const fetchInventory = async () => {
    const res = await fetch(`${API_BASE}/inventory?t=${Date.now()}`, { headers: getHeaders(), cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setInventory(data);
      return data;
    }
    return null;
  };

  const fetchOrders = async () => {
    const res = await fetch(`${API_BASE}/orders`, { headers: getHeaders() });
    if (res.ok) setOrders(await res.json());
  };

  const fetchCustomers = async () => {
    const res = await fetch(`${API_BASE}/customers`, { headers: getHeaders() });
    if (res.ok) setCustomers(await res.json());
  };

  const fetchSuppliers = async () => {
    const res = await fetch(`${API_BASE}/suppliers`, { headers: getHeaders() });
    if (res.ok) setSuppliers(await res.json());
  };

  const fetchRepairs = async () => {
    const res = await fetch(`${API_BASE}/repairs`, { headers: getHeaders() });
    if (res.ok) setRepairs(await res.json());
  };

  const fetchCustomOrders = async () => {
    const res = await fetch(`${API_BASE}/custom-orders`, { headers: getHeaders() });
    if (res.ok) setCustomOrders(await res.json());
  };

  const fetchLedger = async () => {
    const res = await fetch(`${API_BASE}/cashbook`, { headers: getHeaders() });
    if (res.ok) setLedger(await res.json());
  };

  const openConfirmDialog = (title, message, onConfirm, confirmLabel = 'Delete', tone = 'danger') => {
    setConfirmDialog({ title, message, onConfirm, confirmLabel, tone });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog(null);
  };

  const runConfirmAction = async () => {
    const action = confirmDialog?.onConfirm;
    closeConfirmDialog();
    if (action) {
      await action();
    }
  };

  // CSV export/import helpers
  const downloadCSV = (filename, data) => {
    const blob = new Blob([data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const uploadCSVFile = async (endpoint, file, successMessage, refreshFn) => {
    const formData = new FormData();
    formData.append('csvFile', file);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (res.ok) {
      addNotification('success', successMessage);
      if (refreshFn) refreshFn();
    } else {
      const err = await res.json();
      addNotification('error', err.message || 'Import failed');
    }
  };

  const exportInventoryCSV = async () => {
    const res = await fetch(`${API_BASE}/inventory/export`, { headers: getHeaders() });
    if (res.ok) {
      const txt = await res.text();
      downloadCSV('inventory_export.csv', txt);
    } else addNotification('error', 'Failed to export inventory');
  };

  const importInventoryCSV = async (file) => {
    await uploadCSVFile(`${API_BASE}/inventory/import`, file, 'Inventory imported', fetchInventory);
  };

  const exportLedgerCSV = async () => {
    const res = await fetch(`${API_BASE}/cashbook/export`, { headers: getHeaders() });
    if (res.ok) {
      const txt = await res.text();
      downloadCSV('cashbook_export.csv', txt);
    } else addNotification('error', 'Failed to export ledger');
  };

  const importLedgerCSV = async (file) => {
    await uploadCSVFile(`${API_BASE}/cashbook/import`, file, 'Ledger imported', fetchLedger);
  };

  // Actions
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
      } else {
        setLoginError(data.message || 'Login failed.');
      }
    } catch {
      setLoginError('Server connection error.');
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
  };

  const handleUpdateRates = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/rates`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(rateForm)
      });
      if (res.ok) {
        fetchDashboard();
        fetchInventory(); // Inventory recalculates dynamically based on new rates!
        addNotification('success', 'Gold rates updated');
      } else {
        const err = await res.json();
        addNotification('error', err.message || 'Failed to update gold rates');
      }
    } catch (err) {
      console.error(err);
      addNotification('error', 'Failed to update gold rates');
    }
  };

  const handle24kRateChange = (val) => {
    const rate24k = Number(val) || 0;
    const rate22k = Math.round(rate24k * 0.9167);
    const rate20k = Math.round(rate24k * 0.8333);
    const rate18k = Math.round(rate24k * 0.7500);

    setRateForm({
      gold_24k: val,
      gold_22k: rate22k.toString(),
      gold_20k: rate20k.toString(),
      gold_18k: rate18k.toString()
    });
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const productErrors = validateProductForm(newProduct);
    if (Object.keys(productErrors).length > 0) {
      setFormErrors(prev => ({ ...prev, product: productErrors }));
      addNotification('error', 'Please fix the product form errors');
      return;
    }
    try {
      const qtyRaw = (newProduct.stockQuantity === null || newProduct.stockQuantity === undefined) ? '' : String(newProduct.stockQuantity).trim();
      const qtyNum = qtyRaw === '' ? undefined : Number(qtyRaw);
      const payload = {
        sku: newProduct.sku,
        name: newProduct.name,
        category: newProduct.category,
        metalType: newProduct.metalType,
        metalWeightGrams: newProduct.metalWeightGrams,
        ...(qtyNum !== undefined ? { stockQuantity: qtyNum } : {}),
        makingChargePerGram: newProduct.makingChargePerGram,
        makingChargeFixed: newProduct.makingChargeFixed,
        gemstones: newProduct.gems,
        specifications: newProduct.specifications,
        supplierId: newProduct.supplierId || null
      };
      let res;
      if (editingProductId) {
        res = await fetch(`${API_BASE}/inventory/${editingProductId}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(payload) });
      } else {
        res = await fetch(`${API_BASE}/inventory`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(payload) });
      }
      if (res.ok) {
        const savedProduct = await res.json();
        setShowAddProductModal(false);
        setEditingProductId(null);
        setFormErrors(prev => ({ ...prev, product: {} }));
        setNewProduct({
          sku: '', name: '', category: 'Ring', metalType: 'gold_22k',
          metalWeightGrams: '', makingChargePerGram: '', makingChargeFixed: '', stockQuantity: 1,
          gems: [], tempGem: { gemType: 'Diamond', carats: '', cut: 'Round', clarity: 'VVS1', cost: '' },
          specifications: { ringSize: '', certNumber: '' }
        });
        if (editingProductId) {
          setInventory(prev => prev.map(item => (item._id === editingProductId ? { ...item, ...savedProduct } : item)));
        } else {
          setInventory(prev => [{ ...savedProduct }, ...prev]);
        }
        await fetchInventory();
        fetchDashboard();
        addNotification('success', editingProductId ? 'Product updated' : 'Product added');
      } else {
        const errData = await res.json();
        addNotification('error', errData.message || 'Failed to add/update product.');
      }
    } catch (err) {
      console.error(err);
      addNotification('error', 'Failed to add/update product.');
    }
  };

  const handleCheckout = async () => {
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          customerId: checkoutCustomer || null,
          items: cart.map(sku => ({ sku })),
          goldExchange: {
            weightGrams: checkoutGoldExchange.weightGrams ? Number(checkoutGoldExchange.weightGrams) : 0,
            rateApplied: checkoutGoldExchange.rateApplied ? Number(checkoutGoldExchange.rateApplied) : 0
          },
          discountAmount: checkoutDiscount ? Number(checkoutDiscount) : 0,
          taxAmount: checkoutTax ? Number(checkoutTax) : 0,
          paymentMethod: checkoutPaymentMethod
        })
      });
      if (res.ok) {
        const created = await res.json();
        setCart([]);
        setCheckoutCustomer('');
        setCheckoutGoldExchange({ weightGrams: '', rateApplied: '' });
        setCheckoutDiscount('');
        setCheckoutTax('');
        setCheckoutPaymentMethod('Cash');
        fetchAllData();
        // Show invoice modal and trigger print
        setViewOrder(created);
        setShowViewOrderModal(true);
        setTimeout(() => window.print(), 600);
        addNotification('success', 'Sale completed and invoice ready');
      } else {
        const errData = await res.json();
        addNotification('error', errData.message || 'Checkout failed.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    const customerErrors = validateCustomerForm(customerForm);
    if (Object.keys(customerErrors).length > 0) {
      setFormErrors(prev => ({ ...prev, customer: customerErrors }));
      addNotification('error', 'Please fix the customer form errors');
      return;
    }
    try {
      let res;
      if (editingCustomerId) {
        res = await fetch(`${API_BASE}/customers/${editingCustomerId}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(customerForm) });
      } else {
        res = await fetch(`${API_BASE}/customers`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(customerForm) });
      }
      if (res.ok) {
        setShowAddCustomerModal(false);
        setEditingCustomerId(null);
        setFormErrors(prev => ({ ...prev, customer: {} }));
        setCustomerForm({ name: '', phone: '', email: '', address: '', birthday: '', notes: '' });
        fetchCustomers();
        fetchDashboard();
        addNotification('success', editingCustomerId ? 'Customer updated' : 'Customer added');
      } else {
        const err = await res.json();
        addNotification('error', err.message || 'Failed to save customer');
      }
    } catch (err) {
      console.error(err);
      addNotification('error', 'Failed to save customer');
    }
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    const supplierErrors = validateSupplierForm(supplierForm);
    if (Object.keys(supplierErrors).length > 0) {
      setFormErrors(prev => ({ ...prev, supplier: supplierErrors }));
      addNotification('error', 'Please fix the supplier form errors');
      return;
    }
    try {
      const payload = { ...supplierForm, metalTypeSupplied: [supplierForm.metalTypeSupplied] };
      let res;
      if (editingSupplierId) {
        res = await fetch(`${API_BASE}/suppliers/${editingSupplierId}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(payload) });
      } else {
        res = await fetch(`${API_BASE}/suppliers`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(payload) });
      }
      if (res.ok) {
        setShowAddSupplierModal(false);
        setEditingSupplierId(null);
        setFormErrors(prev => ({ ...prev, supplier: {} }));
        setSupplierForm({ name: '', contactPerson: '', phone: '', email: '', address: '', metalTypeSupplied: 'Gold', outstandingBalance: '' });
        fetchSuppliers();
        addNotification('success', editingSupplierId ? 'Supplier updated' : 'Supplier added');
      } else {
        const err = await res.json();
        addNotification('error', err.message || 'Failed to save supplier');
      }
    } catch (err) {
      console.error(err);
      addNotification('error', 'Failed to save supplier');
    }
  };

  const handleAddRepair = async (e) => {
    e.preventDefault();
    const repairErrors = validateRepairForm(repairForm);
    if (Object.keys(repairErrors).length > 0) {
      setFormErrors(prev => ({ ...prev, repair: repairErrors }));
      addNotification('error', 'Please fix the repair form errors');
      return;
    }
    const res = await fetch(`${API_BASE}/repairs`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(repairForm)
    });
    if (res.ok) {
      setShowAddRepairModal(false);
      setFormErrors(prev => ({ ...prev, repair: {} }));
      setRepairForm({ customerId: '', itemName: '', description: '', estimatedWeight: '', estimatedCost: '' });
      fetchRepairs();
      fetchDashboard();
      addNotification('success', 'Repair job logged');
    } else {
      const err = await res.json();
      addNotification('error', err.message || 'Failed to log repair');
    }
  };

  const handleCompleteRepair = async (id) => {
    const res = await fetch(`${API_BASE}/repairs/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status: 'Delivered' })
    });
    if (res.ok) {
      fetchAllData();
      addNotification('success', 'Repair marked complete');
    } else {
      addNotification('error', 'Failed to update repair');
    }
  };

  const handleAddCustomOrder = async (e) => {
    e.preventDefault();
    if ((!customOrderForm.customerId && !customOrderForm.customerName) || !customOrderForm.itemName || !customOrderForm.quotedPrice || !customOrderForm.category) {
      addNotification('error', 'Please fill required fields (Customer, Item, Category, Quoted Price)');
      return;
    }
    const payload = { ...customOrderForm };
    if (!payload.customerId) delete payload.customerId;

    let res;
    if (editingCustomOrderId) {
      res = await fetch(`${API_BASE}/custom-orders/${editingCustomOrderId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`${API_BASE}/custom-orders`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      setShowAddCustomOrderModal(false);
      setEditingCustomOrderId(null);
      setCustomOrderForm({ customerId: '', customerName: '', itemName: '', category: 'Ring', designNotes: '', metalType: 'gold_22k', estimatedWeight: '', quotedPrice: '', advancePayment: '', paymentStatus: 'Unpaid' });
      fetchCustomOrders();
      fetchDashboard();
      addNotification('success', editingCustomOrderId ? 'Custom order updated' : 'Custom order created');
    } else {
      const err = await res.json();
      addNotification('error', err.message || 'Failed to save custom order');
    }
  };

  const generateAIDescription = async () => {
    if (!customOrderForm.itemName) {
      addNotification('error', 'Please enter an Item Name first to generate a description.');
      return;
    }
    setIsGeneratingDesc(true);
    try {
      const promptText = `Generate description for: ${customOrderForm.itemName}. Category: ${customOrderForm.category}. Metal: ${customOrderForm.metalType.replace('_', ' ')}. Existing notes: ${customOrderForm.designNotes}`;
      const res = await fetch(`${API_BASE}/ai/generate-description`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ prompt: promptText })
      });
      if (res.ok) {
        const data = await res.json();
        setCustomOrderForm(prev => ({ ...prev, designNotes: data.description }));
        addNotification('success', 'AI Description generated successfully!');
      } else {
        addNotification('error', 'Failed to generate AI description');
      }
    } catch (err) {
      addNotification('error', 'Network error generating AI description');
    }
    setIsGeneratingDesc(false);
  };

  const handleEditCustomOrder = (co) => {
    setEditingCustomOrderId(co._id);
    setCustomOrderForm({
      customerId: co.customerId?._id || '',
      customerName: co.customerName || '',
      itemName: co.itemName || '',
      category: co.category || 'Ring',
      designNotes: co.designNotes || '',
      metalType: co.metalType || 'gold_22k',
      estimatedWeight: co.estimatedWeight || '',
      quotedPrice: co.quotedPrice || '',
      advancePayment: co.advancePayment || '',
      paymentStatus: co.paymentStatus || 'Unpaid'
    });
    setShowAddCustomOrderModal(true);
  };

  const handleCompleteCustomOrder = async (id) => {
    const res = await fetch(`${API_BASE}/custom-orders/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status: 'Delivered', paymentStatus: 'Paid' })
    });
    if (res.ok) {
      fetchAllData();
      addNotification('success', 'Custom order delivered & paid');
    } else {
      addNotification('error', 'Failed to update custom order');
    }
  };

  const handleDeleteCustomOrder = async (id) => {
    openConfirmDialog('Delete Custom Order?', 'This will permanently remove the bespoke order record and its revenue data.', async () => {
      const res = await fetch(`${API_BASE}/custom-orders/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (res.ok) {
        fetchCustomOrders();
        fetchDashboard();
        addNotification('success', 'Custom Order deleted');
      } else {
        addNotification('error', 'Failed to delete order');
      }
    });
  };

  const downloadCustomOrderPDF = async (id) => {
    try {
      const url = `${API_BASE}/custom-orders/${id}/pdf`;
      const response = await fetch(url, { headers: getHeaders() });
      if (!response.ok) throw new Error('Failed to download custom order PDF');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = `custom_order_${id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
      addNotification('success', 'Custom Order invoice downloaded');
    } catch (err) {
      console.error(err);
      addNotification('error', err.message || 'Download failed');
    }
  };

  const handleAddLedger = async (e) => {
    e.preventDefault();
    const ledgerErrors = validateLedgerForm(ledgerForm);
    if (Object.keys(ledgerErrors).length > 0) {
      setFormErrors(prev => ({ ...prev, ledger: ledgerErrors }));
      addNotification('error', 'Please fix the ledger form errors');
      return;
    }
    const res = await fetch(`${API_BASE}/cashbook`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(ledgerForm)
    });
    if (res.ok) {
      setShowAddLedgerModal(false);
      setFormErrors(prev => ({ ...prev, ledger: {} }));
      setLedgerForm({ type: 'Expense', category: 'Salary', amount: '', description: '', paymentMethod: 'Cash' });
      fetchLedger();
      fetchDashboard();
      addNotification('success', 'Ledger entry posted');
    } else {
      const err = await res.json();
      addNotification('error', err.message || 'Failed to post ledger');
    }
  };

  // Delete handlers for resources
  const handleDeleteProduct = async (id) => {
    openConfirmDialog('Delete product?', 'This action cannot be undone.', async () => {
      const res = await fetch(`${API_BASE}/inventory/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (res.ok) {
        fetchInventory();
        addNotification('success', 'Product deleted');
      } else {
        addNotification('error', 'Failed to delete product');
      }
    });
  };

  const handleDeleteCustomer = async (id) => {
    openConfirmDialog('Delete customer?', 'Customer history will be preserved in related orders.', async () => {
      const res = await fetch(`${API_BASE}/customers/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (res.ok) {
        fetchCustomers();
        addNotification('success', 'Customer deleted');
      } else {
        addNotification('error', 'Failed to delete customer');
      }
    });
  };

  const handleDeleteSupplier = async (id) => {
    openConfirmDialog('Delete supplier?', 'This action cannot be undone.', async () => {
      const res = await fetch(`${API_BASE}/suppliers/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (res.ok) {
        fetchSuppliers();
        addNotification('success', 'Supplier deleted');
      } else {
        addNotification('error', 'Failed to delete supplier');
      }
    });
  };

  const handleDeleteRepair = async (id) => {
    openConfirmDialog('Delete repair ticket?', 'This will remove the repair job record.', async () => {
      const res = await fetch(`${API_BASE}/repairs/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (res.ok) {
        fetchRepairs();
        addNotification('success', 'Repair job deleted');
      } else {
        addNotification('error', 'Failed to delete repair');
      }
    });
  };

  const handleDeleteLedger = async (id) => {
    openConfirmDialog('Delete ledger entry?', 'This action cannot be undone.', async () => {
      const res = await fetch(`${API_BASE}/cashbook/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (res.ok) {
        fetchLedger();
        addNotification('success', 'Ledger entry deleted');
      } else {
        addNotification('error', 'Failed to delete ledger entry');
      }
    });
  };

  const handleViewOrder = async (invoiceNumber) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${invoiceNumber}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setViewOrder(data);
        setShowViewOrderModal(true);
      } else {
        addNotification('error', 'Order not found');
      }
    } catch (err) {
      console.error(err);
      addNotification('error', 'Failed to load order');
    }
  };

  const downloadInvoicePDF = async (invoiceNumber) => {
    try {
      const url = buildInvoicePdfUrl(API_BASE, invoiceNumber, token);
      await downloadPdfBlob(url, { Authorization: `Bearer ${token}` });
      addNotification('success', 'Invoice PDF downloaded');
    } catch (err) {
      console.error(err);
      addNotification('error', err.message || 'Download failed');
    }
  };

  const combinedOrders = React.useMemo(() => {
    const standardOrders = orders.map(o => ({ ...o, type: 'Standard' }));
    const completedCustomOrders = customOrders
      .filter(co => co.status === 'Delivered')
      .map(co => ({
        _id: co._id,
        invoiceNumber: `CST-${co._id.substring(co._id.length - 6).toUpperCase()}`,
        saleDate: co.updatedAt || co.createdAt,
        customerId: co.customerId,
        customerNameFallback: co.customerName,
        paymentMethod: 'Multiple',
        paymentStatus: co.paymentStatus,
        finalAmount: co.quotedPrice || 0,
        amountPaid: co.paymentStatus === 'Paid' ? (co.quotedPrice || 0) : (co.advancePayment || 0),
        balanceDue: (co.quotedPrice || 0) - (co.paymentStatus === 'Paid' ? (co.quotedPrice || 0) : (co.advancePayment || 0)),
        type: 'Custom'
      }));
    return [...standardOrders, ...completedCustomOrders].sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));
  }, [orders, customOrders]);

  const filteredOrders = combinedOrders.filter((order) => {
    const query = ordersSearch.trim().toLowerCase();
    const matchesSearch = !query || [
      order.invoiceNumber,
      order.customerId?.name,
      order.customerNameFallback,
      order.customerId?.phone,
      order.paymentMethod,
      order.paymentStatus,
      order.type
    ].some(value => String(value || '').toLowerCase().includes(query));

    const matchesStatus = ordersStatusFilter === 'All' || order.paymentStatus === ordersStatusFilter;
    const saleDate = order.saleDate ? new Date(order.saleDate) : null;
    const startDate = ordersStartDate ? new Date(`${ordersStartDate}T00:00:00`) : null;
    const endDate = ordersEndDate ? new Date(`${ordersEndDate}T23:59:59.999`) : null;
    const matchesStart = !startDate || (saleDate && saleDate >= startDate);
    const matchesEnd = !endDate || (saleDate && saleDate <= endDate);

    return matchesSearch && matchesStatus && matchesStart && matchesEnd;
  });

  const exportOrdersCSV = () => {
    const headers = ['invoiceNumber', 'saleDate', 'customer', 'paymentMethod', 'paymentStatus', 'finalAmount', 'amountPaid', 'balanceDue'];
    const rows = [headers.join(',')];
    filteredOrders.forEach((order) => {
      const row = [
        order.invoiceNumber,
        order.saleDate ? new Date(order.saleDate).toISOString() : '',
        order.customerId?.name || order.customerNameFallback || 'Walk-in Customer',
        order.paymentMethod || '',
        order.paymentStatus || 'Paid',
        order.finalAmount || 0,
        order.amountPaid || 0,
        order.balanceDue || 0,
      ];
      rows.push(row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','));
    });
    downloadCSV(`orders_${new Date().toISOString().slice(0, 10)}.csv`, rows.join('\n'));
    addNotification('success', 'Orders CSV exported');
  };

  const handleAddGemToProduct = () => {
    if (!newProduct.tempGem.carats || !newProduct.tempGem.cost) return;
    setNewProduct({
      ...newProduct,
      gems: [...newProduct.gems, { ...newProduct.tempGem, carats: Number(newProduct.tempGem.carats), cost: Number(newProduct.tempGem.cost) }],
      tempGem: { gemType: 'Diamond', carats: '', cut: 'Round', clarity: 'VVS1', cost: '' }
    });
  };

  const handleProductCategoryChange = (value) => {
    setNewProduct((current) => ({
      ...current,
      category: value,
      sku: editingProductId ? current.sku : generateProductSku(value, current.metalType)
    }));
  };

  const handleProductMetalChange = (value) => {
    setNewProduct((current) => ({
      ...current,
      metalType: value,
      sku: editingProductId ? current.sku : generateProductSku(current.category, value)
    }));
  };

  // View switchers
  if (!token) {
    return (
      <div className="login-container">
        <form className="login-box" onSubmit={handleLogin}>
          <div className="login-header">
            <div className="logo-icon" style={{ margin: '0 auto 10px auto' }}>💎</div>
            <h2>Jewelry JMS Login</h2>
            <p>Enter credentials to access digital accounts</p>
          </div>
          {loginError && (
            <div style={{ color: 'red', fontSize: '0.8rem', textAlign: 'center' }}>
              <AlertCircle size={14} style={{ display: 'inline', marginRight: 4 }} />
              {loginError}
            </div>
          )}
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              placeholder="e.g. admin"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn-primary">Access Dashboard</button>
          <div style={{ fontSize: '0.72rem', color: '#888', textAlign: 'center', marginTop: 10 }}>
            Mock users: admin (admin123), cashier (cashier123)
          </div>
        </form>
      </div>
    );
  }

  // Calculate cart details
  const cartProducts = cart.map(sku => inventory.find(p => p.sku === sku)).filter(Boolean);
  const cartSubtotal = cartProducts.reduce((acc, p) => acc + (p.pricing?.total || 0), 0);
  const exchangeValue = checkoutGoldExchange.weightGrams && checkoutGoldExchange.rateApplied
    ? Math.round(Number(checkoutGoldExchange.weightGrams) * Number(checkoutGoldExchange.rateApplied))
    : 0;
  const cartFinalAmount = Math.max(0, cartSubtotal - exchangeValue - Number(checkoutDiscount || 0) + Number(checkoutTax || 0));

  const drawSalesGraph = () => {
    if (!dashboard || !dashboard.rollingSales || dashboard.rollingSales.length === 0) return null;
    const width = 1200;
    const height = 300;
    const maxVal = Math.max(...dashboard.rollingSales.map(s => s.revenue), 1000);

    const gridLines = [];
    const numLines = 5;
    for (let i = 0; i <= numLines; i++) {
      const y = Math.round(height - 40 - (i / numLines) * (height - 60));
      const val = Math.round((i / numLines) * maxVal);
      gridLines.push({ y, val });
    }

    const points = dashboard.rollingSales.map((s, idx) => {
      const x = Math.round((idx / Math.max(1, dashboard.rollingSales.length - 1)) * (width - 60) + 40);
      const y = Math.round(height - 40 - (s.revenue / maxVal) * (height - 60));
      const dayNum = s.date.split(' ')[1] || s.date;
      return { x, y, date: dayNum, revenue: s.revenue };
    });

    const pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - 40} L ${points[0].x} ${height - 40} Z`;

    return (
      <div className="svg-chart-container" style={{ position: 'relative', width: '100%', marginTop: '10px' }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ overflow: 'visible' }}>

          {/* Grid Lines */}
          {gridLines.map((line, i) => (
            <g key={`grid-${i}`}>
              <line x1="40" y1={line.y} x2={width} y2={line.y} stroke="#f1f2f3" strokeWidth="1" />
              <text x="30" y={line.y + 4} textAnchor="end" fill="#9ca3af" fontSize="12" fontFamily="inherit">
                Rs.{Math.round(line.val / 1000)}k
              </text>
            </g>
          ))}

          <path d={areaD} fill="rgba(45, 83, 69, 0.08)" stroke="none" />
          <path d={pathD} fill="none" stroke="var(--color-accent)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5" fill="#fff" stroke="var(--color-accent)" strokeWidth="2.5" />
              <text x={p.x} y={height - 15} textAnchor="middle" fill="#6b7280" fontSize="13" fontFamily="inherit" fontWeight="500">
                {p.date}
              </text>
              {p.revenue > 0 && (
                <text x={p.x} y={p.y - 12} textAnchor="middle" fill="var(--color-accent)" fontSize="12" fontWeight="bold">
                  Rs.{Math.round(p.revenue / 1000)}k
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    );
  };

  const drawYearlySalesGraph = () => {
    if (!dashboard || !dashboard.yearlySales || dashboard.yearlySales.length === 0) {
      return <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>Please Restart Backend (`npm start`) to load Yearly Sales data!</div>;
    }
    const width = 1200;
    const height = 300;
    const maxVal = Math.max(...dashboard.yearlySales.map(s => s.revenue), 1000);

    const gridLines = [];
    const numLines = 5;
    for (let i = 0; i <= numLines; i++) {
      const y = Math.round(height - 40 - (i / numLines) * (height - 60));
      const val = Math.round((i / numLines) * maxVal);
      gridLines.push({ y, val });
    }

    const points = dashboard.yearlySales.map((s, idx) => {
      const x = Math.round((idx / Math.max(1, dashboard.yearlySales.length - 1)) * (width - 60) + 40);
      const y = Math.round(height - 40 - (s.revenue / maxVal) * (height - 60));
      return { x, y, month: s.month, revenue: s.revenue };
    });

    const pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - 40} L ${points[0].x} ${height - 40} Z`;

    return (
      <div className="svg-chart-container" style={{ position: 'relative', width: '100%', marginTop: '10px' }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ overflow: 'visible' }}>

          {/* Grid Lines */}
          {gridLines.map((line, i) => (
            <g key={`grid-${i}`}>
              <line x1="40" y1={line.y} x2={width} y2={line.y} stroke="#f1f2f3" strokeWidth="1" />
              <text x="30" y={line.y + 4} textAnchor="end" fill="#9ca3af" fontSize="12" fontFamily="inherit">
                Rs.{Math.round(line.val / 1000)}k
              </text>
            </g>
          ))}

          <path d={areaD} fill="rgba(212, 175, 55, 0.08)" stroke="none" />
          <path d={pathD} fill="none" stroke="var(--color-gold)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5" fill="#fff" stroke="var(--color-gold)" strokeWidth="2.5" />
              <text x={p.x} y={height - 15} textAnchor="middle" fill="#6b7280" fontSize="13" fontFamily="inherit" fontWeight="500">
                {p.month}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  const drawTopProductsDonut = () => {
    if (!dashboard || !dashboard.topProducts || dashboard.topProducts.length === 0) return (
      <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>No top selling products yet.</div>
    );
    const items = dashboard.topProducts.slice(0, 5);
    const colors = ['var(--color-accent)', 'var(--color-gold)', '#3b82f6', '#10b981', '#f59e0b'];
    const data = items.map((item, idx) => ({
      label: item.name.substring(0, 15) + '...',
      value: item.totalSold,
      color: colors[idx % colors.length]
    }));
    return drawDonutChart(data);
  };

  const drawTopProductsChart = () => {
    if (!dashboard || !dashboard.topProducts || dashboard.topProducts.length === 0) return (
      <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>No top selling products yet.</div>
    );
    const items = dashboard.topProducts.slice(0, 8);
    const maxSold = Math.max(...items.map(i => i.totalSold), 1);
    return (
      <div style={{ padding: 12 }}>
        {items.map((p, idx) => {
          const pct = (p.totalSold / maxSold) * 100;
          return (
            <div key={p._id || idx} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 220, fontSize: '0.9rem', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name || p._id}</div>
              <div style={{ flex: 1, height: 14, background: '#f1f2f3', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--color-accent), var(--color-gold))' }} title={`${p.totalSold} sold`}></div>
              </div>
              <div style={{ width: 60, textAlign: 'right', fontWeight: '600' }}>{p.totalSold}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const drawDonutChart = (data) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
      return (
        <div style={{ textAlign: 'center', color: '#888', fontSize: '0.8rem', padding: '20px 0' }}>
          No data to display.
        </div>
      );
    }

    const radius = 35;
    const circ = 2 * Math.PI * radius; // ~219.9
    let accumulatedPercent = 0;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'center' }}>
        <svg width="120" height="120" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f2f3" strokeWidth="12" />
          {data.map((item, idx) => {
            if (item.value === 0) return null;
            const pct = item.value / total;
            const strokeLength = pct * circ;
            const strokeOffset = circ - (accumulatedPercent * circ);
            accumulatedPercent += pct;
            return (
              <circle
                key={idx}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth="12"
                strokeDasharray={`${strokeLength} ${circ}`}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            );
          })}
          {/* Central text */}
          <g style={{ transform: 'rotate(90deg) translate(0px, 0px)', transformOrigin: '50px 50px' }}>
            <text x="50" y="47" textAnchor="middle" fontSize="10" fontWeight="bold" fill="var(--color-primary)" fontFamily="inherit">
              {total}
            </text>
            <text x="50" y="58" textAnchor="middle" fontSize="6" fill="#888" fontFamily="inherit" letterSpacing="0.5">
              ORDERS
            </text>
          </g>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {data.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }}></div>
              <span style={{ color: '#555' }}>{item.label}:</span>
              <strong style={{ whiteSpace: 'nowrap' }}>{item.value} ({Math.round((item.value / total) * 100)}%)</strong>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const drawRetentionGauge = (percentage) => {
    const radius = 35;
    const circ = 2 * Math.PI * radius; // ~219.9
    const strokeOffset = circ - ((percentage / 100) * circ);

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'center' }}>
        <svg width="120" height="120" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f2f3" strokeWidth="10" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="10"
            strokeDasharray={circ}
            strokeDashoffset={strokeOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
          <g style={{ transform: 'rotate(90deg) translate(0px, 0px)', transformOrigin: '50px 50px' }}>
            <text x="50" y="49" textAnchor="middle" fontSize="12" fontWeight="bold" fill="var(--color-primary)" fontFamily="inherit">
              {percentage}%
            </text>
            <text x="50" y="59" textAnchor="middle" fontSize="6" fill="#888" fontFamily="inherit" letterSpacing="0.5">
              RETENTION
            </text>
          </g>
        </svg>
        <div style={{ fontSize: '0.75rem', color: '#555', maxWidth: '120px' }}>
          <strong>{percentage}%</strong> repeat customers index.
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Toast notifications */}
      <div className="toasts-container" style={{ position: 'fixed', top: 14, right: 14, zIndex: 1200, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {notifications.map(n => (
          <div key={n.id} style={{ padding: '10px 12px', borderRadius: 6, color: '#fff', background: n.type === 'error' ? '#ef4444' : (n.type === 'success' ? '#10b981' : '#374151'), boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            {n.message}
          </div>
        ))}
      </div>
      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div>
          <div className="logo-container">
            <div className="logo-icon" aria-hidden="true"></div>
            <span className="logo-text">jewel lanka</span>
          </div>
          <ul className="nav-links">
            <li className={`nav-item ${activeTab === 'Dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('Dashboard')}>
              <LayoutDashboard size={18} /> Dashboard
            </li>
            <li className={`nav-item ${activeTab === 'Analytics' ? 'active' : ''}`} onClick={() => setActiveTab('Analytics')}>
              <TrendingUp size={18} /> Analytics
            </li>
            <li className={`nav-item ${activeTab === 'Invoices' ? 'active' : ''}`} onClick={() => setActiveTab('Invoices')}>
              <FileText size={18} /> Billing & POS
            </li>
            <li className={`nav-item ${activeTab === 'Orders' ? 'active' : ''}`} onClick={() => setActiveTab('Orders')}>
              <FileText size={18} /> Orders
            </li>
            <li className={`nav-item ${activeTab === 'Inventory' ? 'active' : ''}`} onClick={() => setActiveTab('Inventory')}>
              <Gem size={18} /> Inventory
            </li>

            <li className={`nav-item ${activeTab === 'Customers' ? 'active' : ''}`} onClick={() => setActiveTab('Customers')}>
              <Users size={18} /> Customers
            </li>
            <li className={`nav-item ${activeTab === 'Suppliers' ? 'active' : ''}`} onClick={() => setActiveTab('Suppliers')}>
              <Truck size={18} /> Suppliers
            </li>
            <li className={`nav-item ${activeTab === 'Repairs' ? 'active' : ''}`} onClick={() => setActiveTab('Repairs')}>
              <Wrench size={18} /> Repairs
            </li>
            <li className={`nav-item ${activeTab === 'Custom Orders' ? 'active' : ''}`} onClick={() => setActiveTab('Custom Orders')}>
              <PenTool size={18} /> Custom Orders
            </li>
            <li className={`nav-item ${activeTab === 'Ledger' ? 'active' : ''}`} onClick={() => setActiveTab('Ledger')}>
              <BookOpen size={18} /> Financial Ledger
            </li>
          </ul>
        </div>

        <div className="sidebar-footer">

          <div className="nav-item" onClick={handleLogout} style={{ color: '#ef4444' }}>
            <LogOut size={18} /> Log Out
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT CANVAS */}
      <main className="main-content">
        {/* TOP HEADER */}
        <header className="top-header">
          <div className="header-right">
            {/* Gold Rate Ticker */}
            <div className="gold-rates-ticker">
              <div className="rate-badge">24K: <span>Rs.{rates.gold_24k}/g</span></div>
              <div className="rate-badge">22K: <span>Rs.{rates.gold_22k}/g</span></div>
              <div className="rate-badge">20K: <span>Rs.{rates.gold_20k}/g</span></div>
              <div className="rate-badge">18K: <span>Rs.{rates.gold_18k}/g</span></div>
            </div>
            <form onSubmit={handleUpdateRates} className="rates-update-form">
              <TrendingUp size={16} color="var(--color-gold)" />
              <input
                type="number"
                placeholder="24K Rs/g"
                value={rateForm.gold_24k}
                onChange={(e) => handle24kRateChange(e.target.value)}
                required
              />
              <button type="submit" className="btn-update-rate">Update</button>
            </form>
            <Bell size={20} color="#78797a" style={{ cursor: 'pointer' }} />
            <div className="user-profile">
              <div className="user-avatar">JL</div>
              <div className="user-info">
                <span className="user-role">jewel lanka admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* SCROLLABLE VIEW PORT */}
        <div className="view-port">

          {/* ======================================= */}
          {/* TAB 1: DASHBOARD VIEW                   */}
          {/* ======================================= */}
          {activeTab === 'Dashboard' && (
            <div className="dashboard-layout">
              {/* KPI ROW spans full width */}
              <div className="kpi-row">
                <div className="kpi-card border-accent">
                  <span className="kpi-label" style={{ fontSize: '0.9rem', fontWeight: 600 }}>Inventory Value</span>
                  <span className="kpi-value" style={{ fontSize: '1.8rem' }}>Rs. {dashboard.kpis?.inventoryValue?.toLocaleString()}</span>
                  <span className="kpi-trend">Based on current gold rates</span>
                </div>
                <div className="kpi-card border-gold">
                  <span className="kpi-label" style={{ fontSize: '0.9rem', fontWeight: 600 }}>Total Revenue</span>
                  <span className="kpi-value" style={{ fontSize: '1.8rem' }}>Rs. {dashboard.kpis?.totalRevenue?.toLocaleString()}</span>
                  <span className="kpi-trend">All-time sales</span>
                </div>
                <div className="kpi-card border-green">
                  <span className="kpi-label" style={{ fontSize: '0.9rem', fontWeight: 600 }}>This Month's Sales</span>
                  <span className="kpi-value" style={{ fontSize: '1.8rem' }}>Rs. {dashboard.kpis?.thisMonthSales?.toLocaleString()}</span>
                  <span className="kpi-trend">+{dashboard.kpis?.thisMonthOrders} orders logged</span>
                </div>
                <div className="kpi-card border-blue">
                  <span className="kpi-label" style={{ fontSize: '0.9rem', fontWeight: 600 }}>This Month's Profit</span>
                  <span className="kpi-value" style={{ fontSize: '1.8rem' }}>Rs. {dashboard.kpis?.thisMonthProfits?.toLocaleString()}</span>
                  <span className="kpi-trend">After material costs</span>
                </div>
              </div>

              {/* SECONDARY MINI KPIS GRID (now spans full width, larger) */}
              <div className="kpi-grid-mini">
                <div className="kpi-card-mini">
                  <span className="kpi-label-mini">Total Orders</span>
                  <span className="kpi-value-mini">{dashboard.kpis?.totalOrders}</span>
                </div>
                <div className="kpi-card-mini">
                  <span className="kpi-label-mini">Today's Sales</span>
                  <span className="kpi-value-mini">Rs. {dashboard.kpis?.todaySales?.toLocaleString()}</span>
                </div>
                <div className="kpi-card-mini">
                  <span className="kpi-label-mini">Today's Profit</span>
                  <span className="kpi-value-mini">Rs. {dashboard.kpis?.todayProfit?.toLocaleString()}</span>
                </div>
                <div className="kpi-card-mini">
                  <span className="kpi-label-mini">Average Order Value</span>
                  <span className="kpi-value-mini">Rs. {dashboard.kpis?.avgOrderValue?.toLocaleString()}</span>
                </div>
                <div className="kpi-card-mini">
                  <span className="kpi-label-mini">Weekly Growth</span>
                  <span className="kpi-value-mini" style={{ color: dashboard.kpis?.weeklyGrowth >= 0 ? '#10b981' : '#ef4444' }}>{dashboard.kpis?.weeklyGrowth >= 0 ? '+' : ''}{dashboard.kpis?.weeklyGrowth}%</span>
                </div>
                <div className="kpi-card-mini">
                  <span className="kpi-label-mini">Active Products</span>
                  <span className="kpi-value-mini">{dashboard.kpis?.activeProducts}</span>
                </div>
                <div className="kpi-card-mini">
                  <span className="kpi-label-mini">Custom Orders</span>
                  <span className="kpi-value-mini">{dashboard.kpis?.customOrders}</span>
                </div>
                <div className="kpi-card-mini">
                  <span className="kpi-label-mini">Repair Orders</span>
                  <span className="kpi-value-mini">{repairs.length}</span>
                </div>
                <div className="kpi-card-mini">
                  <span className="kpi-label-mini">Pending Payments</span>
                  <span className="kpi-value-mini">Rs. {dashboard.kpis?.pendingPayments?.toLocaleString()}</span>
                </div>
                <div className="kpi-card-mini">
                  <span className="kpi-label-mini">Dead Stock</span>
                  <span className="kpi-value-mini">Rs. {dashboard.kpis?.deadStockValue?.toLocaleString()}</span>
                </div>
                <div className="kpi-card-mini">
                  <span className="kpi-label-mini">Total Customers</span>
                  <span className="kpi-value-mini">{dashboard.kpis?.totalCustomers}</span>
                </div>
                <div className="kpi-card-mini">
                  <span className="kpi-label-mini">Low Stock Items</span>
                  <span className="kpi-value-mini">{dashboard.kpis?.lowStockItems}</span>
                </div>
              </div>

              {/* LIVE SALES GRAPH (Full Width) */}
              <div className="dashboard-wide-row">
                <div className="chart-card live-graph-card" style={{ padding: '28px' }}>
                  <div className="chart-header" style={{ marginBottom: '16px' }}>
                    <div className="chart-title">
                      <h3 style={{ fontSize: '1.15rem' }}>Live Sales (Last 14 Days)</h3>
                    </div>
                    <div className="live-indicator">
                      <span className="live-pulse"></span>
                      Live - Auto-refreshes every 30s
                    </div>
                  </div>
                  {drawSalesGraph()}
                </div>
              </div>

              {/* YEARLY SALES GRAPH (Full Width) */}
              <div className="dashboard-wide-row">
                <div className="chart-card live-graph-card" style={{ padding: '28px' }}>
                  <div className="chart-header" style={{ marginBottom: '16px' }}>
                    <div className="chart-title">
                      <h3 style={{ fontSize: '1.15rem' }}>Yearly Sales (Month-by-Month)</h3>
                    </div>
                  </div>
                  {drawYearlySalesGraph()}
                </div>
              </div>



              {/* LEFT MAIN COLUMN */}
              <div className="dashboard-main-col" style={{ gap: '24px' }}>

                {/* ATTENTION NEEDED PANEL REMOVED AS REQUESTED */}
                {/* SECONDARY MINI KPIS GRID (moved to span full width) */}

                {/* VISUAL CHARTS GRID */}
                <div className="analytics-grid-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                  {/* CHART 1: INVENTORY VELOCITY */}
                  <div className="analytics-sub-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '15px' }}>Top Categories</h3>
                    <div className="custom-bar-chart" style={{ height: '150px' }}>
                      <div className="chart-bars-container" style={{ height: '120px' }}>
                        {dashboard.categorySalesVelocity?.slice(0, 5).map((cat, idx) => {
                          const maxVal = Math.max(...dashboard.categorySalesVelocity.map(c => c.totalRevenue), 1);
                          const primaryHeight = (cat.totalRevenue / maxVal) * 90 + 10;
                          const secondaryHeight = (cat.totalSold / Math.max(...dashboard.categorySalesVelocity.map(c => c.totalSold), 1)) * 70 + 10;
                          return (
                            <div key={idx} className="chart-bar-group">
                              <div className="chart-bars" style={{ height: '100px' }}>
                                <div className="chart-bar-primary" style={{ height: `${primaryHeight}px` }} title={`Revenue: Rs.${cat.totalRevenue}`}></div>
                                <div className="chart-bar-secondary" style={{ height: `${secondaryHeight}px` }} title={`Sold Qty: ${cat.totalSold}`}></div>
                              </div>
                              <span className="chart-label-x" style={{ fontSize: '0.7rem' }}>{cat._id}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="chart-legend" style={{ margin: '8px 0 0 0', padding: 0 }}>
                        <div className="legend-item" style={{ fontSize: '0.7rem' }}><div className="legend-color" style={{ width: 8, height: 8, backgroundColor: 'var(--color-accent)' }}></div> Revenue</div>
                        <div className="legend-item" style={{ fontSize: '0.7rem' }}><div className="legend-color" style={{ width: 8, height: 8, backgroundColor: 'var(--color-gold)' }}></div> Qty</div>
                      </div>
                    </div>
                  </div>

                  {/* CHART 2: SALES BY DAY OF WEEK */}
                  <div className="analytics-sub-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '15px' }}>Sales by Day</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '5px 0' }}>
                      {dashboard.salesByDay?.map((d, idx) => {
                        const maxVal = Math.max(...dashboard.salesByDay.map(day => day.revenue), 1);
                        const pct = Math.round((d.revenue / maxVal) * 100);
                        return (
                          <div key={idx} className="horizontal-bar-row">
                            <span className="horizontal-bar-label" style={{ fontSize: '0.75rem', width: '35px' }}>{d.day.substring(0, 3)}</span>
                            <div className="horizontal-bar-bg" style={{ height: '10px' }}>
                              <div className="horizontal-bar-fill" style={{ width: `${pct || 0}%`, backgroundColor: 'var(--color-gold)', borderRadius: '5px' }}></div>
                            </div>
                            <span className="horizontal-bar-value" style={{ fontSize: '0.75rem' }}>Rs. {d.revenue ? Math.round(d.revenue / 1000) + 'k' : '0'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* DEAD STOCK TRACKING TABLE */}
                <div className="table-card" style={{ padding: '24px' }}>
                  <div className="table-header" style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.1rem' }}>Dead Stock (Old Items)</h3>
                    <span className="status-tag danger" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>Rs. {dashboard.kpis?.deadStockValue?.toLocaleString()} Tied Up</span>
                  </div>
                  <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Status</th>
                        <th>Time on Shelf</th>
                        <th>Action Needed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.deadStockSummary?.map((stage, sIdx) => (
                        <React.Fragment key={sIdx}>
                          {stage.items.map((item, itemIdx) => (
                            <tr key={`${sIdx}-${itemIdx}`}>
                              <td><strong>{item.sku}</strong></td>
                              <td>{stage._id}</td>
                              <td>{item.ageDays} days</td>
                              <td>
                                <span className={`status-tag ${stage._id.includes('Severe') ? 'danger' : 'warning'}`} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                                  {stage._id.includes('Severe') ? 'Discount or Melt' : 'Warning'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                      {(!dashboard.deadStockSummary || dashboard.deadStockSummary.length === 0) && (
                        <tr><td colSpan="4" style={{ textAlign: 'center' }}>No dead stock warning tags active.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>


                {/* RECENT ORDERS */}
                <div className="table-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Recent Orders & Invoices</h3>
                  <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Invoice</th>
                        <th>Customer</th>
                        <th>Total Amount</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.recentOrders?.map((o, idx) => (
                        <tr key={idx}>
                          <td>{new Date(o.saleDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
                          <td><strong>{o.invoiceNumber}</strong></td>
                          <td>{o.customerId?.name || 'Walk-in Customer'}</td>
                          <td><strong>Rs. {o.finalAmount.toLocaleString()}</strong></td>
                          <td>
                            <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => handleViewOrder(o.invoiceNumber)}>View</button>
                          </td>
                        </tr>
                      ))}
                      {(!dashboard.recentOrders || dashboard.recentOrders.length === 0) && (
                        <tr><td colSpan="4" style={{ textAlign: 'center' }}>No orders logged yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>

              {/* RIGHT SIDEBAR COLUMN */}
              <div className="dashboard-side-col">

                {/* ROUND GRAPH 1: Orders Settlement Donut Chart */}
                <div className="analytics-sub-card" style={{ padding: '20px', margin: 0 }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '15px' }}>Payment Methods</h3>
                  {drawDonutChart([
                    { label: 'Cash', value: dashboard.ordersOverview?.Cash || 0, color: 'var(--color-accent)' },
                    { label: 'Card', value: dashboard.ordersOverview?.Card || 0, color: 'var(--color-gold)' },
                    { label: 'Bank Transfer', value: dashboard.ordersOverview?.BankTransfer || 0, color: '#3b82f6' }
                  ])}
                </div>

                {/* ROUND GRAPH 2: Top Selling Products */}
                <div className="analytics-sub-card" style={{ padding: '20px', margin: 0 }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '15px' }}>Top Selling Products</h3>
                  {drawTopProductsDonut()}
                </div>

                {/* ROUND GRAPH 3: Customer Retention Rate Circle */}
                <div className="analytics-sub-card" style={{ padding: '20px', margin: 0 }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '15px' }}>Repeat Customers</h3>
                  {drawRetentionGauge(dashboard.retention || 0)}
                </div>

                {/* VIP CUSTOMERS */}
                <div className="activity-card" style={{ margin: 0, padding: '20px' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Top VIP Customers</h3>
                  <div className="activity-list">
                    {dashboard.customerValueReport?.slice(0, 3).map((cust, idx) => (
                      <div key={idx} className="activity-item" style={{ padding: '8px 0', borderBottom: '1px solid #f1f2f3' }}>
                        <div className="activity-details">
                          <span className="activity-title" style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{cust.name}</span>
                          <span className="activity-time" style={{ fontSize: '0.75rem' }}>{cust.ordersCount} orders</span>
                        </div>
                        <span className="activity-meta" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-accent)' }}>Rs.{Math.round(cust.totalSpent / 1000)}k</span>
                      </div>
                    ))}
                  </div>
                </div>



              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* TAB: ANALYTICS                          */}
          {/* ======================================= */}
          {activeTab === 'Analytics' && (
            <Analytics dashboard={dashboard} token={token} API_BASE={API_BASE} />
          )}

          {/* ======================================= */}
          {/* TAB 2: BILLING & POS checkout           */}
          {/* ======================================= */}
          {activeTab === 'Invoices' && (
            <div className="pos-layout">
              {/* Product Shelf to add to cart */}
              <div>
                <div className="module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Available Showcase Products</h3>
                  <input type="text" placeholder="Search by name or SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', width: '250px' }} />
                </div>
                <div className="table-card" style={{ padding: '16px' }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Name</th>
                        <th>Karat</th>
                        <th>Weight</th>
                        <th>Stock</th>
                        <th>Selling Price</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.filter(p => p.status === 'In_Showcase' && getEffectiveStockQuantity(p) > 0 && (p.sku.toLowerCase().includes(searchQuery.toLowerCase()) || p.name.toLowerCase().includes(searchQuery.toLowerCase()))).map((prod) => {
                        const cartCount = cart.filter((sku) => sku === prod.sku).length;
                        const availableStock = getEffectiveStockQuantity(prod);
                        return (
                          <tr key={prod._id}>
                            <td><strong>{prod.sku}</strong></td>
                            <td>{prod.name}</td>
                            <td>{prod.metalType.replace('gold_', '').toUpperCase()}</td>
                            <td>{prod.metalWeightGrams} g</td>
                            <td>{availableStock}</td>
                            <td><strong>Rs.{prod.pricing?.total?.toLocaleString()}</strong></td>
                            <td>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setCart(cart.filter((sku, index) => !(sku === prod.sku && index === cart.findIndex((currentSku) => currentSku === prod.sku))))} disabled={cartCount === 0}>-</button>
                                <span style={{ minWidth: 20, textAlign: 'center', fontSize: '0.75rem' }}>{cartCount}</span>
                                <button className="btn-action" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => { if (cartCount < availableStock) setCart([...cart, prod.sku]); }} disabled={cartCount >= availableStock}>+</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Checkout Cart Summary */}
              <div className="pos-cart">
                <h3>Draft Invoice Billing</h3>
                <div className="cart-items-list">
                  {cartProducts.map((p, idx) => (
                    <div key={idx} className="cart-item">
                      <div className="cart-item-info">
                        <h4>{p.name}</h4>
                        <p>{p.sku} | {p.metalWeightGrams}g ({p.metalType.replace('gold_', '').toUpperCase()})</p>
                      </div>
                      <span className="cart-item-price">Rs.{p.pricing?.total?.toLocaleString()}</span>
                    </div>
                  ))}
                  {cart.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#888', fontSize: '0.85rem' }}>
                      Cart is empty. Add showcase products.
                    </div>
                  )}
                </div>

                <div className="pos-checkout-panel">
                  {/* Customer Select */}
                  <div className="form-group">
                    <label>Assigned Customer</label>
                    <select value={checkoutCustomer} onChange={(e) => setCheckoutCustomer(e.target.value)}>
                      <option value="">-- Guest Customer / Anonymous --</option>
                      {customers.map(c => <option key={c._id} value={c._id}>{c.name} ({c.phone})</option>)}
                    </select>
                  </div>

                  {/* Gold Exchange fields */}
                  <div className="grid-2">
                    <div className="form-group">
                      <label>Old Gold Weight (g)</label>
                      <input
                        type="number"
                        value={checkoutGoldExchange.weightGrams}
                        onChange={(e) => setCheckoutGoldExchange({ ...checkoutGoldExchange, weightGrams: e.target.value })}
                        placeholder="e.g. 4.5"
                      />
                    </div>
                    <div className="form-group">
                      <label>Exchange Rate (Rs/g)</label>
                      <input
                        type="number"
                        value={checkoutGoldExchange.rateApplied}
                        onChange={(e) => setCheckoutGoldExchange({ ...checkoutGoldExchange, rateApplied: e.target.value })}
                        placeholder="e.g. 8000"
                      />
                    </div>
                  </div>

                  {/* Discount / Tax */}
                  <div className="grid-2">
                    <div className="form-group">
                      <label>Discount Amount (Rs.)</label>
                      <input
                        type="number"
                        value={checkoutDiscount}
                        onChange={(e) => setCheckoutDiscount(e.target.value)}
                        placeholder="e.g. 1500"
                      />
                    </div>
                    <div className="form-group">
                      <label>Tax Charges (Rs.)</label>
                      <input
                        type="number"
                        value={checkoutTax}
                        onChange={(e) => setCheckoutTax(e.target.value)}
                        placeholder="e.g. 450"
                      />
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="form-group">
                    <label>Payment Method</label>
                    <select value={checkoutPaymentMethod} onChange={(e) => setCheckoutPaymentMethod(e.target.value)}>
                      <option value="Cash">Cash Only</option>
                      <option value="Card">Card Only</option>
                      <option value="GoldExchange">Gold Exchange Value Deduction</option>
                      <option value="Split">Split Payments (Gold Exchange + Cash/Card)</option>
                    </select>
                  </div>

                  {/* Summaries */}
                  <div className="checkout-row">
                    <span>Subtotal:</span>
                    <span>Rs.{cartSubtotal.toLocaleString()}</span>
                  </div>
                  {exchangeValue > 0 && (
                    <div className="checkout-row" style={{ color: 'red' }}>
                      <span>Gold Exchange Credit:</span>
                      <span>- Rs.{exchangeValue.toLocaleString()}</span>
                    </div>
                  )}
                  {checkoutDiscount > 0 && (
                    <div className="checkout-row" style={{ color: 'red' }}>
                      <span>Discount Given:</span>
                      <span>- Rs.{Number(checkoutDiscount).toLocaleString()}</span>
                    </div>
                  )}
                  {checkoutTax > 0 && (
                    <div className="checkout-row">
                      <span>Taxes & Charges:</span>
                      <span>+ Rs.{Number(checkoutTax).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="checkout-row total">
                    <span>Net Bill:</span>
                    <span>Rs. {cartFinalAmount.toLocaleString()}</span>
                  </div>

                  <button className="btn-primary" style={{ marginTop: '10px' }} onClick={handleCheckout} disabled={cart.length === 0}>
                    Complete Sale & Print Invoice
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* TAB: ORDERS LIST & MANAGEMENT          */}
          {/* ======================================= */}
          {activeTab === 'Orders' && (
            <div>
              <div className="module-header">
                <h3>All Orders</h3>
                <button className="btn-action" onClick={exportOrdersCSV}>Export CSV</button>
              </div>
              <div className="table-card" style={{ marginBottom: 16 }}>
                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="form-group">
                    <label>Search orders</label>
                    <input type="text" value={ordersSearch} onChange={(e) => { setOrdersSearch(e.target.value); setOrdersPage(1); }} placeholder="Invoice, customer, payment..." />
                  </div>
                  <div className="form-group">
                    <label>Payment status</label>
                    <select value={ordersStatusFilter} onChange={(e) => { setOrdersStatusFilter(e.target.value); setOrdersPage(1); }}>
                      <option value="All">All</option>
                      <option value="Paid">Paid</option>
                      <option value="Partial">Partial</option>
                      <option value="Unpaid">Unpaid</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>From date</label>
                    <input type="date" value={ordersStartDate} onChange={(e) => { setOrdersStartDate(e.target.value); setOrdersPage(1); }} />
                  </div>
                  <div className="form-group">
                    <label>To date</label>
                    <input type="date" value={ordersEndDate} onChange={(e) => { setOrdersEndDate(e.target.value); setOrdersPage(1); }} />
                  </div>
                </div>
              </div>
              <div className="table-card">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoice</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th>Balance Due</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.slice((ordersPage - 1) * ORDERS_PER_PAGE, ordersPage * ORDERS_PER_PAGE).map((o) => (
                      <tr key={o._id}>
                        <td>{new Date(o.saleDate).toLocaleDateString()}</td>
                        <td><strong>{o.invoiceNumber}</strong></td>
                        <td>{o.customerId?.name || o.customerNameFallback || 'Walk-in'}</td>
                        <td>Rs. {o.finalAmount.toLocaleString()}</td>
                        <td>{o.paymentMethod}</td>
                        <td>
                          <span className={`status-tag ${o.paymentStatus === 'Paid' ? 'active' : (o.paymentStatus === 'Partial' ? 'warning' : 'danger')}`}>
                            {o.paymentStatus || 'Paid'}
                          </span>
                        </td>
                        <td>Rs. {(o.balanceDue || 0).toLocaleString()}</td>
                        <td>
                          {o.type !== 'Custom' ? (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn-secondary" onClick={() => handleViewOrder(o.invoiceNumber)}>View</button>
                              <button type="button" className="btn-secondary" onClick={() => downloadInvoicePDF(o.invoiceNumber)}>Download PDF</button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>Managed in Custom Orders</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <div>
                  {filteredOrders.length === 0
                    ? 'No orders match the current filters'
                    : `Showing ${(ordersPage - 1) * ORDERS_PER_PAGE + 1} - ${Math.min(ordersPage * ORDERS_PER_PAGE, filteredOrders.length)} of ${filteredOrders.length}`}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-secondary" onClick={() => setOrdersPage(Math.max(1, ordersPage - 1))}>Prev</button>
                  <button className="btn-secondary" onClick={() => setOrdersPage(Math.min(Math.ceil(filteredOrders.length / ORDERS_PER_PAGE), ordersPage + 1))}>Next</button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* TAB 3: INVENTORY CATALOG                */}
          {/* ======================================= */}
          {activeTab === 'Inventory' && (
            <div>
              <div className="module-header" style={{ display: 'flex', alignItems: 'center' }}>
                <h3>Jewelry Inventory catalog</h3>
                <input type="text" placeholder="Search by name or SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', width: '250px', marginLeft: '20px' }} />
                <button className="btn-action" onClick={() => {
                  setEditingProductId(null);
                  setFormErrors(prev => ({ ...prev, product: {} }));
                  setNewProduct({
                    sku: generateProductSku('Ring', 'gold_22k'),
                    name: '',
                    category: 'Ring',
                    metalType: 'gold_22k',
                    metalWeightGrams: '',
                    makingChargePerGram: '',
                    makingChargeFixed: '',
                    stockQuantity: 1,
                    gems: [],
                    tempGem: { gemType: 'Diamond', carats: '', cut: 'Round', clarity: 'VVS1', cost: '' },
                    specifications: { ringSize: '', certNumber: '' },
                    supplierId: ''
                  });
                  setShowAddProductModal(true);
                }}>
                  <Plus size={16} /> Add Showcase Product
                </button>
                <div style={{ display: 'flex', gap: 8, marginLeft: 12 }}>
                  <button className="btn-secondary" onClick={exportInventoryCSV}>Export CSV</button>
                  <label className="btn-secondary" style={{ display: 'inline-block', padding: '6px 10px', cursor: 'pointer' }}>
                    Import CSV
                    <input type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; await importInventoryCSV(f); e.target.value = ''; }} />
                  </label>
                </div>
              </div>

              <div className="table-card">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Metal & Weight</th>
                      <th>Stock</th>
                      <th>Gem Details</th>
                      <th>Selling Price</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.filter(p => p.sku.toLowerCase().includes(searchQuery.toLowerCase()) || p.name.toLowerCase().includes(searchQuery.toLowerCase())).map((prod) => (
                      <tr key={prod._id}>
                        <td><strong>{prod.sku}</strong></td>
                        <td>{prod.name}</td>
                        <td>{prod.category}</td>
                        <td>{prod.metalType.replace('gold_', '').toUpperCase()} ({prod.metalWeightGrams}g)</td>
                        <td><strong>{getEffectiveStockQuantity(prod)}</strong></td>
                        <td>
                          {prod.gemstones && prod.gemstones.length > 0 ? (
                            prod.gemstones.map((g, idx) => (
                              <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                {g.gemType} ({g.carats}ct {g.cut} - Rs.{g.cost.toLocaleString()})
                              </div>
                            ))
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#bbb' }}>No Gems</span>
                          )}
                        </td>
                        <td>
                          <strong>Rs.{prod.pricing?.total?.toLocaleString()}</strong>
                          <div style={{ fontSize: '0.72rem', color: '#888' }}>
                            Metal: Rs.{prod.pricing?.metalValue?.toLocaleString()} | Labor: Rs.{prod.pricing?.makingCharges?.toLocaleString()}
                          </div>
                        </td>
                        <td>
                          <span className={`status-tag ${prod.status === 'In_Showcase' ? 'active' : (prod.status === 'Sold' ? 'warning' : 'danger')}`}>
                            {prod.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {hasRole('Admin', 'Inventory_Manager') && (
                              <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => { setEditingProductId(prod._id); setFormErrors(prev => ({ ...prev, product: {} })); setNewProduct({ sku: prod.sku, name: prod.name, category: prod.category, metalType: prod.metalType, metalWeightGrams: prod.metalWeightGrams, makingChargePerGram: prod.makingChargePerGram, makingChargeFixed: prod.makingChargeFixed, stockQuantity: getEffectiveStockQuantity(prod), gems: prod.gemstones || [], tempGem: { gemType: 'Diamond', carats: '', cut: 'Round', clarity: 'VVS1', cost: '' }, specifications: prod.specifications || {}, supplierId: prod.supplierId?._id || prod.supplierId || '' }); setShowAddProductModal(true); }}>Edit</button>
                            )}
                            {hasRole('Admin') && (
                              <button className="btn-danger" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => handleDeleteProduct(prod._id)}><Trash2 size={12} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}



          {/* ======================================= */}
          {/* TAB 5: CUSTOMERS REGISTER               */}
          {/* ======================================= */}
          {activeTab === 'Customers' && (
            <div>
              <div className="module-header">
                <h3>Customer Directory</h3>
                <button className="btn-action" onClick={() => setShowAddCustomerModal(true)}>
                  <Plus size={16} /> Register Customer
                </button>
              </div>

              <div className="table-card">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Address</th>
                      <th>Birthday</th>
                      <th>Loyalty Points</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map((cust) => (
                      <tr key={cust._id}>
                        <td><strong>{cust.name}</strong></td>
                        <td>{cust.phone}</td>
                        <td>{cust.email || 'N/A'}</td>
                        <td>{cust.address || 'N/A'}</td>
                        <td>{cust.birthday ? new Date(cust.birthday).toLocaleDateString() : 'N/A'}</td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--color-gold)' }}>
                            ⭐ {cust.loyaltyPoints} pts
                          </span>
                        </td>
                        <td>
                          <th>Stock</th>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => { setEditingCustomerId(cust._id); setCustomerForm({ name: cust.name, phone: cust.phone, email: cust.email || '', address: cust.address || '', birthday: cust.birthday || '', notes: cust.notes || '' }); setShowAddCustomerModal(true); }}>Edit</button>
                            {hasRole('Admin') && (
                              <button className="btn-danger" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => handleDeleteCustomer(cust._id)}><Trash2 size={12} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* TAB 6: SUPPLIERS REGISTER               */}
          {/* ======================================= */}
          {activeTab === 'Suppliers' && (
            <div>
              <div className="module-header">
                <h3>Materials & Gems Wholesalers</h3>
                <button className="btn-action" onClick={() => setShowAddSupplierModal(true)}>
                  <Plus size={16} /> Register Wholesaler
                </button>
              </div>

              <div className="table-card">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Supplier Name</th>
                      <th>Contact Person</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Material Supplied</th>
                      <th>Outstanding Balance</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((supp) => (
                      <tr key={supp._id}>
                        <td><strong>{supp.name}</strong></td>
                        <td>{supp.contactPerson || 'N/A'}</td>
                        <td>{supp.phone}</td>
                        <td>{supp.email || 'N/A'}</td>
                        <td>
                          {supp.metalTypeSupplied?.map((t, i) => (
                            <span key={i} className="status-tag active" style={{ marginRight: '4px' }}>{t}</span>
                          ))}
                        </td>
                        <td>
                          <strong style={{ color: supp.outstandingBalance > 0 ? '#ef4444' : 'inherit' }}>
                            Rs. {supp.outstandingBalance.toLocaleString()}
                          </strong>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {hasRole('Admin', 'Inventory_Manager') && (
                              <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => { setEditingSupplierId(supp._id); setSupplierForm({ name: supp.name, contactPerson: supp.contactPerson || '', phone: supp.phone || '', email: supp.email || '', address: supp.address || '', metalTypeSupplied: supp.metalTypeSupplied?.[0] || 'Gold', outstandingBalance: supp.outstandingBalance || '' }); setShowAddSupplierModal(true); }}>Edit</button>
                            )}
                            {hasRole('Admin') && (
                              <button className="btn-danger" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => handleDeleteSupplier(supp._id)}><Trash2 size={12} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* TAB 7: REPAIRS TRACKING                 */}
          {/* ======================================= */}
          {activeTab === 'Repairs' && (
            <div>
              <div className="module-header">
                <h3>Jewelry repairs and custom services</h3>
                <button className="btn-action" onClick={() => setShowAddRepairModal(true)}>
                  <Plus size={16} /> Log Repair Job
                </button>
              </div>

              <div className="table-card">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Job Code</th>
                      <th>Customer Name</th>
                      <th>Item Name</th>
                      <th>Description</th>
                      <th>Estimated Weight</th>
                      <th>Service Quote</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repairs.map((rep) => (
                      <tr key={rep._id}>
                        <td><strong>{rep.repairNumber}</strong></td>
                        <td>{rep.customerId?.name} ({rep.customerId?.phone})</td>
                        <td>{rep.itemName}</td>
                        <td>{rep.description}</td>
                        <td>{rep.estimatedWeight} g</td>
                        <td><strong>Rs. {rep.estimatedCost.toLocaleString()}</strong></td>
                        <td>
                          <span className={`status-tag ${rep.status === 'Delivered' ? 'active' : (rep.status === 'Ready' ? 'warning' : 'danger')}`}>
                            {rep.status}
                          </span>
                        </td>
                        <td>
                          {hasRole('Admin', 'Cashier', 'Sales_Staff') && rep.status !== 'Delivered' && (
                            <button className="btn-action" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => handleCompleteRepair(rep._id)}>
                              <Check size={12} /> Deliver & Collect Cash
                            </button>
                          )}
                          {hasRole('Admin') && (
                            <div style={{ marginTop: 6 }}>
                              <button className="btn-danger" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => handleDeleteRepair(rep._id)}><Trash2 size={12} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* TAB 8: FINANCIAL LEDGER                 */}
          {/* ======================================= */}
          {activeTab === 'Ledger' && (
            <div>
              <div className="module-header">
                <h3>Digital double-entry Cashbook</h3>
                <button className="btn-action" onClick={() => setShowAddLedgerModal(true)}>
                  <Plus size={16} /> Log Expense/Income
                </button>
                <div style={{ display: 'flex', gap: 8, marginLeft: 12 }}>
                  <button className="btn-secondary" onClick={exportLedgerCSV}>Export CSV</button>
                  <label className="btn-secondary" style={{ display: 'inline-block', padding: '6px 10px', cursor: 'pointer' }}>
                    Import CSV
                    <input type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; await importLedgerCSV(f); e.target.value = ''; }} />
                  </label>
                </div>
              </div>

              <div className="table-card">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Entry Date</th>
                      <th>Type</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Description</th>
                      <th>Reference ID</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((ent) => (
                      <tr key={ent._id}>
                        <td>{new Date(ent.entryDate).toLocaleDateString()}</td>
                        <td>
                          <span className={`status-tag ${ent.type === 'Income' ? 'active' : 'danger'}`}>
                            {ent.type}
                          </span>
                        </td>
                        <td>{ent.category}</td>
                        <td>
                          <strong style={{ color: ent.type === 'Income' ? '#10b981' : '#ef4444' }}>
                            Rs. {ent.amount.toLocaleString()}
                          </strong>
                        </td>
                        <td>{ent.description}</td>
                        <td>{ent.referenceId || '-'}</td>
                        <td>
                          {hasRole('Admin') && (
                            <button className="btn-danger" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => handleDeleteLedger(ent._id)}><Trash2 size={12} /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'Custom Orders' && (() => {
            const coCollectedRev = customOrders.reduce((sum, co) => {
              if (co.paymentStatus === 'Paid') return sum + (co.quotedPrice || 0);
              if (co.paymentStatus === 'Partial') return sum + (co.advancePayment || 0);
              return sum;
            }, 0);
            const coPendingPayment = customOrders.reduce((sum, co) => {
              if (co.paymentStatus === 'Paid') return sum;
              if (co.paymentStatus === 'Partial') return sum + ((co.quotedPrice || 0) - (co.advancePayment || 0));
              return sum + (co.quotedPrice || 0);
            }, 0);
            const coProfit = coCollectedRev * 0.20;

            return (
              <div>
                <div className="kpi-row" style={{ marginBottom: 20 }}>
                  <div className="kpi-card border-accent">
                    <span className="kpi-label">Collected Revenue</span>
                    <span className="kpi-value">Rs. {coCollectedRev.toLocaleString()}</span>
                    <span className="kpi-trend">Paid & Partial</span>
                  </div>
                  <div className="kpi-card border-gold">
                    <span className="kpi-label">Estimated Profit</span>
                    <span className="kpi-value">Rs. {coProfit.toLocaleString()}</span>
                    <span className="kpi-trend">Based on collected</span>
                  </div>
                  <div className="kpi-card border-danger">
                    <span className="kpi-label">Pending Payments</span>
                    <span className="kpi-value">Rs. {coPendingPayment.toLocaleString()}</span>
                    <span className="kpi-trend">Unpaid & Balances</span>
                  </div>
                </div>
                <div className="module-header">
                  <h3>Custom Orders Management</h3>
                  <button className="btn-action" onClick={() => {
                    setEditingCustomOrderId(null);
                    setCustomOrderForm({ customerId: '', customerName: '', itemName: '', category: 'Ring', designNotes: '', metalType: 'gold_22k', estimatedWeight: '', quotedPrice: '', advancePayment: '', paymentStatus: 'Unpaid' });
                    setShowAddCustomOrderModal(true);
                  }}>+ New Custom Order</button>
                </div>
                <div className="table-card">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Item</th>
                        <th>Category</th>
                        <th>Metal</th>
                        <th>Quoted Price</th>
                        <th>Advance</th>
                        <th>Payment</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customOrders.map((co) => (
                        <tr key={co._id}>
                          <td>{new Date(co.createdAt).toLocaleDateString()}</td>
                          <td>{co.customerId?.name || co.customerName || 'Anonymous'}</td>
                          <td><strong>{co.itemName}</strong></td>
                          <td>{co.category}</td>
                          <td>{co.metalType.replace('gold_', '').toUpperCase()}</td>
                          <td>Rs. {co.quotedPrice?.toLocaleString()}</td>
                          <td>Rs. {co.advancePayment?.toLocaleString()}</td>
                          <td>
                            <span className={`status-tag ${co.paymentStatus === 'Paid' ? 'active' : (co.paymentStatus === 'Partial' ? 'warning' : 'danger')}`} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                              {co.paymentStatus === 'Paid' ? 'Fully Paid' : (co.paymentStatus === 'Partial' ? 'Partial' : 'Unpaid')}
                            </span>
                          </td>
                          <td><span className={`status-tag ${co.status === 'Delivered' ? 'active' : 'warning'}`}>{co.status}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {co.status !== 'Delivered' ? (
                                <>
                                  <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => handleEditCustomOrder(co)}><PenTool size={12} /></button>
                                  <button className="btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => openConfirmDialog('Confirm Delivery & Payment', 'Has the full payment been collected for this custom order? Marking as delivered will record this in the revenue.', () => handleCompleteCustomOrder(co._id), 'Confirm Delivery', 'success')}><Check size={12} style={{ marginRight: 4 }} />Deliver</button>
                                  <button className="btn-danger" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => handleDeleteCustomOrder(co._id)}><Trash2 size={12} /></button>
                                </>
                              ) : (
                                <>
                                  <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => downloadCustomOrderPDF(co._id)}>Invoice PDF</button>
                                  <button className="btn-danger" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => handleDeleteCustomOrder(co._id)}><Trash2 size={12} /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {customOrders.length === 0 && (
                        <tr><td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>No custom orders found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

        </div>
      </main>

      {/* ======================================= */}
      {/* MODALS & FORMS SECTION                  */}
      {/* ======================================= */}

      {/* Modal 1: Add Inventory Product */}
      {showAddProductModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingProductId ? 'Edit Showcase Jewelry' : 'Register Showcase Jewelry'}</h3>
              <button className="btn-secondary" style={{ padding: 4 }} onClick={() => { setShowAddProductModal(false); setEditingProductId(null); setFormErrors(prev => ({ ...prev, product: {} })); }}>✕</button>
            </div>
            <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="grid-2">
                <div className="form-group">
                  <label>SKU (Unique)</label>
                  <input type="text" value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} placeholder="e.g. RIN-GLD-102" required aria-invalid={!!formErrors.product?.sku} />
                  {formErrors.product?.sku && <div className="field-error">{formErrors.product.sku}</div>}
                </div>
                <div className="form-group">
                  <label>Product Name</label>
                  <input type="text" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="e.g. 22K Gold Bangle" required aria-invalid={!!formErrors.product?.name} />
                  {formErrors.product?.name && <div className="field-error">{formErrors.product.name}</div>}
                </div>
              </div>

              <div className="grid-3">
                <div className="form-group">
                  <label>Category</label>
                  <select value={newProduct.category} onChange={(e) => handleProductCategoryChange(e.target.value)}>
                    <option value="Ring">Ring</option>
                    <option value="Necklace">Necklace</option>
                    <option value="Bracelet">Bracelet</option>
                    <option value="Earrings">Earrings</option>
                    <option value="Bangle">Bangle</option>
                    <option value="Pendant">Pendant</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Metal Purity</label>
                  <select value={newProduct.metalType} onChange={(e) => handleProductMetalChange(e.target.value)}>
                    <option value="gold_24k">24K Gold</option>
                    <option value="gold_22k">22K Gold</option>
                    <option value="gold_20k">20K Gold</option>
                    <option value="gold_18k">18K Gold</option>
                    <option value="silver_925">Silver 925</option>
                    <option value="platinum">Platinum</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Metal Weight (g)</label>
                  <input type="number" step="0.01" value={newProduct.metalWeightGrams} onChange={(e) => setNewProduct({ ...newProduct, metalWeightGrams: e.target.value })} placeholder="e.g. 5.6" required aria-invalid={!!formErrors.product?.metalWeightGrams} />
                  {formErrors.product?.metalWeightGrams && <div className="field-error">{formErrors.product.metalWeightGrams}</div>}
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Making Charge Per Gram (Rs.)</label>
                  <input type="number" value={newProduct.makingChargePerGram} onChange={(e) => setNewProduct({ ...newProduct, makingChargePerGram: e.target.value })} placeholder="e.g. 800" aria-invalid={!!formErrors.product?.makingChargePerGram} />
                  {formErrors.product?.makingChargePerGram && <div className="field-error">{formErrors.product.makingChargePerGram}</div>}
                </div>
                <div className="form-group">
                  <label>Fixed Making Charge (Rs.)</label>
                  <input type="number" value={newProduct.makingChargeFixed} onChange={(e) => setNewProduct({ ...newProduct, makingChargeFixed: e.target.value })} placeholder="e.g. 3000" aria-invalid={!!formErrors.product?.makingChargeFixed} />
                  {formErrors.product?.makingChargeFixed && <div className="field-error">{formErrors.product.makingChargeFixed}</div>}
                </div>
              </div>

              <div className="form-group">
                <label>Stock Quantity</label>
                <input type="number" min="0" step="1" value={newProduct.stockQuantity} onChange={(e) => setNewProduct({ ...newProduct, stockQuantity: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="e.g. 4" required aria-invalid={!!formErrors.product?.stockQuantity} />
                {formErrors.product?.stockQuantity && <div className="field-error">{formErrors.product.stockQuantity}</div>}
              </div>

              {/* Gemstone Adding Sub-form */}
              <div style={{ border: '1px solid var(--border-color)', padding: 12, borderRadius: 'var(--border-radius-sm)' }}>
                <h4>Embed Gemstones (Schema Flexibility)</h4>
                <div className="grid-3" style={{ marginTop: 8 }}>
                  <div className="form-group">
                    <label>Gem Type</label>
                    <select value={newProduct.tempGem.gemType} onChange={(e) => setNewProduct({ ...newProduct, tempGem: { ...newProduct.tempGem, gemType: e.target.value } })}>
                      <option value="Diamond">Diamond</option>
                      <option value="Blue Sapphire">Blue Sapphire</option>
                      <option value="Ruby">Ruby</option>
                      <option value="Emerald">Emerald</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Carats</label>
                    <input type="number" step="0.01" value={newProduct.tempGem.carats} onChange={(e) => setNewProduct({ ...newProduct, tempGem: { ...newProduct.tempGem, carats: e.target.value } })} placeholder="e.g. 0.2" />
                  </div>
                  <div className="form-group">
                    <label>Gem Cost (Rs.)</label>
                    <input type="number" value={newProduct.tempGem.cost} onChange={(e) => setNewProduct({ ...newProduct, tempGem: { ...newProduct.tempGem, cost: e.target.value } })} placeholder="e.g. 45000" />
                  </div>
                </div>
                <button type="button" className="btn-secondary" style={{ marginTop: 10, width: '100%', padding: '6px' }} onClick={handleAddGemToProduct}>+ Embed Gem Details</button>
                {newProduct.gems.length > 0 && (
                  <div style={{ marginTop: 10, fontSize: '0.75rem' }}>
                    <strong>Embedded:</strong> {newProduct.gems.map((g) => `${g.gemType} (${g.carats}ct - Rs.${g.cost})`).join(', ')}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Assigned Wholesaler</label>
                <select value={newProduct.supplierId} onChange={(e) => setNewProduct({ ...newProduct, supplierId: e.target.value })}>
                  <option value="">-- No Supplier --</option>
                  {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => { setShowAddProductModal(false); setEditingProductId(null); setFormErrors(prev => ({ ...prev, product: {} })); }}>Cancel</button>
                <button type="submit" className="btn-primary">{editingProductId ? 'Update Product' : 'Add Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Register Customer */}
      {showAddCustomerModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Register Customer Account</h3>
              <button className="btn-secondary" style={{ padding: 4 }} onClick={() => { setShowAddCustomerModal(false); setFormErrors(prev => ({ ...prev, customer: {} })); }}>✕</button>
            </div>
            <form onSubmit={handleAddCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Customer Name</label>
                <input type="text" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} placeholder="Kamal Perera" required aria-invalid={!!formErrors.customer?.name} />
                {formErrors.customer?.name && <div className="field-error">{formErrors.customer.name}</div>}
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="text" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} placeholder="0771234567" required aria-invalid={!!formErrors.customer?.phone} />
                {formErrors.customer?.phone && <div className="field-error">{formErrors.customer.phone}</div>}
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} placeholder="kamal@gmail.com" aria-invalid={!!formErrors.customer?.email} />
                {formErrors.customer?.email && <div className="field-error">{formErrors.customer.email}</div>}
              </div>
              <div className="form-group">
                <label>Address</label>
                <input type="text" value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} placeholder="No 12, Galle Road, Colombo" />
              </div>
              <div className="form-group">
                <label>Birthday</label>
                <input type="date" value={customerForm.birthday} onChange={(e) => setCustomerForm({ ...customerForm, birthday: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => { setShowAddCustomerModal(false); setFormErrors(prev => ({ ...prev, customer: {} })); }}>Cancel</button>
                <button type="submit" className="btn-primary">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Register Wholesaler */}
      {showAddSupplierModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Register Material Wholesaler</h3>
              <button className="btn-secondary" style={{ padding: 4 }} onClick={() => { setShowAddSupplierModal(false); setFormErrors(prev => ({ ...prev, supplier: {} })); }}>✕</button>
            </div>
            <form onSubmit={handleAddSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Supplier Name</label>
                <input type="text" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} placeholder="e.g. Aurora Wholesalers" required aria-invalid={!!formErrors.supplier?.name} />
                {formErrors.supplier?.name && <div className="field-error">{formErrors.supplier.name}</div>}
              </div>
              <div className="form-group">
                <label>Contact Person</label>
                <input type="text" value={supplierForm.contactPerson} onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })} placeholder="Michael Fox" />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="text" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} placeholder="0112345678" required aria-invalid={!!formErrors.supplier?.phone} />
                  {formErrors.supplier?.phone && <div className="field-error">{formErrors.supplier.phone}</div>}
                </div>
                <div className="form-group">
                  <label>Outstanding Debt (Rs.)</label>
                  <input type="number" value={supplierForm.outstandingBalance} onChange={(e) => setSupplierForm({ ...supplierForm, outstandingBalance: e.target.value })} placeholder="e.g. 150000" aria-invalid={!!formErrors.supplier?.outstandingBalance} />
                  {formErrors.supplier?.outstandingBalance && <div className="field-error">{formErrors.supplier.outstandingBalance}</div>}
                </div>
              </div>
              <div className="form-group">
                <label>Metal Type Supplied</label>
                <select value={supplierForm.metalTypeSupplied} onChange={(e) => setSupplierForm({ ...supplierForm, metalTypeSupplied: e.target.value })}>
                  <option value="Gold">Gold Bullion</option>
                  <option value="Gems">Precious Gemstones</option>
                  <option value="Silver">Silver Stock</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => { setShowAddSupplierModal(false); setFormErrors(prev => ({ ...prev, supplier: {} })); }}>Cancel</button>
                <button type="submit" className="btn-primary">Register Wholesaler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Add Repair Job */}
      {showAddRepairModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Log Repair Service Ticket</h3>
              <button className="btn-secondary" style={{ padding: 4 }} onClick={() => { setShowAddRepairModal(false); setFormErrors(prev => ({ ...prev, repair: {} })); }}>✕</button>
            </div>
            <form onSubmit={handleAddRepair} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Select Customer Profile</label>
                <select value={repairForm.customerId} onChange={(e) => setRepairForm({ ...repairForm, customerId: e.target.value })} required aria-invalid={!!formErrors.repair?.customerId}>
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => <option key={c._id} value={c._id}>{c.name} ({c.phone})</option>)}
                </select>
                {formErrors.repair?.customerId && <div className="field-error">{formErrors.repair.customerId}</div>}
              </div>
              <div className="form-group">
                <label>Item Name</label>
                <input type="text" value={repairForm.itemName} onChange={(e) => setRepairForm({ ...repairForm, itemName: e.target.value })} placeholder="e.g. Gold Necklace, Ruby Ring" required aria-invalid={!!formErrors.repair?.itemName} />
                {formErrors.repair?.itemName && <div className="field-error">{formErrors.repair.itemName}</div>}
              </div>
              <div className="form-group">
                <label>Repair Description</label>
                <textarea value={repairForm.description} onChange={(e) => setRepairForm({ ...repairForm, description: e.target.value })} placeholder="Solder broken hook lock / Resize ring size from 12 to 14" required aria-invalid={!!formErrors.repair?.description}></textarea>
                {formErrors.repair?.description && <div className="field-error">{formErrors.repair.description}</div>}
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Estimated Weight (g)</label>
                  <input type="number" step="0.01" value={repairForm.estimatedWeight} onChange={(e) => setRepairForm({ ...repairForm, estimatedWeight: e.target.value })} placeholder="e.g. 5.6" />
                </div>
                <div className="form-group">
                  <label>Service Cost Quote (Rs.)</label>
                  <input type="number" value={repairForm.estimatedCost} onChange={(e) => setRepairForm({ ...repairForm, estimatedCost: e.target.value })} placeholder="e.g. 2500" required aria-invalid={!!formErrors.repair?.estimatedCost} />
                  {formErrors.repair?.estimatedCost && <div className="field-error">{formErrors.repair.estimatedCost}</div>}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => { setShowAddRepairModal(false); setFormErrors(prev => ({ ...prev, repair: {} })); }}>Cancel</button>
                <button type="submit" className="btn-primary">Generate Job Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Add Custom Order */}
      {showAddCustomOrderModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingCustomOrderId ? 'Edit Custom Order' : 'Create Custom Order'}</h3>
              <button className="btn-secondary" style={{ padding: 4 }} onClick={() => setShowAddCustomOrderModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddCustomOrder} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="grid-2">
                <div className="form-group">
                  <label>Select Registered Customer</label>
                  <select value={customOrderForm.customerId} onChange={(e) => setCustomOrderForm({ ...customOrderForm, customerId: e.target.value })}>
                    <option value="">-- Anonymous / Manual --</option>
                    {customers.map(c => <option key={c._id} value={c._id}>{c.name} ({c.phone})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Or Enter Customer Name</label>
                  <input type="text" value={customOrderForm.customerName} onChange={(e) => setCustomOrderForm({ ...customOrderForm, customerName: e.target.value })} placeholder="John Doe" disabled={!!customOrderForm.customerId} />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Item Name</label>
                  <input type="text" value={customOrderForm.itemName} onChange={(e) => setCustomOrderForm({ ...customOrderForm, itemName: e.target.value })} placeholder="e.g. Diamond Engagement Ring" required />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select value={customOrderForm.category} onChange={(e) => setCustomOrderForm({ ...customOrderForm, category: e.target.value })} required>
                    <option value="Ring">Ring</option>
                    <option value="Necklace">Necklace</option>
                    <option value="Earrings">Earrings</option>
                    <option value="Bracelet">Bracelet</option>
                    <option value="Bangle">Bangle</option>
                    <option value="Pendant">Pendant</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ margin: 0 }}>Design Notes & Description</label>
                  <button
                    type="button"
                    onClick={generateAIDescription}
                    disabled={isGeneratingDesc}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      background: 'var(--color-gold)', color: '#000',
                      border: 'none', padding: '4px 8px', borderRadius: '4px',
                      fontSize: '0.75rem', fontWeight: 600, cursor: isGeneratingDesc ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Sparkles size={12} /> {isGeneratingDesc ? 'Generating...' : 'AI Generate'}
                  </button>
                </div>
                <textarea value={customOrderForm.designNotes} onChange={(e) => setCustomOrderForm({ ...customOrderForm, designNotes: e.target.value })} placeholder="Customer specific requirements or luxurious description..."></textarea>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Metal Type</label>
                  <select value={customOrderForm.metalType} onChange={(e) => setCustomOrderForm({ ...customOrderForm, metalType: e.target.value })}>
                    <option value="gold_24k">24K Gold</option>
                    <option value="gold_22k">22K Gold</option>
                    <option value="gold_20k">20K Gold</option>
                    <option value="gold_18k">18K Gold</option>
                    <option value="silver_925">Silver 925</option>
                    <option value="platinum">Platinum</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Estimated Weight (g)</label>
                  <input type="number" step="0.01" value={customOrderForm.estimatedWeight} onChange={(e) => setCustomOrderForm({ ...customOrderForm, estimatedWeight: e.target.value })} placeholder="e.g. 5" />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Quoted Price (Rs.)</label>
                  <input type="number" value={customOrderForm.quotedPrice} onChange={(e) => setCustomOrderForm({ ...customOrderForm, quotedPrice: e.target.value })} placeholder="e.g. 150000" required />
                </div>
                <div className="form-group">
                  <label>Advance Payment (Rs.)</label>
                  <input type="number" value={customOrderForm.advancePayment} onChange={(e) => setCustomOrderForm({ ...customOrderForm, advancePayment: e.target.value })} placeholder="e.g. 50000" />
                </div>
              </div>
              <div className="form-group">
                <label>Payment Status</label>
                <select value={customOrderForm.paymentStatus} onChange={(e) => setCustomOrderForm({ ...customOrderForm, paymentStatus: e.target.value })}>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Partial">Partial</option>
                  <option value="Paid">Fully Paid</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddCustomOrderModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Custom Order</button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Modal 5: Add Ledger Transaction */}
      {showAddLedgerModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Log Financial Cashflow Entry</h3>
              <button className="btn-secondary" style={{ padding: 4 }} onClick={() => { setShowAddLedgerModal(false); setFormErrors(prev => ({ ...prev, ledger: {} })); }}>✕</button>
            </div>
            <form onSubmit={handleAddLedger} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="grid-2">
                <div className="form-group">
                  <label>Transaction Type</label>
                  <select value={ledgerForm.type} onChange={(e) => setLedgerForm({ ...ledgerForm, type: e.target.value })}>
                    <option value="Expense">Expense (Debit Outflow)</option>
                    <option value="Income">Income (Credit Inflow)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select value={ledgerForm.category} onChange={(e) => setLedgerForm({ ...ledgerForm, category: e.target.value })}>
                    <option value="Salary">Staff Salaries</option>
                    <option value="Rent">Shop Showroom Rent</option>
                    <option value="Utilities">Electricity/Water Bills</option>
                    <option value="SupplierPayment">Supplier Settlements</option>
                    <option value="CustomPurchase">Precious Metal Bullion purchase</option>
                    <option value="Other">Other Miscellaneous</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Amount (Rs.)</label>
                <input type="number" value={ledgerForm.amount} onChange={(e) => setLedgerForm({ ...ledgerForm, amount: e.target.value })} placeholder="e.g. 45000" required aria-invalid={!!formErrors.ledger?.amount} />
                {formErrors.ledger?.amount && <div className="field-error">{formErrors.ledger.amount}</div>}
              </div>
              <div className="form-group">
                <label>Description Detail</label>
                <input type="text" value={ledgerForm.description} onChange={(e) => setLedgerForm({ ...ledgerForm, description: e.target.value })} placeholder="Electricity bill Colombo showroom for Jan" required aria-invalid={!!formErrors.ledger?.description} />
                {formErrors.ledger?.description && <div className="field-error">{formErrors.ledger.description}</div>}
              </div>
              <div className="form-group">
                <label>Payment Method</label>
                <select value={ledgerForm.paymentMethod} onChange={(e) => setLedgerForm({ ...ledgerForm, paymentMethod: e.target.value })}>
                  <option value="Cash">Cash Drawer</option>
                  <option value="Card">Card Reader</option>
                  <option value="BankTransfer">Direct Bank Transfer</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => { setShowAddLedgerModal(false); setFormErrors(prev => ({ ...prev, ledger: {} })); }}>Cancel</button>
                <button type="submit" className="btn-primary">Post Ledger Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Order / Invoice */}
      {showViewOrderModal && viewOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 920, background: 'linear-gradient(180deg, #ffffff 0%, #fbfbf8 100%)' }}>
            <div className="modal-header">
              <div>
                <h3>Invoice Preview - {viewOrder.invoiceNumber}</h3>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 4 }}>Branded invoice template for customer review and download</div>
              </div>
              <button className="btn-secondary" style={{ padding: 4 }} onClick={() => setShowViewOrderModal(false)}>✕</button>
            </div>
            <div style={{ padding: '8px 0 16px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16, marginBottom: 16 }}>
                <div className="table-card" style={{ padding: 18, background: '#fffdf8', border: '1px solid #eee2c9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-primary)' }}>jewel lanka</div>
                      <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 4 }}>Certified gold jewelry and custom design</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 6 }}>No. 1, Main Street, Colombo</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Tel: +94 77 123 4567</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>Invoice No.</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800 }}>{viewOrder.invoiceNumber}</div>
                      <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 8 }}>Date</div>
                      <div style={{ fontSize: '0.95rem' }}>{new Date(viewOrder.saleDate).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
                <div className="table-card" style={{ padding: 18, border: '1px solid #eee2c9' }}>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Customer</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: 4 }}>{viewOrder.customerId?.name || 'Walk-in Customer'}</div>
                  <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 4 }}>{viewOrder.customerId?.phone || ''}</div>
                  <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>{viewOrder.customerId?.email || ''}</div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className={`status-tag ${viewOrder.paymentStatus === 'Paid' ? 'active' : (viewOrder.paymentStatus === 'Partial' ? 'warning' : 'danger')}`}>
                      {viewOrder.paymentStatus || 'Paid'}
                    </span>
                    <span className="status-tag active">{viewOrder.paymentMethod}</span>
                  </div>
                </div>
              </div>
              <table className="custom-table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Item</th>
                    <th>Metal</th>
                    <th>Weight</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {viewOrder.items.map((it, i) => (
                    <tr key={i}>
                      <td><strong>{it.sku}</strong></td>
                      <td>{it.name}</td>
                      <td>{it.metalType.replace('gold_', '').toUpperCase()}</td>
                      <td>{it.metalWeightGrams} g</td>
                      <td>Rs. {it.subtotal.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
                <div className="table-card" style={{ padding: 18 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 10 }}>Customer / Order Notes</div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.6 }}>
                    Payment method: {viewOrder.paymentMethod}. Use the button below to download the official branded PDF receipt.
                  </div>
                </div>
                <div className="table-card" style={{ padding: 18, background: '#fbf8ef' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem' }}><span>Subtotal</span><strong>Rs. {viewOrder.items.reduce((s, a) => s + (a.subtotal || 0), 0).toLocaleString()}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', marginTop: 8 }}><span>Discount</span><strong>Rs. {viewOrder.discountAmount?.toLocaleString() || 0}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', marginTop: 8 }}><span>Tax</span><strong>Rs. {viewOrder.taxAmount?.toLocaleString() || 0}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', marginTop: 8 }}><span>Balance Due</span><strong>Rs. {(viewOrder.balanceDue || 0).toLocaleString()}</strong></div>
                  <div style={{ borderTop: '1px solid #e7dcc7', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem' }}><span>Total Due</span><strong>Rs. {viewOrder.finalAmount.toLocaleString()}</strong></div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowViewOrderModal(false)}>Close</button>
              <button type="button" className="btn-secondary" onClick={() => downloadInvoicePDF(viewOrder.invoiceNumber)}>Download PDF</button>
              <button type="button" className="btn-primary" onClick={() => downloadInvoicePDF(viewOrder.invoiceNumber)}>Print Invoice</button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <ConfirmDialog
          open
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          tone={confirmDialog.tone}
          onConfirm={runConfirmAction}
          onCancel={closeConfirmDialog}
        />
      )}

      {user && token && <JewelBot token={token} API_BASE={API_BASE} />}

    </div>
  );
}

export default App;
