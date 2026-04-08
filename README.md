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

## 🗄️ Banco de dados - Guia completo de inicialização

### Passo 1: Instalar Node.js (se ainda não tiver)

1. Baixe Node.js em https://nodejs.org/ (versão LTS recomendada).
2. Execute o instalador.
3. No PowerShell, valide a instalação:
```powershell
node -v
npm -v
```

### Passo 2: Resolver problema de npm no PowerShell (Windows)

Se receber erro `O arquivo ... não pode ser carregado porque a execução de scripts foi desabilitada`, use:

```powershell
$env:Path = "C:\Program Files\nodejs;$env:Path"; npm.cmd -v
```

**Dica:** Para evitar digitar isso toda vez, adicione permissão permanente:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### Passo 3: Configurar o arquivo .env

1. No diretório raiz do projeto, execute:
```powershell
npm.cmd run setup:db
```

2. Responda as perguntas do assistente:
   - Host: `localhost`
   - Usuário: `root`
   - Senha: sua senha do MySQL (deixar em branco se não tiver)
   - Nome do banco: `estoque_db`
   - Porta: `3306`
   - Porta da aplicação: `3001`
   - Ambiente: `development`

3. A partir daí, o arquivo `.env` será criado automaticamente com suas credenciais.

**Arquivo esperado no `.env`:**
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha_aqui
DB_NAME=estoque_db
DB_PORT=3306
PORT=3001
NODE_ENV=development
```

### Passo 4: Criar o banco de dados e aplicar o schema

#### Opção A: Usando MySQL Workbench (recomendado)

1. Abra **MySQL Workbench**.
2. Conecte-se na sua instância local de MySQL.
3. Abra uma nova aba SQL.
4. Cole e execute este bloco:
```sql
CREATE DATABASE IF NOT EXISTS estoque_db;
USE estoque_db;
```
5. Verifique que aparece `estoque_db` no painel Schemas (lado esquerdo).
6. Abra o arquivo `src/database/schema.sql` do projeto.
7. Execute todo o script SQL (botão raio "Run All" ou Ctrl+Shift+Enter).
8. Valide se as tabelas foram criadas sem erros vermelhos:
```sql
USE estoque_db;
SHOW TABLES;
```

#### Opção B: Pela linha de comando (Windows PowerShell)

1. Certifique-se de que tem a sua senha configurada no `.env`.
2. Execute:
```powershell
mysql -u root -p estoque_db < src/database/schema.sql
```
3. Digite sua senha quando solicitado.

### Passo 5: Iniciar o servidor

Após configurar tudo, execute:

```powershell
npm.cmd run dev
```

Resultado esperado:
```
✓ Conexão com banco de dados estabelecida com sucesso
🚀 Servidor rodando em http://localhost:3001
📦 Ambiente: development
```

Se receber erro de autenticação MySQL, verifique:
- A senha no `.env` está correta.
- O MySQL está rodando (Windows → Services → MySQL).
- O usuário `root` existe no seu MySQL.

### Problemas comuns

| Erro | Solução |
|------|---------|
| `Access denied for user 'root'@'localhost'` | Verifique a senha no `.env` ou atualize via MySQL Workbench |
| `Error Code 1046: No database selected` | Cole `USE estoque_db;` antes de executar o schema |
| `npm: comando não encontrado` | Use `npm.cmd` no PowerShell ou execute `Set-ExecutionPolicy` |
| `MySQL port 3306 já em uso` | Altere `DB_PORT` no `.env` para uma porta livre (ex: 3307) |

### Dados de demonstração

Após iniciar o servidor com sucesso, use estas credenciais para login:

- **E-mail:** `cliente@intellistock.com` ou `demo@intellistock.com`
- **Senha:** `123456`
- **Código de verificação (2FA):** `123456`

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
