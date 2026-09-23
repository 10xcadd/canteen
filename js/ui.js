/* ui.js — renders every screen into #view-root. Reads AppState, writes via AppState actions. */

const Toast = (() => {
  function show(message, type = 'info') {
    const stack = document.getElementById('toast-stack');
    if (!stack) return;
    const t = Utils.el('div', { class: `toast${type === 'error' ? ' error' : ''}`, text: message });
    stack.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }
  return { show };
})();

const Modal = (() => {
  let overlayEl = null;

  function open({ title, bodyNode, actions = [], center = false, onClose }) {
    close();
    overlayEl = Utils.el('div', { class: `overlay${center ? ' center' : ''}` });
    const sheet = Utils.el('div', { class: 'sheet' });
    if (!center) sheet.appendChild(Utils.el('div', { class: 'sheet-handle' }));
    if (title) sheet.appendChild(Utils.el('div', { class: 'sheet-title', text: title }));
    const body = Utils.el('div', { class: 'sheet-body' });
    if (bodyNode) body.appendChild(bodyNode);
    sheet.appendChild(body);
    if (actions.length) {
      const actionsRow = Utils.el('div', { class: 'sheet-actions' });
      actions.forEach(a => actionsRow.appendChild(a));
      sheet.appendChild(actionsRow);
    }
    overlayEl.appendChild(sheet);
    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) close();
    });
    document.body.appendChild(overlayEl);
    overlayEl._onClose = onClose;
    return sheet;
  }

  function close() {
    if (overlayEl) {
      overlayEl._onClose?.();
      overlayEl.remove();
      overlayEl = null;
    }
  }

  function confirm({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm }) {
    const body = Utils.el('p', { text: message, style: 'color:var(--ink-soft);font-size:14px;line-height:1.5;' });
    const cancelBtn = Utils.el('button', { class: 'btn btn-outline', text: 'Cancel', onclick: close });
    const confirmBtn = Utils.el('button', {
      class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`,
      text: confirmLabel,
      onclick: () => { close(); onConfirm(); }
    });
    open({ title, bodyNode: body, actions: [cancelBtn, confirmBtn], center: true });
  }

  return { open, close, confirm };
})();

const Icons = {
  plate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.4"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6.3 6.8.7-5.1 4.7 1.5 6.8L12 17.7 5.9 21l1.5-6.8-5.1-4.7 6.8-.7L12 2.5z"/></svg>',
  starOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2.5l2.9 6.3 6.8.7-5.1 4.7 1.5 6.8L12 17.7 5.9 21l1.5-6.8-5.1-4.7 6.8-.7L12 2.5z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/></svg>'
};

function money(n) { return Utils.formatINR(n); }

/* ===========================================================
   Onboarding
=========================================================== */
function renderOnboarding(root) {
  root.innerHTML = '';
  const screen = Utils.el('div', { class: 'onboard-screen' });
  screen.innerHTML = `
    <div class="onboard-mark" aria-hidden="true">🍲🥙</div>
    <h1>Canteen Tracker</h1>
    <p class="lede">Track your canteen spending in seconds. Everything stays on this device — no account, no sign-in.</p>
  `;
  const field = Utils.el('div', { class: 'field' });
  field.innerHTML = `<label for="onboard-name">Your name</label>`;
  const input = Utils.el('input', { type: 'text', id: 'onboard-name', placeholder: 'e.g. Rahul', autocomplete: 'name' });
  field.appendChild(input);
  screen.appendChild(field);

  const btn = Utils.el('button', { class: 'btn btn-primary btn-full', text: 'Start tracking' });
  btn.addEventListener('click', () => {
    const name = input.value.trim();
    if (!name) { Toast.show('Enter your name to continue', 'error'); input.focus(); return; }
    StorageService.bootstrapDefaults();
    AppState.setUser(name);
    AppState.state.items = StorageService.getItems();
    AppState.state.paymentMethods = StorageService.getPaymentMethods();
    AppState.state.settings = StorageService.getSettings();
    Router.navigate('/home');
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });
  screen.appendChild(btn);
  root.appendChild(screen);
  input.focus();
}

/* ===========================================================
   Home / Dashboard
=========================================================== */
function renderHome(root) {
  const { state } = AppState;
  const today = Utils.todayISO();
  const monthKeyStr = Utils.monthKey(today);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const todaySpend = Calc.calculateDailyTotal(state.expenses, today);
  const weekSpend = Calc.calculateWeeklyTotal(state.expenses, today);
  const monthSpend = Calc.calculateMonthlyTotal(state.expenses, monthKeyStr);
  const avgDay = Calc.calculateAverageDailySpend(state.expenses, monthKeyStr);

  root.innerHTML = '';

  const hero = Utils.el('div', { class: 'hero-card' });
  hero.innerHTML = `
    <div class="greeting">${greeting}, ${Utils.escapeHTML(state.user?.name || '')} 👋</div>
    <div class="hero-label">Today's spend</div>
    <div class="hero-amount num">${money(todaySpend)}</div>
  `;
  root.appendChild(hero);

  const grid = Utils.el('div', { class: 'stat-grid' });
  grid.innerHTML = `
    <div class="stat-card"><div class="stat-label">This week</div><div class="stat-value num">${money(weekSpend)}</div></div>
    <div class="stat-card"><div class="stat-label">This month</div><div class="stat-value num">${money(monthSpend)}</div></div>
    <div class="stat-card"><div class="stat-label">Avg / day</div><div class="stat-value num">${money(avgDay)}</div></div>
  `;
  root.appendChild(grid);

  const heading = Utils.el('div', { class: 'section-heading' });
  heading.innerHTML = `<h2>Recent expenses</h2>`;
  const seeAll = Utils.el('a', { href: '#/history', text: 'See all' });
  heading.appendChild(seeAll);
  root.appendChild(heading);

  const recent = [...state.expenses].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  if (recent.length === 0) {
    root.appendChild(emptyState({
      title: 'No expenses yet',
      body: 'Start tracking your canteen spending.',
      actionLabel: 'Add expense',
      onAction: () => Router.navigate('/add')
    }));
  } else {
    const list = Utils.el('div', {});
    recent.forEach(e => list.appendChild(expenseCard(e, { compact: true })));
    root.appendChild(list);
  }
}

function emptyState({ title, body, actionLabel, onAction, icon = Icons.empty }) {
  const wrap = Utils.el('div', { class: 'empty-state' });
  wrap.innerHTML = `
    <div class="empty-icon">${icon}</div>
    <h3>${Utils.escapeHTML(title)}</h3>
    <p>${Utils.escapeHTML(body)}</p>
  `;
  if (actionLabel) {
    const btn = Utils.el('button', { class: 'btn btn-primary', text: actionLabel, onclick: onAction });
    wrap.appendChild(btn);
  }
  return wrap;
}

function expenseCard(expense, { compact = false } = {}) {
  const total = Calc.calculateExpenseTotal(expense);
  const card = Utils.el('div', { class: 'expense-card' });
  const itemsStr = expense.items.map(i => `${Utils.escapeHTML(i.itemName)} ×${i.quantity}`).join(', ');
  const left = Utils.el('div', {});
  left.innerHTML = `
    <div class="expense-items">${itemsStr}</div>
    <div class="expense-meta">
      <span class="pill">${Utils.escapeHTML(expense.paymentMethod || 'Other')}</span>
      ${compact ? `<span style="font-size:12px;color:var(--muted)">${Utils.formatDateShort(expense.date)}</span>` : ''}
    </div>
    ${expense.note ? `<div style="font-size:12px;color:var(--muted);margin-top:4px;">${Utils.escapeHTML(expense.note)}</div>` : ''}
  `;
  const right = Utils.el('div', { class: 'expense-actions' });
  right.innerHTML = `<div class="expense-amount num">${money(total)}</div>`;
  if (!compact) {
    const actionsRow = Utils.el('div', { style: 'display:flex;gap:6px;' });
    const editBtn = Utils.el('button', { class: 'icon-btn', html: Icons.edit, 'aria-label': 'Edit expense' });
    editBtn.addEventListener('click', () => openEditExpense(expense));
    const delBtn = Utils.el('button', { class: 'icon-btn', html: Icons.trash, 'aria-label': 'Delete expense' });
    delBtn.addEventListener('click', () => {
      Modal.confirm({
        title: 'Delete this expense?',
        message: `${itemsStr} — ${money(total)}. This can't be undone.`,
        confirmLabel: 'Delete',
        danger: true,
        onConfirm: () => { AppState.removeExpense(expense.id); Toast.show('Expense deleted'); Router.rerender(); }
      });
    });
    actionsRow.appendChild(editBtn);
    actionsRow.appendChild(delBtn);
    right.appendChild(actionsRow);
  } else {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => Router.navigate('/history'));
  }
  card.appendChild(left);
  card.appendChild(right);
  return card;
}

