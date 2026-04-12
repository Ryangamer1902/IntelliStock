// src/controllers/authController.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { enviarCodigoVerificacao, enviarLinkResetSenha } = require('../services/emailService');

async function criarDesafioVerificacao(db, usuario) {
  const codigo = String(Math.floor(100000 + Math.random() * 900000));
  const tokenTemp = crypto.randomBytes(32).toString('hex');
  const expiraEm = new Date(Date.now() + 10 * 60 * 1000);
  const mailRequired = String(process.env.MAIL_ENABLED || '').trim().toLowerCase() === 'true';

  await db.query('DELETE FROM codigos_verificacao WHERE usuario_id = ?', [usuario.id]);
  await db.query(
    'INSERT INTO codigos_verificacao (usuario_id, token_temp, codigo, expira_em) VALUES (?, ?, ?, ?)',
    [usuario.id, tokenTemp, codigo, expiraEm]
  );

  const envioEmail = await enviarCodigoVerificacao({
    para: usuario.email,
    nome: usuario.nome,
    codigo
  });

  const resposta = {
    success: true,
    token_temp: tokenTemp,
    nome: usuario.nome,
    email_enviado: envioEmail.sent
  };

  if (mailRequired && !envioEmail.sent) {
    return {
      success: false,
      message: 'Nao foi possivel enviar o codigo de verificacao por e-mail. Tente novamente em instantes.'
    };
  }

  if (!envioEmail.sent && process.env.NODE_ENV !== 'production') {
    resposta.codigo_demo = codigo;
  }

  return resposta;
}

function emailValido(email) {
  return /\S+@\S+\.\S+/.test(String(email || '').trim());
}

