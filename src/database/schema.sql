-- Script DDL para o projeto IntelliStock
-- Banco de dados: estoque_db

CREATE TABLE IF NOT EXISTS materiais (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL,
  codigo_barras VARCHAR(50) NOT NULL,
  nome VARCHAR(150) NOT NULL,
  fornecedor VARCHAR(150) NOT NULL DEFAULT 'Nao informado',
  quantidade_atual INT NOT NULL DEFAULT 0,
  quantidade_minima INT NOT NULL DEFAULT 10,
  preco_custo DECIMAL(10, 2) NOT NULL DEFAULT 0,
  margem_lucro DECIMAL(5, 2) NOT NULL DEFAULT 0,
  preco_manual DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuario_codigo (usuario_id, codigo_barras),
  INDEX idx_usuario_id (usuario_id),
  INDEX idx_quantidade (quantidade_atual),
  INDEX idx_fornecedor (fornecedor)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migracao: adicionar usuario_id em materiais (bancos existentes)
SET @col_mat_uid_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'materiais'
    AND COLUMN_NAME = 'usuario_id'
);
SET @sql_mat_uid := IF(
  @col_mat_uid_exists = 0,
  'ALTER TABLE materiais ADD COLUMN usuario_id INT NULL AFTER id, ADD INDEX idx_usuario_id (usuario_id)',
  'SELECT 1'
);
PREPARE stmt_mat_uid FROM @sql_mat_uid;
EXECUTE stmt_mat_uid;
DEALLOCATE PREPARE stmt_mat_uid;

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

CREATE TABLE IF NOT EXISTS materiais_receitas (
  material_id INT NOT NULL,
  usuario_id INT NOT NULL,
  base_quantidade DECIMAL(12, 3) NOT NULL,
  receita_json LONGTEXT NOT NULL,
  custos_extras_json LONGTEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (material_id),
  INDEX idx_materiais_receitas_usuario (usuario_id),
  CONSTRAINT fk_materiais_receitas_material
    FOREIGN KEY (material_id) REFERENCES materiais(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL,
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
  INDEX idx_mov_usuario (usuario_id),
  INDEX idx_mov_material (material_id),
  INDEX idx_mov_data (created_at),
  INDEX idx_mov_tipo (tipo_movimento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migracao: adicionar usuario_id em movimentacoes_estoque (bancos existentes)
SET @col_mov_uid_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'movimentacoes_estoque'
    AND COLUMN_NAME = 'usuario_id'
);
SET @sql_mov_uid := IF(
  @col_mov_uid_exists = 0,
  'ALTER TABLE movimentacoes_estoque ADD COLUMN usuario_id INT NULL AFTER id, ADD INDEX idx_mov_usuario (usuario_id)',
  'SELECT 1'
);
PREPARE stmt_mov_uid FROM @sql_mov_uid;
EXECUTE stmt_mov_uid;
DEALLOCATE PREPARE stmt_mov_uid;

-- Compatibilidade TiDB:
-- TiDB nao suporta TRIGGER (nem comandos de cliente como DELIMITER) da mesma forma que MySQL.
-- O controle de alerta de quantidade minima deve ser feito pela aplicacao
-- (ex.: ao inserir/atualizar materiais, gravar em alertas_estoque quando necessario).

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

CREATE TABLE IF NOT EXISTS tokens_reset_senha (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expira_em TIMESTAMP NOT NULL,
  usado TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_token_reset (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessoes_ativas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expira_em TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_sessoes_token (token),
  INDEX idx_sessoes_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migração: adicionar is_admin em usuarios (bancos existentes)
SET @col_is_admin_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'usuarios'
    AND COLUMN_NAME = 'is_admin'
);
SET @sql_is_admin := IF(
  @col_is_admin_exists = 0,
  'ALTER TABLE usuarios ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT 1'
);
PREPARE stmt_is_admin FROM @sql_is_admin;
EXECUTE stmt_is_admin;
DEALLOCATE PREPARE stmt_is_admin;

-- Assinaturas (planos pagos via Mercado Pago)
CREATE TABLE IF NOT EXISTS assinaturas (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id           INT NOT NULL,
  plano                ENUM('teste','semanal','mensal','anual') NOT NULL,
  status               ENUM('pendente','ativa','cancelada','suspensa','expirada') NOT NULL DEFAULT 'pendente',
  mp_payment_id        VARCHAR(100) NULL,
  cpf_cnpj             VARCHAR(14) NULL,
  card_brand           VARCHAR(40) NULL,
  card_last4           VARCHAR(4) NULL,
  valor_pago           DECIMAL(10,2) NULL,
  data_inicio          TIMESTAMP NULL,
  data_expiracao       TIMESTAMP NULL,
  data_cancelamento    TIMESTAMP NULL,
  renovacao_automatica TINYINT(1) NOT NULL DEFAULT 1,
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_assinatura_usuario (usuario_id),
  INDEX idx_assinaturas_status    (status),
  INDEX idx_assinaturas_expiracao (data_expiracao),
  INDEX idx_mp_payment            (mp_payment_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migração: adicionar campos de cobrança em assinaturas (bancos existentes)
SET @col_ass_cpf_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'assinaturas'
    AND COLUMN_NAME = 'cpf_cnpj'
);
SET @sql_ass_cpf := IF(
  @col_ass_cpf_exists = 0,
  'ALTER TABLE assinaturas ADD COLUMN cpf_cnpj VARCHAR(14) NULL AFTER mp_payment_id',
  'SELECT 1'
);
PREPARE stmt_ass_cpf FROM @sql_ass_cpf;
EXECUTE stmt_ass_cpf;
DEALLOCATE PREPARE stmt_ass_cpf;

SET @col_ass_brand_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'assinaturas'
    AND COLUMN_NAME = 'card_brand'
);
SET @sql_ass_brand := IF(
  @col_ass_brand_exists = 0,
  'ALTER TABLE assinaturas ADD COLUMN card_brand VARCHAR(40) NULL AFTER cpf_cnpj',
  'SELECT 1'
);
PREPARE stmt_ass_brand FROM @sql_ass_brand;
EXECUTE stmt_ass_brand;
DEALLOCATE PREPARE stmt_ass_brand;

ALTER TABLE assinaturas
  MODIFY COLUMN plano ENUM('teste','semanal','mensal','anual') NOT NULL;

SET @col_ass_last4_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'assinaturas'
    AND COLUMN_NAME = 'card_last4'
);
SET @sql_ass_last4 := IF(
  @col_ass_last4_exists = 0,
  'ALTER TABLE assinaturas ADD COLUMN card_last4 VARCHAR(4) NULL AFTER card_brand',
  'SELECT 1'
);
PREPARE stmt_ass_last4 FROM @sql_ass_last4;
EXECUTE stmt_ass_last4;
DEALLOCATE PREPARE stmt_ass_last4;

-- ==================== INSUMOS ====================

CREATE TABLE IF NOT EXISTS fornecedores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(150),
  telefone VARCHAR(20),
  endereco TEXT,
  cidade VARCHAR(100),
  estado VARCHAR(2),
  cep VARCHAR(9),
  tempo_espera_dias INT NOT NULL DEFAULT 7,
  contato VARCHAR(255),
  observacoes TEXT,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuario_fornecedor (usuario_id, nome),
  INDEX idx_fornecedores_nome (nome),
  INDEX idx_fornecedores_usuario (usuario_id),
  INDEX idx_fornecedores_ativo (ativo),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migracao: adicionar usuario_id em fornecedores (bancos existentes)
SET @col_forn_uid_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fornecedores'
    AND COLUMN_NAME = 'usuario_id'
);
SET @sql_forn_uid := IF(
  @col_forn_uid_exists = 0,
  'ALTER TABLE fornecedores ADD COLUMN usuario_id INT NULL AFTER id, ADD UNIQUE KEY uq_usuario_fornecedor (usuario_id, nome), ADD INDEX idx_fornecedores_usuario (usuario_id), ADD CONSTRAINT fk_fornecedores_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt_forn_uid FROM @sql_forn_uid;
EXECUTE stmt_forn_uid;
DEALLOCATE PREPARE stmt_forn_uid;

-- Migracao: adicionar campos de contato em fornecedores (bancos existentes)
SET @col_forn_email_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fornecedores'
    AND COLUMN_NAME = 'email'
);
SET @sql_forn_email := IF(
  @col_forn_email_exists = 0,
  'ALTER TABLE fornecedores ADD COLUMN email VARCHAR(150) AFTER nome',
  'SELECT 1'
);
PREPARE stmt_forn_email FROM @sql_forn_email;
EXECUTE stmt_forn_email;
DEALLOCATE PREPARE stmt_forn_email;

SET @col_forn_telefone_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fornecedores'
    AND COLUMN_NAME = 'telefone'
);
SET @sql_forn_telefone := IF(
  @col_forn_telefone_exists = 0,
  'ALTER TABLE fornecedores ADD COLUMN telefone VARCHAR(20) AFTER email',
  'SELECT 1'
);
PREPARE stmt_forn_telefone FROM @sql_forn_telefone;
EXECUTE stmt_forn_telefone;
DEALLOCATE PREPARE stmt_forn_telefone;

