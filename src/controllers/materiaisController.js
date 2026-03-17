// src/controllers/materiaisController.js
// Controller para gerenciar operações com materiais

const Material = require('../models/Material');

class MateriaisController {
  /**
   * GET /api/materiais
   * Listar todos os materiais ou buscar por termo
   */
  static async listar(req, res) {
    try {
      const { busca } = req.query;

      let materiais;
      if (busca) {
        materiais = await Material.findByNome(busca);
      } else {
        materiais = await Material.findAll();
      }

      res.status(200).json({
        success: true,
        message: 'Materiais recuperados com sucesso',
        data: materiais
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao listar materiais',
        error: error.message
      });
    }
  }

  /**
   * GET /api/materiais/:id
   * Buscar material específico por ID
   */
  static async obter(req, res) {
    try {
      const { id } = req.params;
      const material = await Material.findById(id);

      if (!material) {
        return res.status(404).json({
          success: false,
          message: 'Material não encontrado'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Material recuperado com sucesso',
        data: material
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao obter material',
        error: error.message
      });
    }
  }

  /**
   * POST /api/materiais
   * Criar novo material
   */
  static async criar(req, res) {
    try {
      const { codigo_barras, nome, quantidade_atual, quantidade_minima, preco_manual } = req.body;

      // Validação básica
      if (!codigo_barras || !nome) {
        return res.status(400).json({
          success: false,
          message: 'Código de barras e nome são obrigatórios'
        });
      }

      // Verificar se código de barras já existe
      const materialExistente = await Material.findByCodigoBarras(codigo_barras);
      if (materialExistente) {
        return res.status(409).json({
          success: false,
          message: 'Material com este código de barras já existe'
        });
      }

      // Criar material
      const novoMaterialId = await Material.create({
        codigo_barras,
        nome,
        quantidade_atual: quantidade_atual || 0,
        quantidade_minima: quantidade_minima || 10,
        preco_manual: preco_manual || 0
      });

      const novoMaterial = await Material.findById(novoMaterialId);

      res.status(201).json({
        success: true,
        message: 'Material criado com sucesso',
        data: novoMaterial
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao criar material',
        error: error.message
      });
    }
  }

  /**
   * PUT /api/materiais/:id
   * Atualizar material completo
   */
  static async atualizar(req, res) {
    try {
      const { id } = req.params;
      const { codigo_barras, nome, quantidade_atual, quantidade_minima, preco_manual } = req.body;

      // Verificar se material existe
      const material = await Material.findById(id);
      if (!material) {
        return res.status(404).json({
          success: false,
          message: 'Material não encontrado'
        });
      }

      // Se mudar código de barras, verificar duplicatas
      if (codigo_barras && codigo_barras !== material.codigo_barras) {
        const materialComCodigo = await Material.findByCodigoBarras(codigo_barras);
        if (materialComCodigo) {
          return res.status(409).json({
            success: false,
            message: 'Já existe um material com este código de barras'
          });
        }
      }

      // Montar objeto de atualização
      const dadosAtualizacao = {};
      if (codigo_barras !== undefined) dadosAtualizacao.codigo_barras = codigo_barras;
      if (nome !== undefined) dadosAtualizacao.nome = nome;
      if (quantidade_atual !== undefined) dadosAtualizacao.quantidade_atual = quantidade_atual;
      if (quantidade_minima !== undefined) dadosAtualizacao.quantidade_minima = quantidade_minima;
      if (preco_manual !== undefined) dadosAtualizacao.preco_manual = preco_manual;

      // Atualizar
      await Material.update(id, dadosAtualizacao);
      const materialAtualizado = await Material.findById(id);

      res.status(200).json({
        success: true,
        message: 'Material atualizado com sucesso',
        data: materialAtualizado
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar material',
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/materiais/:id
   * Deletar material
   */
  static async deletar(req, res) {
    try {
      const { id } = req.params;

      // Verificar se material existe
      const material = await Material.findById(id);
      if (!material) {
        return res.status(404).json({
          success: false,
          message: 'Material não encontrado'
        });
      }

      // Deletar
      await Material.delete(id);

      res.status(200).json({
        success: true,
        message: 'Material deletado com sucesso',
        data: material
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao deletar material',
        error: error.message
      });
    }
  }

  /**
   * PUT /api/materiais/:id/quantidade
   * Atualizar quantidade (somar/subtrair)
   */
  static async atualizarQuantidade(req, res) {
    try {
      const { id } = req.params;
      const { diferenca } = req.body;

      // Validação
      if (diferenca === undefined || typeof diferenca !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'Diferença de quantidade é obrigatória e deve ser um número'
        });
      }

      // Atualizar quantidade
      const materialAtualizado = await Material.atualizarQuantidade(id, diferenca);

      res.status(200).json({
        success: true,
        message: 'Quantidade atualizada com sucesso',
        data: materialAtualizado
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar quantidade',
        error: error.message
      });
    }
  }

  /**
   * GET /api/materiais/estoque/baixo
   * Listar materiais com estoque baixo
   */
  static async listarBaixoEstoque(req, res) {
    try {
      const materiais = await Material.findBaixoEstoque();

      res.status(200).json({
        success: true,
        message: 'Materiais com estoque baixo recuperados',
        data: materiais
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao listar materiais com estoque baixo',
        error: error.message
      });
    }
  }
}

module.exports = MateriaisController;
