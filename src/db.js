/**
 * Conexão e inicialização do banco de dados SQLite.
 * Cria todas as tabelas e relacionamentos na primeira execução.
 */
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'comercio.db'));

// Performance: WAL mode para leituras concorrentes
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  -- ── Usuários ────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS usuarios (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    nome         TEXT    NOT NULL,
    email        TEXT    NOT NULL UNIQUE,
    senha        TEXT    NOT NULL,
    telefone     TEXT,
    tipo         TEXT    NOT NULL DEFAULT 'usuario' CHECK(tipo IN ('admin','usuario')),
    ativo        INTEGER NOT NULL DEFAULT 1,
    criado_em    TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- ── Categorias de produto ────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS categorias (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE
  );

  -- ── Produtos ─────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS produtos (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    nome             TEXT    NOT NULL,
    codigo_barras    TEXT    UNIQUE,
    categoria_id     INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    descricao        TEXT,
    preco_custo      REAL    NOT NULL DEFAULT 0,
    preco_venda      REAL    NOT NULL DEFAULT 0,
    quantidade       INTEGER NOT NULL DEFAULT 0,
    estoque_minimo   INTEGER NOT NULL DEFAULT 5,
    fornecedor       TEXT,
    ativo            INTEGER NOT NULL DEFAULT 1,
    criado_em        TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- ── Movimentações de caixa ───────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS movimentacoes (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo             TEXT    NOT NULL CHECK(tipo IN ('entrada','saida')),
    descricao        TEXT    NOT NULL,
    valor            REAL    NOT NULL,
    categoria        TEXT    NOT NULL DEFAULT 'outros',
    forma_pagamento  TEXT    NOT NULL DEFAULT 'dinheiro',
    usuario_id       INTEGER NOT NULL REFERENCES usuarios(id),
    data_mov         TEXT    NOT NULL DEFAULT (date('now','localtime')),
    criado_em        TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- ── Log de ações ─────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    acao       TEXT NOT NULL,
    detalhes   TEXT,
    criado_em  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
`);

module.exports = db;
