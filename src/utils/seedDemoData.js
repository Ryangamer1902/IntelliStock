const bcrypt = require('bcryptjs');

const demoUsers = [
  { nome: 'Usuário Demo', email: 'demo@intellistock.com', senha: '123456' },
  { nome: 'Cliente IntelliStock', email: 'cliente@intellistock.com', senha: '123456' }
];

const demoMateriais = [
  { codigo_barras: '7891234000010', nome: 'Parafuso M6 Inox', fornecedor: 'MetalSul Distribuidora', quantidade_atual: 250, quantidade_minima: 100, preco_custo: 0.35, margem_lucro: 30, preco_manual: 0.45 },
  { codigo_barras: '7891234000027', nome: 'Porca Sextavada M6', fornecedor: 'MetalSul Distribuidora', quantidade_atual: 180, quantidade_minima: 100, preco_custo: 0.22, margem_lucro: 35, preco_manual: 0.30 },
  { codigo_barras: '7891234000034', nome: 'Chapa de Aço 2mm', fornecedor: 'Aço Forte Chapas', quantidade_atual: 8, quantidade_minima: 20, preco_custo: 39.90, margem_lucro: 22, preco_manual: 48.90 },
  { codigo_barras: '7891234000041', nome: 'Cabo Elétrico 2.5mm (metro)', fornecedor: 'EletroCabos Brasil', quantidade_atual: 0, quantidade_minima: 50, preco_custo: 2.90, margem_lucro: 29, preco_manual: 3.75 },
  { codigo_barras: '7891234000058', nome: 'Luva de Proteção par', fornecedor: 'SegMais EPIs', quantidade_atual: 15, quantidade_minima: 10, preco_custo: 9.20, margem_lucro: 30, preco_manual: 12.00 },
  { codigo_barras: '7891234000065', nome: 'Tinta Spray Preta 400ml', fornecedor: 'Química Rápida', quantidade_atual: 4, quantidade_minima: 10, preco_custo: 14.00, margem_lucro: 32, preco_manual: 18.50 },
  { codigo_barras: '7891234000072', nome: 'Rolo de Fita Isolante', fornecedor: 'EletroCabos Brasil', quantidade_atual: 32, quantidade_minima: 15, preco_custo: 3.70, margem_lucro: 32, preco_manual: 4.90 }
];

const demoMovimentacoes = [
  { codigo_barras: '7891234000010', tipo_movimento: 'CADASTRO', quantidade_delta: 250, quantidade_anterior: 0, quantidade_atual: 250, usuario_nome: 'Mariana', observacao: 'Carga inicial do catálogo demo' },
  { codigo_barras: '7891234000027', tipo_movimento: 'CADASTRO', quantidade_delta: 180, quantidade_anterior: 0, quantidade_atual: 180, usuario_nome: 'Mariana', observacao: 'Carga inicial do catálogo demo' },
  { codigo_barras: '7891234000034', tipo_movimento: 'AJUSTE', quantidade_delta: -12, quantidade_anterior: 20, quantidade_atual: 8, usuario_nome: 'Caio', observacao: 'Baixa após separação de pedido' },
  { codigo_barras: '7891234000041', tipo_movimento: 'AJUSTE', quantidade_delta: -50, quantidade_anterior: 50, quantidade_atual: 0, usuario_nome: 'Rafaela', observacao: 'Consumo total em manutenção' },
  { codigo_barras: '7891234000058', tipo_movimento: 'CADASTRO', quantidade_delta: 15, quantidade_anterior: 0, quantidade_atual: 15, usuario_nome: 'Diego', observacao: 'Carga inicial do catálogo demo' },
  { codigo_barras: '7891234000065', tipo_movimento: 'AJUSTE', quantidade_delta: -6, quantidade_anterior: 10, quantidade_atual: 4, usuario_nome: 'Diego', observacao: 'Baixa por uso interno' },
  { codigo_barras: '7891234000072', tipo_movimento: 'CADASTRO', quantidade_delta: 32, quantidade_anterior: 0, quantidade_atual: 32, usuario_nome: 'Mariana', observacao: 'Carga inicial do catálogo demo' }
];

const demoInsumos = [
  { nome: 'Resina Epóxi', preco_custo_un: 42.75, qtd_atual: 180.5, unidade: 'kg', fornecedor_nome: 'Pesca Química LTDA', tempo_espera_dias: 8, ponto_pedido: 120, consumo_medio_diario: 11.5, qtd_seguranca_minima: 28 },
  { nome: 'Corante Fluorescente Azul', preco_custo_un: 9.8, qtd_atual: 52, unidade: 'ml', fornecedor_nome: 'ColorMix Brasil', tempo_espera_dias: 5, ponto_pedido: 40, consumo_medio_diario: 5.2, qtd_seguranca_minima: 14 },
  { nome: 'Anzol Nº 4', preco_custo_un: 0.74, qtd_atual: 900, unidade: 'un', fornecedor_nome: 'Aco Forte Insumos', tempo_espera_dias: 10, ponto_pedido: 500, consumo_medio_diario: 33, qtd_seguranca_minima: 170 },
  { nome: 'Glitter Holográfico', preco_custo_un: 18.2, qtd_atual: 0, unidade: 'g', fornecedor_nome: 'ColorMix Brasil', tempo_espera_dias: 5, ponto_pedido: 30, consumo_medio_diario: 3.5, qtd_seguranca_minima: 12.5 },
  { nome: 'Embalagem ZIP 12x18', preco_custo_un: 0.39, qtd_atual: 320, unidade: 'un', fornecedor_nome: 'PackSul', tempo_espera_dias: 6, ponto_pedido: 250, consumo_medio_diario: 22, qtd_seguranca_minima: 118 }
];

