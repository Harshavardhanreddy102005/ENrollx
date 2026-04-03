// ========================================
// EnrollX – Theme Toggle (Dark/Light Mode)
// ========================================

(function() {
  const THEME_KEY = 'enrollx-theme';
  
  function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'light';
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    updateToggleIcons(theme);
  }

  function updateToggleIcons(theme) {
    const toggles = document.querySelectorAll('.theme-toggle, .theme-toggle-sidebar');
    toggles.forEach(btn => {
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
      }
    });
  }

  function toggleTheme() {
    const current = getTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }

  // Initialize on load
  document.addEventListener('DOMContentLoaded', () => {
    setTheme(getTheme());

    // Bind click events
    document.querySelectorAll('.theme-toggle, .theme-toggle-sidebar').forEach(btn => {
      btn.addEventListener('click', toggleTheme);
    });
  });

  // Set theme immediately to prevent flash
  setTheme(getTheme());
})();
