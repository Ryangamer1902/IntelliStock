#!/usr/bin/env node

/**
 * Script para auxiliar na configuração do banco de dados
 * Uso: node setup-db.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

function parseEnvFile(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .reduce((acc, line) => {
      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) return acc;

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim().replace(/^"|"$/g, '');
      acc[key] = value;
      return acc;
    }, {});
}

function loadDefaults() {
  let defaults = {};

  try {
    if (fs.existsSync(envExamplePath)) {
      defaults = { ...defaults, ...parseEnvFile(fs.readFileSync(envExamplePath, 'utf-8')) };
    }

    if (fs.existsSync(envPath)) {
      defaults = { ...defaults, ...parseEnvFile(fs.readFileSync(envPath, 'utf-8')) };
    }
  } catch (err) {
    console.warn('⚠️ Não foi possível carregar configurações existentes:', err.message);
  }

  return defaults;
}

const defaults = loadDefaults();

console.log('\n🔧 Assistente de Configuração do Banco de Dados\n');
console.log('=' .repeat(50));

const questions = [
  {
    key: 'DB_HOST',
    label: 'Host do banco (localhost para local, host do provedor para nuvem)',
    default: defaults.DB_HOST || 'localhost'
  },
  {
    key: 'DB_USER',
    label: 'Usuário do MySQL (use o usuário fornecido pelo provedor em banco cloud)',
    default: defaults.DB_USER || 'root'
  },
  { key: 'DB_PASSWORD', label: 'Senha do MySQL (pressione Enter para vazio)', default: defaults.DB_PASSWORD || '' },
  { key: 'DB_NAME', label: 'Nome do banco', default: defaults.DB_NAME || 'estoque_db' },
  {
    key: 'DB_PORT',
    label: 'Porta do MySQL (3306 local, em cloud pode ser 4000 ou a porta do provedor)',
    default: defaults.DB_PORT || '3306'
  },
  { key: 'PORT', label: 'Porta da aplicação', default: defaults.PORT || '3001' },
  { key: 'NODE_ENV', label: 'Ambiente (development/production)', default: defaults.NODE_ENV || 'development' },
  { key: 'MAIL_ENABLED', label: 'Enviar 2FA por e-mail? (true/false)', default: defaults.MAIL_ENABLED || 'false' },
  { key: 'MAIL_USER', label: 'E-mail Gmail que vai enviar os códigos', default: defaults.MAIL_USER || '' },
  { key: 'MAIL_PASS', label: 'App Password do Gmail (16 caracteres)', default: defaults.MAIL_PASS || '' }
];

let config = {};
let currentQuestion = 0;

const askQuestion = () => {
  if (currentQuestion >= questions.length) {
    saveEnv();
    return;
  }

  const q = questions[currentQuestion];
  const prompt = `\n${q.label}\n[${q.default}]: `;

  rl.question(prompt, (answer) => {
    config[q.key] = answer || q.default;
    currentQuestion++;
    askQuestion();
  });
};

const saveEnv = () => {
  console.log('\n' + '='.repeat(50));
  console.log('💾 Salvando configurações...\n');

  const dbHost = String(config.DB_HOST || '').trim().toLowerCase();
  const isLocalHost = dbHost === 'localhost' || dbHost === '127.0.0.1';

  config.DB_SSL = isLocalHost ? 'false' : 'true';
  config.DB_SSL_REJECT_UNAUTHORIZED = isLocalHost ? 'false' : 'false';

  if (String(config.MAIL_ENABLED).toLowerCase() === 'true') {
    config.MAIL_HOST = 'smtp.gmail.com';
    config.MAIL_PORT = '587';
    config.MAIL_SECURE = 'false';
    if (config.MAIL_USER) {
      config.MAIL_FROM = `IntelliStock <${config.MAIL_USER}>`;
    } else {
      config.MAIL_FROM = '';
    }
  } else {
    config.MAIL_HOST = 'smtp.gmail.com';
    config.MAIL_PORT = '587';
    config.MAIL_SECURE = 'false';
    config.MAIL_FROM = '';
  }

  let envText = '';
  
  Object.entries(config).forEach(([key, value]) => {
    envText += `${key}=${value}\n`;
  });

  try {
    fs.writeFileSync(envPath, envText);
    console.log('✓ Arquivo .env criado com sucesso!\n');
    console.log('Configurações salvas:');
    console.log('─'.repeat(50));
    
    Object.entries(config).forEach(([key, value]) => {
      const displayValue = key === 'DB_PASSWORD' || key === 'MAIL_PASS' ? '***' : value;
      console.log(`  ${key}: ${displayValue}`);
    });
    
    console.log('─'.repeat(50));
    console.log('\n📝 Próximos passos:');
    if (isLocalHost) {
      console.log(`  1. Criar banco de dados MySQL: ${config.DB_NAME}`);
      console.log('  2. Executar script SQL: src/database/schema.sql');
      console.log('  3. Iniciar servidor: npm run dev\n');
    } else {
      console.log(`  1. Confirmar acesso remoto ao host: ${config.DB_HOST}:${config.DB_PORT}`);
      console.log(`  2. Criar/importar o schema no banco remoto: ${config.DB_NAME}`);
      console.log('  3. Iniciar servidor: npm run dev\n');
    }

    if (isLocalHost) {
      console.log('ℹ️ Se seu banco for na nuvem, reexecute o assistente e preencha host, usuário e porta do provedor.\n');
    }
    
  } catch (err) {
    console.error('❌ Erro ao salvar .env:', err.message);
    process.exit(1);
  }

  rl.close();
};

askQuestion();
