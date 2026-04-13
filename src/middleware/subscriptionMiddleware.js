// Verifica se o usuário autenticado possui assinatura ativa
// Administradores (is_admin = 1) têm acesso irrestrito
async function subscriptionMiddleware(req, res, next) {
  const db = global.db;
  if (!db) return next(); // Se BD indisponível, authMiddleware já tratou

  try {
    const [rows] = await db.query(
      `SELECT u.is_admin,
              (SELECT COUNT(*)
               FROM assinaturas a
               WHERE a.usuario_id = u.id
                 AND a.status = 'ativa'
                 AND a.data_expiracao > NOW()) AS assinatura_ativa
       FROM usuarios u
       WHERE u.id = ? LIMIT 1`,
      [req.usuario_id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const { is_admin, assinatura_ativa } = rows[0];

    if (is_admin || Number(assinatura_ativa) > 0) {
      return next();
    }

    return res.status(402).json({
      success: false,
      code: 'SUBSCRIPTION_REQUIRED',
      message: 'Assinatura ativa necessária para acessar este recurso.',
      redirect: '/produtos.html'
    });

  } catch (err) {
    console.error('Erro no middleware de assinatura:', err);
    next(); // Em caso de erro técnico, não bloqueia o acesso
  }
}

module.exports = subscriptionMiddleware;
