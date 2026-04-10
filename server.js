require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3001;

// ==================== MIDDLEWARES ====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Servir arquivos estáticos (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// ==================== CONFIGURAÇÃO DO BANCO DE DADOS ====================
let pool = null;
let dbConnected = false;

// Função para inicializar conexão com banco (pode ser chamada depois)
const initializeDatabase = async () => {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'estoque_db',
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const connection = await pool.getConnection();
    console.log('✓ Conexão com banco de dados estabelecida com sucesso');
    connection.release();
    
    dbConnected = true;
    global.db = pool;
    await seedAdmin(pool);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tokens_reset_senha (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        token VARCHAR(64) NOT NULL UNIQUE,
        expira_em TIMESTAMP NOT NULL,
        usado TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        INDEX idx_token_reset (token)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    return true;
  } catch (error) {
    console.warn('⚠️ Banco de dados não conectado. Execute: npm run setup:db');
    console.warn('Erro:', error.message);
    dbConnected = false;
    return false;
  }
};

// Tentar conectar ao banco na inicialização (não obrigatório)
initializeDatabase();

// ==================== ROTAS ====================
// Importar rotas
const materiaisRoutes = require('./src/routes/materiais.routes');
const insumosRoutes = require('./src/routes/insumos.routes');
const authRoutes = require('./src/routes/auth.routes');
const seedAdmin = require('./src/utils/seedAdmin');

app.use('/api/materiais', materiaisRoutes);
app.use('/api/insumos', insumosRoutes);
app.use('/api/auth', authRoutes);

// Rota padrão para teste
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor rodando corretamente' });
});

// Rota para servir o index.html na raiz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== TRATAMENTO DE ERROS ====================
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erro interno do servidor'
  });
});

// ==================== MIDDLEWARE DE VERIFICAÇÃO DE BD ====================
app.use((req, res, next) => {
  // Se for requisição à API e BD não está conectado, avisar
  if (req.path.startsWith('/api') && !dbConnected && req.path !== '/api/health') {
    console.warn(`⚠️ Requisição a ${req.path} sem banco de dados conectado`);
  }
  next();
});

// ==================== INICIALIZAR SERVIDOR ====================
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📦 Ambiente: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
