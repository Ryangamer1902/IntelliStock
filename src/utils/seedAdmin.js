// src/utils/seedAdmin.js
// Cria o usuário administrador padrão se não existir nenhum usuário no banco
const bcrypt = require('bcryptjs');

async function seedAdmin(db) {
  try {
    const [rows] = await db.query('SELECT COUNT(*) AS total FROM usuarios');
    if (rows[0].total === 0) {
      const hash = await bcrypt.hash('Admin123', 10);
      await db.query(
        'INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)',
        ['Administrador', 'admin@intellistock.com', hash]
      );
      console.log('✓ Usuário admin criado automaticamente');
      console.log('  E-mail: admin@intellistock.com');
      console.log('  Senha:  Admin123\n');
    }
  } catch (err) {
    // Tabela ainda não existe (schema não aplicado) — ignora silenciosamente
  }
}

module.exports = seedAdmin;