async function seedDemoUsers(connection) {
  for (const user of demoUsers) {
    const [existing] = await connection.query('SELECT id FROM usuarios WHERE email = ? LIMIT 1', [user.email]);
    if (existing.length > 0) {
      continue;
    }

    const senhaHash = await bcrypt.hash(user.senha, 10);
    await connection.query(
      'INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)',
      [user.nome, user.email, senhaHash]
    );
  }
}

async function seedDemoMateriais(connection) {
  // Busca o primeiro usuario para associar os dados demo
  const [userRows] = await connection.query('SELECT id FROM usuarios ORDER BY id ASC LIMIT 1');
  if (userRows.length === 0) return false;
  const usuarioId = userRows[0].id;

  const [countRows] = await connection.query('SELECT COUNT(*) AS total FROM materiais WHERE usuario_id = ?', [usuarioId]);
  if (Number(countRows[0].total) > 0) {
    return false;
  }

  for (const material of demoMateriais) {
    await connection.query(
      `INSERT INTO materiais
       (usuario_id, codigo_barras, nome, fornecedor, quantidade_atual, quantidade_minima, preco_custo, margem_lucro, preco_manual)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuarioId,
        material.codigo_barras,
        material.nome,
        material.fornecedor,
        material.quantidade_atual,
        material.quantidade_minima,
        material.preco_custo,
        material.margem_lucro,
        material.preco_manual
      ]
    );
  }

  const [movCountRows] = await connection.query('SELECT COUNT(*) AS total FROM movimentacoes_estoque WHERE usuario_id = ?', [usuarioId]);
  if (Number(movCountRows[0].total) === 0) {
    const [materialRows] = await connection.query('SELECT id, codigo_barras, nome FROM materiais WHERE usuario_id = ?', [usuarioId]);
    const materialByCodigo = new Map(materialRows.map((row) => [row.codigo_barras, row]));

    for (const mov of demoMovimentacoes) {
      const material = materialByCodigo.get(mov.codigo_barras);
      if (!material) {
        continue;
      }

      await connection.query(
        `INSERT INTO movimentacoes_estoque
         (usuario_id, material_id, material_nome_snapshot, tipo_movimento, quantidade_delta, quantidade_anterior, quantidade_atual, usuario_nome, observacao)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          usuarioId,
          material.id,
          material.nome,
          mov.tipo_movimento,
          mov.quantidade_delta,
          mov.quantidade_anterior,
          mov.quantidade_atual,
          mov.usuario_nome,
          mov.observacao
        ]
      );
    }
  }

  return true;
}

async function seedDemoInsumos(connection) {
  // Busca o primeiro usuario para associar os dados demo
  const [userRows] = await connection.query('SELECT id FROM usuarios ORDER BY id ASC LIMIT 1');
  if (userRows.length === 0) return false;
  const usuarioId = userRows[0].id;

  const [countRows] = await connection.query('SELECT COUNT(*) AS total FROM insumos WHERE usuario_id = ?', [usuarioId]);
  if (Number(countRows[0].total) > 0) {
    return false;
  }

  for (const insumo of demoInsumos) {
    const [supplierRows] = await connection.query('SELECT id FROM fornecedores WHERE nome = ? LIMIT 1', [insumo.fornecedor_nome]);
    let fornecedorId = supplierRows[0] && supplierRows[0].id;

    if (!fornecedorId) {
      const [insertSupplier] = await connection.query(
        'INSERT INTO fornecedores (nome, tempo_espera_dias) VALUES (?, ?)',
        [insumo.fornecedor_nome, insumo.tempo_espera_dias]
      );
      fornecedorId = insertSupplier.insertId;
    }

    const [insertInsumo] = await connection.query(
      `INSERT INTO insumos
       (usuario_id, nome, preco_custo_un, qtd_atual, unidade, id_fornecedor_pref, descricao)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        usuarioId,
        insumo.nome,
        insumo.preco_custo_un,
        insumo.qtd_atual,
        insumo.unidade,
        fornecedorId,
        'Registro demo importado automaticamente do modo mock.'
      ]
    );

    await connection.query(
      `INSERT INTO estoque_seguranca
       (id_insumo, consumo_medio_diario, qtd_seguranca_minima, ponto_pedido)
       VALUES (?, ?, ?, ?)`,
      [insertInsumo.insertId, insumo.consumo_medio_diario, insumo.qtd_seguranca_minima, insumo.ponto_pedido]
    );
  }

  return true;
}

async function seedDemoData(db) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    await seedDemoUsers(connection);
    const materiaisSeeded = await seedDemoMateriais(connection);
    const insumosSeeded = await seedDemoInsumos(connection);
    await connection.commit();

    if (materiaisSeeded || insumosSeeded) {
      console.log('✓ Dados demo importados no banco para uso em modo API');
    }
  } catch (error) {
    await connection.rollback();

    if (error && error.code === 'ER_NO_SUCH_TABLE') {
      console.warn('⚠️ Seed demo ignorado porque o schema ainda nao foi aplicado completamente.');
      return;
    }

    console.warn('⚠️ Nao foi possivel importar os dados demo:', error.message);
  } finally {
    connection.release();
  }
}

module.exports = seedDemoData;