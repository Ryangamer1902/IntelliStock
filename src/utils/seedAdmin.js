// src/utils/seedAdmin.js
// Cria o usuário administrador padrão se não existir nenhum usuário no banco
const bcrypt = require('bcryptjs');

async function seedAdmin(db) {
  try {
    const [rows] = await db.query('SELECT COUNT(*) AS total FROM usuarios');
    if (rows[0].total === 0) {
      const hash = await bcrypt.hash('Admin123', 10);
      await db.query(
        'INSERT INTO usuarios (nome, email, senha_hash, is_admin) VALUES (?, ?, ?, 1)',
        ['Administrador', 'admin@intellistock.com', hash]
      );
      console.log('✓ Usuário admin criado automaticamente');
      console.log('  E-mail: admin@intellistock.com');
      console.log('  Senha:  Admin123\n');
    } else {
      // Garante is_admin = 1 para o admin fixo em bancos existentes
      await db.query(
        `UPDATE usuarios SET is_admin = 1 WHERE email = 'admin@intellistock.com' AND is_admin = 0`
      ).catch(() => {});
    }
  } catch (err) {
    // Tabela ainda não existe (schema não aplicado) — ignora silenciosamente
  }
}

module.exports = seedAdmin;
