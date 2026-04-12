// src/models/Insumo.js
// Modelo para operações de leitura da tabela insumos

class Insumo {
  /**
   * Lista insumos do usuario com dados de fornecedor e ponto de pedido.
   * @param {string} busca - termo opcional de busca por nome
   * @param {number} usuarioId - ID do usuario logado
   * @returns {Promise<Array>}
   */
  static async findAll(busca, usuarioId) {
    const connection = await global.db.getConnection();

    try {
      const params = [usuarioId];
      let whereSql = 'WHERE i.ativo = TRUE AND i.usuario_id = ?';

      if (busca) {
        whereSql += ' AND i.nome LIKE ?';
        params.push(`%${busca}%`);
      }

      const [rows] = await connection.query(
        `SELECT
          i.id,
          i.nome,
          i.preco_custo_un,
          i.qtd_atual,
          i.unidade,
          i.descricao,
          i.data_cadastro,
          i.data_atualizacao,
          f.nome AS fornecedor_nome,
          f.tempo_espera_dias,
          es.consumo_medio_diario,
          es.qtd_seguranca_minima,
          es.ponto_pedido
        FROM insumos i
        LEFT JOIN fornecedores f ON f.id = i.id_fornecedor_pref
        LEFT JOIN estoque_seguranca es ON es.id_insumo = i.id
        ${whereSql}
        ORDER BY i.id DESC`,
        params
      );

      return rows;
    } finally {
      connection.release();
    }
  }
}

module.exports = Insumo;
