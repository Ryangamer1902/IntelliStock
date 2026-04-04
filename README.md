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
npm run start:all
```

Importante:
Se existir uma pasta duplicada `IntelliStock/IntelliStock`, execute os comandos na raiz que contém `src/` e `public/`.
No PowerShell, valide antes com:

```powershell
Get-ChildItem
```

Você deve ver `src`, `public`, `server.js` e `package.json` na pasta atual.

O comando `start:tudo` executa:
1. `npm run setup:db` → assistente para criar/configurar o `.env`
2. `npm run dev` → inicia o servidor com nodemon

O comando `start:all` executa tudo em uma vez:
1. `npm install`
2. `npm run start:tudo`

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

1. `api` (padrão): usa endpoints reais para autenticação e CRUD no MySQL.
2. `mock`: funciona sem banco/API para desenvolvimento de interface.

Como trocar de modo no navegador (DevTools Console):

```js
localStorage.setItem('auth_mode', 'mock') // frontend isolado
localStorage.setItem('auth_mode', 'api')  // conecta no backend real
```

Credenciais de demonstração disponíveis também no modo `api` após aplicar o schema e iniciar o servidor:

- E-mail: `cliente@intellistock.com`
- E-mail: `demo@intellistock.com`
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

Se o banco já existia antes dessa atualização, reaplique o `schema.sql` para garantir as colunas `preco_custo`, `margem_lucro`, `fornecedor`, a tabela `movimentacoes_estoque` e as tabelas de `insumos` no próprio `estoque_db`.

Quando o servidor sobe com essas tabelas vazias, ele importa automaticamente os registros demo para uso em modo `api`.

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
- `POST /api/materiais` → criar material com `fornecedor`, `preco_custo`, `margem_lucro` e `preco_manual` (preco de venda)
- `PUT /api/materiais/:id` → atualizar material e recalcular o preco de venda
- `PUT /api/materiais/:id/quantidade` → ajustar quantidade
- `DELETE /api/materiais/:id` → remover material
- `GET /api/materiais/estoque/baixo` → listar estoque baixo
- `GET /api/materiais/historico` → listar movimentacoes de estoque para a tela de historico

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
