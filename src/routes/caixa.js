/**
 * Módulo de fluxo de caixa.
 * Entradas e saídas com filtros, relatórios e totalizadores.
 */
const router = require('express').Router();
const db     = require('../db');
const { autenticar, apenasAdmin, log } = require('../middleware/auth');

// GET /caixa — histórico com filtros
router.get('/', autenticar, (req, res) => {
  const { tipo, data_inicio, data_fim, categoria, forma_pagamento } = req.query;

  let sql = `
    SELECT m.*, u.nome AS usuario_nome
    FROM movimentacoes m
    JOIN usuarios u ON u.id = m.usuario_id
    WHERE 1=1
  `;
  const params = [];

  // Usuário comum vê apenas as próprias movimentações
  if (req.usuario.tipo !== 'admin') {
    sql += ' AND m.usuario_id = ?';
    params.push(req.usuario.id);
  }

  if (tipo)           { sql += ' AND m.tipo = ?';            params.push(tipo); }
  if (data_inicio)    { sql += ' AND m.data_mov >= ?';       params.push(data_inicio); }
  if (data_fim)       { sql += ' AND m.data_mov <= ?';       params.push(data_fim); }
  if (categoria)      { sql += ' AND m.categoria = ?';       params.push(categoria); }
  if (forma_pagamento){ sql += ' AND m.forma_pagamento = ?'; params.push(forma_pagamento); }

  sql += ' ORDER BY m.data_mov DESC, m.id DESC';

  const rows = db.prepare(sql).all(...params);

  const entradas = rows.filter(r => r.tipo === 'entrada').reduce((s, r) => s + r.valor, 0);
  const saidas   = rows.filter(r => r.tipo === 'saida').reduce((s, r) => s + r.valor, 0);

  res.json({
    movimentacoes: rows,
    resumo: { entradas, saidas, saldo: entradas - saidas, total: rows.length }
  });
});

// GET /caixa/relatorio/diario — totais do dia
router.get('/relatorio/diario', autenticar, (req, res) => {
  const hoje = req.query.data || new Date().toISOString().slice(0, 10);

  const rows = db.prepare(`
    SELECT tipo, SUM(valor) AS total, COUNT(*) AS qtd
    FROM movimentacoes
    WHERE data_mov = ?
    GROUP BY tipo
  `).all(hoje);

  const entradas = rows.find(r => r.tipo === 'entrada') || { total: 0, qtd: 0 };
  const saidas   = rows.find(r => r.tipo === 'saida')   || { total: 0, qtd: 0 };

  res.json({
    data: hoje,
    entradas: { total: entradas.total, qtd: entradas.qtd },
    saidas:   { total: saidas.total,   qtd: saidas.qtd },
    saldo:    entradas.total - saidas.total
  });
});

// GET /caixa/relatorio/mensal — totais por dia no mês
router.get('/relatorio/mensal', autenticar, (req, res) => {
  const hoje  = new Date();
  const ano   = req.query.ano  || hoje.getFullYear();
  const mes   = req.query.mes  || String(hoje.getMonth() + 1).padStart(2, '0');
  const prefixo = `${ano}-${mes}`;

  const rows = db.prepare(`
    SELECT data_mov, tipo, SUM(valor) AS total
    FROM movimentacoes
    WHERE data_mov LIKE ?
    GROUP BY data_mov, tipo
    ORDER BY data_mov ASC
  `).all(`${prefixo}%`);

  // Agrupa por data
  const mapa = {};
  rows.forEach(r => {
    if (!mapa[r.data_mov]) mapa[r.data_mov] = { data: r.data_mov, entradas: 0, saidas: 0 };
    mapa[r.data_mov][r.tipo === 'entrada' ? 'entradas' : 'saidas'] = r.total;
  });

  const dias = Object.values(mapa).map(d => ({ ...d, saldo: d.entradas - d.saidas }));
  const totalEntradas = dias.reduce((s, d) => s + d.entradas, 0);
  const totalSaidas   = dias.reduce((s, d) => s + d.saidas, 0);

  res.json({ ano, mes, dias, totalEntradas, totalSaidas, saldo: totalEntradas - totalSaidas });
});

// POST /caixa — registrar movimentação
router.post('/', autenticar, (req, res) => {
  const { tipo, descricao, valor, categoria, forma_pagamento, data_mov } = req.body;

  if (!tipo || !descricao || !valor) {
    return res.status(400).json({ erro: 'Tipo, descrição e valor são obrigatórios.' });
  }

  if (!['entrada', 'saida'].includes(tipo)) {
    return res.status(400).json({ erro: 'Tipo inválido. Use "entrada" ou "saida".' });
  }

  if (isNaN(valor) || Number(valor) <= 0) {
    return res.status(400).json({ erro: 'Valor deve ser um número positivo.' });
  }

  const result = db.prepare(`
    INSERT INTO movimentacoes (tipo, descricao, valor, categoria, forma_pagamento, usuario_id, data_mov)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    tipo,
    descricao.trim(),
    Number(valor),
    categoria      || 'outros',
    forma_pagamento|| 'dinheiro',
    req.usuario.id,
    data_mov       || new Date().toISOString().slice(0, 10)
  );

  log(req.usuario.id, `CAIXA_${tipo.toUpperCase()}`, { id: result.lastInsertRowid, valor });
  res.status(201).json({ id: result.lastInsertRowid, mensagem: 'Movimentação registrada.' });
});

// DELETE /caixa/:id — remover (admin ou dono)
router.delete('/:id', autenticar, (req, res) => {
  const mov = db.prepare('SELECT * FROM movimentacoes WHERE id = ?').get(req.params.id);
  if (!mov) return res.status(404).json({ erro: 'Movimentação não encontrada.' });

  if (req.usuario.tipo !== 'admin' && mov.usuario_id !== req.usuario.id) {
    return res.status(403).json({ erro: 'Sem permissão para remover este registro.' });
  }

  db.prepare('DELETE FROM movimentacoes WHERE id = ?').run(req.params.id);
  log(req.usuario.id, 'CAIXA_REMOVIDO', { id: req.params.id });
  res.json({ mensagem: 'Movimentação removida.' });
});

module.exports = router;
