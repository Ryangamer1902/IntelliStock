# 📦 Sistema de Gerenciamento de Estoque

API e interface web para controle de materiais, construída com **Node.js**, **Express** e **MySQL**.

---

## 📌 Sobre o projeto

Este projeto foi criado para facilitar o controle de estoque de materiais em um ambiente simples e prático.  
Com ele, é possível cadastrar produtos, atualizar quantidades, consultar itens e acompanhar materiais com estoque baixo.

O sistema é composto por:
- **Backend (API REST)** com Node.js + Express
- **Banco de dados MySQL** para persistência
- **Interface web** para operação diária

---

## ⚙️ Como funciona

1. O usuário acessa a interface web.
2. A interface faz requisições para a API (`/api/materiais`).
3. A API processa as regras de negócio (cadastro, edição, listagem, remoção).
4. Os dados são salvos e lidos no MySQL.
5. O sistema retorna as informações atualizadas para a interface.

Fluxo resumido: **Frontend → API Express → MySQL → API → Frontend**

---

## 🚀 Inicialização Rápida (1 comando)

### Pré-requisitos
- Node.js (v14+)
- MySQL (v5.7+)
- npm

### Passos
```bash
cd IntelliStock
npm install
npm run start:tudo
```

O comando `start:tudo` executa:
1. `npm run setup:db` → assistente para criar/configurar o `.env`
2. `npm run dev` → inicia o servidor com nodemon

Servidor padrão: `http://localhost:3001`

---

## 🛠️ Scripts disponíveis

```bash
npm start          # Inicia em modo produção
npm run dev        # Inicia em modo desenvolvimento (nodemon)
npm run setup:db   # Assistente interativo para gerar .env
npm run start:tudo # Configura .env + inicia servidor
```

---

## 🔌 Integração Frontend x Backend (Login + 2FA)

As telas de login e verificação já estão preparadas para dois modos:

1. `mock` (padrão): funciona sem banco/API para desenvolvimento de interface.
2. `api`: usa endpoints reais para autenticação.

Como trocar de modo no navegador (DevTools Console):

```js
localStorage.setItem('auth_mode', 'mock') // frontend isolado
localStorage.setItem('auth_mode', 'api')  // conecta no backend real
```

Credencial de demonstração no modo `mock`:

- E-mail: `cliente@intellistock.com`
- Senha: `123456`

Contrato esperado no modo `api`:

- `POST /api/auth/login` com `{ email, senha }`
- `POST /api/auth/verificar` com `{ token_temp, codigo }`

---

## ⚙️ Configuração manual do .env (opcional)

Se não quiser usar o assistente:

### Windows (PowerShell/CMD)
```powershell
copy .env.example .env
```

Depois edite o `.env` com suas credenciais do MySQL.

---

## 🗄️ Banco de dados

Crie o banco e aplique o schema:

```bash
mysql -u root -p < src/database/schema.sql
```

Se o banco já existia antes dessa atualização, recrie a tabela materiais ou adicione manualmente as colunas novas: `preco_custo` e `margem_lucro`.

Configuração padrão esperada no `.env`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=estoque_db
DB_PORT=3306
PORT=3001
NODE_ENV=development
```

---

## 📋 Endpoints principais

Base: `/api/materiais`

- `GET /api/materiais` → listar materiais
- `GET /api/materiais/:id` → buscar por id
- `POST /api/materiais` → criar material com `preco_custo`, `margem_lucro` e `preco_manual` (preço de venda)
- `PUT /api/materiais/:id` → atualizar material e recalcular o preço de venda
- `PUT /api/materiais/:id/quantidade` → ajustar quantidade
- `DELETE /api/materiais/:id` → remover material
- `GET /api/materiais/estoque/baixo` → listar estoque baixo

---

## 📁 Estrutura resumida

```text
BarberControl/
├── src/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   └── database/schema.sql
├── public/index.html
├── server.js
├── setup-db.js
├── .env.example
└── package.json
```

---

## 📦 Dependências

- express
- cors
- dotenv
- mysql2
- nodemon (dev)

---

## 🌐 Deploy no Render

O projeto já está preparado para deploy no Render com o arquivo [render.yaml](render.yaml).

### Passo a passo

1. Acesse o Render e conecte seu repositório do GitHub.
2. Escolha o serviço Web usando o arquivo render.yaml.
3. Faça o deploy.
4. Ao final, o app ficará online com uma URL pública.

### Isso tem a ver com banco de dados?

Depende do modo usado no frontend:

1. Modo mock: não precisa banco. Login e verificação funcionam com dados de demonstração.
2. Modo api: precisa banco + variáveis DB_HOST, DB_USER, DB_PASSWORD, DB_NAME e DB_PORT.

Resumo prático:

1. Para demo rápida: pode subir sem banco (modo mock).
2. Para CRUD real de materiais: precisa banco configurado no Render (ou banco externo).

---

## 📄 Licença

ISC
