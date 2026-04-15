// src/routes/fornecedores.routes.js

const express = require('express');
const router = express.Router();
const FornecedoresController = require('../controllers/fornecedoresController');
const authMiddleware = require('../middleware/authMiddleware');

// Proteger todas as rotas com autenticação
router.use(authMiddleware);

// GET /api/fornecedores - Listar todos os fornecedores
router.get('/', FornecedoresController.listar);

// GET /api/fornecedores/:id - Obter um fornecedor específico
router.get('/:id', FornecedoresController.obter);

// POST /api/fornecedores - Criar novo fornecedor
router.post('/', FornecedoresController.criar);

// PUT /api/fornecedores/:id - Atualizar fornecedor
router.put('/:id', FornecedoresController.atualizar);

// DELETE /api/fornecedores/:id - Deletar fornecedor
router.delete('/:id', FornecedoresController.deletar);

module.exports = router;
