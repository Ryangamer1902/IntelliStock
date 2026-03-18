// src/controllers/authController.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class AuthController {
  static async login(req, res) {
    const db = global.db;
    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'Banco de dados não configurado. Execute npm run setup:db e reinicie o servidor.'
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

      // Gerar código de 6 dígitos e token temporário seguro
      const codigo = String(Math.floor(100000 + Math.random() * 900000));
      const tokenTemp = crypto.randomBytes(32).toString('hex');
      const expiraEm = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

      // Remover códigos anteriores do usuário
      await db.query('DELETE FROM codigos_verificacao WHERE usuario_id = ?', [usuario.id]);

      // Inserir novo código
      await db.query(
        'INSERT INTO codigos_verificacao (usuario_id, token_temp, codigo, expira_em) VALUES (?, ?, ?, ?)',
        [usuario.id, tokenTemp, codigo, expiraEm]
      );

      // Em produção: enviar código por e-mail ou SMS
      // Em modo demo: código retornado na resposta para facilitar teste
      return res.json({
        success: true,
        token_temp: tokenTemp,
        nome: usuario.nome,
        codigo_demo: codigo
      });

    } catch (err) {
      console.error('Erro no login:', err);
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

      return res.json({
        success: true,
        usuario: { id: reg.usuario_id, nome: reg.nome, email: reg.email }
      });

    } catch (err) {
      console.error('Erro na verificação 2FA:', err);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
  }
}

module.exports = AuthController;
