/**
 * Rotas de autenticação: login, logout, perfil, troca de senha.
 */
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const { log, SECRET } = require('../middleware/auth');
const { autenticar }  = require('../middleware/auth');

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
  }

  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email.toLowerCase().trim());

  if (!usuario || !usuario.ativo) {
    return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
  }

  const ok = await bcrypt.compare(senha, usuario.senha);
  if (!ok) {
    log(usuario.id, 'LOGIN_FALHOU', { email });
    return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
  }

  const token = jwt.sign(
    { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo },
    SECRET,
    { expiresIn: '10h' }
  );

  log(usuario.id, 'LOGIN');
  res.json({
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo }
  });
});

// GET /auth/me — valida token e retorna dados do usuário
router.get('/me', autenticar, (req, res) => {
  const u = db.prepare('SELECT id, nome, email, telefone, tipo, criado_em FROM usuarios WHERE id = ?')
    .get(req.usuario.id);
  res.json(u);
});

// PUT /auth/senha — troca senha do próprio usuário
router.put('/senha', autenticar, async (req, res) => {
  const { senha_atual, nova_senha } = req.body;

  if (!senha_atual || !nova_senha) {
    return res.status(400).json({ erro: 'Informe a senha atual e a nova senha.' });
  }

  if (nova_senha.length < 6) {
    return res.status(400).json({ erro: 'A nova senha deve ter pelo menos 6 caracteres.' });
  }

  const u = db.prepare('SELECT senha FROM usuarios WHERE id = ?').get(req.usuario.id);
  const ok = await bcrypt.compare(senha_atual, u.senha);
  if (!ok) return res.status(400).json({ erro: 'Senha atual incorreta.' });

  const hash = await bcrypt.hash(nova_senha, 10);
  db.prepare('UPDATE usuarios SET senha = ? WHERE id = ?').run(hash, req.usuario.id);
  log(req.usuario.id, 'SENHA_ALTERADA');
  res.json({ mensagem: 'Senha alterada com sucesso.' });
});

module.exports = router;
