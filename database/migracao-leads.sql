/* ═══════════════════════════════════════════════════════════════════
   database/migracao-leads.sql — integração com a Landing Page
   Para bancos que JÁ EXISTEM (o schema.sql completo já inclui a tabela).
   Pode rodar mais de uma vez sem estragar nada.

     psql -U postgres -d feira_system -f migracao-leads.sql
   ═══════════════════════════════════════════════════════════════════ */

BEGIN;

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