function openEditExpense(expense) {
  AppState.draftLoadFromExpense(expense);
  Router.navigate('/add');
}

/* ===========================================================
   Add / Edit expense
=========================================================== */
function renderAdd(root) {
  const { state } = AppState;
  if (!state.draftExpense.date) AppState.resetDraft();
  const draft = state.draftExpense;
  const isEdit = !!draft.id;

  root.innerHTML = '';

  const dateField = Utils.el('div', { class: 'field' });
  dateField.innerHTML = `<label for="expense-date">Date</label>`;
  const dateInput = Utils.el('input', { type: 'date', id: 'expense-date', value: draft.date, max: Utils.todayISO() });
  dateInput.addEventListener('change', () => AppState.draftSetDate(dateInput.value));
  dateField.appendChild(dateInput);
  root.appendChild(dateField);

  // Cart
  if (draft.items.length > 0) {
    const cartHeading = Utils.el('div', { class: 'section-heading' });
    cartHeading.innerHTML = `<h2>Your order</h2>`;
    root.appendChild(cartHeading);

    const cartPanel = Utils.el('div', { class: 'cart-panel' });
    draft.items.forEach(line => {
      const row = Utils.el('div', { class: 'cart-line' });
      const info = Utils.el('div', {});
      info.innerHTML = `<div class="cart-name">${Utils.escapeHTML(line.itemName)}</div><div class="cart-unit num">${money(line.unitPrice)} each</div>`;
      const qtyControl = Utils.el('div', { class: 'qty-control' });
      const minusBtn = Utils.el('button', { class: 'qty-btn', html: '&minus;', 'aria-label': `Decrease ${line.itemName}` });
      minusBtn.addEventListener('click', () => AppState.draftSetQuantity(line.itemId, line.quantity - 1));
      const qtyVal = Utils.el('span', { class: 'qty-value num', text: line.quantity });
      const plusBtn = Utils.el('button', { class: 'qty-btn', html: '&plus;', 'aria-label': `Increase ${line.itemName}` });
      plusBtn.addEventListener('click', () => AppState.draftSetQuantity(line.itemId, line.quantity + 1));
      qtyControl.appendChild(minusBtn); qtyControl.appendChild(qtyVal); qtyControl.appendChild(plusBtn);
      const lineTotal = Utils.el('div', { class: 'cart-line-total num', text: money(line.unitPrice * line.quantity) });
      row.appendChild(info); row.appendChild(qtyControl); row.appendChild(lineTotal);
      cartPanel.appendChild(row);
    });
    const totalRow = Utils.el('div', { class: 'cart-total-row' });
    const total = draft.items.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    totalRow.innerHTML = `<span>Total</span><span class="num">${money(total)}</span>`;
    cartPanel.appendChild(totalRow);
    root.appendChild(cartPanel);
  }

  // Food grid: favorites first, then rest, grouped simply
  const heading = Utils.el('div', { class: 'section-heading' });
  heading.innerHTML = `<h2>${draft.items.length ? 'Add more' : 'What did you have?'}</h2>`;
  root.appendChild(heading);

  const activeItems = state.items.filter(i => i.active !== false);
  if (activeItems.length === 0) {
    root.appendChild(emptyState({
      title: 'No food items',
      body: 'Add the items and prices from your canteen.',
      actionLabel: 'Add item',
      onAction: () => openItemForm()
    }));
  } else {
    const favorites = activeItems.filter(i => i.favorite);
    const recentIds = Calc.recentItemIds(state.expenses, 6).filter(id => !favorites.some(f => f.id === id));
    const recentItems = recentIds.map(id => activeItems.find(i => i.id === id)).filter(Boolean);
    const shown = new Set([...favorites, ...recentItems].map(i => i.id));
    const rest = activeItems.filter(i => !shown.has(i.id));

    if (favorites.length) root.appendChild(foodSection('Frequently used', favorites, draft));
    if (recentItems.length) root.appendChild(foodSection('Recently used', recentItems, draft));
    root.appendChild(foodSection('All items', rest.length ? rest : (favorites.length || recentItems.length ? [] : activeItems), draft));
  }

  // Payment method
  const payHeading = Utils.el('div', { class: 'section-heading' });
  payHeading.innerHTML = `<h2>Payment method</h2>`;
  root.appendChild(payHeading);
  const chipRow = Utils.el('div', { class: 'chip-row' });
  state.paymentMethods.filter(m => m.active !== false).forEach(m => {
    const chip = Utils.el('button', { class: `chip${draft.paymentMethod === m.name ? ' selected' : ''}`, text: m.name });
    chip.addEventListener('click', () => AppState.draftSetPaymentMethod(m.name));
    chipRow.appendChild(chip);
  });
  root.appendChild(chipRow);

  // Note
  const noteField = Utils.el('div', { class: 'field', style: 'margin-top:16px;' });
  noteField.innerHTML = `<label for="expense-note">Note (optional)</label>`;
  const noteInput = Utils.el('textarea', { id: 'expense-note', placeholder: 'e.g. Extra spicy' });
  noteInput.value = draft.note || '';
  noteInput.addEventListener('input', () => AppState.draftSetNote(noteInput.value));
  noteField.appendChild(noteInput);
  root.appendChild(noteField);

  // Save
  const stickyWrap = Utils.el('div', { class: 'sticky-save' });
  const total = draft.items.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const saveBtn = Utils.el('button', {
    class: 'btn btn-primary btn-full',
    text: draft.items.length ? `Save expense — ${money(total)}` : 'Save expense'
  });
  saveBtn.disabled = draft.items.length === 0 || !draft.paymentMethod;
  saveBtn.addEventListener('click', () => {
    if (draft.items.length === 0) { Toast.show('Add at least one item', 'error'); return; }
    if (!draft.paymentMethod) { Toast.show('Choose a payment method', 'error'); return; }
    const payload = {
      id: draft.id,
      date: draft.date,
      items: draft.items.map(l => ({ itemId: l.itemId, itemName: l.itemName, quantity: l.quantity, unitPrice: l.unitPrice, total: l.unitPrice * l.quantity })),
      subtotal: total,
      total,
      paymentMethod: draft.paymentMethod,
      note: draft.note
    };
    if (isEdit) {
      AppState.editExpense(payload);
      Toast.show('Expense updated');
    } else {
      AppState.addExpense(payload);
      Toast.show(`Expense saved — ${money(total)}`);
    }
    AppState.resetDraft();
    Router.navigate('/home');
  });
  stickyWrap.appendChild(saveBtn);
  root.appendChild(stickyWrap);
}

