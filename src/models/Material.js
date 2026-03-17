// src/models/Material.js
// Modelo para operações com a tabela materiais

class Material {
  /**
   * Buscar todos os materiais
   * @returns {Promise<Array>} Lista de materiais
   */
  static async findAll() {
    try {
      const connection = await global.db.getConnection();
      const [rows] = await connection.query('SELECT * FROM materiais ORDER BY id DESC');
      connection.release();
      return rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Buscar material por ID
   * @param {number} id - ID do material
   * @returns {Promise<Object>} Dados do material
   */
  static async findById(id) {
    try {
      const connection = await global.db.getConnection();
      const [rows] = await connection.query('SELECT * FROM materiais WHERE id = ?', [id]);
      connection.release();
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Buscar material por código de barras
   * @param {string} codigoBarras - Código de barras
   * @returns {Promise<Object>} Dados do material
   */
  static async findByCodigoBarras(codigoBarras) {
    try {
      const connection = await global.db.getConnection();
      const [rows] = await connection.query('SELECT * FROM materiais WHERE codigo_barras = ?', [codigoBarras]);
      connection.release();
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Buscar materiais por nome (like)
   * @param {string} nome - Nome do material
   * @returns {Promise<Array>} Lista de materiais encontrados
   */
  static async findByNome(nome) {
    try {
      const connection = await global.db.getConnection();
      const [rows] = await connection.query('SELECT * FROM materiais WHERE nome LIKE ? ORDER BY id DESC', [`%${nome}%`]);
      connection.release();
      return rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Criar novo material
   * @param {Object} dados - Dados do material
   * @returns {Promise<number>} ID do material criado
   */
  static async create(dados) {
    try {
      const { codigo_barras, nome, quantidade_atual, quantidade_minima, preco_manual } = dados;

      // Validações básicas
      if (!codigo_barras || !nome || quantidade_minima === undefined || preco_manual === undefined) {
        throw new Error('Campos obrigatórios faltando');
      }

      const connection = await global.db.getConnection();
      const [result] = await connection.query(
        'INSERT INTO materiais (codigo_barras, nome, quantidade_atual, quantidade_minima, preco_manual) VALUES (?, ?, ?, ?, ?)',
        [codigo_barras, nome, quantidade_atual || 0, quantidade_minima, preco_manual]
      );
      connection.release();
      return result.insertId;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Atualizar material
   * @param {number} id - ID do material
   * @param {Object} dados - Dados a atualizar
   * @returns {Promise<boolean>} Sucesso da operação
   */
  static async update(id, dados) {
    try {
      const connection = await global.db.getConnection();
      const [result] = await connection.query(
        'UPDATE materiais SET ? WHERE id = ?',
        [dados, id]
      );
      connection.release();
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Deletar material
   * @param {number} id - ID do material
   * @returns {Promise<boolean>} Sucesso da operação
   */
  static async delete(id) {
    try {
      const connection = await global.db.getConnection();
      const [result] = await connection.query('DELETE FROM materiais WHERE id = ?', [id]);
      connection.release();
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Atualizar quantidade de um material
   * @param {number} id - ID do material
   * @param {number} diferenca - Quantidade a adicionar/subtrair
   * @returns {Promise<Object>} Material atualizado
   */
  static async atualizarQuantidade(id, diferenca) {
    try {
      const connection = await global.db.getConnection();
      
      // Buscar quantidade atual
      const [material] = await connection.query('SELECT quantidade_atual FROM materiais WHERE id = ?', [id]);
      
      if (!material || material.length === 0) {
        throw new Error('Material não encontrado');
      }

      const novaQuantidade = Math.max(0, material[0].quantidade_atual + diferenca);
      
      // Atualizar quantidade
      await connection.query('UPDATE materiais SET quantidade_atual = ? WHERE id = ?', [novaQuantidade, id]);
      
      // Retornar material atualizado
      const [materialAtualizado] = await connection.query('SELECT * FROM materiais WHERE id = ?', [id]);
      
      connection.release();
      return materialAtualizado[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Buscar materiais com estoque baixo
   * @returns {Promise<Array>} Materiais com quantidade abaixo do mínimo
   */
  static async findBaixoEstoque() {
    try {
      const connection = await global.db.getConnection();
      const [rows] = await connection.query('SELECT * FROM materiais WHERE quantidade_atual < quantidade_minima ORDER BY id DESC');
      connection.release();
      return rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Material;
