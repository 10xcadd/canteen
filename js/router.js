/* router.js — simple hash router. No server-side routing needed, so it works unmodified on GitHub Pages. */

const Router = (() => {
  const routes = {
    '/onboarding': { render: renderOnboarding, title: 'Welcome', bare: true },
    '/home': { render: renderHome, title: 'Canteen Tracker' },
    '/add': { render: renderAdd, title: 'Add expense' },
    '/history': { render: renderHistory, title: 'History' },
    '/analytics': { render: renderAnalytics, title: 'Analytics' },
    '/credit': { render: renderCredit, title: 'Canteen credit' },
    '/settings': { render: renderSettings, title: 'Settings' }
  };

  let current = '/home';

  function parseHash() {
    const hash = window.location.hash.replace(/^#/, '');
    return routes[hash] ? hash : null;
  }

  function navigate(path) {
    if (window.location.hash === `#${path}`) {
      render(path);
    } else {
      window.location.hash = path;
    }
  }

  function rerender() {
    render(current);
  }

  function render(path) {
    if (!AppState.state.user && path !== '/onboarding') {
      path = '/onboarding';
      window.location.hash = '/onboarding';
    }
    if (AppState.state.user && path === '/onboarding') {
      path = '/home';
      window.location.hash = '/home';
    }
    current = path;
    const route = routes[path] || routes['/home'];
    const root = document.getElementById('view-root');
    const appEl = document.getElementById('app');

    appEl.classList.toggle('is-onboarding', !!route.bare);
    document.getElementById('bottom-nav').style.display = route.bare ? 'none' : '';
    document.getElementById('sidebar').style.display = route.bare ? 'none' : '';
    document.getElementById('header-title').textContent = route.title;
    document.querySelector('.app-header').style.display = route.bare ? 'none' : '';

    document.querySelectorAll('[data-route]').forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-route') === path);
    });

    route.render(root);
    window.scrollTo(0, 0);
  }

  function onHashChange() {
    const path = parseHash() || (AppState.state.user ? '/home' : '/onboarding');
    render(path);
  }

  function init() {
    window.addEventListener('hashchange', onHashChange);
    const initial = parseHash() || (AppState.state.user ? '/home' : '/onboarding');
    render(initial);
  }

  return { init, navigate, rerender };
})();