function foodSection(label, items, draft) {
  const wrap = Utils.el('div', { style: 'margin-bottom:18px;' });
  if (items.length === 0) return wrap;
  wrap.appendChild(Utils.el('div', { style: 'font-size:12px;font-weight:700;color:var(--muted);margin-bottom:8px;', text: label }));
  const grid = Utils.el('div', { class: 'food-grid' });
  items.forEach(item => {
    const line = draft.items.find(l => l.itemId === item.id);
    const tile = Utils.el('button', { class: `food-tile${line ? ' in-cart' : ''}` });
    tile.innerHTML = `
      <div class="food-name">${Utils.escapeHTML(item.name)}</div>
      <div class="food-price num">${money(item.price)}</div>
      ${line ? `<span class="food-badge">${line.quantity}</span>` : ''}
    `;
    tile.addEventListener('click', () => AppState.draftAddItem(item));
    grid.appendChild(tile);
  });
  wrap.appendChild(grid);
  return wrap;
}

/* ===========================================================
   History
=========================================================== */
function renderHistory(root) {
  const { state } = AppState;
  root.innerHTML = '';

  if (!state.ui.historyFilters) {
    state.ui.historyFilters = { date: 'all', payment: 'all', food: 'all', search: '' };
  }
  const filters = state.ui.historyFilters;

  const searchBar = Utils.el('div', { class: 'search-bar' });
  searchBar.innerHTML = Icons.search;
  const searchInput = Utils.el('input', { type: 'text', placeholder: 'Search food or note…', value: filters.search });
  searchInput.addEventListener('input', Utils.debounce(() => {
    filters.search = searchInput.value;
    renderHistoryList(listRoot, filters);
  }, 200));
  searchBar.appendChild(searchInput);
  root.appendChild(searchBar);

  const filterRow = Utils.el('div', { class: 'filter-row' });
  const dateOptions = [['all', 'All dates'], ['today', 'Today'], ['yesterday', 'Yesterday'], ['week', 'This week'], ['month', 'This month']];
  dateOptions.forEach(([val, label]) => {
    const chip = Utils.el('button', { class: `chip${filters.date === val ? ' selected' : ''}`, text: label });
    chip.addEventListener('click', () => { filters.date = val; renderHistory(root); });
    filterRow.appendChild(chip);
  });
  root.appendChild(filterRow);

  const paymentNames = ['all', ...state.paymentMethods.map(m => m.name)];
  const paymentRow = Utils.el('div', { class: 'filter-row' });
  paymentNames.forEach(val => {
    const chip = Utils.el('button', { class: `chip${filters.payment === val ? ' selected' : ''}`, text: val === 'all' ? 'All payments' : val });
    chip.addEventListener('click', () => { filters.payment = val; renderHistory(root); });
    paymentRow.appendChild(chip);
  });
  root.appendChild(paymentRow);

  const listRoot = Utils.el('div', {});
  root.appendChild(listRoot);
  renderHistoryList(listRoot, filters);
}

