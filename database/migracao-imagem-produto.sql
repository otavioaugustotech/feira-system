-- database/migracao-imagem-produto.sql - Imagem do produto
-- Acrescenta a coluna imagem na tabela produtos (nao apaga nenhum dado).
-- Pode rodar de novo sem problema (usa IF NOT EXISTS). A API tambem
-- aplica este arquivo sozinha ao iniciar (server.js).
-- A imagem e guardada como texto base64 ("data:image/jpeg;base64,..."),
-- ja reduzida no navegador para 320x320 (cerca de 20 a 40 KB).
-- (Arquivo sem acentos de proposito, para nao dar erro de codificacao no Windows.)

ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS imagem TEXT;
