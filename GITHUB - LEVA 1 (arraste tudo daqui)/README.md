# Feira System

Sistema de gestão para feirantes: produtos, estoque, vendas, desperdícios, metas e relatórios — com backend em Node.js/Express/PostgreSQL e frontend em React/Vite, com uma Central de Acessibilidade completa.

---

## Pré-requisitos

Antes de começar, tenha instalado:

- **Node.js 20 ou mais recente** — confira com `node --version`. (A partir da versão 10 do `nodemailer`, usado na recuperação de senha, o Node 20+ é obrigatório.)
- **PostgreSQL** (testado com a versão 16, mas qualquer versão recente funciona)
- **npm** (vem junto com o Node.js)

---

## 1. Banco de dados

Crie o banco e aplique o schema:

```bash
createdb -U postgres feira_system
psql -U postgres -d feira_system -f database/schema.sql
```

Isso cria todas as tabelas (`usuarios`, `produtos`, `vendas`, `itens_venda`, `desperdicios`, `metas`, `password_reset_tokens`) já com os índices e restrições corretas.

---

## 2. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Abra o `.env` recém-criado e preencha:

| Variável | O que colocar |
|---|---|
| `DB_PASSWORD` | A senha do seu usuário `postgres` local |
| `DB_NAME` | `feira_system` (se seguiu o passo 1 sem mudar o nome) |
| `JWT_SECRET` | Uma string aleatória e longa — gere uma com o comando abaixo |
| `SMTP_USER` / `SMTP_PASS` | Opcional em desenvolvimento. Se deixar em branco, o link de recuperação de senha só aparece no console do servidor, sem enviar e-mail de verdade |
| `FRONTEND_URL` | `http://localhost:5173` (padrão do Vite) |

Pra gerar um `JWT_SECRET` forte:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Depois, suba o servidor:
```bash
npm run dev
```
Deve aparecer `🚀 Servidor rodando em http://localhost:3000`.

---

## 3. Frontend

Em outro terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Abra `http://localhost:5173` no navegador. O `.env` do frontend só precisa de uma variável (`VITE_API_URL`), que já vem certa por padrão se o backend estiver rodando na porta 3000.

---

## 4. Rodando os testes automatizados

O backend tem testes de ponta a ponta (login, criação de venda com baixa de estoque, cancelamento com reversão de estoque, cadastro de produtos). Eles usam um **banco de teste separado** (`feira_system_test`), que é apagado e recriado do zero a cada execução — nunca tocam no banco de desenvolvimento.

```bash
cd backend
npm test
```

Não precisa criar o banco de teste manualmente — o próprio teste cria, aplica o schema e limpa sozinho. Só é preciso que o PostgreSQL esteja rodando e que as credenciais em `backend/.env.test` (já vem pronto no projeto) apontem pro seu Postgres local.

---

## 5. Build de produção (frontend)

```bash
cd frontend
npm run build
```
Gera os arquivos finais em `frontend/dist/`, prontos pra hospedar em qualquer servidor de arquivos estáticos.

---

## Estrutura do projeto

```
feira-system/
├── database/
│   └── schema.sql              # Cria todas as tabelas do zero
├── backend/
│   ├── app.js                  # Monta o Express (rotas, CORS) — usado pelos testes
│   ├── server.js                # Liga o servidor de verdade (usa app.js)
│   ├── db.js                   # Pool de conexão com o PostgreSQL
│   ├── routes/                 # Define os endpoints de cada área
│   ├── controllers/             # Recebe a requisição, valida o básico, chama o service
│   ├── services/                # Regra de negócio + queries no banco
│   ├── middleware/              # Autenticação (JWT) e limite de tentativas de login
│   ├── schemas/                 # Validação de entrada (Zod)
│   ├── utils/                   # E-mail, exportação de PDF/Word, formatação de resposta
│   ├── tests/                   # Testes automatizados (Jest + Supertest)
│   ├── .env.example             # Modelo de configuração (copie para .env)
│   └── .env.test                # Configuração usada só pelos testes automatizados
└── frontend/
    ├── src/
    │   ├── pages/                # Uma pasta por tela (Dashboard, Produtos, Vendas...)
    │   ├── components/           # Componentes reutilizáveis (botões, modais, gráficos...)
    │   ├── context/              # Autenticação e preferências de acessibilidade
    │   ├── hooks/                 # Lógica reutilizável (toast, acessibilidade...)
    │   ├── services/              # Chamadas à API do backend
    │   └── utils/                 # Formatação de moeda, data, número...
    └── .env.example
```

---

## Problemas comuns

**"vite: Permission denied" ao rodar `npm run dev`/`npm run build`**
Geralmente acontece quando a pasta `node_modules` foi copiada de outra máquina/sistema operacional. Solução:
```bash
rm -rf node_modules package-lock.json
npm install
```

**Backend não conecta no banco**
Confirme que o PostgreSQL está rodando e que `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` no `.env` batem com o seu Postgres local.

**Recuperação de senha não chega por e-mail**
Se `SMTP_USER`/`SMTP_PASS` estiverem vazios no `.env`, isso é esperado em desenvolvimento — o link de recuperação aparece no **console do servidor**, não é enviado de verdade. Preencha essas variáveis com uma [senha de app do Gmail](https://myaccount.google.com/apppasswords) (nunca a senha normal da conta) pra testar o envio real.

**`npm test` falha ao criar o banco de teste**
Confirme que o usuário do Postgres configurado em `backend/.env.test` tem permissão para criar e apagar bancos de dados (`CREATEDB`).