function renderHistoryList(listRoot, filters) {
  const { state } = AppState;
  let expenses = [...state.expenses];

  const today = Utils.todayISO();
  if (filters.date === 'today') expenses = expenses.filter(e => e.date === today);
  else if (filters.date === 'yesterday') {
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yIso = Utils.dateToISO(y);
    expenses = expenses.filter(e => e.date === yIso);
  } else if (filters.date === 'week') {
    expenses = Calc.expensesForWeek(expenses, today);
  } else if (filters.date === 'month') {
    expenses = Calc.expensesForMonth(expenses, Utils.monthKey(today));
  }

  if (filters.payment !== 'all') expenses = expenses.filter(e => e.paymentMethod === filters.payment);

  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    expenses = expenses.filter(e =>
      e.items.some(i => i.itemName.toLowerCase().includes(q)) ||
      (e.note || '').toLowerCase().includes(q)
    );
  }

  expenses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  listRoot.innerHTML = '';
  if (expenses.length === 0) {
    listRoot.appendChild(emptyState({
      title: 'No expenses found',
      body: 'Try a different filter or search term.',
      icon: Icons.search
    }));
    return;
  }

  const byDate = {};
  expenses.forEach(e => { (byDate[e.date] = byDate[e.date] || []).push(e); });
  const dates = Object.keys(byDate).sort((a, b) => new Date(b) - new Date(a));

  dates.forEach(date => {
    const group = Utils.el('div', { class: 'day-group' });
    const dayTotal = byDate[date].reduce((s, e) => s + Calc.calculateExpenseTotal(e), 0);
    const header = Utils.el('div', { class: 'day-group-header' });
    header.innerHTML = `<span class="day-name">${Utils.formatDateLabel(date)}</span><span class="day-total num">${money(dayTotal)}</span>`;
    group.appendChild(header);
    byDate[date].forEach(e => group.appendChild(expenseCard(e)));
    listRoot.appendChild(group);
  });
}

