/* calculations.js — all derived numbers come from here; screens never compute totals themselves. */

const Calc = (() => {

  function calculateExpenseTotal(expense) {
    return (expense.items || []).reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);
  }

  function expensesForDate(expenses, iso) {
    return expenses.filter(e => e.date === iso);
  }

  function expensesForMonth(expenses, monthKeyStr) {
    return expenses.filter(e => Utils.monthKey(e.date) === monthKeyStr);
  }

  function expensesForWeek(expenses, iso) {
    const start = Utils.isoToDate(Utils.startOfWeekISO(iso));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return expenses.filter(e => {
      const d = Utils.isoToDate(e.date);
      return d >= start && d <= end;
    });
  }

  function calculateDailyTotal(expenses, iso) {
    return expensesForDate(expenses, iso).reduce((s, e) => s + calculateExpenseTotal(e), 0);
  }

  function calculateWeeklyTotal(expenses, iso) {
    return expensesForWeek(expenses, iso).reduce((s, e) => s + calculateExpenseTotal(e), 0);
  }

  function calculateMonthlyTotal(expenses, monthKeyStr) {
    return expensesForMonth(expenses, monthKeyStr).reduce((s, e) => s + calculateExpenseTotal(e), 0);
  }

  function daysTrackedInMonth(expenses, monthKeyStr) {
    const dates = new Set(expensesForMonth(expenses, monthKeyStr).map(e => e.date));
    return dates.size;
  }

  function calculateAverageDailySpend(expenses, monthKeyStr) {
    const days = daysTrackedInMonth(expenses, monthKeyStr);
    if (days === 0) return 0;
    return calculateMonthlyTotal(expenses, monthKeyStr) / days;
  }

  function calculatePaymentMethodTotal(expenses, method, monthKeyStr) {
    return expensesForMonth(expenses, monthKeyStr)
      .filter(e => e.paymentMethod === method)
      .reduce((s, e) => s + calculateExpenseTotal(e), 0);
  }

  function paymentBreakdown(expenses, monthKeyStr) {
    const monthExpenses = expensesForMonth(expenses, monthKeyStr);
    const map = {};
    monthExpenses.forEach(e => {
      const m = e.paymentMethod || 'Other';
      map[m] = (map[m] || 0) + calculateExpenseTotal(e);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }

  function calculateItemTotal(expenses, itemId, monthKeyStr) {
    return expensesForMonth(expenses, monthKeyStr).reduce((sum, e) => {
      const line = e.items.find(i => i.itemId === itemId);
      return sum + (line ? line.unitPrice * line.quantity : 0);
    }, 0);
  }

  function foodBreakdown(expenses, monthKeyStr) {
    const monthExpenses = expensesForMonth(expenses, monthKeyStr);
    const map = {};
    monthExpenses.forEach(e => {
      e.items.forEach(i => {
        if (!map[i.itemName]) map[i.itemName] = { total: 0, qty: 0 };
        map[i.itemName].total += i.unitPrice * i.quantity;
        map[i.itemName].qty += i.quantity;
      });
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }

  function calculateHighestSpendingDay(expenses, monthKeyStr) {
    const monthExpenses = expensesForMonth(expenses, monthKeyStr);
    const byDate = {};
    monthExpenses.forEach(e => {
      byDate[e.date] = (byDate[e.date] || 0) + calculateExpenseTotal(e);
    });
    let max = 0, maxDate = null;
    for (const [date, total] of Object.entries(byDate)) {
      if (total > max) { max = total; maxDate = date; }
    }
    return { date: maxDate, total: max };
  }

  function calculateTotalItemQuantity(expenses, monthKeyStr) {
    return expensesForMonth(expenses, monthKeyStr)
      .reduce((sum, e) => sum + e.items.reduce((s, i) => s + i.quantity, 0), 0);
  }

  function mostPurchasedItem(expenses, monthKeyStr) {
    const breakdown = foodBreakdown(expenses, monthKeyStr);
    if (breakdown.length === 0) return null;
    return breakdown.reduce((max, cur) => (cur[1].qty > max[1].qty ? cur : max), breakdown[0]);
  }

  function recentItemIds(expenses, limit = 6) {
    const sorted = [...expenses].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const seen = [];
    for (const e of sorted) {
      for (const i of e.items) {
        if (!seen.includes(i.itemId)) seen.push(i.itemId);
        if (seen.length >= limit) return seen;
      }
    }
    return seen;
  }

  function dailySeriesForMonth(expenses, monthKeyStr) {
    const [y, m] = monthKeyStr.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const series = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      series.push({ date: iso, total: calculateDailyTotal(expenses, iso) });
    }
    return series;
  }

  return {
    calculateExpenseTotal, expensesForDate, expensesForMonth, expensesForWeek,
    calculateDailyTotal, calculateWeeklyTotal, calculateMonthlyTotal,
    daysTrackedInMonth, calculateAverageDailySpend,
    calculatePaymentMethodTotal, paymentBreakdown,
    calculateItemTotal, foodBreakdown, calculateHighestSpendingDay,
    calculateTotalItemQuantity, mostPurchasedItem, recentItemIds, dailySeriesForMonth
  };
})();
