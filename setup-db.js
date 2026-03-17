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

console.log('\n🔧 Assistente de Configuração do Banco de Dados\n');
console.log('=' .repeat(50));

// Ler arquivo .env.example para valores padrão
let envContent = '';
try {
  envContent = fs.readFileSync(envExamplePath, 'utf-8');
} catch (err) {
  console.error('❌ Erro ao ler .env.example');
  process.exit(1);
}

const questions = [
  { key: 'DB_HOST', label: 'Host do banco (padrão: localhost)', default: 'localhost' },
  { key: 'DB_USER', label: 'Usuário do MySQL (padrão: root)', default: 'root' },
  { key: 'DB_PASSWORD', label: 'Senha do MySQL (pressione Enter para vazio)', default: '' },
  { key: 'DB_NAME', label: 'Nome do banco (padrão: estoque_db)', default: 'estoque_db' },
  { key: 'DB_PORT', label: 'Porta do MySQL (padrão: 3306)', default: '3306' },
  { key: 'PORT', label: 'Porta da aplicação (padrão: 3000)', default: '3000' },
  { key: 'NODE_ENV', label: 'Ambiente (development/production)', default: 'development' }
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
      const displayValue = key === 'DB_PASSWORD' ? '***' : value;
      console.log(`  ${key}: ${displayValue}`);
    });
    
    console.log('─'.repeat(50));
    console.log('\n📝 Próximos passos:');
    console.log('  1. Criar banco de dados MySQL: estoque_db');
    console.log('  2. Executar script SQL: src/database/schema.sql');
    console.log('  3. Iniciar servidor: npm run dev\n');
    
  } catch (err) {
    console.error('❌ Erro ao salvar .env:', err.message);
    process.exit(1);
  }

  rl.close();
};

askQuestion();
