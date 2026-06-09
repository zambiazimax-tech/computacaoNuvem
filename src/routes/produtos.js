/**
 * CRUD de produtos com controle de estoque.
 * Admin: acesso total. Usuário: leitura + atualização de estoque via venda.
 */
const router = require('express').Router();
const db     = require('../db');
const { autenticar, apenasAdmin, log } = require('../middleware/auth');

// GET /produtos — listar com filtros opcionais
router.get('/', autenticar, (req, res) => {
  const { busca, categoria_id, estoque_baixo } = req.query;

  let sql = `
    SELECT p.*, c.nome AS categoria_nome
    FROM produtos p
    LEFT JOIN categorias c ON c.id = p.categoria_id
    WHERE p.ativo = 1
  `;
  const params = [];

  if (busca) {
    sql += ' AND (p.nome LIKE ? OR p.codigo_barras LIKE ?)';
    params.push(`%${busca}%`, `%${busca}%`);
  }

  if (categoria_id) {
    sql += ' AND p.categoria_id = ?';
    params.push(categoria_id);
  }

  if (estoque_baixo === '1') {
    sql += ' AND p.quantidade <= p.estoque_minimo';
  }

  sql += ' ORDER BY p.nome ASC';

  const produtos = db.prepare(sql).all(...params);
  res.json(produtos);
});

// GET /produtos/categorias — listar categorias
router.get('/categorias', autenticar, (req, res) => {
  res.json(db.prepare('SELECT * FROM categorias ORDER BY nome').all());
});

// GET /produtos/:id — detalhe
router.get('/:id', autenticar, (req, res) => {
  const p = db.prepare(`
    SELECT p.*, c.nome AS categoria_nome
    FROM produtos p LEFT JOIN categorias c ON c.id = p.categoria_id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!p) return res.status(404).json({ erro: 'Produto não encontrado.' });
  res.json(p);
});

// POST /produtos — criar (admin)
router.post('/', autenticar, apenasAdmin, (req, res) => {
  const { nome, codigo_barras, categoria_id, descricao, preco_custo,
          preco_venda, quantidade, estoque_minimo, fornecedor } = req.body;

  if (!nome) return res.status(400).json({ erro: 'Nome do produto é obrigatório.' });
  if (preco_venda === undefined || preco_venda === '') {
    return res.status(400).json({ erro: 'Preço de venda é obrigatório.' });
  }

  if (codigo_barras) {
    const dup = db.prepare('SELECT id FROM produtos WHERE codigo_barras = ?').get(codigo_barras);
    if (dup) return res.status(409).json({ erro: 'Código de barras já cadastrado.' });
  }

  const result = db.prepare(`
    INSERT INTO produtos
      (nome, codigo_barras, categoria_id, descricao, preco_custo, preco_venda,
       quantidade, estoque_minimo, fornecedor)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nome.trim(),
    codigo_barras || null,
    categoria_id  || null,
    descricao     || null,
    Number(preco_custo)  || 0,
    Number(preco_venda),
    Number(quantidade)   || 0,
    Number(estoque_minimo) || 5,
    fornecedor    || null
  );

  log(req.usuario.id, 'PRODUTO_CRIADO', { id: result.lastInsertRowid, nome });
  res.status(201).json({ id: result.lastInsertRowid, mensagem: 'Produto criado.' });
});

// PUT /produtos/:id — editar (admin)
router.put('/:id', autenticar, apenasAdmin, (req, res) => {
  const { id } = req.params;
  const { nome, codigo_barras, categoria_id, descricao, preco_custo,
          preco_venda, quantidade, estoque_minimo, fornecedor } = req.body;

  const p = db.prepare('SELECT id FROM produtos WHERE id = ?').get(id);
  if (!p) return res.status(404).json({ erro: 'Produto não encontrado.' });

  if (codigo_barras) {
    const dup = db.prepare('SELECT id FROM produtos WHERE codigo_barras = ? AND id != ?').get(codigo_barras, id);
    if (dup) return res.status(409).json({ erro: 'Código de barras já em uso.' });
  }

  db.prepare(`
    UPDATE produtos SET
      nome = ?, codigo_barras = ?, categoria_id = ?, descricao = ?,
      preco_custo = ?, preco_venda = ?, quantidade = ?, estoque_minimo = ?, fornecedor = ?
    WHERE id = ?
  `).run(
    nome?.trim()           ?? null,
    codigo_barras          || null,
    categoria_id           || null,
    descricao              || null,
    Number(preco_custo)    || 0,
    Number(preco_venda)    || 0,
    Number(quantidade)     || 0,
    Number(estoque_minimo) || 5,
    fornecedor             || null,
    id
  );

  log(req.usuario.id, 'PRODUTO_EDITADO', { id });
  res.json({ mensagem: 'Produto atualizado.' });
});

// PATCH /produtos/:id/estoque — ajuste de estoque (admin)
router.patch('/:id/estoque', autenticar, apenasAdmin, (req, res) => {
  const { quantidade } = req.body;
  const { id } = req.params;

  if (quantidade === undefined) return res.status(400).json({ erro: 'Informe a quantidade.' });

  const p = db.prepare('SELECT id, quantidade FROM produtos WHERE id = ?').get(id);
  if (!p) return res.status(404).json({ erro: 'Produto não encontrado.' });

  db.prepare('UPDATE produtos SET quantidade = ? WHERE id = ?').run(Number(quantidade), id);
  log(req.usuario.id, 'ESTOQUE_AJUSTADO', { id, quantidade });
  res.json({ mensagem: 'Estoque atualizado.' });
});

// DELETE /produtos/:id — exclusão lógica (admin)
router.delete('/:id', autenticar, apenasAdmin, (req, res) => {
  const result = db.prepare('UPDATE produtos SET ativo = 0 WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ erro: 'Produto não encontrado.' });

  log(req.usuario.id, 'PRODUTO_DESATIVADO', { id: req.params.id });
  res.json({ mensagem: 'Produto desativado.' });
});

module.exports = router;
