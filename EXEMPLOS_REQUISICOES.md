# Exemplos de Requisições API - Gerenciamento de Estoque

## Base URL
```
http://localhost:3000/api
```

## 1. LISTAR TODOS OS MATERIAIS

### Request
```http
GET /materiais HTTP/1.1
Host: localhost:3000
```

### cURL
```bash
curl -X GET http://localhost:3000/api/materiais
```

---

## 2. BUSCAR MATERIAL POR NOME

### Request
```http
GET /materiais?busca=parafuso HTTP/1.1
Host: localhost:3000
```

### cURL
```bash
curl -X GET "http://localhost:3000/api/materiais?busca=parafuso"
```

---

## 3. OBTER MATERIAL ESPECÍFICO

### Request
```http
GET /materiais/1 HTTP/1.1
Host: localhost:3000
```

### cURL
```bash
curl -X GET http://localhost:3000/api/materiais/1
```

---

## 4. CRIAR NOVO MATERIAL

### Request
```http
POST /materiais HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "codigo_barras": "7891234567890",
  "nome": "Parafuso M8 Inoxidável",
  "quantidade_atual": 100,
  "quantidade_minima": 20,
  "preco_manual": 2.50
}
```

### cURL
```bash
curl -X POST http://localhost:3000/api/materiais \
  -H "Content-Type: application/json" \
  -d '{
    "codigo_barras": "7891234567890",
    "nome": "Parafuso M8 Inoxidável",
    "quantidade_atual": 100,
    "quantidade_minima": 20,
    "preco_manual": 2.50
  }'
```

### PowerShell
```powershell
$body = @{
    codigo_barras = "7891234567890"
    nome = "Parafuso M8 Inoxidável"
    quantidade_atual = 100
    quantidade_minima = 20
    preco_manual = 2.50
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/materiais" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

---

## 5. ATUALIZAR MATERIAL COMPLETO

### Request
```http
PUT /materiais/1 HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "nome": "Parafuso M10 Inoxidável",
  "quantidade_minima": 25,
  "preco_manual": 3.00
}
```

### cURL
```bash
curl -X PUT http://localhost:3000/api/materiais/1 \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Parafuso M10 Inoxidável",
    "quantidade_minima": 25,
    "preco_manual": 3.00
  }'
```

---

## 6. ADICIONAR QUANTIDADE (Somar)

### Request
```http
PUT /materiais/1/quantidade HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "diferenca": 15
}
```

### cURL
```bash
curl -X PUT http://localhost:3000/api/materiais/1/quantidade \
  -H "Content-Type: application/json" \
  -d '{"diferenca": 15}'
```

---

## 7. REMOVER QUANTIDADE (Subtrair)

### Request
```http
PUT /materiais/1/quantidade HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "diferenca": -5
}
```

### cURL
```bash
curl -X PUT http://localhost:3000/api/materiais/1/quantidade \
  -H "Content-Type: application/json" \
  -d '{"diferenca": -5}'
```

---

## 8. DELETAR MATERIAL

### Request
```http
DELETE /materiais/1 HTTP/1.1
Host: localhost:3000
```

### cURL
```bash
curl -X DELETE http://localhost:3000/api/materiais/1
```

---

## 9. LISTAR MATERIAIS COM ESTOQUE BAIXO

### Request
```http
GET /materiais/estoque/baixo HTTP/1.1
Host: localhost:3000
```

### cURL
```bash
curl -X GET http://localhost:3000/api/materiais/estoque/baixo
```

---

## 10. VERIFICAR SAÚDE DO SERVIDOR

### Request
```http
GET /health HTTP/1.1
Host: localhost:3000
```

### cURL
```bash
curl -X GET http://localhost:3000/api/health
```

---

## Dicas Úteis

### Testar Localmente com Postman
1. Importar requisições acima no Postman
2. Variar valores nos bodies
3. Verificar respostas de sucesso e erro

### Testar com VSCode REST Client (extensão)
Criar arquivo `requests.http` e usar:
```http
@baseUrl = http://localhost:3000/api

### Listar materiais
GET {{baseUrl}}/materiais

### Criar novo material
POST {{baseUrl}}/materiais
Content-Type: application/json

{
  "codigo_barras": "123456",
  "nome": "Produto Teste",
  "quantidade_atual": 10,
  "quantidade_minima": 5,
  "preco_manual": 10.00
}
```

### Debug no Node.js
```bash
# Iniciar com debugger
node --inspect server.js

# Abrir DevTools em chrome://inspect
```

---

**Nota**: Certifique-se que o servidor está rodando antes de fazer as requisições!
