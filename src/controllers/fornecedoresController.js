// src/controllers/fornecedoresController.js

const Fornecedor = require('../models/Fornecedor');

class FornecedoresController {
  /**
   * GET /api/fornecedores
   * Listar todos os fornecedores do usuário
   */
  static async listar(req, res) {
    try {
      const usuarioId = Number(req.usuario_id);
      if (!usuarioId || !Number.isInteger(usuarioId) || usuarioId <= 0) {
        return res.status(401).json({ erro: 'Usuário inválido' });
      }

      const termo = String(req.query.q || '').trim();
      const fornecedores = termo 
        ? await Fornecedor.search(usuarioId, termo)
        : await Fornecedor.findAll(usuarioId);

      return res.json(fornecedores);
    } catch (err) {
      console.error('Erro ao listar fornecedores:', err);
      return res.status(500).json({ erro: 'Erro ao listar fornecedores' });
    }
  }

  /**
   * GET /api/fornecedores/:id
   * Obter um fornecedor específico
   */
  static async obter(req, res) {
    try {
      const usuarioId = Number(req.usuario_id);
      const fornecedorId = Number(req.params.id);

      if (!usuarioId || !Number.isInteger(usuarioId) || usuarioId <= 0) {
        return res.status(401).json({ erro: 'Usuário inválido' });
      }

      if (!fornecedorId || !Number.isInteger(fornecedorId) || fornecedorId <= 0) {
        return res.status(400).json({ erro: 'ID do fornecedor inválido' });
      }

      const fornecedor = await Fornecedor.findById(fornecedorId, usuarioId);
      if (!fornecedor) {
        return res.status(404).json({ erro: 'Fornecedor não encontrado' });
      }

      return res.json(fornecedor);
    } catch (err) {
      console.error('Erro ao obter fornecedor:', err);
      return res.status(500).json({ erro: 'Erro ao obter fornecedor' });
    }
  }

  /**
   * POST /api/fornecedores
   * Criar um novo fornecedor
   */
  static async criar(req, res) {
    try {
      const usuarioId = Number(req.usuario_id);
      if (!usuarioId || !Number.isInteger(usuarioId) || usuarioId <= 0) {
        return res.status(401).json({ erro: 'Usuário inválido' });
      }

      const { nome, email, telefone, endereco, cidade, estado, cep, tempo_espera_dias, observacoes } = req.body;

      if (!nome || String(nome).trim().length === 0) {
        return res.status(400).json({ erro: 'Nome do fornecedor é obrigatório' });
      }

      const fornecedor = await Fornecedor.create({
        nome: String(nome).trim(),
        email: email ? String(email).trim() : null,
        telefone: telefone ? String(telefone).trim() : null,
        endereco: endereco ? String(endereco).trim() : null,
        cidade: cidade ? String(cidade).trim() : null,
        estado: estado ? String(estado).trim() : null,
        cep: cep ? String(cep).trim() : null,
        tempo_espera_dias: Number(tempo_espera_dias) || 7,
        observacoes: observacoes ? String(observacoes).trim() : null
      }, usuarioId);

      return res.status(201).json(fornecedor);
    } catch (err) {
      console.error('Erro ao criar fornecedor:', err);
      if (err.message.includes('Duplicate')) {
        return res.status(409).json({ erro: 'Fornecedor com este nome já existe' });
      }
      return res.status(500).json({ erro: 'Erro ao criar fornecedor' });
    }
  }

  /**
   * PUT /api/fornecedores/:id
   * Atualizar um fornecedor
   */
  static async atualizar(req, res) {
    try {
      const usuarioId = Number(req.usuario_id);
      const fornecedorId = Number(req.params.id);

      if (!usuarioId || !Number.isInteger(usuarioId) || usuarioId <= 0) {
        return res.status(401).json({ erro: 'Usuário inválido' });
      }

      if (!fornecedorId || !Number.isInteger(fornecedorId) || fornecedorId <= 0) {
        return res.status(400).json({ erro: 'ID do fornecedor inválido' });
      }

      const { nome, email, telefone, endereco, cidade, estado, cep, tempo_espera_dias, observacoes } = req.body;

      if (!nome || String(nome).trim().length === 0) {
        return res.status(400).json({ erro: 'Nome do fornecedor é obrigatório' });
      }

      const fornecedor = await Fornecedor.update(fornecedorId, {
        nome: String(nome).trim(),
        email: email ? String(email).trim() : null,
        telefone: telefone ? String(telefone).trim() : null,
        endereco: endereco ? String(endereco).trim() : null,
        cidade: cidade ? String(cidade).trim() : null,
        estado: estado ? String(estado).trim() : null,
        cep: cep ? String(cep).trim() : null,
        tempo_espera_dias: Number(tempo_espera_dias) || 7,
        observacoes: observacoes ? String(observacoes).trim() : null
      }, usuarioId);

      return res.json(fornecedor);
    } catch (err) {
      console.error('Erro ao atualizar fornecedor:', err);
      if (err.message.includes('not found')) {
        return res.status(404).json({ erro: 'Fornecedor não encontrado' });
      }
      return res.status(500).json({ erro: 'Erro ao atualizar fornecedor' });
    }
  }

  /**
   * DELETE /api/fornecedores/:id
   * Deletar um fornecedor (soft delete - ativo = 0)
   */
  static async deletar(req, res) {
    try {
      const usuarioId = Number(req.usuario_id);
      const fornecedorId = Number(req.params.id);

      if (!usuarioId || !Number.isInteger(usuarioId) || usuarioId <= 0) {
        return res.status(401).json({ erro: 'Usuário inválido' });
      }

      if (!fornecedorId || !Number.isInteger(fornecedorId) || fornecedorId <= 0) {
        return res.status(400).json({ erro: 'ID do fornecedor inválido' });
      }

      const resultado = await Fornecedor.delete(fornecedorId, usuarioId);
      return res.json(resultado);
    } catch (err) {
      console.error('Erro ao deletar fornecedor:', err);
      if (err.message.includes('not found')) {
        return res.status(404).json({ erro: 'Fornecedor não encontrado' });
      }
      return res.status(500).json({ erro: 'Erro ao deletar fornecedor' });
    }
  }
}

module.exports = FornecedoresController;
