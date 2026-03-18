-- Script DDL para criação da tabela materiais
-- Banco de dados: estoque_db

CREATE TABLE IF NOT EXISTS materiais (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo_barras VARCHAR(50) NOT NULL UNIQUE,
  nome VARCHAR(150) NOT NULL,
  quantidade_atual INT NOT NULL DEFAULT 0,
  quantidade_minima INT NOT NULL DEFAULT 10,
  preco_manual DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_codigo_barras (codigo_barras),
  INDEX idx_quantidade (quantidade_atual)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Trigger para alertar quando a quantidade atual fica abaixo da quantidade mínima
DELIMITER $$

CREATE TRIGGER tr_verificar_quantidade_minima_insert
AFTER INSERT ON materiais
FOR EACH ROW
BEGIN
  IF NEW.quantidade_atual < NEW.quantidade_minima THEN
    INSERT INTO alertas_estoque (material_id, tipo_alerta, mensagem, data_alerta)
    VALUES (NEW.id, 'BAIXA_QUANTIDADE', CONCAT('Material ', NEW.nome, ' abaixo do mínimo'), NOW());
  END IF;
END$$

CREATE TRIGGER tr_verificar_quantidade_minima_update
AFTER UPDATE ON materiais
FOR EACH ROW
BEGIN
  IF NEW.quantidade_atual < NEW.quantidade_minima AND OLD.quantidade_atual >= OLD.quantidade_minima THEN
    INSERT INTO alertas_estoque (material_id, tipo_alerta, mensagem, data_alerta)
    VALUES (NEW.id, 'BAIXA_QUANTIDADE', CONCAT('Material ', NEW.nome, ' abaixo do mínimo'), NOW());
  END IF;
END$$

DELIMITER ;

-- Tabela de alertas (opcional, para suportar os triggers)
CREATE TABLE IF NOT EXISTS alertas_estoque (
  id INT AUTO_INCREMENT PRIMARY KEY,
  material_id INT NOT NULL,
  tipo_alerta VARCHAR(50) NOT NULL,
  mensagem VARCHAR(255) NOT NULL,
  data_alerta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (material_id) REFERENCES materiais(id) ON DELETE CASCADE,
  INDEX idx_material_id (material_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== AUTENTICAÇÃO ====================

-- Tabela de usuários do sistema
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de códigos de verificação em duas etapas (2FA)
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
