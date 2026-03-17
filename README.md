# 📦 Sistema de Gerenciamento de Estoque

Sistema robusto e escalável de gerenciamento de estoque desenvolvido com **Node.js**, **Express** e **MySQL**, seguindo a arquitetura **MVC**.

## 🎯 Estrutura do Projeto

```
BarberControl/
├── src/
│   ├── controllers/
│   │   └── materiaisController.js      # Lógica de negócio para materiais
│   ├── models/
│   │   └── Material.js                 # Modelo de dados para a tabela materiais
│   ├── routes/
│   │   └── materiais.routes.js         # Definição de rotas da API
│   └── database/
│       └── schema.sql                  # Script DDL para criar tabelas
├── public/
│   └── index.html                      # Interface frontend
├── server.js                           # Servidor Express com middlewares
├── package.json                        # Dependências do projeto
├── .env.example                        # Variáveis de ambiente (exemplo)
└── README.md                           # Este arquivo
```

## 🚀 Início Rápido

### Pré-requisitos
- Node.js (v14+)
- MySQL (v5.7+) - *Opcional para iniciar o servidor*
- npm ou yarn

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente
Opção A: Assistente Interativo (Recomendado)
```bash
npm run setup-db
```
Isso vai guiar você através das configurações necessárias.

Opção B: Manual
```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env com suas credenciais MySQL
```

### 3. Iniciar o Servidor (ANTES de configurar BD)
```bash
npm run dev
```

Neste ponto, o servidor está rodando e acessível em `http://localhost:3000`, mesmo sem banco de dados conectado.

### 4. Configurar Banco de Dados (DEPOIS - Responsabilidade de outra pessoa)

Quando estiver pronto para conectar ao MySQL:

1. **Criar banco de dados:**
```bash
mysql -u root -p
CREATE DATABASE estoque_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE estoque_db;
SOURCE src/database/schema.sql;
EXIT;
```

Ou execute direto:
```bash
mysql -u root -p < src/database/schema.sql
```

2. **Verificar conexão:**
Quando o servidor tentar conectar ao banco (na próxima inicialização), ele vai avisar se conseguiu ou não.

---

## 📋 API Endpoints

### Materiais (CRUD Completo)

#### 1. Listar todos os materiais
```
GET /api/materiais
GET /api/materiais?busca=termo
```

**Resposta (200):**
```json
{
  "success": true,
  "message": "Materiais recuperados com sucesso",
  "data": [
    {
      "id": 1,
      "codigo_barras": "123456789",
      "nome": "Parafuso M8",
      "quantidade_atual": 50,
      "quantidade_minima": 10,
      "preco_manual": 2.50,
      "created_at": "2024-03-17T10:30:00Z",
      "updated_at": "2024-03-17T10:30:00Z"
    }
  ]
}
```

#### 2. Obter material específico
```
GET /api/materiais/{id}
```

#### 3. Criar novo material
```
POST /api/materiais
Content-Type: application/json

{
  "codigo_barras": "123456789",
  "nome": "Parafuso M8",
  "quantidade_atual": 50,
  "quantidade_minima": 10,
  "preco_manual": 2.50
}
```

**Resposta (201):**
```json
{
  "success": true,
  "message": "Material criado com sucesso",
  "data": { ... }
}
```

#### 4. Atualizar material completo
```
PUT /api/materiais/{id}
Content-Type: application/json

{
  "nome": "Parafuso M10",
  "quantidade_minima": 15,
  "preco_manual": 3.00
}
```

#### 5. Atualizar quantidade (adicionar/subtrair)
```
PUT /api/materiais/{id}/quantidade
Content-Type: application/json

{
  "diferenca": 5
}
```

**Exemplos:**
- `"diferenca": 5` → Adiciona 5 unidades
- `"diferenca": -3` → Remove 3 unidades
- `"diferenca": 0` → Sem alteração

#### 6. Deletar material
```
DELETE /api/materiais/{id}
```