/* ===========================================================
   Analytics
=========================================================== */
function renderAnalytics(root) {
  const { state } = AppState;
  const monthKeyStr = state.ui.currentMonth || Utils.monthKey(Utils.todayISO());
  root.innerHTML = '';

  const switcher = Utils.el('div', { class: 'month-switcher' });
  const prevBtn = Utils.el('button', { class: 'icon-btn', html: '&lsaquo;', 'aria-label': 'Previous month' });
  prevBtn.addEventListener('click', () => { AppState.setCurrentMonth(Utils.shiftMonth(monthKeyStr, -1)); Router.rerender(); });
  const nextBtn = Utils.el('button', { class: 'icon-btn', html: '&rsaquo;', 'aria-label': 'Next month' });
  const isCurrentMonth = monthKeyStr === Utils.monthKey(Utils.todayISO());
  nextBtn.disabled = isCurrentMonth;
  nextBtn.addEventListener('click', () => { AppState.setCurrentMonth(Utils.shiftMonth(monthKeyStr, 1)); Router.rerender(); });
  const label = Utils.el('span', { class: 'month-label', text: Utils.monthLabel(monthKeyStr) });
  switcher.appendChild(prevBtn); switcher.appendChild(label); switcher.appendChild(nextBtn);
  root.appendChild(switcher);

  const monthTotal = Calc.calculateMonthlyTotal(state.expenses, monthKeyStr);
  const avg = Calc.calculateAverageDailySpend(state.expenses, monthKeyStr);
  const highest = Calc.calculateHighestSpendingDay(state.expenses, monthKeyStr);
  const totalItems = Calc.calculateTotalItemQuantity(state.expenses, monthKeyStr);
  const mostPurchased = Calc.mostPurchasedItem(state.expenses, monthKeyStr);

  const grid = Utils.el('div', { class: 'stat-grid' });
  grid.innerHTML = `
    <div class="stat-card"><div class="stat-label">Monthly spend</div><div class="stat-value num">${money(monthTotal)}</div></div>
    <div class="stat-card"><div class="stat-label">Avg / day</div><div class="stat-value num">${money(avg)}</div></div>
    <div class="stat-card"><div class="stat-label">Highest day</div><div class="stat-value num">${money(highest.total)}</div></div>
    <div class="stat-card"><div class="stat-label">Items bought</div><div class="stat-value num">${totalItems}</div></div>
  `;
  root.appendChild(grid);

  if (mostPurchased) {
    const mp = Utils.el('div', { class: 'card', style: 'margin-top:14px;' });
    mp.innerHTML = `<div class="stat-label">Most purchased item</div><div class="stat-value" style="margin-top:4px;">${Utils.escapeHTML(mostPurchased[0])} <span style="color:var(--muted);font-weight:600;font-size:13px;">×${mostPurchased[1].qty}</span></div>`;
    root.appendChild(mp);
  }

  const payHeading = Utils.el('div', { class: 'section-heading' });
  payHeading.innerHTML = `<h2>Payment breakdown</h2>`;
  root.appendChild(payHeading);
  const payBreakdown = Calc.paymentBreakdown(state.expenses, monthKeyStr);
  root.appendChild(breakdownList(payBreakdown, monthTotal));

  const foodHeading = Utils.el('div', { class: 'section-heading' });
  foodHeading.innerHTML = `<h2>Food breakdown</h2>`;
  root.appendChild(foodHeading);
  const foodBreakdown = Calc.foodBreakdown(state.expenses, monthKeyStr).map(([name, v]) => [name, v.total]);
  root.appendChild(breakdownList(foodBreakdown, monthTotal));

  if (monthTotal === 0) {
    root.appendChild(emptyState({
      title: 'Nothing tracked yet',
      body: 'Analytics will appear once you log expenses this month.',
      actionLabel: 'Add expense',
      onAction: () => Router.navigate('/add')
    }));
  }
}

