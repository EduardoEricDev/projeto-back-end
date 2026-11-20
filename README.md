# Projeto Back-End - API E-Commerce

API RESTful desenvolvida em Node.js com Express, Sequelize, MySQL, autenticação JWT, documentação Swagger e testes automatizados com Jest.

## Tecnologias

- Node.js e Express.js
- MySQL e Sequelize ORM (com Migrations)
- Bcrypt e JSON Web Token (JWT)
- Dotenv e Nodemon
- Swagger UI (`swagger-ui-express`)
- Jest e Supertest

## Estrutura do Projeto

```text
src/
├── config/
├── controllers/
├── database/
│   └── migrations/
├── middleware/
├── models/
├── routes/
├── services/
├── app.js
└── server.js
tests/
```

## Configuração e Execução

1. Instale as dependências:

```bash
npm install
```

2. Configure o arquivo `.env` a partir do `.env.example` com os dados do seu banco MySQL e chave JWT:

```bash
cp .env.example .env
```

3. Execute as migrations no banco de dados:

```bash
npm run migrate
```

4. Inicie o servidor:

```bash
npm run dev
```

A documentação interativa da API (Swagger) fica disponível em `http://localhost:3000/api-docs`.

## Testes

```bash
npm test
```
