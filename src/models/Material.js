// src/models/Material.js
// Modelo para operacoes com materiais e historico de movimentacoes

class Material {
  static parseJsonArray(value) {
    try {
      const parsed = JSON.parse(String(value || '[]'));
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  /**
   * Buscar todos os materiais do usuario
   */
  static async findAll(usuarioId) {
    const connection = await global.db.getConnection();
    try {
      const [rows] = await connection.query('SELECT * FROM materiais WHERE usuario_id = ? ORDER BY id DESC', [usuarioId]);
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Buscar material por ID (pertencente ao usuario)
   */
  static async findById(id, usuarioId) {
    const connection = await global.db.getConnection();
    try {
      const [rows] = await connection.query('SELECT * FROM materiais WHERE id = ? AND usuario_id = ?', [id, usuarioId]);
      return rows[0] || null;
    } finally {
      connection.release();
    }
  }

  /**
   * Buscar material por codigo de barras (pertencente ao usuario)
   */
  static async findByCodigoBarras(codigoBarras, usuarioId) {
    const connection = await global.db.getConnection();
    try {
      const [rows] = await connection.query('SELECT * FROM materiais WHERE codigo_barras = ? AND usuario_id = ?', [codigoBarras, usuarioId]);
      return rows[0] || null;
    } finally {
      connection.release();
    }
  }

  /**
   * Buscar materiais por nome (like) do usuario
   */
  static async findByNome(nome, usuarioId) {
    const connection = await global.db.getConnection();
    try {
      const [rows] = await connection.query('SELECT * FROM materiais WHERE nome LIKE ? AND usuario_id = ? ORDER BY id DESC', [`%${nome}%`, usuarioId]);
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Criar novo material vinculado ao usuario
   */
  static async create(dados) {
    const { usuario_id, codigo_barras, nome, fornecedor, quantidade_atual, quantidade_minima, preco_custo, margem_lucro, preco_manual } = dados;

    if (!usuario_id || !codigo_barras || !nome || !fornecedor || quantidade_minima === undefined || preco_custo === undefined || preco_manual === undefined) {
      throw new Error('Campos obrigatorios faltando');
    }

    const connection = await global.db.getConnection();
    try {
      const [result] = await connection.query(
        `INSERT INTO materiais
          (usuario_id, codigo_barras, nome, fornecedor, quantidade_atual, quantidade_minima, preco_custo, margem_lucro, preco_manual)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [usuario_id, codigo_barras, nome, fornecedor, quantidade_atual || 0, quantidade_minima, preco_custo, margem_lucro || 0, preco_manual]
      );
      return result.insertId;
    } finally {
      connection.release();
    }
  }

  /**
   * Atualizar material (somente se pertencer ao usuario)
   */
  static async update(id, dados, usuarioId) {
    const connection = await global.db.getConnection();
    try {
      const fields = Object.keys(dados).map(k => `${k} = ?`).join(', ');
      const values = [...Object.values(dados), id, usuarioId];
      const [result] = await connection.query(`UPDATE materiais SET ${fields} WHERE id = ? AND usuario_id = ?`, values);
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Deletar material (somente se pertencer ao usuario)
   */
  static async delete(id, usuarioId) {
    const connection = await global.db.getConnection();
    try {
      const [result] = await connection.query('DELETE FROM materiais WHERE id = ? AND usuario_id = ?', [id, usuarioId]);
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Atualizar quantidade de um material do usuario
   */
  static async atualizarQuantidade(id, diferenca, usuarioId) {
    const connection = await global.db.getConnection();
    try {
      const [material] = await connection.query('SELECT quantidade_atual FROM materiais WHERE id = ? AND usuario_id = ?', [id, usuarioId]);
      if (!material || material.length === 0) {
        throw new Error('Material não encontrado');
      }

      const novaQuantidade = Math.max(0, Number(material[0].quantidade_atual) + Number(diferenca));
      await connection.query('UPDATE materiais SET quantidade_atual = ? WHERE id = ? AND usuario_id = ?', [novaQuantidade, id, usuarioId]);

      const [materialAtualizado] = await connection.query('SELECT * FROM materiais WHERE id = ? AND usuario_id = ?', [id, usuarioId]);
      return materialAtualizado[0];
    } finally {
      connection.release();
    }
  }

  /**
   * Buscar materiais com estoque baixo do usuario
   */
  static async findBaixoEstoque(usuarioId) {
    const connection = await global.db.getConnection();
    try {
      const [rows] = await connection.query('SELECT * FROM materiais WHERE quantidade_atual < quantidade_minima AND usuario_id = ? ORDER BY id DESC', [usuarioId]);
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Registrar movimentacao no historico
   */
  static async registrarMovimentacao(mov) {
    const {
      usuario_id = null,
      material_id,
      tipo_movimento,
      quantidade_delta = 0,
      quantidade_anterior = 0,
      quantidade_atual = 0,
      usuario_nome = 'Sistema',
      observacao = null,
      material_nome_snapshot = 'Material removido'
    } = mov;

    const connection = await global.db.getConnection();
    try {
      await connection.query(
        `INSERT INTO movimentacoes_estoque
          (usuario_id, material_id, material_nome_snapshot, tipo_movimento, quantidade_delta, quantidade_anterior, quantidade_atual, usuario_nome, observacao)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [usuario_id, material_id, material_nome_snapshot, tipo_movimento, quantidade_delta, quantidade_anterior, quantidade_atual, usuario_nome, observacao]
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Listar historico de movimentacoes do usuario
   */
  static async listarMovimentacoes(usuarioId) {
    const connection = await global.db.getConnection();
    try {
      const [rows] = await connection.query(
        `SELECT
          m.id,
          m.material_id,
          COALESCE(mt.nome, m.material_nome_snapshot) AS material_nome,
          m.tipo_movimento,
          m.quantidade_delta,
          m.quantidade_anterior,
          m.quantidade_atual,
          m.usuario_nome,
          m.observacao,
          m.created_at
        FROM movimentacoes_estoque m
        LEFT JOIN materiais mt ON mt.id = m.material_id
        WHERE m.usuario_id = ?
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT 300`,
        [usuarioId]
      );

      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Buscar receita de producao de um item final
   */
  static async findReceita(materialId, usuarioId) {
    const connection = await global.db.getConnection();
    try {
      const [rows] = await connection.query(
        `SELECT material_id, usuario_id, base_quantidade, receita_json, custos_extras_json, created_at, updated_at
         FROM materiais_receitas
         WHERE material_id = ? AND usuario_id = ?
         LIMIT 1`,
        [materialId, usuarioId]
      );

      const row = rows[0];
      if (!row) return null;

      return {
        material_id: Number(row.material_id),
        usuario_id: Number(row.usuario_id),
        base_quantidade: Number(row.base_quantidade || 0),
        componentes: Material.parseJsonArray(row.receita_json),
        custos_extras: Material.parseJsonArray(row.custos_extras_json),
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Salvar ou atualizar receita de producao de um item final
   */
  static async saveReceita(materialId, usuarioId, payload) {
    const baseQuantidade = Number(payload?.base_quantidade || 0);
    const componentes = Array.isArray(payload?.componentes) ? payload.componentes : [];
    const custosExtras = Array.isArray(payload?.custos_extras) ? payload.custos_extras : [];

    const connection = await global.db.getConnection();
    try {
      await connection.query(
        `INSERT INTO materiais_receitas
          (material_id, usuario_id, base_quantidade, receita_json, custos_extras_json)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           base_quantidade = VALUES(base_quantidade),
           receita_json = VALUES(receita_json),
           custos_extras_json = VALUES(custos_extras_json),
           updated_at = CURRENT_TIMESTAMP`,
        [
          materialId,
          usuarioId,
          baseQuantidade,
          JSON.stringify(componentes),
          JSON.stringify(custosExtras)
        ]
      );

      return Material.findReceita(materialId, usuarioId);
    } finally {
      connection.release();
    }
  }
}

module.exports = Material;
