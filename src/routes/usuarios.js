/**
 * CRUD de usuários — acesso restrito a admin,
 * exceto GET /usuarios/me (próprio perfil).
 */
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db     = require('../db');
const { autenticar, apenasAdmin, log } = require('../middleware/auth');

const CAMPOS_PUBLICOS = 'id, nome, email, telefone, tipo, ativo, criado_em';

// GET /usuarios — listar todos (admin)
router.get('/', autenticar, apenasAdmin, (req, res) => {
  const usuarios = db.prepare(`SELECT ${CAMPOS_PUBLICOS} FROM usuarios ORDER BY criado_em DESC`).all();
  res.json(usuarios);
});

// GET /usuarios/:id — detalhe (admin)
router.get('/:id', autenticar, apenasAdmin, (req, res) => {
  const u = db.prepare(`SELECT ${CAMPOS_PUBLICOS} FROM usuarios WHERE id = ?`).get(req.params.id);
  if (!u) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  res.json(u);
});

// POST /usuarios — criar (admin)
router.post('/', autenticar, apenasAdmin, async (req, res) => {
  const { nome, email, senha, telefone, tipo } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ erro: 'E-mail inválido.' });
  }

  if (senha.length < 6) {
    return res.status(400).json({ erro: 'Senha deve ter pelo menos 6 caracteres.' });
  }

  const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email.toLowerCase());
  if (existe) return res.status(409).json({ erro: 'E-mail já cadastrado.' });

  const hash = await bcrypt.hash(senha, 10);
  const result = db.prepare(
    'INSERT INTO usuarios (nome, email, senha, telefone, tipo) VALUES (?, ?, ?, ?, ?)'
  ).run(nome.trim(), email.toLowerCase(), hash, telefone || null, tipo || 'usuario');

  log(req.usuario.id, 'USUARIO_CRIADO', { novo_id: result.lastInsertRowid, email });
  res.status(201).json({ id: result.lastInsertRowid, mensagem: 'Usuário criado.' });
});

// PUT /usuarios/:id — editar (admin)
router.put('/:id', autenticar, apenasAdmin, async (req, res) => {
  const { nome, email, telefone, tipo, senha } = req.body;
  const { id } = req.params;

  const u = db.prepare('SELECT id FROM usuarios WHERE id = ?').get(id);
  if (!u) return res.status(404).json({ erro: 'Usuário não encontrado.' });

  if (email) {
    const dup = db.prepare('SELECT id FROM usuarios WHERE email = ? AND id != ?').get(email.toLowerCase(), id);
    if (dup) return res.status(409).json({ erro: 'E-mail já em uso.' });
  }

  // Monta update dinâmico
  const campos = [];
  const vals   = [];

  if (nome)     { campos.push('nome = ?');     vals.push(nome.trim()); }
  if (email)    { campos.push('email = ?');    vals.push(email.toLowerCase()); }
  if (telefone !== undefined) { campos.push('telefone = ?'); vals.push(telefone || null); }
  if (tipo)     { campos.push('tipo = ?');     vals.push(tipo); }
  if (senha) {
    if (senha.length < 6) return res.status(400).json({ erro: 'Senha deve ter pelo menos 6 caracteres.' });
    campos.push('senha = ?');
    vals.push(await bcrypt.hash(senha, 10));
  }

  if (campos.length === 0) return res.status(400).json({ erro: 'Nenhum campo para atualizar.' });

  vals.push(id);
  db.prepare(`UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`).run(...vals);
  log(req.usuario.id, 'USUARIO_EDITADO', { id });
  res.json({ mensagem: 'Usuário atualizado.' });
});

// PATCH /usuarios/:id/status — ativar/desativar (exclusão lógica)
router.patch('/:id/status', autenticar, apenasAdmin, (req, res) => {
  const { id } = req.params;

  if (Number(id) === req.usuario.id) {
    return res.status(400).json({ erro: 'Você não pode desativar sua própria conta.' });
  }

  const u = db.prepare('SELECT ativo FROM usuarios WHERE id = ?').get(id);
  if (!u) return res.status(404).json({ erro: 'Usuário não encontrado.' });

  const novoStatus = u.ativo ? 0 : 1;
  db.prepare('UPDATE usuarios SET ativo = ? WHERE id = ?').run(novoStatus, id);
  log(req.usuario.id, novoStatus ? 'USUARIO_ATIVADO' : 'USUARIO_DESATIVADO', { id });
  res.json({ ativo: novoStatus, mensagem: novoStatus ? 'Usuário ativado.' : 'Usuário desativado.' });
});

// DELETE /usuarios/:id — exclusão física (admin, não pode excluir a si mesmo)
router.delete('/:id', autenticar, apenasAdmin, (req, res) => {
  const { id } = req.params;

  if (Number(id) === req.usuario.id) {
    return res.status(400).json({ erro: 'Você não pode excluir sua própria conta.' });
  }

  const result = db.prepare('DELETE FROM usuarios WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ erro: 'Usuário não encontrado.' });

  log(req.usuario.id, 'USUARIO_EXCLUIDO', { id });
  res.json({ mensagem: 'Usuário excluído.' });
});

module.exports = router;
