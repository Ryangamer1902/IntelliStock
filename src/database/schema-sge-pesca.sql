-- ============================================================================
-- ESQUEMA DE BANCO DE DADOS: SGE-PESCA (Sistema de Gestão de Estoque - Pesca)
-- ============================================================================
-- Projeto: Fábrica de Iscas Artificiais
-- Foco: Controle de insumos, produtos finais, sazonalidade e ponto de reordenação
-- Motor: InnoDB | Charset: UTF-8mb4 | Versão: MySQL 5.7+
-- ============================================================================

-- Criar banco de dados
CREATE DATABASE IF NOT EXISTS sge_pesca CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sge_pesca;

-- ============================================================================
-- TABELA: fornecedores
-- ============================================================================
-- Descrição: Armazena informações dos fornecedores de insumos
-- Campo crítico: tempo_espera_dias (Lead Time) → usado para calcular ponto de pedido
-- ============================================================================

CREATE TABLE fornecedores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(150) NOT NULL UNIQUE,
    tempo_espera_dias INT NOT NULL DEFAULT 7,
    contato VARCHAR(255),
    valor_minimo_pedido DECIMAL(10, 2) DEFAULT 0.00,
    ativo BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_ativo (ativo),
    INDEX idx_tempo_espera (tempo_espera_dias)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Fornecedores de insumos. Lead Time (tempo_espera_dias) e usado no calculo de ponto de pedido.';

-- ============================================================================
-- TABELA: insumos
-- ============================================================================
-- Descrição: Matérias-primas utilizadas na fabricação de iscas
-- Unidades: kg, un (unidade), ml (mililitro)
-- Obs: Cada insumo tem um fornecedor preferencial, mas pode ter múltiplos
-- ============================================================================

