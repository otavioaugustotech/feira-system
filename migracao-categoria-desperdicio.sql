-- database/migracao-categoria-desperdicio.sql - Categoria do motivo do desperdicio
-- Rode UMA VEZ no banco que voce ja usa (nao apaga nenhum dado).
-- Pode rodar de novo sem problema (usa IF NOT EXISTS).
-- Os registros antigos ficam com a categoria 'outros'; o texto que ja
-- existia no campo motivo continua guardado como descricao.
-- (Arquivo sem acentos de proposito, para nao dar erro de codificacao no Windows.)

ALTER TABLE desperdicios
  ADD COLUMN IF NOT EXISTS categoria_motivo VARCHAR(20) NOT NULL DEFAULT 'outros';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'desperdicios_categoria_motivo_check'
  ) THEN
    ALTER TABLE desperdicios ADD CONSTRAINT desperdicios_categoria_motivo_check
      CHECK (categoria_motivo IN ('vencimento', 'transporte', 'manuseio', 'armazenamento', 'outros'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_desperdicios_categoria ON desperdicios(usuario_id, categoria_motivo);