SET @col_forn_endereco_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fornecedores'
    AND COLUMN_NAME = 'endereco'
);
SET @sql_forn_endereco := IF(
  @col_forn_endereco_exists = 0,
  'ALTER TABLE fornecedores ADD COLUMN endereco TEXT AFTER telefone',
  'SELECT 1'
);
PREPARE stmt_forn_endereco FROM @sql_forn_endereco;
EXECUTE stmt_forn_endereco;
DEALLOCATE PREPARE stmt_forn_endereco;

CREATE TABLE IF NOT EXISTS insumos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL,
  nome VARCHAR(200) NOT NULL,
  preco_custo_un DECIMAL(10, 4) NOT NULL,
  qtd_atual DECIMAL(12, 4) NOT NULL DEFAULT 0,
  unidade ENUM('kg', 'un', 'ml', 'l', 'g') NOT NULL DEFAULT 'un',
  id_fornecedor_pref INT NOT NULL,
  descricao TEXT,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuario_insumo_nome (usuario_id, nome),
  INDEX idx_insumos_nome (nome),
  INDEX idx_insumos_ativo (ativo),
  INDEX idx_insumos_usuario (usuario_id),
  INDEX idx_insumos_fornecedor (id_fornecedor_pref),
  FOREIGN KEY (id_fornecedor_pref) REFERENCES fornecedores(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migracao: adicionar usuario_id em insumos (bancos existentes)
SET @col_ins_uid_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'insumos'
    AND COLUMN_NAME = 'usuario_id'
);
SET @sql_ins_uid := IF(
  @col_ins_uid_exists = 0,
  'ALTER TABLE insumos ADD COLUMN usuario_id INT NULL AFTER id, ADD INDEX idx_insumos_usuario (usuario_id)',
  'SELECT 1'
);
PREPARE stmt_ins_uid FROM @sql_ins_uid;
EXECUTE stmt_ins_uid;
DEALLOCATE PREPARE stmt_ins_uid;

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
