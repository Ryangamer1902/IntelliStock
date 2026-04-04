(function () {
  const MODE_KEY = 'auth_mode';
  const DEFAULT_MODE = 'api';
  const MOCK_USERS_KEY = 'mock_auth_users_v1';

  const defaultMockUsers = [
    {
      id: 1,
      nome: 'Usuario Demo',
      email: 'demo@intellistock.com',
      senha: '123456'
    }
  ];

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

  async function login(payload) {
    return getMode() === 'api' ? apiLogin(payload) : mockLogin(payload);
  }

  async function register(payload) {
    return getMode() === 'api' ? apiRegister(payload) : mockRegister(payload);
  }

  async function verify(payload) {
    return getMode() === 'api' ? apiVerify(payload) : mockVerify(payload);
  }

  window.AuthService = {
    getMode,
    setMode,
    login,
    register,
    verify
  };
})();
