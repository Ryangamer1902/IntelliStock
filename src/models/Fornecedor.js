// src/models/Fornecedor.js

class Fornecedor {
  static async findAll(usuarioId) {
    if (!global.db) return [];
    const connection = await global.db.getConnection();
    try {
      const [rows] = await connection.query(
        `SELECT * FROM fornecedores WHERE usuario_id = ? AND ativo = 1 ORDER BY nome ASC`,
        [usuarioId]
      );
      return rows || [];
    } finally {
      connection.release();
    }
  }

  static async findById(id, usuarioId) {
    if (!global.db) return null;
    const connection = await global.db.getConnection();
    try {
      const [rows] = await connection.query(
        `SELECT * FROM fornecedores WHERE id = ? AND usuario_id = ?`,
        [id, usuarioId]
      );
      return rows?.[0] || null;
    } finally {
      connection.release();
    }
  }

  static async create(data, usuarioId) {
    if (!global.db) throw new Error('Database not initialized');
    const connection = await global.db.getConnection();
    try {
      const { nome, email, telefone, endereco, cidade, estado, cep, tempo_espera_dias, observacoes } = data;
      
      const [result] = await connection.query(
        `INSERT INTO fornecedores (usuario_id, nome, email, telefone, endereco, cidade, estado, cep, tempo_espera_dias, observacoes, ativo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [usuarioId, nome, email || null, telefone || null, endereco || null, cidade || null, estado || null, cep || null, tempo_espera_dias || 7, observacoes || null]
      );

      return { id: result.insertId, ...data, usuario_id: usuarioId };
    } finally {
      connection.release();
    }
  }

  static async update(id, data, usuarioId) {
    if (!global.db) throw new Error('Database not initialized');
    const connection = await global.db.getConnection();
    try {
      const fornecedor = await Fornecedor.findById(id, usuarioId);
      if (!fornecedor) throw new Error('Fornecedor not found');

      const { nome, email, telefone, endereco, cidade, estado, cep, tempo_espera_dias, observacoes } = data;
      
      await connection.query(
        `UPDATE fornecedores SET nome = ?, email = ?, telefone = ?, endereco = ?, cidade = ?, estado = ?, cep = ?, tempo_espera_dias = ?, observacoes = ?, data_atualizacao = NOW() WHERE id = ?`,
        [nome, email || null, telefone || null, endereco || null, cidade || null, estado || null, cep || null, tempo_espera_dias || 7, observacoes || null, id]
      );

      return await Fornecedor.findById(id, usuarioId);
    } finally {
      connection.release();
    }
  }

  static async delete(id, usuarioId) {
    if (!global.db) throw new Error('Database not initialized');
    const connection = await global.db.getConnection();
    try {
      const fornecedor = await Fornecedor.findById(id, usuarioId);
      if (!fornecedor) throw new Error('Fornecedor not found');

      await connection.query(
        `UPDATE fornecedores SET ativo = 0, data_atualizacao = NOW() WHERE id = ?`,
        [id]
      );

      return { success: true, id };
    } finally {
      connection.release();
    }
  }

  static async search(usuarioId, termo) {
    if (!global.db) return [];
    const connection = await global.db.getConnection();
    try {
      const [rows] = await connection.query(
        `SELECT * FROM fornecedores 
         WHERE usuario_id = ? AND ativo = 1 
         AND (LOWER(nome) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?) OR LOWER(telefone) LIKE LOWER(?))
         ORDER BY nome ASC`,
        [usuarioId, `%${termo}%`, `%${termo}%`, `%${termo}%`]
      );
      return rows || [];
    } finally {
      connection.release();
    }
  }
}

module.exports = Fornecedor;
