-- database/migracao-perfil-foto.sql - Foto de perfil
-- Rode UMA VEZ no banco que voce ja usa (nao apaga nenhum dado).
-- Pode rodar de novo sem problema (usa IF NOT EXISTS).
-- (Arquivo sem acentos de proposito, para nao dar erro de codificacao no Windows.)

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url TEXT;