#### 7. Listar materiais com estoque baixo
```
GET /api/materiais/estoque/baixo
```

Retorna apenas materiais onde `quantidade_atual < quantidade_minima`

## 🗄️ Estrutura do Banco de Dados

### Tabela: `materiais`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT | Chave primária (auto-increment) |
| `codigo_barras` | VARCHAR(50) | Código único do produto (UNIQUE) |
| `nome` | VARCHAR(150) | Nome do material |
| `quantidade_atual` | INT | Quantidade em estoque |
| `quantidade_minima` | INT | Quantidade mínima (gatilho para alertas) |
| `preco_manual` | DECIMAL(10,2) | Preço unitário |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data da última atualização |

### Triggers Automáticos

- **`tr_verificar_quantidade_minima_insert`**: Cria alerta ao inserir material abaixo do mínimo
- **`tr_verificar_quantidade_minima_update`**: Cria alerta ao atualizar quantidade abaixo do mínimo

### Tabela: `alertas_estoque`

Registra automaticamente quando a quantidade de um material fica abaixo do mínimo.

## 🎨 Interface Frontend

A interface HTML em `/public/index.html` oferece:

✅ **Listagem de Materiais**: Visualização em tabela com filtros  
✅ **Busca**: Busca por nome ou código de barras (tempo real)  
✅ **Adicionar Material**: Modal para novo registro  
✅ **Atualizar Quantidade**: Botões +/- para ajuste rápido  
✅ **Deletar Material**: Remover registros com confirmação  
✅ **Status Visual**: Indicador de estoque baixo  
✅ **Responsivo**: Design adaptável para mobile  

## 📝 Próximos Passos para a Equipe

### Setup Inicial (Já Feito ✓)
- ✓ Estrutura MVC criada
- ✓ Servidor Express com middlewares configurados
- ✓ Interface frontend pronta
- ✓ Documentação de API

### Configuração do Banco de Dados (Próxima Pessoa)
1. **Criar banco de dados MySQL**:
   ```bash
   mysql -u root -p < src/database/schema.sql
   ```

2. **Atualizar .env**:
   ```bash
   npm run setup-db
   ```

3. **Reiniciar servidor** para conectar ao banco

### Implementar Funcionalidades Específicas
- Relatórios de movimento de estoque
- Histórico de alterações
- Integração com fornecedores
- Sistema de pedidos de reposição
- Autenticação e autorização

## 🛠️ Scripts NPM

```bash
npm start         # Iniciar servidor (modo produção)
npm run dev       # Iniciar servidor (modo desenvolvimento com nodemon)
npm run setup-db  # Assistente de configuração interativo
```

## 📦 Dependências

| Pacote | Versão | Descrição |
|--------|--------|-----------|
| `express` | ^4.18.2 | Framework web |
| `cors` | ^2.8.5 | Middleware CORS |
| `dotenv` | ^16.0.3 | Carregar variáveis de ambiente |
| `mysql2` | ^3.6.0 | Driver MySQL com Promises |
| `nodemon` | ^2.0.22 | Auto-reload em desenvolvimento |

## 🔐 Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto (ou use `npm run setup-db`):

```env
# Configurações do Servidor
PORT=3000
NODE_ENV=development

# Configurações do Banco de Dados
# Deixe em branco até que alguém configure o MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=estoque_db
DB_PORT=3306

# CORS
CORS_ORIGIN=*
```

**Nota**: Você pode iniciar o servidor sem as credenciais do banco. Quando o banco estiver configurado, edite as variáveis e reinicie.

## 📞 Suporte

Para dúvidas sobre a arquitetura ou implementação, consulte:
- **Models**: Lógica de dados em `src/models/`
- **Controllers**: Regras de negócio em `src/controllers/`
- **Routes**: Endpoints disponíveis em `src/routes/`

## 📄 Licença

Este projeto está sob licença ISC.

---

**Versão**: 1.0.0  
**Última Atualização**: 17 de Março de 2024