function breakdownList(entries, total) {
  const card = Utils.el('div', { class: 'card' });
  if (entries.length === 0) {
    card.innerHTML = `<p style="color:var(--muted);font-size:13px;">Nothing yet this month.</p>`;
    return card;
  }
  entries.forEach(([name, amount]) => {
    const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
    const row = Utils.el('div', { class: 'breakdown-row' });
    row.innerHTML = `
      <span class="breakdown-name">${Utils.escapeHTML(name)}</span>
      <span class="breakdown-bar-track"><span class="breakdown-bar-fill" style="width:${pct}%"></span></span>
      <span class="breakdown-value num">${money(amount)}</span>
    `;
    card.appendChild(row);
  });
  return card;
}

/* ===========================================================
   Settings
=========================================================== */
function renderSettings(root) {
  const { state } = AppState;
  root.innerHTML = '';

  // Profile
  root.appendChild(settingsGroup('Profile', [
    listRow({
      title: state.user?.name || 'Set your name',
      sub: 'Tap to edit',
      onClick: () => openNameEdit()
    })
  ]));

  // Canteen items
  const itemRows = state.items.map(item => {
    const row = Utils.el('div', { class: `list-row${item.active === false ? ' inactive' : ''}` });
    const main = Utils.el('div', { class: 'row-main' });
    const starBtn = Utils.el('button', { class: `icon-btn star-btn${item.favorite ? '' : ' off'}`, html: item.favorite ? Icons.star : Icons.starOff, 'aria-label': 'Toggle favorite' });
    starBtn.addEventListener('click', () => AppState.toggleFavorite(item.id));
    const text = Utils.el('div', {});
    text.innerHTML = `<div class="row-title">${Utils.escapeHTML(item.name)}</div><div class="row-sub num">${money(item.price)} · ${Utils.escapeHTML(item.category)}</div>`;
    main.appendChild(starBtn); main.appendChild(text);
    const actions = Utils.el('div', { class: 'row-actions' });
    const editBtn = Utils.el('button', { class: 'icon-btn', html: Icons.edit, 'aria-label': `Edit ${item.name}` });
    editBtn.addEventListener('click', () => openItemForm(item));
    const delBtn = Utils.el('button', { class: 'icon-btn', html: Icons.trash, 'aria-label': `Delete ${item.name}` });
    delBtn.addEventListener('click', () => {
      Modal.confirm({
        title: 'Delete this item?',
        message: `"${item.name}" will be removed from your item list. Past expenses keep their recorded price.`,
        confirmLabel: 'Delete', danger: true,
        onConfirm: () => { AppState.removeItem(item.id); Toast.show('Item deleted'); Router.rerender(); }
      });
    });
    actions.appendChild(editBtn); actions.appendChild(delBtn);
    row.appendChild(main); row.appendChild(actions);
    return row;
  });
  const canteenGroup = settingsGroup('Canteen items', itemRows.length ? itemRows : [emptyRow('No items yet')]);
  const addItemBtn = Utils.el('button', { class: 'btn btn-secondary btn-sm', text: '+ Add item', style: 'margin-top:10px;' });
  addItemBtn.addEventListener('click', () => openItemForm());
  canteenGroup.appendChild(addItemBtn);
  root.appendChild(canteenGroup);

  // Payment methods
  const pmRows = state.paymentMethods.map(pm => {
    const row = Utils.el('div', { class: 'list-row' });
    row.innerHTML = `<div class="row-title">${Utils.escapeHTML(pm.name)}</div>`;
    const delBtn = Utils.el('button', { class: 'icon-btn', html: Icons.trash, 'aria-label': `Remove ${pm.name}` });
    delBtn.addEventListener('click', () => {
      Modal.confirm({
        title: 'Remove payment method?',
        message: `"${pm.name}" will no longer appear when adding expenses.`,
        confirmLabel: 'Remove', danger: true,
        onConfirm: () => { AppState.removePaymentMethod(pm.id); Toast.show('Payment method removed'); Router.rerender(); }
      });
    });
    row.appendChild(delBtn);
    return row;
  });
  const pmGroup = settingsGroup('Payment methods', pmRows.length ? pmRows : [emptyRow('No payment methods')]);
  const addPmBtn = Utils.el('button', { class: 'btn btn-secondary btn-sm', text: '+ Add payment method', style: 'margin-top:10px;' });
  addPmBtn.addEventListener('click', () => openPaymentMethodForm());
  pmGroup.appendChild(addPmBtn);
  root.appendChild(pmGroup);

  // Appearance
  const themeRow = Utils.el('div', { class: 'chip-row' });
  [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']].forEach(([val, label]) => {
    const chip = Utils.el('button', { class: `chip${state.settings.theme === val ? ' selected' : ''}`, text: label });
    chip.addEventListener('click', () => { AppState.updateSettings({ theme: val }); applyTheme(val); Router.rerender(); });
    themeRow.appendChild(chip);
  });
  const appearanceGroup = settingsGroup('Appearance', [themeRow]);
  root.appendChild(appearanceGroup);

  // Data — backup & restore (this app has no cloud sync, so this is the only way to move or protect data)
  const lastBackup = state.settings.lastBackupAt;
  const backupNote = Utils.el('p', {
    style: 'font-size:12px;color:var(--muted);margin:0 0 12px;',
    text: lastBackup
      ? `Last backup: ${new Date(lastBackup).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`
      : 'No backup yet — back up regularly so you never lose your history.'
  });
  const exportBtn = Utils.el('button', { class: 'btn btn-primary btn-full', text: '⬇ Back up data', style: 'margin-bottom:10px;' });
  exportBtn.addEventListener('click', exportDataFile);
  const importLabel = Utils.el('label', { class: 'btn btn-outline btn-full', text: '⬆ Restore from backup', style: 'margin-bottom:10px;display:flex;' });
  const importInput = Utils.el('input', { type: 'file', accept: 'application/json', style: 'display:none;' });
  importInput.addEventListener('change', handleImportFile);
  importLabel.appendChild(importInput);
  const clearBtn = Utils.el('button', { class: 'btn btn-danger btn-full', text: 'Clear all data' });
  clearBtn.addEventListener('click', () => {
    Modal.confirm({
      title: 'Delete all canteen data from this device?',
      message: 'This removes your profile, items, expenses and settings. This cannot be undone.',
      confirmLabel: 'Delete everything', danger: true,
      onConfirm: () => {
        StorageService.clearAllData();
        AppState.load();
        Toast.show('All data cleared');
        Router.navigate('/onboarding');
      }
    });
  });
  const dataGroup = settingsGroup('Backup & restore', [backupNote, exportBtn, importLabel, clearBtn]);
  root.appendChild(dataGroup);

  // About
  const about = Utils.el('div', { class: 'settings-group' });
  about.innerHTML = `
    <div class="settings-group-title">About</div>
    <div class="card">
      <p style="font-size:13px;color:var(--ink-soft);line-height:1.6;">
        Canteen Tracker v1.0<br>
        Your canteen data is stored locally on this device's browser. It does not sync to the cloud or between devices — use Export regularly to back it up.
      </p>
    </div>
  `;
  root.appendChild(about);
}

