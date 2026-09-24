/* storage.js — the ONLY module that talks to window.localStorage directly.
   Everything else goes through StorageService. */

const StorageService = (() => {

  const KEYS = {
    user: 'canteen_user',
    items: 'canteen_items',
    expenses: 'canteen_expenses',
    settings: 'canteen_settings',
    paymentMethods: 'canteen_payment_methods',
    creditPayments: 'canteen_credit_payments'
  };

  const DATA_VERSION = 1;

  function safeGet(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && 'version' in parsed && 'data' in parsed) {
        return parsed.data;
      }
      return parsed;
    } catch (err) {
      console.error(`StorageService: corrupt value for "${key}", using fallback`, err);
      return fallback;
    }
  }

  function safeSet(key, value) {
    try {
      const wrapped = { version: DATA_VERSION, data: value };
      window.localStorage.setItem(key, JSON.stringify(wrapped));
      return true;
    } catch (err) {
      console.error(`StorageService: failed to save "${key}"`, err);
      const isQuota = err && (err.name === 'QuotaExceededError' || err.code === 22);
      Toast?.show(isQuota ? 'Storage is full — export a backup and clear old data' : 'Could not save data', 'error');
      return false;
    }
  }

  function safeRemove(key) {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.error(`StorageService: failed to remove "${key}"`, err);
      return false;
    }
  }

  function isAvailable() {
    try {
      const t = '__canteen_test__';
      window.localStorage.setItem(t, '1');
      window.localStorage.removeItem(t);
      return true;
    } catch {
      return false;
    }
  }

  // ---- Defaults ----

  const DEFAULT_ITEMS = [
    { name: 'Dal Rice', price: 60, category: 'Lunch' },
    { name: 'Chapati', price: 10, category: 'Lunch' },
    { name: 'Rice', price: 30, category: 'Lunch' },
    { name: 'Dal', price: 30, category: 'Lunch' },
    { name: 'Chicken', price: 100, category: 'Lunch' },
    { name: 'Tea', price: 10, category: 'Beverages' },
    { name: 'Coffee', price: 20, category: 'Beverages' },
    { name: 'Thali', price: 80, category: 'Lunch' }
  ];

  const DEFAULT_PAYMENT_METHODS = ['GPay', 'Cash', 'UPI', 'Card', 'Credit', 'Other'];

  function defaultSettings() {
    return {
      theme: 'system',
      lastPaymentMethod: null,
      onboarded: true
    };
  }

  function makeDefaultItems() {
    const now = new Date().toISOString();
    return DEFAULT_ITEMS.map((it, i) => ({
      id: Utils.uid('item'),
      name: it.name,
      price: it.price,
      category: it.category,
      active: true,
      favorite: i < 3,
      createdAt: now,
      updatedAt: now
    }));
  }

  function makeDefaultPaymentMethods() {
    return DEFAULT_PAYMENT_METHODS.map(name => ({ id: Utils.uid('pm'), name, active: true }));
  }

  // ---- User ----

  function getUser() {
    return safeGet(KEYS.user, null);
  }

  function saveUser(user) {
    const now = new Date().toISOString();
    const existing = getUser();
    const payload = {
      id: 'local-user',
      name: user.name,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    safeSet(KEYS.user, payload);
    return payload;
  }

  // ---- Items ----

  function getItems() {
    return safeGet(KEYS.items, []);
  }

  function saveItems(items) {
    safeSet(KEYS.items, items);
  }

  function saveItem(item) {
    const items = getItems();
    const now = new Date().toISOString();
    const newItem = {
      id: item.id || Utils.uid('item'),
      name: item.name,
      price: Number(item.price),
      category: item.category || 'Other',
      active: item.active !== false,
      favorite: !!item.favorite,
      createdAt: item.createdAt || now,
      updatedAt: now
    };
    items.push(newItem);
    saveItems(items);
    return newItem;
  }

  function updateItem(item) {
    const items = getItems();
    const idx = items.findIndex(i => i.id === item.id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...item, updatedAt: new Date().toISOString() };
    saveItems(items);
    return items[idx];
  }

  function deleteItem(itemId) {
    const items = getItems().filter(i => i.id !== itemId);
    saveItems(items);
  }

  // ---- Expenses ----

  function getExpenses() {
    return safeGet(KEYS.expenses, []);
  }

  function saveExpenses(expenses) {
    safeSet(KEYS.expenses, expenses);
  }

  function saveExpense(expense) {
    const expenses = getExpenses();
    const now = new Date().toISOString();
    const newExpense = {
      id: expense.id || Utils.uid('expense'),
      date: expense.date,
      createdAt: expense.createdAt || now,
      updatedAt: now,
      items: expense.items,
      subtotal: expense.subtotal,
      total: expense.total,
      paymentMethod: expense.paymentMethod,
      note: expense.note || ''
    };
    expenses.push(newExpense);
    saveExpenses(expenses);
    return newExpense;
  }

  function updateExpense(expense) {
    const expenses = getExpenses();
    const idx = expenses.findIndex(e => e.id === expense.id);
    if (idx === -1) return null;
    expenses[idx] = { ...expenses[idx], ...expense, updatedAt: new Date().toISOString() };
    saveExpenses(expenses);
    return expenses[idx];
  }

  function deleteExpense(expenseId) {
    const expenses = getExpenses().filter(e => e.id !== expenseId);
    saveExpenses(expenses);
  }

  // ---- Settings ----

  function getSettings() {
    return { ...defaultSettings(), ...safeGet(KEYS.settings, {}) };
  }

  function saveSettings(settings) {
    const merged = { ...getSettings(), ...settings };
    safeSet(KEYS.settings, merged);
    return merged;
  }

  // ---- Payment methods ----

  function getPaymentMethods() {
    return safeGet(KEYS.paymentMethods, []);
  }

  function savePaymentMethods(methods) {
    safeSet(KEYS.paymentMethods, methods);
  }

  function addPaymentMethod(name) {
    const methods = getPaymentMethods();
    const newMethod = { id: Utils.uid('pm'), name, active: true };
    methods.push(newMethod);
    savePaymentMethods(methods);
    return newMethod;
  }

  function removePaymentMethod(id) {
    const methods = getPaymentMethods().filter(m => m.id !== id);
    savePaymentMethods(methods);
  }

  /** Existing installs (onboarded before the Credit feature existed) get
   *  "Credit" added to their payment methods once, automatically. */
  function ensureCreditPaymentMethod() {
    const methods = getPaymentMethods();
    if (methods.length === 0) return; // not onboarded yet — bootstrapDefaults will handle it
    if (methods.some(m => m.name.trim().toLowerCase() === 'credit')) return;
    methods.push({ id: Utils.uid('pm'), name: 'Credit', active: true });
    savePaymentMethods(methods);
  }

  // ---- Credit payments (settling up a canteen tab paid later) ----

  function getCreditPayments() {
    return safeGet(KEYS.creditPayments, []);
  }

  function saveCreditPayments(payments) {
    safeSet(KEYS.creditPayments, payments);
  }

  function saveCreditPayment(payment) {
    const payments = getCreditPayments();
    const now = new Date().toISOString();
    const newPayment = {
      id: payment.id || Utils.uid('credit'),
      date: payment.date,
      amount: Number(payment.amount),
      method: payment.method,
      periodFrom: payment.periodFrom || null,
      periodTo: payment.periodTo || null,
      note: payment.note || '',
      createdAt: payment.createdAt || now,
      updatedAt: now
    };
    payments.push(newPayment);
    saveCreditPayments(payments);
    return newPayment;
  }

  function updateCreditPayment(payment) {
    const payments = getCreditPayments();
    const idx = payments.findIndex(p => p.id === payment.id);
    if (idx === -1) return null;
    payments[idx] = { ...payments[idx], ...payment, updatedAt: new Date().toISOString() };
    saveCreditPayments(payments);
    return payments[idx];
  }

  function deleteCreditPayment(paymentId) {
    const payments = getCreditPayments().filter(p => p.id !== paymentId);
    saveCreditPayments(payments);
  }

  // ---- First-run bootstrap ----

  function bootstrapDefaults() {
    if (getItems().length === 0) saveItems(makeDefaultItems());
    if (getPaymentMethods().length === 0) savePaymentMethods(makeDefaultPaymentMethods());
    if (!safeGet(KEYS.settings, null)) safeSet(KEYS.settings, defaultSettings());
  }

  // ---- Export / Import / Clear ----

  function exportData() {
    return {
      version: DATA_VERSION,
      exportedAt: new Date().toISOString(),
      user: getUser(),
      items: getItems(),
      expenses: getExpenses(),
      settings: getSettings(),
      paymentMethods: getPaymentMethods(),
      creditPayments: getCreditPayments()
    };
  }

  function validateImport(payload) {
    if (!payload || typeof payload !== 'object') return 'File is not valid JSON.';
    if (typeof payload.version !== 'number') return 'Backup is missing a version number.';
    if (!Array.isArray(payload.items)) return 'Backup is missing food items.';
    if (!Array.isArray(payload.expenses)) return 'Backup is missing expenses.';
    if (!Array.isArray(payload.paymentMethods)) return 'Backup is missing payment methods.';
    if (!payload.settings || typeof payload.settings !== 'object') return 'Backup is missing settings.';
    // creditPayments was added after v1 backups existed — treat a missing array as "none yet", not invalid.
    if (payload.creditPayments !== undefined && !Array.isArray(payload.creditPayments)) return 'Backup has an invalid credit payments list.';
    return null;
  }

  function importData(payload) {
    const err = validateImport(payload);
    if (err) return { ok: false, error: err };
    if (payload.user) safeSet(KEYS.user, payload.user);
    saveItems(payload.items);
    saveExpenses(payload.expenses);
    safeSet(KEYS.settings, { ...defaultSettings(), ...payload.settings });
    savePaymentMethods(payload.paymentMethods);
    saveCreditPayments(Array.isArray(payload.creditPayments) ? payload.creditPayments : []);
    ensureCreditPaymentMethod();
    return { ok: true };
  }

  function clearAllData() {
    Object.values(KEYS).forEach(safeRemove);
  }

  return {
    KEYS, isAvailable, bootstrapDefaults,
    getUser, saveUser,
    getItems, saveItem, updateItem, deleteItem,
    getExpenses, saveExpense, updateExpense, deleteExpense,
    getSettings, saveSettings,
    getPaymentMethods, addPaymentMethod, removePaymentMethod, ensureCreditPaymentMethod,
    getCreditPayments, saveCreditPayment, updateCreditPayment, deleteCreditPayment,
    exportData, importData, validateImport, clearAllData
  };
})();
