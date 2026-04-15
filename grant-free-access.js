#!/usr/bin/env node

try {
  require('dotenv').config();
} catch (_) {}

let bcrypt = null;
let db = null;

function readArgs(argv) {
  const parsed = {};

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = next;
    index += 1;
  }

  return parsed;
}

function printHelp() {
  console.log('Uso: node grant-free-access.js --email usuario@dominio.com --senha MinhaSenha123 --nome "Nome do Usuario" [--dias 365] [--plano anual]');
  console.log('');
  console.log('Cria ou atualiza uma conta ativa com assinatura cortesia, sem alterar o schema.');
}

async function upsertCourtesyAccess(pool, { nome, email, senha, plano, dias }) {
  if (!bcrypt) {
    bcrypt = require('bcryptjs');
  }

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedNome = String(nome || '').trim();
  const password = String(senha || '');
  const allowedPlans = new Set(['semanal', 'mensal', 'anual']);
  const planId = allowedPlans.has(String(plano || '').trim()) ? String(plano).trim() : 'anual';
  const durationDays = Number.isFinite(Number(dias)) && Number(dias) > 0 ? Number(dias) : 365;

  if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
    throw new Error('Informe um e-mail válido com --email.');
  }

  if (normalizedNome.length < 3) {
    throw new Error('Informe um nome com ao menos 3 caracteres usando --nome.');
  }

  if (password.length < 6) {
    throw new Error('Informe uma senha com ao menos 6 caracteres usando --senha.');
  }

  const senhaHash = await bcrypt.hash(password, 10);
  const [existingRows] = await pool.query('SELECT id FROM usuarios WHERE email = ? LIMIT 1', [normalizedEmail]);

  let usuarioId = null;
  if (existingRows.length > 0) {
    usuarioId = existingRows[0].id;
    await pool.query(
      'UPDATE usuarios SET nome = ?, senha_hash = ?, ativo = 1 WHERE id = ?',
      [normalizedNome, senhaHash, usuarioId]
    );
  } else {
    const [insertResult] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha_hash, ativo) VALUES (?, ?, ?, 1)',
      [normalizedNome, normalizedEmail, senhaHash]
    );
    usuarioId = insertResult.insertId;
  }

  const dataInicio = new Date();
  const dataExpiracao = new Date(dataInicio);
  dataExpiracao.setDate(dataExpiracao.getDate() + durationDays);

  await pool.query(
    `INSERT INTO assinaturas
       (usuario_id, plano, status, mp_payment_id, valor_pago, data_inicio, data_expiracao, renovacao_automatica)
     VALUES (?, ?, 'ativa', ?, 0, ?, ?, 0)
     ON DUPLICATE KEY UPDATE
       plano = VALUES(plano),
       status = 'ativa',
       mp_payment_id = VALUES(mp_payment_id),
       valor_pago = VALUES(valor_pago),
       data_inicio = VALUES(data_inicio),
       data_expiracao = VALUES(data_expiracao),
       renovacao_automatica = 0,
       data_cancelamento = NULL,
       updated_at = NOW()`,
    [usuarioId, planId, `courtesy_${Date.now()}`, dataInicio, dataExpiracao]
  );

  return { usuarioId, email: normalizedEmail, plano: planId, dataExpiracao };
}

async function main() {
  const args = readArgs(process.argv);
  if (args.help || args.h || Object.keys(args).length === 0) {
    printHelp();
    process.exit(0);
  }

  if (!db) {
    db = require('./src/config/database');
  }

  const connected = await db.connect();
  if (!connected || !global.db) {
    throw new Error('Não foi possível conectar ao banco configurado no .env.');
  }

  try {
    const result = await upsertCourtesyAccess(global.db, args);
    console.log('Conta com acesso cortesia liberada com sucesso.');
    console.log(`Usuário ID: ${result.usuarioId}`);
    console.log(`E-mail: ${result.email}`);
    console.log(`Plano: ${result.plano}`);
    console.log(`Expiração: ${result.dataExpiracao.toISOString()}`);
  } finally {
    if (db.disconnect) {
      await db.disconnect();
    }
  }
}

main().catch(async (error) => {
  if (db.disconnect) {
    try {
      await db.disconnect();
    } catch (_) {}
  }

  console.error(error.message || error);
  process.exit(1);
});
