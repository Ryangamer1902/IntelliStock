// src/models/Material.js
// Modelo para operacoes com materiais e historico de movimentacoes

class Material {
  /**
   * Buscar todos os materiais
   * @returns {Promise<Array>} Lista de materiais
   */
  static async findAll() {
    const connection = await global.db.getConnection();
    try {
      const [rows] = await connection.query('SELECT * FROM materiais ORDER BY id DESC');
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Buscar material por ID
   * @param {number} id - ID do material
   * @returns {Promise<Object>} Dados do material
   */
  static async findById(id) {
    const connection = await global.db.getConnection();
    try {
      const [rows] = await connection.query('SELECT * FROM materiais WHERE id = ?', [id]);
      return rows[0] || null;
    } finally {
      connection.release();
    }
  }

  /**
   * Buscar material por codigo de barras
   * @param {string} codigoBarras - Codigo de barras
   * @returns {Promise<Object>} Dados do material
   */
  static async findByCodigoBarras(codigoBarras) {
    const connection = await global.db.getConnection();
    try {
      const [rows] = await connection.query('SELECT * FROM materiais WHERE codigo_barras = ?', [codigoBarras]);
      return rows[0] || null;
    } finally {
      connection.release();
    }
  }

  /**
   * Buscar materiais por nome (like)
   * @param {string} nome - Nome do material
   * @returns {Promise<Array>} Lista de materiais encontrados
   */
  static async findByNome(nome) {
    const connection = await global.db.getConnection();
    try {
      const [rows] = await connection.query('SELECT * FROM materiais WHERE nome LIKE ? ORDER BY id DESC', [`%${nome}%`]);
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Criar novo material
   * @param {Object} dados - Dados do material
   * @returns {Promise<number>} ID do material criado
   */
  static async create(dados) {
    const { codigo_barras, nome, fornecedor, quantidade_atual, quantidade_minima, preco_custo, margem_lucro, preco_manual } = dados;

    if (!codigo_barras || !nome || !fornecedor || quantidade_minima === undefined || preco_custo === undefined || preco_manual === undefined) {
      throw new Error('Campos obrigatorios faltando');
    }

    const connection = await global.db.getConnection();
    try {
      const [result] = await connection.query(
        `INSERT INTO materiais
          (codigo_barras, nome, fornecedor, quantidade_atual, quantidade_minima, preco_custo, margem_lucro, preco_manual)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [codigo_barras, nome, fornecedor, quantidade_atual || 0, quantidade_minima, preco_custo, margem_lucro || 0, preco_manual]
      );
      return result.insertId;
    } finally {
      connection.release();
    }
  }

  /**
   * Atualizar material
   * @param {number} id - ID do material
   * @param {Object} dados - Dados a atualizar
   * @returns {Promise<boolean>} Sucesso da operacao
   */
  static async update(id, dados) {
    const connection = await global.db.getConnection();
    try {
      const [result] = await connection.query('UPDATE materiais SET ? WHERE id = ?', [dados, id]);
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Deletar material
   * @param {number} id - ID do material
   * @returns {Promise<boolean>} Sucesso da operacao
   */
  static async delete(id) {
    const connection = await global.db.getConnection();
    try {
      const [result] = await connection.query('DELETE FROM materiais WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Atualizar quantidade de um material
   * @param {number} id - ID do material
   * @param {number} diferenca - Quantidade a adicionar/subtrair
   * @returns {Promise<Object>} Material atualizado
   */
  static async atualizarQuantidade(id, diferenca) {
    const connection = await global.db.getConnection();
    try {
      const [material] = await connection.query('SELECT quantidade_atual FROM materiais WHERE id = ?', [id]);
      if (!material || material.length === 0) {
        throw new Error('Material nao encontrado');
      }

      const novaQuantidade = Math.max(0, Number(material[0].quantidade_atual) + Number(diferenca));
      await connection.query('UPDATE materiais SET quantidade_atual = ? WHERE id = ?', [novaQuantidade, id]);

      const [materialAtualizado] = await connection.query('SELECT * FROM materiais WHERE id = ?', [id]);
      return materialAtualizado[0];
    } finally {
      connection.release();
    }
  }

  /**
   * Buscar materiais com estoque baixo
   * @returns {Promise<Array>} Materiais com quantidade abaixo do minimo
   */
  static async findBaixoEstoque() {
    const connection = await global.db.getConnection();
    try {
      const [rows] = await connection.query('SELECT * FROM materiais WHERE quantidade_atual < quantidade_minima ORDER BY id DESC');
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Registrar movimentacao no historico
   * @param {Object} mov - Dados da movimentacao
   */
  static async registrarMovimentacao(mov) {
    const {
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
          (material_id, material_nome_snapshot, tipo_movimento, quantidade_delta, quantidade_anterior, quantidade_atual, usuario_nome, observacao)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [material_id, material_nome_snapshot, tipo_movimento, quantidade_delta, quantidade_anterior, quantidade_atual, usuario_nome, observacao]
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Listar historico de movimentacoes
   * @returns {Promise<Array>}
   */
  static async listarMovimentacoes() {
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
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT 300`
      );

      return rows;
    } finally {
      connection.release();
    }
  }
}

module.exports = Material;
