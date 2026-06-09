/**
 * Dashboard — dados consolidados para o painel inicial.
 */
const router = require('express').Router();
const db     = require('../db');
const { autenticar } = require('../middleware/auth');

router.get('/', autenticar, (req, res) => {
  const hoje = new Date().toISOString().slice(0, 10);

  // Saldo total (todas as movimentações)
  const saldoRow = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN tipo='entrada' THEN valor ELSE 0 END), 0) AS entradas,
      COALESCE(SUM(CASE WHEN tipo='saida'   THEN valor ELSE 0 END), 0) AS saidas
    FROM movimentacoes
  `).get();

  // Vendas do dia
  const vendasHoje = db.prepare(`
    SELECT COALESCE(SUM(valor), 0) AS total, COUNT(*) AS qtd
    FROM movimentacoes
    WHERE tipo = 'entrada' AND data_mov = ?
  `).get(hoje);

  // Produtos
  const estoque = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN quantidade <= estoque_minimo THEN 1 ELSE 0 END) AS estoque_baixo
    FROM produtos WHERE ativo = 1
  `).get();

  // Últimas 8 movimentações
  const ultimas = db.prepare(`
    SELECT m.id, m.tipo, m.descricao, m.valor, m.data_mov, m.categoria, u.nome AS usuario_nome
    FROM movimentacoes m
    JOIN usuarios u ON u.id = m.usuario_id
    ORDER BY m.id DESC LIMIT 8
  `).all();

  // Gráfico: últimos 7 dias
  const grafico = db.prepare(`
    SELECT data_mov AS data,
      COALESCE(SUM(CASE WHEN tipo='entrada' THEN valor ELSE 0 END), 0) AS entradas,
      COALESCE(SUM(CASE WHEN tipo='saida'   THEN valor ELSE 0 END), 0) AS saidas
    FROM movimentacoes
    WHERE data_mov >= date('now', '-6 days', 'localtime')
    GROUP BY data_mov
    ORDER BY data_mov ASC
  `).all();

  // Produtos com estoque baixo (lista)
  const estoqueBaixo = db.prepare(`
    SELECT id, nome, quantidade, estoque_minimo
    FROM produtos
    WHERE ativo = 1 AND quantidade <= estoque_minimo
    ORDER BY quantidade ASC
    LIMIT 5
  `).all();

  res.json({
    caixa: {
      entradas: saldoRow.entradas,
      saidas:   saldoRow.saidas,
      saldo:    saldoRow.entradas - saldoRow.saidas
    },
    vendasHoje: { total: vendasHoje.total, qtd: vendasHoje.qtd },
    produtos:   { total: estoque.total, estoque_baixo: estoque.estoque_baixo },
    ultimas,
    grafico,
    estoqueBaixo
  });
});

module.exports = router;