CREATE TABLE insumos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(200) NOT NULL UNIQUE,
    preco_custo_un DECIMAL(10, 4) NOT NULL,
    qtd_atual DECIMAL(12, 4) NOT NULL DEFAULT 0.00,
    unidade ENUM('kg', 'un', 'ml', 'l', 'g') NOT NULL DEFAULT 'un',
    id_fornecedor_pref INT NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_ativo (ativo),
    INDEX idx_fornecedor_pref (id_fornecedor_pref),
    INDEX idx_nome (nome),
    
    FOREIGN KEY (id_fornecedor_pref) REFERENCES fornecedores(id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Insumos e materias-primas para producao. Rastreia quantidade atual, custo unitario e fornecedor preferencial.';

-- ============================================================================
-- TABELA: produtos_finais
-- ============================================================================
-- Descrição: Iscas artificiais prontas para venda
-- Sazonalidade: Verao = pico de demanda | Inverno = demanda reduzida
-- Obs: Controla estoque pronto para venda (para-rastreabilidade de produção)
-- ============================================================================

CREATE TABLE produtos_finais (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(200) NOT NULL UNIQUE,
    preco_venda DECIMAL(10, 2) NOT NULL,
    estoque_atual_pronto DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    categoria_sazonal ENUM('Verao', 'Inverno', 'Ambos') NOT NULL DEFAULT 'Ambos',
    margem_lucro_percentual DECIMAL(5, 2) DEFAULT 0.00,
    ativo BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_ativo (ativo),
    INDEX idx_sazonal (categoria_sazonal),
    INDEX idx_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Produtos finais. Controla estoque pronto e sazonalidade para inteligencia de demanda.';

-- ============================================================================
-- TABELA: ficha_tecnica
-- ============================================================================
-- Descrição: "Receita" de cada produto | Ligação entre produtos_finais e insumos
-- Uso: Uma isca pode precisar de múltiplos insumos em quantidades diferentes
-- Exemplo: Isca_Verão = 100g de resina + 5ml de corante + 2 anzóis
-- ============================================================================

CREATE TABLE ficha_tecnica (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_produto INT NOT NULL,
    id_insumo INT NOT NULL,
    quantidade_necessaria DECIMAL(10, 4) NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_produto_insumo (id_produto, id_insumo),
    INDEX idx_id_produto (id_produto),
    INDEX idx_id_insumo (id_insumo),
    
    FOREIGN KEY (id_produto) REFERENCES produtos_finais(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    FOREIGN KEY (id_insumo) REFERENCES insumos(id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Receita do produto. Define a quantidade de cada insumo necessaria para produzir uma unidade do produto final.';

-- ============================================================================
-- TABELA: estoque_seguranca
-- ============================================================================
-- Descrição: Inteligência de reordenação | Evita interrupção de produção
-- Fórmula do Ponto de Pedido: ponto_pedido = (consumo_medio_diario * tempo_espera) + qtd_seguranca_minima
-- Exemplo: (50 un/dia * 7 dias) + 100 = 450 un (quando pedir)
-- ============================================================================

CREATE TABLE estoque_seguranca (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_insumo INT NOT NULL UNIQUE,
    consumo_medio_diario DECIMAL(10, 4) NOT NULL DEFAULT 0.00,
    qtd_seguranca_minima DECIMAL(10, 4) NOT NULL DEFAULT 0.00,
    ponto_pedido DECIMAL(10, 4) NOT NULL DEFAULT 0.00,
    data_ultima_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_id_insumo (id_insumo),
    
    FOREIGN KEY (id_insumo) REFERENCES insumos(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Parametros de reordenacao inteligente. O ponto de pedido e mantido por triggers com base no lead time do fornecedor.';

-- ============================================================================
-- TABELA: movimentacao_vendas
-- ============================================================================
-- Descrição: Registro de todas as saídas de estoque (vendas)
-- Uso: Auditoria, cálculo de média diária de consumo, relatórios
-- Obs: Permite rastreamento completo de cada venda
-- ============================================================================

CREATE TABLE movimentacao_vendas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_produto INT NOT NULL,
    quantidade DECIMAL(10, 2) NOT NULL,
    valor_unitario DECIMAL(10, 2) NOT NULL,
    valor_total DECIMAL(12, 2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
    data_venda TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observacoes TEXT,
    
    INDEX idx_id_produto (id_produto),
    INDEX idx_data_venda (data_venda),
    INDEX idx_produto_data (id_produto, data_venda),
    
    FOREIGN KEY (id_produto) REFERENCES produtos_finais(id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Historico de vendas e saidas. Base para calcular consumo medio diario e projecao de demanda sazonal.';

-- ============================================================================
-- TABELA ADICIONAL: pedidos_compra (Bonus - para rastreabilidade completa)
-- ============================================================================
-- Descrição: Armazena histórico de pedidos de recompra
-- Status: pendente, recebido, cancelado
-- ============================================================================

CREATE TABLE pedidos_compra (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_insumo INT NOT NULL,
    id_fornecedor INT NOT NULL,
    quantidade_pedida DECIMAL(10, 4) NOT NULL,
    valor_total DECIMAL(12, 2),
    status ENUM('pendente', 'recebido', 'cancelado') DEFAULT 'pendente',
    data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_recebimento TIMESTAMP NULL,
    observacoes TEXT,
    
    INDEX idx_id_insumo (id_insumo),
    INDEX idx_id_fornecedor (id_fornecedor),
    INDEX idx_status (status),
    INDEX idx_data_pedido (data_pedido),
    
    FOREIGN KEY (id_insumo) REFERENCES insumos(id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    FOREIGN KEY (id_fornecedor) REFERENCES fornecedores(id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Rastreamento de pedidos de compra. Permite acompanhar lead time real e gerar alertas de atraso.';

DELIMITER $$

CREATE TRIGGER trg_estoque_seguranca_bi
BEFORE INSERT ON estoque_seguranca
FOR EACH ROW
BEGIN
    DECLARE v_tempo_espera_dias INT DEFAULT 0;

    SELECT f.tempo_espera_dias
      INTO v_tempo_espera_dias
      FROM insumos i
      JOIN fornecedores f ON f.id = i.id_fornecedor_pref
     WHERE i.id = NEW.id_insumo;

    SET NEW.ponto_pedido = (NEW.consumo_medio_diario * v_tempo_espera_dias) + NEW.qtd_seguranca_minima;
END$$

CREATE TRIGGER trg_estoque_seguranca_bu
BEFORE UPDATE ON estoque_seguranca
FOR EACH ROW
BEGIN
    DECLARE v_tempo_espera_dias INT DEFAULT 0;

    SELECT f.tempo_espera_dias
      INTO v_tempo_espera_dias
      FROM insumos i
      JOIN fornecedores f ON f.id = i.id_fornecedor_pref
     WHERE i.id = NEW.id_insumo;

    SET NEW.ponto_pedido = (NEW.consumo_medio_diario * v_tempo_espera_dias) + NEW.qtd_seguranca_minima;
END$$

CREATE TRIGGER trg_fornecedores_au_recalcula_ponto_pedido
AFTER UPDATE ON fornecedores
FOR EACH ROW
BEGIN
    IF NEW.tempo_espera_dias <> OLD.tempo_espera_dias THEN
        UPDATE estoque_seguranca es
        JOIN insumos i ON i.id = es.id_insumo
           SET es.ponto_pedido = (es.consumo_medio_diario * NEW.tempo_espera_dias) + es.qtd_seguranca_minima
         WHERE i.id_fornecedor_pref = NEW.id;
    END IF;
END$$

CREATE TRIGGER trg_insumos_au_recalcula_ponto_pedido
AFTER UPDATE ON insumos
FOR EACH ROW
BEGIN
    DECLARE v_tempo_espera_dias INT DEFAULT 0;

    IF NEW.id_fornecedor_pref <> OLD.id_fornecedor_pref THEN
        SELECT tempo_espera_dias
          INTO v_tempo_espera_dias
          FROM fornecedores
         WHERE id = NEW.id_fornecedor_pref;

        UPDATE estoque_seguranca
           SET ponto_pedido = (consumo_medio_diario * v_tempo_espera_dias) + qtd_seguranca_minima
         WHERE id_insumo = NEW.id;
    END IF;
END$$

DELIMITER ;

-- ============================================================================
-- VIEWS ÚTEIS PARA RELATÓRIOS E DASHBOARDS
-- ============================================================================

-- View: Insumos com alerta de reordenação
CREATE VIEW vw_insumos_alerta_reorderacao AS
SELECT 
    i.id,
    i.nome AS insumo,
    i.qtd_atual,
    es.ponto_pedido,
    es.ponto_pedido - i.qtd_atual AS diferenca,
    CASE 
        WHEN i.qtd_atual <= es.ponto_pedido THEN 'COMPRAR URGENTE'
        WHEN i.qtd_atual <= (es.ponto_pedido * 1.1) THEN 'ATENÇÃO - ESTOQUE BAIXO'
        ELSE 'OK'
    END AS status_estoque,
    f.nome AS fornecedor,
    f.tempo_espera_dias,
    i.unidade
FROM insumos i
JOIN estoque_seguranca es ON i.id = es.id_insumo
JOIN fornecedores f ON i.id_fornecedor_pref = f.id
WHERE i.ativo = TRUE;

-- View: Consumo médio diário dos últimos 30 dias (para calibrar estoque_seguranca)
CREATE VIEW vw_consumo_medio_mensal AS
SELECT 
    pf.id,
    pf.nome AS produto,
    COUNT(mv.id) AS qtd_vendas,
    SUM(mv.quantidade) AS total_vendido,
    ROUND(SUM(mv.quantidade) / 30, 2) AS consumo_medio_diario,
    pf.categoria_sazonal,
    DATE(mv.data_venda) AS periodo
FROM produtos_finais pf
LEFT JOIN movimentacao_vendas mv ON pf.id = mv.id_produto 
    AND mv.data_venda >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
WHERE pf.ativo = TRUE
GROUP BY pf.id, DATE(mv.data_venda)
ORDER BY pf.id, DATE(mv.data_venda) DESC;

-- ============================================================================
-- ÍNDICES ADICIONAIS PARA PERFORMANCE
-- ============================================================================

ALTER TABLE movimentacao_vendas ADD INDEX idx_data_produto (data_venda, id_produto);

-- ============================================================================
-- COMENTÁRIOS GERAIS PARA DOCUMENTAÇÃO DO TCC
-- ============================================================================
/*
 * ARQUITETURA DO BANCO:
 *
 * 1. FORNECEDORES → Define o lead time (tempo_espera_dias)
 *    • Crítico para calcular ponto de pedido
 *    • Relação 1:N com INSUMOS
 *
 * 2. INSUMOS → Matérias-primas
 *    • Rastreia quantidade atual e custo
 *    • Ligado ao fornecedor preferencial
 *    • Relação N:M com PRODUTOS_FINAIS via FICHA_TECNICA
 *
 * 3. PRODUTOS_FINAIS → Iscas artificiais prontas
 *    • Suporta sazonalidade (Verão/Inverno)
 *    • Controla estoque pronto para venda
 *
 * 4. FICHA_TECNICA → Bill of Materials (BOM)
 *    • Define "receita" de cada produto
 *    • Exemplo: Para fazer 1 unidade de Isca_Gold, precisa de:
 *      - 100g de resina epóxi
 *      - 5ml de corante fluorescente
 *      - 2 anzóis nº 4
 *
 * 5. ESTOQUE_SEGURANCA → Inteligência de reordenação
 *    • Calcula automaticamente ponto de pedido
 *    • Fórmula: Ponto = (Consumo Diário × Lead Time) + Segurança
 *    • Evita interrupção de produção
 *    • Integra dados de FORNECEDORES e INSUMOS
 *
 * 6. MOVIMENTACAO_VENDAS → Auditoria completa de saídas
 *    • Rastreia cada venda
 *    • Base para calcular consumo médio diário
 *    • Permite análise de sazonalidade
 *
 * 7. PEDIDOS_COMPRA → Rastreabilidade de compras (Bonus)
 *    • Permite validar se lead time real bate com estimado
 *    • Suporta análise de atrasos de fornecedores
 *
 * FLUXO DE USO:
 * ─────────────
 * 1. Vendedor registra venda → MOVIMENTACAO_VENDAS
 * 2. Sistema calcula consumo médio diário dos últimos 30 dias
 * 3. Sistema compara qtd_atual vs ponto_pedido (via VIEW)
 * 4. Se qtd_atual < ponto_pedido → Alerta de recompra
 * 5. Comprador cria pedido de compra → PEDIDOS_COMPRA
 * 6. Fornecedor entrega → atualiza qtd_atual em INSUMOS
 *
 * DIFERENCIAL PARA O TCC:
 * ──────────────────────
 * • Inteligência de sazonalidade (Verão/Inverno)
 * • Cálculo automático de ponto de pedido (GENERATED COLUMN)
 * • Rastreabilidade 360° (Fornecedor → Insumo → Produto → Venda)
 * • Views prontas para dashboards e alertas
 * • Integridade referencial com InnoDB
 */