function settingsGroup(title, rows) {
  const wrap = Utils.el('div', { class: 'settings-group' });
  wrap.appendChild(Utils.el('div', { class: 'settings-group-title', text: title }));
  const card = Utils.el('div', { class: 'card' });
  rows.forEach(r => card.appendChild(r));
  wrap.appendChild(card);
  return wrap;
}

function listRow({ title, sub, onClick }) {
  const row = Utils.el('div', { class: 'list-row', style: onClick ? 'cursor:pointer;' : '' });
  row.innerHTML = `<div><div class="row-title">${Utils.escapeHTML(title)}</div>${sub ? `<div class="row-sub">${Utils.escapeHTML(sub)}</div>` : ''}</div>`;
  if (onClick) row.addEventListener('click', onClick);
  return row;
}

function emptyRow(text) {
  return Utils.el('div', { class: 'list-row', text, style: 'color:var(--muted);font-size:13px;' });
}

function openNameEdit() {
  const input = Utils.el('input', { type: 'text', value: AppState.state.user?.name || '' });
  const field = Utils.el('div', { class: 'field' });
  field.innerHTML = `<label>Your name</label>`;
  field.appendChild(input);
  const saveBtn = Utils.el('button', {
    class: 'btn btn-primary btn-full', text: 'Save',
    onclick: () => {
      const name = input.value.trim();
      if (!name) { Toast.show('Name cannot be empty', 'error'); return; }
      AppState.setUser(name);
      Modal.close();
      Toast.show('Name updated');
      Router.rerender();
    }
  });
  Modal.open({ title: 'Edit name', bodyNode: field, actions: [saveBtn], center: true });
  input.focus();
}

