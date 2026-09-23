/* state.js — single in-memory source of truth, kept in sync with StorageService */

const AppState = (() => {

  const state = {
    user: null,
    items: [],
    expenses: [],
    paymentMethods: [],
    settings: {},
    // transient UI state, not persisted
    draftExpense: { date: null, items: [], paymentMethod: null, note: '' },
    ui: { currentMonth: null }
  };

  const listeners = new Set();

  function load() {
    state.user = StorageService.getUser();
    state.items = StorageService.getItems();
    state.expenses = StorageService.getExpenses();
    state.paymentMethods = StorageService.getPaymentMethods();
    state.settings = StorageService.getSettings();
    state.ui.currentMonth = Utils.monthKey(Utils.todayISO());
    notify();
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function notify() {
    listeners.forEach(fn => fn(state));
  }

  // ---- User ----
  function setUser(name) {
    state.user = StorageService.saveUser({ name });
    notify();
  }

  // ---- Items ----
  function addItem(item) {
    const saved = StorageService.saveItem(item);
    state.items = StorageService.getItems();
    notify();
    return saved;
  }

  function editItem(item) {
    StorageService.updateItem(item);
    state.items = StorageService.getItems();
    notify();
  }

  function removeItem(itemId) {
    StorageService.deleteItem(itemId);
    state.items = StorageService.getItems();
    notify();
  }

  function toggleFavorite(itemId) {
    const item = state.items.find(i => i.id === itemId);
    if (!item) return;
    editItem({ ...item, favorite: !item.favorite });
  }

  function toggleActive(itemId) {
    const item = state.items.find(i => i.id === itemId);
    if (!item) return;
    editItem({ ...item, active: !item.active });
  }

  // ---- Expenses ----
  function addExpense(expense) {
    const saved = StorageService.saveExpense(expense);
    state.expenses = StorageService.getExpenses();
    if (expense.paymentMethod) {
      StorageService.saveSettings({ lastPaymentMethod: expense.paymentMethod });
      state.settings = StorageService.getSettings();
    }
    notify();
    return saved;
  }

  function editExpense(expense) {
    StorageService.updateExpense(expense);
    state.expenses = StorageService.getExpenses();
    notify();
  }

  function removeExpense(expenseId) {
    StorageService.deleteExpense(expenseId);
    state.expenses = StorageService.getExpenses();
    notify();
  }

  // ---- Settings ----
  function updateSettings(patch) {
    state.settings = StorageService.saveSettings(patch);
    notify();
  }

  // ---- Payment methods ----
  function addPaymentMethod(name) {
    StorageService.addPaymentMethod(name);
    state.paymentMethods = StorageService.getPaymentMethods();
    notify();
  }

  function removePaymentMethod(id) {
    StorageService.removePaymentMethod(id);
    state.paymentMethods = StorageService.getPaymentMethods();
    notify();
  }

  // ---- Draft expense (Add Expense screen working state) ----
  function resetDraft() {
    state.draftExpense = {
      date: Utils.todayISO(),
      items: [],
      paymentMethod: state.settings.lastPaymentMethod || null,
      note: ''
    };
    notify();
  }

  function draftAddItem(item) {
    const line = state.draftExpense.items.find(l => l.itemId === item.id);
    if (line) {
      line.quantity += 1;
    } else {
      state.draftExpense.items.push({
        itemId: item.id, itemName: item.name, quantity: 1, unitPrice: item.price
      });
    }
    notify();
  }

  function draftSetQuantity(itemId, qty) {
    const line = state.draftExpense.items.find(l => l.itemId === itemId);
    if (!line) return;
    if (qty <= 0) {
      state.draftExpense.items = state.draftExpense.items.filter(l => l.itemId !== itemId);
    } else {
      line.quantity = qty;
    }
    notify();
  }

  function draftRemoveItem(itemId) {
    state.draftExpense.items = state.draftExpense.items.filter(l => l.itemId !== itemId);
    notify();
  }

  function draftSetPaymentMethod(method) {
    state.draftExpense.paymentMethod = method;
    notify();
  }

  function draftSetNote(note) {
    state.draftExpense.note = note;
  }

  function draftSetDate(date) {
    state.draftExpense.date = date;
    notify();
  }

  function draftLoadFromExpense(expense) {
    state.draftExpense = {
      id: expense.id,
      date: expense.date,
      items: expense.items.map(i => ({ ...i })),
      paymentMethod: expense.paymentMethod,
      note: expense.note || ''
    };
    notify();
  }

  // ---- Month nav (Analytics/History) ----
  function setCurrentMonth(monthKeyStr) {
    state.ui.currentMonth = monthKeyStr;
    notify();
  }

  return {
    state, load, subscribe, notify,
    setUser,
    addItem, editItem, removeItem, toggleFavorite, toggleActive,
    addExpense, editExpense, removeExpense,
    updateSettings,
    addPaymentMethod, removePaymentMethod,
    resetDraft, draftAddItem, draftSetQuantity, draftRemoveItem,
    draftSetPaymentMethod, draftSetNote, draftSetDate, draftLoadFromExpense,
    setCurrentMonth
  };
})();
