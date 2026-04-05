// src/controllers/materiaisController.js
// Controller para gerenciar operacoes com materiais

const Material = require('../models/Material');

function calcularPrecoVenda(precoCusto, margemLucro) {
  const custo = Number(precoCusto) || 0;
  const margem = Number(margemLucro) || 0;
  return Number((custo * (1 + margem / 100)).toFixed(2));
}

function usuarioDaRequisicao(req) {
  return String(req.body?.usuario_nome || req.headers['x-usuario-nome'] || 'Sistema').slice(0, 100);
}

class MateriaisController {
  /**
   * GET /api/materiais
   * Listar todos os materiais ou buscar por termo
   */
  static async listar(req, res) {
    try {
      const { busca } = req.query;
      const materiais = busca ? await Material.findByNome(busca) : await Material.findAll();

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
   * GET /api/materiais/historico
   * Listar movimentacoes de estoque
   */
  static async listarHistorico(req, res) {
    try {
      const movimentacoes = await Material.listarMovimentacoes();

      res.status(200).json({
        success: true,
        message: 'Historico recuperado com sucesso',
        data: movimentacoes
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao listar historico de estoque',
        error: error.message
      });
    }
  }

  /**
   * GET /api/materiais/:id
   * Buscar material especifico por ID
   */
  static async obter(req, res) {
    try {
      const { id } = req.params;
      const material = await Material.findById(id);

      if (!material) {
        return res.status(404).json({
          success: false,
          message: 'Material nao encontrado'
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
      const { codigo_barras, nome, fornecedor, quantidade_atual, quantidade_minima, preco_custo, margem_lucro, preco_manual } = req.body;
      const precoVenda = preco_manual !== undefined ? Number(preco_manual) : calcularPrecoVenda(preco_custo, margem_lucro);

      if (!codigo_barras || !nome || !fornecedor) {
        return res.status(400).json({
          success: false,
          message: 'Codigo de barras, nome e fornecedor sao obrigatorios'
        });
      }

      const materialExistente = await Material.findByCodigoBarras(codigo_barras);
      if (materialExistente) {
        return res.status(409).json({
          success: false,
          message: 'Material com este codigo de barras ja existe'
        });
      }

      const novoMaterialId = await Material.create({
        codigo_barras,
        nome,
        fornecedor,
        quantidade_atual: quantidade_atual || 0,
        quantidade_minima: quantidade_minima || 10,
        preco_custo: preco_custo || 0,
        margem_lucro: margem_lucro || 0,
        preco_manual: precoVenda
      });

      const novoMaterial = await Material.findById(novoMaterialId);

      await Material.registrarMovimentacao({
        material_id: novoMaterialId,
        material_nome_snapshot: String(novoMaterial?.nome || nome),
        tipo_movimento: 'CADASTRO',
        quantidade_delta: Number(quantidade_atual || 0),
        quantidade_anterior: 0,
        quantidade_atual: Number(quantidade_atual || 0),
        usuario_nome: usuarioDaRequisicao(req),
        observacao: 'Cadastro de novo material'
      });

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
      const { codigo_barras, nome, fornecedor, quantidade_atual, quantidade_minima, preco_custo, margem_lucro, preco_manual } = req.body;

      const material = await Material.findById(id);
      if (!material) {
        return res.status(404).json({
          success: false,
          message: 'Material nao encontrado'
        });
      }

      if (codigo_barras && codigo_barras !== material.codigo_barras) {
        const materialComCodigo = await Material.findByCodigoBarras(codigo_barras);
        if (materialComCodigo) {
          return res.status(409).json({
            success: false,
            message: 'Ja existe um material com este codigo de barras'
          });
        }
      }

      const dadosAtualizacao = {};
      if (codigo_barras !== undefined) dadosAtualizacao.codigo_barras = codigo_barras;
      if (nome !== undefined) dadosAtualizacao.nome = nome;
      if (fornecedor !== undefined) dadosAtualizacao.fornecedor = fornecedor;
      if (quantidade_atual !== undefined) dadosAtualizacao.quantidade_atual = quantidade_atual;
      if (quantidade_minima !== undefined) dadosAtualizacao.quantidade_minima = quantidade_minima;
      if (preco_custo !== undefined) dadosAtualizacao.preco_custo = preco_custo;
      if (margem_lucro !== undefined) dadosAtualizacao.margem_lucro = margem_lucro;
      if (preco_manual !== undefined) {
        dadosAtualizacao.preco_manual = preco_manual;
      } else if (preco_custo !== undefined || margem_lucro !== undefined) {
        dadosAtualizacao.preco_manual = calcularPrecoVenda(
          preco_custo !== undefined ? preco_custo : material.preco_custo,
          margem_lucro !== undefined ? margem_lucro : material.margem_lucro
        );
      }

      await Material.update(id, dadosAtualizacao);
      const materialAtualizado = await Material.findById(id);

      const qtdAnterior = Number(material.quantidade_atual || 0);
      const qtdAtual = Number(materialAtualizado.quantidade_atual || 0);
      await Material.registrarMovimentacao({
        material_id: Number(id),
        material_nome_snapshot: String(materialAtualizado?.nome || material?.nome || 'Material'),
        tipo_movimento: 'EDICAO',
        quantidade_delta: qtdAtual - qtdAnterior,
        quantidade_anterior: qtdAnterior,
        quantidade_atual: qtdAtual,
        usuario_nome: usuarioDaRequisicao(req),
        observacao: 'Edicao de dados do material'
      });

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
      const material = await Material.findById(id);
      if (!material) {
        return res.status(404).json({
          success: false,
          message: 'Material nao encontrado'
        });
      }

      await Material.registrarMovimentacao({
        material_id: Number(id),
        material_nome_snapshot: String(material?.nome || 'Material removido'),
        tipo_movimento: 'REMOCAO',
        quantidade_delta: -Number(material.quantidade_atual || 0),
        quantidade_anterior: Number(material.quantidade_atual || 0),
        quantidade_atual: 0,
        usuario_nome: usuarioDaRequisicao(req),
        observacao: 'Exclusao de material'
      });

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

      if (diferenca === undefined || typeof diferenca !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'Diferenca de quantidade e obrigatoria e deve ser um numero'
        });
      }

      const materialAntes = await Material.findById(id);
      if (!materialAntes) {
        return res.status(404).json({
          success: false,
          message: 'Material nao encontrado'
        });
      }

      const materialAtualizado = await Material.atualizarQuantidade(id, diferenca);

      await Material.registrarMovimentacao({
        material_id: Number(id),
        material_nome_snapshot: String(materialAtualizado?.nome || materialAntes?.nome || 'Material'),
        tipo_movimento: 'AJUSTE',
        quantidade_delta: Number(diferenca),
        quantidade_anterior: Number(materialAntes.quantidade_atual || 0),
        quantidade_atual: Number(materialAtualizado.quantidade_atual || 0),
        usuario_nome: usuarioDaRequisicao(req),
        observacao: 'Ajuste manual de quantidade'
      });

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
