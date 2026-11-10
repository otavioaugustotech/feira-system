/* ═══════════════════════════════════════════════════════════════════
   database/schema.sql — Feira System
   Schema completo, reconstruído a partir do que cada arquivo em
   backend/services (arquivos .js) efetivamente consome (colunas, tipos,
   constraints de unicidade e chaves estrangeiras).

   Como aplicar:
     psql -U postgres -d feira_system -f schema.sql
   (crie o banco antes, se ele ainda não existir:
     createdb -U postgres feira_system )
   ═══════════════════════════════════════════════════════════════════ */

BEGIN;

/* ───────────────────────── usuarios ─────────────────────────
   authService.js: registrar()/login() usam id, nome, email,
   senha_hash, nome_banca, created_at. email precisa ser único
   (checado explicitamente antes do INSERT, mas a constraint é
   quem garante isso de fato sob concorrência). */
CREATE TABLE IF NOT EXISTS usuarios (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(150)  NOT NULL,
    email       VARCHAR(255)  NOT NULL UNIQUE,
    senha_hash  VARCHAR(255),              /* NULL = conta criada pelo Google (sem senha) */
    nome_banca  VARCHAR(150),
    google_id   VARCHAR(255)  UNIQUE,      /* "sub" do Google — preenchido no login com Google */
    foto_url    TEXT,                      /* foto de perfil (imagem em base64 ou link da foto do Google) */
    created_at  TIMESTAMP     NOT NULL DEFAULT NOW()
);

/* Login com Google: se o banco JÁ EXISTIA antes dessa mudança, o
   CREATE TABLE acima é ignorado — estas duas linhas atualizam a tabela
   antiga. Podem rodar quantas vezes quiser sem estragar nada. */
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE usuarios ALTER COLUMN senha_hash DROP NOT NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url TEXT;

/* ───────────────────────── produtos ─────────────────────────
   produtosService.js: quantidade e estoque_minimo são tratados
   como valores fracionários (produto vendido por kg), por isso
   NUMERIC e não INTEGER. tipo_venda tem 4 valores possíveis
   (unidade, kg, maco, caixa — alinhados com o Zod em schemas/index.js
   e com as opções do formulário no frontend; corrigido na auditoria,
   antes o CHECK aqui aceitava 'pacote' em vez de 'maco'/'caixa' e
   isso quebrava o cadastro de produto com erro 500). ativo=false =
   "excluído" (soft delete, nunca é apagado de fato — preserva o
   histórico de vendas que referencia produto_id). */
