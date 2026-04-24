// src/middleware/authMiddleware.js
// Valida o token de sessao e injeta usuario_id na requisicao

async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Autenticação necessária.' });
  }

  if (!global.db) {
    return res.status(503).json({ success: false, message: 'Banco de dados não disponível.' });
  }

  try {
    const [rows] = await global.db.query(
      `SELECT s.usuario_id, u.nome AS usuario_nome
       FROM sessoes_ativas s
       JOIN usuarios u ON u.id = s.usuario_id
       WHERE s.token = ? AND s.expira_em > NOW() AND u.ativo = 1`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Sessão inválida ou expirada. Faça login novamente.' });
    }

    req.usuario_id = rows[0].usuario_id;
    req.usuario_nome = rows[0].usuario_nome;
    next();
  } catch (err) {
    console.error('Erro no middleware de autenticacao:', err);
    return res.status(500).json({ success: false, message: 'Erro interno ao validar sessão.' });
  }
}

module.exports = authMiddleware;
