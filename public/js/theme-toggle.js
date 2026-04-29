(function () {
  var STORAGE_KEY = 'intellistock_dark_mode';
  var ICON_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"></path></svg>';
  var ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><line x1="12" y1="2" x2="12" y2="4"></line><line x1="12" y1="20" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"></line><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="4" y2="12"></line><line x1="20" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="6.34" y2="17.66"></line><line x1="17.66" y1="6.34" x2="19.07" y2="4.93"></line></svg>';

  function readPreference() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function savePreference(isDark) {
    try {
      localStorage.setItem(STORAGE_KEY, isDark ? '1' : '0');
    } catch (_) {
      // Ignore storage restrictions in private mode.
    }
  }

  function applyTheme(isDark) {
    if (!document.body) return;
    document.body.classList.toggle('dark-mode', isDark);

    var toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-pressed', String(isDark));
      toggleBtn.setAttribute('title', isDark ? 'Ativar modo claro' : 'Ativar modo noturno');

      var label = toggleBtn.querySelector('.theme-label');
      if (label) label.textContent = isDark ? 'Claro' : 'Noturno';

      var icon = toggleBtn.querySelector('.theme-icon');
      if (icon) icon.innerHTML = isDark ? ICON_SUN : ICON_MOON;
    }
  }

  function getProfileControl() {
    return (
      document.getElementById('userMenuTrigger') ||
      document.getElementById('userChip') ||
      document.querySelector('.user-area .user-chip') ||
      document.querySelector('#userArea .user-pill') ||
      document.querySelector('.user-pill')
    );
  }

  function createToggleButton() {
    if (document.getElementById('themeToggleBtn')) return;

    var profileControl = getProfileControl();
    if (!profileControl || !profileControl.parentElement) return;

    var button = document.createElement('button');
    button.id = 'themeToggleBtn';
    button.className = 'theme-toggle-btn';
    button.type = 'button';
    button.setAttribute('aria-label', 'Alternar modo noturno');
    button.innerHTML = '<span class="theme-icon" aria-hidden="true">' + ICON_MOON + '</span><span class="theme-label">Noturno</span>';

    profileControl.insertAdjacentElement('afterend', button);

    button.addEventListener('click', function () {
      var isDark = !document.body.classList.contains('dark-mode');
      applyTheme(isDark);
      savePreference(isDark);
    });
  }

  function init() {
    createToggleButton();
    applyTheme(readPreference());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
