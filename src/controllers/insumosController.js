// src/controllers/insumosController.js
// Controller para leitura de insumos no schema principal do estoque_db

const Insumo = require('../models/Insumo');

class InsumosController {
  /**
   * GET /api/insumos
   * Query: ?busca=termo
   */
  static async listar(req, res) {
    try {
      const { busca } = req.query;
      const insumos = await Insumo.findAll(busca);

      return res.status(200).json({
        success: true,
        message: 'Insumos recuperados com sucesso',
        data: insumos
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao listar insumos. Verifique se o schema principal foi aplicado e se a API esta conectada ao estoque_db.',
        error: error.message
      });
    }
  }
}

module.exports = InsumosController;
