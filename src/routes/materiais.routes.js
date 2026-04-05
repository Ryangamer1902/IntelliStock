// src/routes/materiais.routes.js
// Rotas para operações CRUD de materiais

const express = require('express');
const router = express.Router();
const MateriaisController = require('../controllers/materiaisController');

// ==================== ROTAS DE MATERIAIS ====================

/**
 * GET /api/materiais
 * Listar todos os materiais ou buscar por termo
 * Query param: ?busca=termo
 */
router.get('/', MateriaisController.listar);

/**
 * GET /api/materiais/estoque/baixo
 * Listar materiais com estoque abaixo do mínimo
 * NOTA: Esta rota deve estar ANTES da rota /:id para evitar conflito
 */
router.get('/estoque/baixo', MateriaisController.listarBaixoEstoque);

/**
 * GET /api/materiais/historico
 * Listar histórico de movimentações do estoque
 * NOTA: Esta rota deve estar ANTES da rota /:id para evitar conflito
 */
router.get('/historico', MateriaisController.listarHistorico);

/**
 * GET /api/materiais/:id
 * Obter um material específico por ID
 */
router.get('/:id', MateriaisController.obter);

/**
 * POST /api/materiais
 * Criar novo material
 * Body: { codigo_barras, nome, quantidade_atual, quantidade_minima, preco_custo, margem_lucro, preco_manual }
 */
router.post('/', MateriaisController.criar);

/**
 * PUT /api/materiais/:id
 * Atualizar dados de um material
 * Body: { codigo_barras, nome, quantidade_atual, quantidade_minima, preco_custo, margem_lucro, preco_manual }
 */
router.put('/:id', MateriaisController.atualizar);

/**
 * PUT /api/materiais/:id/quantidade
 * Atualizar quantidade (somar ou subtrair)
 * Body: { diferenca: number } (positivo para adicionar, negativo para subtrair)
 */
router.put('/:id/quantidade', MateriaisController.atualizarQuantidade);

/**
 * DELETE /api/materiais/:id
 * Deletar um material
 */
router.delete('/:id', MateriaisController.deletar);

module.exports = router;
