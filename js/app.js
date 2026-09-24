/* app.js — bootstraps the application */

(function init() {
  if (!StorageService.isAvailable()) {
    document.getElementById('view-root').innerHTML =
      '<div class="empty-state"><h3>Storage unavailable</h3><p>This browser is blocking local storage (private/incognito mode can do this). Canteen Tracker needs it to save your data.</p></div>';
    return;
  }

  AppState.load();
  StorageService.ensureCreditPaymentMethod();
  AppState.state.paymentMethods = StorageService.getPaymentMethods();
  AppState.resetDraft();
  applyTheme(AppState.state.settings.theme || 'system');

  document.getElementById('header-settings-btn').addEventListener('click', () => Router.navigate('/settings'));

  // The "+" / "Add expense" nav links always start a fresh entry, even if
  // the last visit to /add was for editing an existing expense.
  document.querySelectorAll('[data-route="/add"]').forEach((link) => {
    link.addEventListener('click', () => AppState.resetDraft());
  });

  Router.init();

  // Any state change (tapping a food item, changing quantity, saving, etc.)
  // re-renders whatever screen is currently on view. Registered AFTER the
  // first render so it never fires during initial load.
  AppState.subscribe(() => Router.rerender());

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const base = window.location.pathname.replace(/[^/]*$/, '');
      navigator.serviceWorker.register(`${base}service-worker.js`).catch(err => {
        console.warn('Service worker registration failed', err);
      });
    });
  }
})();
