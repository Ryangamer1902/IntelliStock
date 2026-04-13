'use strict';

const bcrypt = require('bcryptjs');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

// ==================== PLANOS ====================
const PLANOS = {
  semanal: { nome: 'Assinatura Semanal IntelliStock', preco: 59.00,   dias: 7   },
  mensal:  { nome: 'Assinatura Mensal IntelliStock',  preco: 179.00,  dias: 30  },
  anual:   { nome: 'Assinatura Anual IntelliStock',   preco: 1690.00, dias: 365 }
};

function getMpClient() {
  return new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN || '',
    options: { timeout: 15000 }
  });
}

function getAppUrl() {
  return (process.env.APP_URL || `http://localhost:${process.env.PORT || 3001}`).replace(/\/$/, '');
}

function isPublicHttpUrl(url) {
  if (!/^https?:\/\//i.test(url || '')) return false;
  return !/localhost|127\.0\.0\.1/i.test(url);
}

function emailValido(email) {
  return /\S+@\S+\.\S+/.test(String(email || '').trim());
}

async function criarPreferenciaMp(usuarioId, email, nome, cpfCnpj, planoId) {
  const plano = PLANOS[planoId];
  if (!plano) throw new Error('Plano inválido: ' + planoId);

  const appUrl = getAppUrl();
  const client = getMpClient();
  const prefClient = new Preference(client);

  const body = {
    items: [{
      id: planoId,
      title: plano.nome,
      description: 'Acesso ao IntelliStock - Sistema de Gerenciamento de Estoque',
      quantity: 1,
      unit_price: plano.preco,
      currency_id: 'BRL'
    }],
    payer: {
      name: nome,
      email,
      identification: {
        type: cpfCnpj.length <= 11 ? 'CPF' : 'CNPJ',
        number: cpfCnpj
      }
    },
    external_reference: String(usuarioId),
    metadata: {
      usuario_id: usuarioId,
      plano: planoId
    },
    statement_descriptor: 'INTELLISTOCK'
  };

  // Em localhost o Mercado Pago pode rejeitar auto_return/back_urls.
  // Para ambiente público, enviamos o fluxo completo de retorno + webhook.
  if (isPublicHttpUrl(appUrl)) {
    body.back_urls = {
      success: `${appUrl}/checkout.html?status=success`,
      failure: `${appUrl}/checkout.html?status=failure`,
      pending: `${appUrl}/checkout.html?status=pending`
    };
    body.auto_return = 'approved';
    body.notification_url = `${appUrl}/api/assinaturas/webhook`;
  }

  return prefClient.create({ body });
}

class AssinaturasController {
  // ─────────────────────────────────────────────────────────────────────
  // POST /api/assinaturas/iniciar-checkout  (público)
  // Cria/atualiza usuário → cria preferência MP → devolve init_point
  // ─────────────────────────────────────────────────────────────────────
  static async iniciarCheckout(req, res) {
    const db = global.db;
    if (!db) {
      return res.status(503).json({ success: false, message: 'Banco de dados não disponível.' });
    }
    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(503).json({
        success: false,
        message: 'Gateway de pagamento não configurado. Contate o suporte.'
      });
    }

    const nome    = String(req.body.nome     || '').trim();
    const email   = String(req.body.email    || '').trim().toLowerCase();
    const senha   = String(req.body.senha    || '');
    const cpfCnpj = String(req.body.cpf_cnpj || '').replace(/\D/g, '');
    const planoId = String(req.body.plano    || 'mensal');

    if (!PLANOS[planoId])    return res.status(400).json({ success: false, message: 'Plano inválido.' });
    if (nome.length < 3)     return res.status(400).json({ success: false, message: 'Nome precisa ter ao menos 3 caracteres.' });
    if (!emailValido(email)) return res.status(400).json({ success: false, message: 'E-mail inválido.' });
    if (cpfCnpj.length < 11) return res.status(400).json({ success: false, message: 'CPF (11 dígitos) ou CNPJ (14 dígitos) inválido.' });

    try {
      // Verifica se já há sessão ativa (usuário logado quer renovar)
      const authHeader  = req.headers['authorization'] || '';
      const sessionToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      let usuarioId = null;

      if (sessionToken) {
        const [sessRows] = await db.query(
          `SELECT s.usuario_id
           FROM sessoes_ativas s
           JOIN usuarios u ON u.id = s.usuario_id
           WHERE s.token = ? AND s.expira_em > NOW() AND u.ativo = 1`,
          [sessionToken]
        );
        if (sessRows.length > 0) usuarioId = sessRows[0].usuario_id;
      }

      if (!usuarioId) {
        // Novo fluxo: usuário ainda não existe ou está pendente de pagamento
        if (senha.length < 6) {
          return res.status(400).json({ success: false, message: 'Senha precisa ter ao menos 6 caracteres.' });
        }

        const [existRows] = await db.query(
          'SELECT id, ativo FROM usuarios WHERE email = ? LIMIT 1',
          [email]
        );

        if (existRows.length > 0 && existRows[0].ativo === 1) {
          return res.status(409).json({
            success: false,
            message: 'Este e-mail já possui uma conta ativa. Faça login para renovar sua assinatura.',
            redirect: '/login.html'
          });
        }

        if (existRows.length > 0) {
          // Usuário pendente (pagamento anterior não concluído) — atualiza dados
          const hash = await bcrypt.hash(senha, 10);
          await db.query(
            'UPDATE usuarios SET nome = ?, senha_hash = ? WHERE id = ?',
            [nome, hash, existRows[0].id]
          );
          usuarioId = existRows[0].id;
        } else {
          // Cria usuário inativo — será ativado pelo webhook após pagamento
          const hash = await bcrypt.hash(senha, 10);
          const [ins] = await db.query(
            'INSERT INTO usuarios (nome, email, senha_hash, ativo) VALUES (?, ?, ?, 0)',
            [nome, email, hash]
          );
          usuarioId = ins.insertId;
        }
      }

      const pref = await criarPreferenciaMp(usuarioId, email, nome, cpfCnpj, planoId);

      return res.json({
        success: true,
        init_point: pref.init_point,
        sandbox_init_point: pref.sandbox_init_point,
        preference_id: pref.id
      });

    } catch (err) {
      console.error('Erro ao iniciar checkout:', err);
      return res.status(500).json({
        success: false,
        message: 'Erro ao processar checkout. Tente novamente.'
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // POST /api/assinaturas/renovar  (requer auth)
  // Usuário já logado com assinatura vencida quer renovar/trocar plano
  // ─────────────────────────────────────────────────────────────────────
  static async renovar(req, res) {
    const db = global.db;
    if (!db) return res.status(503).json({ success: false, message: 'Banco de dados não disponível.' });
    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(503).json({ success: false, message: 'Gateway de pagamento não configurado.' });
    }

    const planoId = String(req.body.plano    || 'mensal');
    const cpfCnpj = String(req.body.cpf_cnpj || '').replace(/\D/g, '');

    if (!PLANOS[planoId])    return res.status(400).json({ success: false, message: 'Plano inválido.' });
    if (cpfCnpj.length < 11) return res.status(400).json({ success: false, message: 'CPF ou CNPJ obrigatório para renovação.' });

    try {
      const [userRows] = await db.query(
        'SELECT nome, email FROM usuarios WHERE id = ? LIMIT 1',
        [req.usuario_id]
      );
      if (userRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
      }

      const { nome, email } = userRows[0];
      const pref = await criarPreferenciaMp(req.usuario_id, email, nome, cpfCnpj, planoId);

      return res.json({
        success: true,
        init_point: pref.init_point,
        sandbox_init_point: pref.sandbox_init_point,
        preference_id: pref.id
      });

    } catch (err) {
      console.error('Erro ao renovar assinatura:', err);
      return res.status(500).json({ success: false, message: 'Erro ao iniciar renovação. Tente novamente.' });
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // POST /api/assinaturas/webhook  (público — chamado pelo Mercado Pago)
  // ─────────────────────────────────────────────────────────────────────
  static async webhook(req, res) {
    // Responder 200 imediatamente para evitar reenvio do MP
    res.status(200).end();

    const db = global.db;
    if (!db || !process.env.MP_ACCESS_TOKEN) return;

    const { type, data } = req.body || {};
    const paymentId = data?.id || req.query.id;

    // Só processa notificações de pagamento com ID numérico
    if (!paymentId || !/^\d+$/.test(String(paymentId))) return;
    if (type && type !== 'payment') return;

    try {
      const client = getMpClient();
      const paymentClient = new Payment(client);
      const payment = await paymentClient.get({ id: String(paymentId) });

      if (!payment) return;

      const usuarioId = parseInt(payment.external_reference, 10);
      if (!usuarioId || isNaN(usuarioId)) {
        console.warn('[MP Webhook] external_reference inválido:', payment.external_reference);
        return;
      }

      const planoId = payment.metadata?.plano || 'mensal';
      const plano   = PLANOS[planoId] || PLANOS.mensal;

      if (payment.status === 'approved') {
        const dataInicio      = new Date();
        const dataExpiracao   = new Date(dataInicio);
        dataExpiracao.setDate(dataExpiracao.getDate() + plano.dias);

        await db.query('UPDATE usuarios SET ativo = 1 WHERE id = ?', [usuarioId]);

        await db.query(
          `INSERT INTO assinaturas
             (usuario_id, plano, status, mp_payment_id, valor_pago, data_inicio, data_expiracao)
           VALUES (?, ?, 'ativa', ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             plano            = VALUES(plano),
             status           = 'ativa',
             mp_payment_id    = VALUES(mp_payment_id),
             valor_pago       = VALUES(valor_pago),
             data_inicio      = VALUES(data_inicio),
             data_expiracao   = VALUES(data_expiracao),
             data_cancelamento = NULL,
             updated_at       = NOW()`,
          [usuarioId, planoId, String(payment.id), plano.preco, dataInicio, dataExpiracao]
        );

        console.log(
          `✓ [MP Webhook] Assinatura ativada: usuário ${usuarioId}, plano ${planoId}, expira ${dataExpiracao.toISOString()}`
        );

      } else {
        console.log(`ℹ [MP Webhook] Pagamento status "${payment.status}": usuário ${usuarioId}`);
      }

    } catch (err) {
      console.error('[MP Webhook] Erro ao processar notificação:', err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // GET /api/assinaturas/status  (requer auth)
  // ─────────────────────────────────────────────────────────────────────
  static async status(req, res) {
    const db = global.db;
    if (!db) return res.status(503).json({ success: false, message: 'Banco de dados não disponível.' });

    try {
      const [rows] = await db.query(
        `SELECT plano, status, mp_payment_id, valor_pago,
                data_inicio, data_expiracao, data_cancelamento,
                renovacao_automatica, created_at, updated_at
         FROM assinaturas WHERE usuario_id = ? LIMIT 1`,
        [req.usuario_id]
      );

      if (rows.length === 0) {
        return res.json({ success: true, assinatura: null });
      }

      const a = rows[0];

      // Auto-expirar se passou da data de expiração
      if (a.status === 'ativa' && a.data_expiracao && new Date(a.data_expiracao) < new Date()) {
        await db.query(
          'UPDATE assinaturas SET status = ? WHERE usuario_id = ?',
          ['expirada', req.usuario_id]
        );
        a.status = 'expirada';
      }

      return res.json({ success: true, assinatura: a });

    } catch (err) {
      console.error('Erro ao buscar status de assinatura:', err);
      return res.status(500).json({ success: false, message: 'Erro ao buscar assinatura.' });
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // POST /api/assinaturas/cancelar  (requer auth)
  // ─────────────────────────────────────────────────────────────────────
  static async cancelar(req, res) {
    const db = global.db;
    if (!db) return res.status(503).json({ success: false, message: 'Banco de dados não disponível.' });

    try {
      const [rows] = await db.query(
        `SELECT id FROM assinaturas WHERE usuario_id = ? AND status = 'ativa' LIMIT 1`,
        [req.usuario_id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Nenhuma assinatura ativa encontrada.' });
      }

      await db.query(
        `UPDATE assinaturas SET status = 'cancelada', data_cancelamento = NOW() WHERE usuario_id = ?`,
        [req.usuario_id]
      );

      return res.json({ success: true, message: 'Assinatura cancelada. Você terá acesso até a data de expiração.' });

    } catch (err) {
      console.error('Erro ao cancelar assinatura:', err);
      return res.status(500).json({ success: false, message: 'Erro ao cancelar assinatura.' });
    }
  }
}

module.exports = AssinaturasController;
