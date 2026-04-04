-- Script DDL para o projeto IntelliStock
-- Banco de dados: estoque_db

CREATE TABLE IF NOT EXISTS materiais (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo_barras VARCHAR(50) NOT NULL UNIQUE,
  nome VARCHAR(150) NOT NULL,
  fornecedor VARCHAR(150) NOT NULL DEFAULT 'Nao informado',
  quantidade_atual INT NOT NULL DEFAULT 0,
  quantidade_minima INT NOT NULL DEFAULT 10,
  preco_custo DECIMAL(10, 2) NOT NULL DEFAULT 0,
  margem_lucro DECIMAL(5, 2) NOT NULL DEFAULT 0,
  preco_manual DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_codigo_barras (codigo_barras),
  INDEX idx_quantidade (quantidade_atual),
  INDEX idx_fornecedor (fornecedor)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ajuste para bancos existentes antes desta coluna (compativel com MySQL 5.7+)
SET @col_fornecedor_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'materiais'
    AND COLUMN_NAME = 'fornecedor'
);
SET @sql_add_fornecedor := IF(
  @col_fornecedor_exists = 0,
  'ALTER TABLE materiais ADD COLUMN fornecedor VARCHAR(150) NOT NULL DEFAULT ''Nao informado'' AFTER nome',
  'SELECT 1'
);
PREPARE stmt_add_fornecedor FROM @sql_add_fornecedor;
EXECUTE stmt_add_fornecedor;
DEALLOCATE PREPARE stmt_add_fornecedor;

CREATE TABLE IF NOT EXISTS alertas_estoque (
  id INT AUTO_INCREMENT PRIMARY KEY,
  material_id INT NOT NULL,
  tipo_alerta VARCHAR(50) NOT NULL,
  mensagem VARCHAR(255) NOT NULL,
  data_alerta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (material_id) REFERENCES materiais(id) ON DELETE CASCADE,
  INDEX idx_material_id (material_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id INT AUTO_INCREMENT PRIMARY KEY,
  material_id INT NULL,
  material_nome_snapshot VARCHAR(150) NOT NULL,
  tipo_movimento ENUM('CADASTRO', 'AJUSTE', 'EDICAO', 'REMOCAO') NOT NULL,
  quantidade_delta INT NOT NULL DEFAULT 0,
  quantidade_anterior INT NOT NULL DEFAULT 0,
  quantidade_atual INT NOT NULL DEFAULT 0,
  usuario_nome VARCHAR(100) NOT NULL DEFAULT 'Sistema',
  observacao VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (material_id) REFERENCES materiais(id) ON DELETE SET NULL,
  INDEX idx_mov_material (material_id),
  INDEX idx_mov_data (created_at),
  INDEX idx_mov_tipo (tipo_movimento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER $$

DROP TRIGGER IF EXISTS tr_verificar_quantidade_minima_insert$$
CREATE TRIGGER tr_verificar_quantidade_minima_insert
AFTER INSERT ON materiais
FOR EACH ROW
BEGIN
  IF NEW.quantidade_atual < NEW.quantidade_minima THEN
    INSERT INTO alertas_estoque (material_id, tipo_alerta, mensagem, data_alerta)
    VALUES (NEW.id, 'BAIXA_QUANTIDADE', CONCAT('Material ', NEW.nome, ' abaixo do minimo'), NOW());
  END IF;
END$$

DROP TRIGGER IF EXISTS tr_verificar_quantidade_minima_update$$
CREATE TRIGGER tr_verificar_quantidade_minima_update
AFTER UPDATE ON materiais
FOR EACH ROW
BEGIN
  IF NEW.quantidade_atual < NEW.quantidade_minima AND OLD.quantidade_atual >= OLD.quantidade_minima THEN
    INSERT INTO alertas_estoque (material_id, tipo_alerta, mensagem, data_alerta)
    VALUES (NEW.id, 'BAIXA_QUANTIDADE', CONCAT('Material ', NEW.nome, ' abaixo do minimo'), NOW());
  END IF;
END$$

DELIMITER ;

-- ==================== AUTENTICACAO ====================

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS codigos_verificacao (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  token_temp VARCHAR(64) NOT NULL UNIQUE,
  codigo VARCHAR(6) NOT NULL,
  expira_em TIMESTAMP NOT NULL,
  usado TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_token_temp (token_temp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== INSUMOS ====================

CREATE TABLE IF NOT EXISTS fornecedores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL UNIQUE,
  tempo_espera_dias INT NOT NULL DEFAULT 7,
  contato VARCHAR(255),
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fornecedores_nome (nome),
  INDEX idx_fornecedores_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS insumos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(200) NOT NULL UNIQUE,
  preco_custo_un DECIMAL(10, 4) NOT NULL,
  qtd_atual DECIMAL(12, 4) NOT NULL DEFAULT 0,
  unidade ENUM('kg', 'un', 'ml', 'l', 'g') NOT NULL DEFAULT 'un',
  id_fornecedor_pref INT NOT NULL,
  descricao TEXT,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_insumos_nome (nome),
  INDEX idx_insumos_ativo (ativo),
  INDEX idx_insumos_fornecedor (id_fornecedor_pref),
  FOREIGN KEY (id_fornecedor_pref) REFERENCES fornecedores(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS estoque_seguranca (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_insumo INT NOT NULL UNIQUE,
  consumo_medio_diario DECIMAL(10, 4) NOT NULL DEFAULT 0,
  qtd_seguranca_minima DECIMAL(10, 4) NOT NULL DEFAULT 0,
  ponto_pedido DECIMAL(10, 4) NOT NULL DEFAULT 0,
  data_ultima_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_estoque_seguranca_insumo (id_insumo),
  FOREIGN KEY (id_insumo) REFERENCES insumos(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