function openItemForm(item = null) {
  const wrap = Utils.el('div', {});
  const nameField = Utils.el('div', { class: 'field' });
  nameField.innerHTML = `<label>Item name</label>`;
  const nameInput = Utils.el('input', { type: 'text', value: item?.name || '', placeholder: 'e.g. Dal Rice' });
  nameField.appendChild(nameInput);
  const priceField = Utils.el('div', { class: 'field' });
  priceField.innerHTML = `<label>Price (₹)</label>`;
  const priceInput = Utils.el('input', { type: 'number', min: '0', step: '1', value: item?.price ?? '', placeholder: 'e.g. 60' });
  priceField.appendChild(priceInput);
  const catField = Utils.el('div', { class: 'field' });
  catField.innerHTML = `<label>Category</label>`;
  const catSelect = Utils.el('select', {});
  ['Breakfast', 'Lunch', 'Snacks', 'Beverages', 'Dinner', 'Other'].forEach(c => {
    const opt = Utils.el('option', { value: c, text: c });
    if (item?.category === c) opt.selected = true;
    catSelect.appendChild(opt);
  });
  catField.appendChild(catSelect);
  wrap.appendChild(nameField); wrap.appendChild(priceField); wrap.appendChild(catField);

  const saveBtn = Utils.el('button', {
    class: 'btn btn-primary btn-full', text: item ? 'Save changes' : 'Add item',
    onclick: () => {
      const name = nameInput.value.trim();
      const price = Number(priceInput.value);
      if (!name) { Toast.show('Enter an item name', 'error'); return; }
      if (!Number.isFinite(price) || price < 0) { Toast.show('Enter a valid price', 'error'); return; }
      if (item) {
        AppState.editItem({ ...item, name, price, category: catSelect.value });
        Toast.show('Item updated');
      } else {
        AppState.addItem({ name, price, category: catSelect.value, active: true, favorite: false });
        Toast.show('Item added');
      }
      Modal.close();
      Router.rerender();
    }
  });
  Modal.open({ title: item ? 'Edit item' : 'Add item', bodyNode: wrap, actions: [saveBtn], center: true });
  nameInput.focus();
}

function openPaymentMethodForm() {
  const field = Utils.el('div', { class: 'field' });
  field.innerHTML = `<label>Payment method name</label>`;
  const input = Utils.el('input', { type: 'text', placeholder: 'e.g. Wallet' });
  field.appendChild(input);
  const saveBtn = Utils.el('button', {
    class: 'btn btn-primary btn-full', text: 'Add',
    onclick: () => {
      const name = input.value.trim();
      if (!name) { Toast.show('Enter a name', 'error'); return; }
      AppState.addPaymentMethod(name);
      Modal.close();
      Toast.show('Payment method added');
      Router.rerender();
    }
  });
  Modal.open({ title: 'Add payment method', bodyNode: field, actions: [saveBtn], center: true });
  input.focus();
}

function exportDataFile() {
  const data = StorageService.exportData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'canteen-tracker-backup.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  AppState.updateSettings({ lastBackupAt: new Date().toISOString() });
  Toast.show('Backup saved to your downloads');
}

function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let parsed;
    try {
      parsed = JSON.parse(reader.result);
    } catch {
      Toast.show('That file is not valid JSON', 'error');
      e.target.value = '';
      return;
    }
    const err = StorageService.validateImport(parsed);
    if (err) {
      Toast.show(err, 'error');
      e.target.value = '';
      return;
    }
    Modal.confirm({
      title: 'Replace current data?',
      message: 'This will replace the current data on this device with the contents of the backup file.',
      confirmLabel: 'Replace data', danger: true,
      onConfirm: () => {
        const result = StorageService.importData(parsed);
        if (result.ok) {
          AppState.load();
          Toast.show('Data imported successfully');
          Router.navigate('/home');
        } else {
          Toast.show(result.error, 'error');
        }
      }
    });
    e.target.value = '';
  };
  reader.readAsText(file);
}

function applyTheme(theme) {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
}
