(function () {
  const MODE_KEY = 'auth_mode';
  const DEFAULT_MODE = 'api';
  const MOCK_USERS_KEY = 'mock_auth_users_v1';
  const USER_KEY = 'is_usuario';
  const TOKEN_KEY = 'is_session_token';
  const TWO_FA_KEY = 'is_2fa_session';
  const REMEMBER_KEY = 'is_remember_me';

  const defaultMockUsers = [
    {
      id: 1,
      nome: 'Usuário Demo',
      email: 'demo@intellistock.com',
      senha: '123456'
    }
  ];

  function safeParse(raw) {
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function isRememberEnabled() {
    return localStorage.getItem(REMEMBER_KEY) === '1';
  }

  function setRememberEnabled(enabled) {
    localStorage.setItem(REMEMBER_KEY, enabled ? '1' : '0');
  }

  function getCurrentUser() {
    const sessionUser = safeParse(sessionStorage.getItem(USER_KEY) || 'null');
    if (sessionUser) return sessionUser;
    return safeParse(localStorage.getItem(USER_KEY) || 'null');
  }

  function getSessionToken() {
    const sessionToken = sessionStorage.getItem(TOKEN_KEY);
    if (sessionToken) return sessionToken;
    return localStorage.getItem(TOKEN_KEY);
  }

  function get2FASession() {
    const session2fa = safeParse(sessionStorage.getItem(TWO_FA_KEY) || 'null');
    if (session2fa) return session2fa;
    return safeParse(localStorage.getItem(TWO_FA_KEY) || 'null');
  }

  function hydrateAuthState() {
    if (!isRememberEnabled()) return;

    const persistedUser = localStorage.getItem(USER_KEY);
    const persistedToken = localStorage.getItem(TOKEN_KEY);
    const persisted2fa = localStorage.getItem(TWO_FA_KEY);

    if (!sessionStorage.getItem(USER_KEY) && persistedUser) {
      sessionStorage.setItem(USER_KEY, persistedUser);
    }

    if (!sessionStorage.getItem(TOKEN_KEY) && persistedToken) {
      sessionStorage.setItem(TOKEN_KEY, persistedToken);
    }

    if (!sessionStorage.getItem(TWO_FA_KEY) && persisted2fa) {
      sessionStorage.setItem(TWO_FA_KEY, persisted2fa);
    }
  }

  function clear2FASession() {
    sessionStorage.removeItem(TWO_FA_KEY);
    localStorage.removeItem(TWO_FA_KEY);
  }

  function save2FASession(sessionData, remember) {
    const safeSession = {
      ...sessionData,
      remember: remember === true
    };

    sessionStorage.setItem(TWO_FA_KEY, JSON.stringify(safeSession));
    setRememberEnabled(remember === true);

    if (remember === true) {
      localStorage.setItem(TWO_FA_KEY, JSON.stringify(safeSession));
    } else {
      localStorage.removeItem(TWO_FA_KEY);
    }
  }

  function saveAuthSession(usuario, sessionToken, remember) {
    sessionStorage.setItem(USER_KEY, JSON.stringify(usuario));
    if (sessionToken) {
      sessionStorage.setItem(TOKEN_KEY, sessionToken);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }

    setRememberEnabled(remember === true);

    if (remember === true) {
      localStorage.setItem(USER_KEY, JSON.stringify(usuario));
      if (sessionToken) {
        localStorage.setItem(TOKEN_KEY, sessionToken);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } else {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }

    clear2FASession();
  }

  function clearAuthState() {
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TWO_FA_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TWO_FA_KEY);
    localStorage.removeItem(REMEMBER_KEY);
  }

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

  async function apiRegister(payload) {
    const response = await fetch('/api/auth/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return data;
  }

  async function apiSolicitarReset(payload) {
    const response = await fetch('/api/auth/solicitar-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return response.json();
  }

  async function apiRedefinirSenha(payload) {
    const response = await fetch('/api/auth/redefinir-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return response.json();
  }

  function readMockUsers() {
    try {
      const saved = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || 'null');
      if (Array.isArray(saved) && saved.length) {
        return saved;
      }
    } catch (_) {}

    return defaultMockUsers.map((user) => ({ ...user }));
  }

  function writeMockUsers(users) {
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
  }

  function nextMockUserId(users) {
    return users.reduce((maxId, user) => Math.max(maxId, Number(user.id) || 0), 0) + 1;
  }

  function createMockChallenge(usuario) {
    const tokenTemp = makeToken();
    const codigo = makeCode();
    const expiraEm = Date.now() + 10 * 60 * 1000;

    sessionStorage.setItem('mock_2fa_pending', JSON.stringify({
      token_temp: tokenTemp,
      codigo,
      expiraEm,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
      }
    }));

    return {
      success: true,
      token_temp: tokenTemp,
      nome: usuario.nome,
      email_enviado: false,
      codigo_demo: codigo
    };
  }

  async function mockLogin(payload) {
    const email = String(payload.email || '').trim().toLowerCase();
    const senha = String(payload.senha || '');

    if (!email || !senha) {
      return { success: false, message: 'E-mail e senha são obrigatórios.' };
    }

    const users = readMockUsers();
    const usuario = users.find((user) => user.email === email);

    if (!usuario || usuario.senha !== senha) {
      return { success: false, message: 'Credenciais inválidas (mock).' };
    }

    return createMockChallenge(usuario);
  }

  async function mockRegister(payload) {
    const nome = String(payload.nome || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const senha = String(payload.senha || '');

    if (nome.length < 3) {
      return { success: false, message: 'Informe um nome com pelo menos 3 caracteres.' };
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return { success: false, message: 'Informe um e-mail válido.' };
    }

    if (senha.length < 6) {
      return { success: false, message: 'A senha precisa ter pelo menos 6 caracteres.' };
    }

    const users = readMockUsers();
    if (users.some((user) => user.email === email)) {
      return { success: false, message: 'Já existe uma conta cadastrada com este e-mail.' };
    }

    const usuario = {
      id: nextMockUserId(users),
      nome,
      email,
      senha
    };

    users.push(usuario);
    writeMockUsers(users);

    return {
      success: true,
      message: 'Cadastro realizado com sucesso. Faça login com seu e-mail e senha.'
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

  async function mockSolicitarReset(payload) {
    const email = String(payload.email || '').trim().toLowerCase();
    if (!/\S+@\S+\.\S+/.test(email)) {
      return { success: false, message: 'Informe um e-mail válido.' };
    }
    const token = makeToken();
    sessionStorage.setItem('mock_reset_token', token);
    
    // Simulate email send
    console.log(`[MOCK EMAIL] Acesse para resetar a senha: http://localhost:3001/redefinir-senha.html?token=${token}`);
    
    return { success: true, message: 'Se este e-mail for válido, você receberá as instruções. (MOCK: Veja o console)' };
  }

  async function mockRedefinirSenha(payload) {
    const token = String(payload.token || '').trim();
    const senha = String(payload.senha || '');

    if (!token) return { success: false, message: 'Token inválido.' };
    if (senha.length < 6) return { success: false, message: 'A nova senha precisa ter pelo menos 6 caracteres.' };

    const expectedToken = sessionStorage.getItem('mock_reset_token');
    if (!expectedToken || token !== expectedToken) {
      return { success: false, message: 'Link inválido ou já utilizado.' };
    }

    sessionStorage.removeItem('mock_reset_token');
    return { success: true, message: 'Senha redefinida com sucesso. Faça login com sua nova senha. (Modo MOCK não salva permanentemente, mas simula sucesso)' };
  }

  async function login(payload) {
    return getMode() === 'api' ? apiLogin(payload) : mockLogin(payload);
  }

  async function register(payload) {
    return getMode() === 'api' ? apiRegister(payload) : mockRegister(payload);
  }

  async function verify(payload) {
    return getMode() === 'api' ? apiVerify(payload) : mockVerify(payload);
  }

  async function solicitarReset(payload) {
    return getMode() === 'api' ? apiSolicitarReset(payload) : mockSolicitarReset(payload);
  }

  async function redefinirSenha(payload) {
    return getMode() === 'api' ? apiRedefinirSenha(payload) : mockRedefinirSenha(payload);
  }

  hydrateAuthState();

  window.AuthService = {
    getMode,
    setMode,
    login,
    register,
    verify,
    solicitarReset,
    redefinirSenha,
    isRememberEnabled,
    getCurrentUser,
    getSessionToken,
    get2FASession,
    save2FASession,
    clear2FASession,
    saveAuthSession,
    clearAuthState,
    hydrateAuthState
  };
})();