CREATE TABLE IF NOT EXISTS produtos (
    id              SERIAL PRIMARY KEY,
    usuario_id      INTEGER        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nome            VARCHAR(150)   NOT NULL,
    categoria       VARCHAR(100),
    tipo_venda      VARCHAR(20)    NOT NULL DEFAULT 'unidade'
                        CHECK (tipo_venda IN ('unidade', 'kg', 'maco', 'caixa')),
    preco_custo     NUMERIC(12,2)  NOT NULL CHECK (preco_custo >= 0),
    preco_venda     NUMERIC(12,2)  NOT NULL CHECK (preco_venda >= 0),
    quantidade      NUMERIC(12,3)  NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
    estoque_minimo  NUMERIC(12,3)  NOT NULL DEFAULT 5,
    ativo           BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_produtos_usuario ON produtos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_produtos_usuario_ativo ON produtos(usuario_id, ativo);

/* ───────────────────────── vendas ─────────────────────────
   vendasService.js: forma_pagamento tem 4 valores possíveis
   (também validados no Zod). status começa 'concluida' e pode
   virar 'cancelada' via PATCH /:id/cancelar. */
CREATE TABLE IF NOT EXISTS vendas (
    id                    SERIAL PRIMARY KEY,
    usuario_id            INTEGER        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    total                 NUMERIC(12,2)  NOT NULL CHECK (total >= 0),
    lucro_total           NUMERIC(12,2)  NOT NULL,
    forma_pagamento       VARCHAR(20)    NOT NULL
                              CHECK (forma_pagamento IN ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito')),
    status                VARCHAR(20)    NOT NULL DEFAULT 'concluida'
                              CHECK (status IN ('concluida', 'cancelada')),
    motivo_cancelamento   VARCHAR(255),
    cancelada_em          TIMESTAMP,
    created_at            TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendas_usuario ON vendas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_vendas_usuario_data ON vendas(usuario_id, created_at);
CREATE INDEX IF NOT EXISTS idx_vendas_status ON vendas(status);

/* ───────────────────────── itens_venda ─────────────────────────
   vendasService.js: cada linha é um item dentro de uma venda.
   ON DELETE CASCADE em venda_id (se a venda sumisse, os itens
   também deveriam); ON DELETE RESTRICT em produto_id — não deixa
   apagar fisicamente um produto que já tem vendas associadas
   (por isso produtos usa soft delete via campo "ativo"). */
CREATE TABLE IF NOT EXISTS itens_venda (
    id               SERIAL PRIMARY KEY,
    venda_id         INTEGER        NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id       INTEGER        NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
    quantidade       NUMERIC(12,3)  NOT NULL CHECK (quantidade > 0),
    preco_unitario   NUMERIC(12,2)  NOT NULL,
    custo_unitario   NUMERIC(12,2)  NOT NULL,
    subtotal         NUMERIC(12,2)  NOT NULL,
    lucro_item       NUMERIC(12,2)  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_itens_venda_venda ON itens_venda(venda_id);
CREATE INDEX IF NOT EXISTS idx_itens_venda_produto ON itens_venda(produto_id);

/* ───────────────────────── desperdicios ─────────────────────────
   desperdiciosService.js: quantidade > 0, valor_perda calculado
   como preco_custo * quantidade no momento do registro. */
CREATE TABLE IF NOT EXISTS desperdicios (
    id             SERIAL PRIMARY KEY,
    usuario_id     INTEGER        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    produto_id     INTEGER        NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
    quantidade     NUMERIC(12,3)  NOT NULL CHECK (quantidade > 0),
    categoria_motivo VARCHAR(20)  NOT NULL DEFAULT 'outros'
                   CHECK (categoria_motivo IN ('vencimento', 'transporte', 'manuseio', 'armazenamento', 'outros')),
    motivo         VARCHAR(255),  -- descricao livre (opcional) do motivo
    valor_perda    NUMERIC(12,2)  NOT NULL,
    data_registro  TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_desperdicios_usuario_data ON desperdicios(usuario_id, data_registro);
CREATE INDEX IF NOT EXISTS idx_desperdicios_produto ON desperdicios(produto_id);
CREATE INDEX IF NOT EXISTS idx_desperdicios_categoria ON desperdicios(usuario_id, categoria_motivo);

/* ───────────────────────── metas ─────────────────────────
   metasService.js: definir() faz
     INSERT ... ON CONFLICT (usuario_id, ano, mes) DO UPDATE ...
   Isso EXIGE uma constraint UNIQUE (ou índice único) exatamente
   nessas 3 colunas — sem ela o upsert quebra com erro do Postgres. */
CREATE TABLE IF NOT EXISTS metas (
    id             SERIAL PRIMARY KEY,
    usuario_id     INTEGER        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    ano            INTEGER        NOT NULL CHECK (ano BETWEEN 2020 AND 2100),
    mes            INTEGER        NOT NULL CHECK (mes BETWEEN 1 AND 12),
    meta_receita   NUMERIC(12,2)  NOT NULL CHECK (meta_receita >= 0),
    meta_lucro     NUMERIC(12,2),
    created_at     TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP      NOT NULL DEFAULT NOW(),
    UNIQUE (usuario_id, ano, mes)
);

CREATE INDEX IF NOT EXISTS idx_metas_usuario ON metas(usuario_id);

/* ───────────────────────── password_reset_tokens ─────────────────────────
   authService.js: solicitarRecuperacao()/redefinirSenha(). Guardamos
   só o HASH do token (nunca o token bruto que vai por e-mail), com
   expiração de 1h e marcação de uso único via used_at. */
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id           SERIAL PRIMARY KEY,
    usuario_id   INTEGER      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash   VARCHAR(64)  NOT NULL,
    expires_at   TIMESTAMP    NOT NULL,
    used_at      TIMESTAMP,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reset_tokens_usuario ON password_reset_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_hash ON password_reset_tokens(token_hash);

/* ───────────────────────── leads ─────────────────────────
   leadsService.js: contatos e pedidos de demonstração enviados pelo
   formulário PÚBLICO da Landing Page (POST /api/leads). Não pertence a
   nenhum usuário. consentimento_em registra quando a pessoa autorizou
   o contato (LGPD); ip/user_agent ajudam a investigar spam.
   status permite um funil simples de CRM. */
CREATE TABLE IF NOT EXISTS leads (
    id                SERIAL PRIMARY KEY,
    nome              VARCHAR(150)  NOT NULL,
    email             VARCHAR(255)  NOT NULL,
    telefone          VARCHAR(20),
    nome_banca        VARCHAR(150),
    tipo              VARCHAR(20)   NOT NULL DEFAULT 'contato'
                          CHECK (tipo IN ('contato', 'demonstracao')),
    mensagem          TEXT,
    origem            VARCHAR(100),
    status            VARCHAR(20)   NOT NULL DEFAULT 'novo'
                          CHECK (status IN ('novo', 'em_contato', 'convertido', 'descartado')),
    consentimento_em  TIMESTAMP     NOT NULL,
    ip                VARCHAR(64),
    user_agent        VARCHAR(500),
    created_at        TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_email_data ON leads(email, created_at);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

COMMIT;
