(function () {
  const MODE_KEY = 'auth_mode';
  const DEFAULT_MODE = 'mock';

  function getMode() {
    const saved = localStorage.getItem(MODE_KEY);
    return saved === 'api' ? 'api' : DEFAULT_MODE;
  }

  function setMode(mode) {
    const safeMode = mode === 'api' ? 'api' : 'mock';
    localStorage.setItem(MODE_KEY, safeMode);
  }

  function makeToken() {
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  }

  function makeCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  async function apiLogin(payload) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return data;
  }

  async function apiVerify(payload) {
    const response = await fetch('/api/auth/verificar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return data;
  }

  async function mockLogin(payload) {
    const email = String(payload.email || '').trim().toLowerCase();
    const senha = String(payload.senha || '');

    if (!email || !senha) {
      return { success: false, message: 'E-mail e senha são obrigatórios.' };
    }

    // Credencial de demonstração para trabalho de frontend
    if (email !== 'cliente@intellistock.com' || senha !== '123456') {
      return { success: false, message: 'Credenciais inválidas (mock). Use cliente@intellistock.com / 123456.' };
    }

    const tokenTemp = makeToken();
    const codigo = makeCode();
    const expiraEm = Date.now() + 10 * 60 * 1000;

    sessionStorage.setItem('mock_2fa_pending', JSON.stringify({
      token_temp: tokenTemp,
      codigo,
      expiraEm,
      usuario: {
        id: 1,
        nome: 'Cliente Demo',
        email
      }
    }));

    return {
      success: true,
      token_temp: tokenTemp,
      nome: 'Cliente Demo',
      codigo_demo: codigo
    };
  }

  async function mockVerify(payload) {
    const tokenTemp = String(payload.token_temp || '');
    const codigo = String(payload.codigo || '').trim();

    const pendingRaw = sessionStorage.getItem('mock_2fa_pending');
    if (!pendingRaw) {
      return { success: false, message: 'Sessão inválida. Faça login novamente.' };
    }

    const pending = JSON.parse(pendingRaw);

    if (pending.token_temp !== tokenTemp) {
      return { success: false, message: 'Token inválido. Faça login novamente.' };
    }

    if (Date.now() > pending.expiraEm) {
      return { success: false, message: 'Código expirado. Faça login novamente.' };
    }

    if (pending.codigo !== codigo) {
      return { success: false, message: 'Código incorreto.' };
    }

    sessionStorage.removeItem('mock_2fa_pending');
    return { success: true, usuario: pending.usuario };
  }

  async function login(payload) {
    return getMode() === 'api' ? apiLogin(payload) : mockLogin(payload);
  }

  async function verify(payload) {
    return getMode() === 'api' ? apiVerify(payload) : mockVerify(payload);
  }

  window.AuthService = {
    getMode,
    setMode,
    login,
    verify
  };
})();