class AuthController {
  static async login(req, res) {
    const db = global.db;
    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'Estamos tendo problemas técnicos. Contate o suporte.'
      });
    }

    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ success: false, message: 'E-mail e senha são obrigatórios.' });
    }

    try {
      const [rows] = await db.query(
        'SELECT id, nome, email, senha_hash FROM usuarios WHERE email = ? AND ativo = 1',
        [email.trim().toLowerCase()]
      );

      if (rows.length === 0) {
        return res.status(401).json({ success: false, message: 'E-mail ou senha incorretos.' });
      }

      const usuario = rows[0];
      const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
      if (!senhaValida) {
        return res.status(401).json({ success: false, message: 'E-mail ou senha incorretos.' });
      }

      const desafio = await criarDesafioVerificacao(db, usuario);
      if (!desafio.success) {
        return res.status(502).json(desafio);
      }

      return res.json(desafio);

    } catch (err) {
      console.error('Erro no login:', err);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
  }

  static async cadastrar(req, res) {
    const db = global.db;
    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'Estamos tendo problemas técnicos. Contate o suporte.'
      });
    }

    const nome = String(req.body.nome || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const senha = String(req.body.senha || '');

    if (nome.length < 3) {
      return res.status(400).json({ success: false, message: 'Informe um nome com pelo menos 3 caracteres.' });
    }

    if (!emailValido(email)) {
      return res.status(400).json({ success: false, message: 'Informe um e-mail válido.' });
    }

    if (senha.length < 6) {
      return res.status(400).json({ success: false, message: 'A senha precisa ter pelo menos 6 caracteres.' });
    }

    try {
      const [rows] = await db.query('SELECT id FROM usuarios WHERE email = ? LIMIT 1', [email]);
      if (rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Já existe uma conta cadastrada com este e-mail.' });
      }

      const senhaHash = await bcrypt.hash(senha, 10);
      await db.query(
        'INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)',
        [nome, email, senhaHash]
      );

      return res.status(201).json({
        success: true,
        message: 'Cadastro realizado com sucesso. Faça login com seu e-mail e senha.'
      });
    } catch (err) {
      console.error('Erro no cadastro:', err);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
  }

  static async verificar(req, res) {
    const db = global.db;
    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'Banco de dados não configurado.'
      });
    }

    const { token_temp, codigo } = req.body;
    if (!token_temp || !codigo) {
      return res.status(400).json({ success: false, message: 'Token e código são obrigatórios.' });
    }

    try {
      const [rows] = await db.query(
        `SELECT cv.id, cv.codigo, cv.expira_em, cv.usado,
                u.id AS usuario_id, u.nome, u.email
         FROM codigos_verificacao cv
         JOIN usuarios u ON cv.usuario_id = u.id
         WHERE cv.token_temp = ?`,
        [token_temp]
      );

      if (rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Sessão inválida. Faça o login novamente.' });
      }

      const reg = rows[0];

      if (reg.usado) {
        return res.status(401).json({ success: false, message: 'Código já utilizado.' });
      }

      if (new Date() > new Date(reg.expira_em)) {
        return res.status(401).json({ success: false, message: 'Código expirado. Faça o login novamente.' });
      }

      if (reg.codigo !== String(codigo).trim()) {
        return res.status(401).json({ success: false, message: 'Código incorreto.' });
      }

      // Marcar código como usado (uso único)
      await db.query('UPDATE codigos_verificacao SET usado = 1 WHERE id = ?', [reg.id]);

      // Criar token de sessao duradouro (8 horas)
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const sessionExpira = new Date(Date.now() + 8 * 60 * 60 * 1000);
      await db.query(
        'INSERT INTO sessoes_ativas (usuario_id, token, expira_em) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE token = VALUES(token), expira_em = VALUES(expira_em)',
        [reg.usuario_id, sessionToken, sessionExpira]
      );

      return res.json({
        success: true,
        session_token: sessionToken,
        usuario: { id: reg.usuario_id, nome: reg.nome, email: reg.email }
      });

    } catch (err) {
      console.error('Erro na verificação 2FA:', err);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
  }

  static async logout(req, res) {
    const db = global.db;
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (token && db) {
      try {
        await db.query('DELETE FROM sessoes_ativas WHERE token = ?', [token]);
      } catch (_) {}
    }

    return res.json({ success: true });
  }

  static async solicitarReset(req, res) {
    const db = global.db;
    if (!db) return res.status(503).json({ success: false, message: 'Banco de dados nao configurado.' });

    const email = String(req.body.email || '').trim().toLowerCase();
    if (!emailValido(email)) {
      return res.status(400).json({ success: false, message: 'Informe um e-mail valido.' });
    }

    try {
      const [rows] = await db.query(
        'SELECT id, nome, email FROM usuarios WHERE email = ? AND ativo = 1 LIMIT 1',
        [email]
      );

      // Resposta generica por seguranca (nao revela se o e-mail existe)
      if (rows.length === 0) {
        return res.json({ success: true, message: 'Se este e-mail estiver cadastrado, voce receberá as instruções em instantes.' });
      }

      const usuario = rows[0];
      const token = crypto.randomBytes(32).toString('hex');
      const expiraEm = new Date(Date.now() + 30 * 60 * 1000);

      await db.query('DELETE FROM tokens_reset_senha WHERE usuario_id = ?', [usuario.id]);
      await db.query(
        'INSERT INTO tokens_reset_senha (usuario_id, token, expira_em) VALUES (?, ?, ?)',
        [usuario.id, token, expiraEm]
      );

      const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3001}`;
      const link = `${baseUrl}/redefinir-senha.html?token=${token}`;

      const envio = await enviarLinkResetSenha({ para: usuario.email, nome: usuario.nome, link });

      if (!envio.sent) {
        console.error('Falha ao enviar e-mail de reset para', usuario.email, '-', envio.reason);
        return res.status(502).json({ success: false, message: 'Nao foi possivel enviar o e-mail. Tente novamente.' });
      }

      return res.json({ success: true, message: 'Se este e-mail estiver cadastrado, voce receberá as instruções em instantes.' });
    } catch (err) {
      console.error('Erro ao solicitar reset:', err);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
  }

  static async redefinirSenha(req, res) {
    const db = global.db;
    if (!db) return res.status(503).json({ success: false, message: 'Banco de dados nao configurado.' });

    const token = String(req.body.token || '').trim();
    const novaSenha = String(req.body.senha || '');

    if (!token) return res.status(400).json({ success: false, message: 'Token invalido.' });
    if (novaSenha.length < 6) return res.status(400).json({ success: false, message: 'A nova senha precisa ter pelo menos 6 caracteres.' });

    try {
      const [rows] = await db.query(
        `SELECT tr.id, tr.usuario_id, tr.expira_em, tr.usado
         FROM tokens_reset_senha tr
         WHERE tr.token = ?`,
        [token]
      );

      if (rows.length === 0) return res.status(401).json({ success: false, message: 'Link invalido ou ja utilizado.' });

      const reg = rows[0];
      if (reg.usado) return res.status(401).json({ success: false, message: 'Este link ja foi utilizado.' });
      if (new Date() > new Date(reg.expira_em)) return res.status(401).json({ success: false, message: 'Link expirado. Solicite um novo.' });

      const senhaHash = await bcrypt.hash(novaSenha, 10);
      await db.query('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [senhaHash, reg.usuario_id]);
      await db.query('UPDATE tokens_reset_senha SET usado = 1 WHERE id = ?', [reg.id]);

      return res.json({ success: true, message: 'Senha redefinida com sucesso. Faca login com sua nova senha.' });
    } catch (err) {
      console.error('Erro ao redefinir senha:', err);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
  }
}

module.exports = AuthController;
