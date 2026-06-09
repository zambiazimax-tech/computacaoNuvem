/**
 * Middlewares de autenticação e autorização JWT.
 */
const jwt = require('jsonwebtoken');
const db  = require('../db');

const SECRET = process.env.JWT_SECRET || 'comercio-jwt-secret-2024';

/**
 * Verifica token JWT e injeta req.usuario.
 */
function autenticar(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Não autenticado.' });
  }

  try {
    req.usuario = jwt.verify(header.slice(7), SECRET);

    // Verifica se usuário ainda está ativo no banco
    const u = db.prepare('SELECT ativo FROM usuarios WHERE id = ?').get(req.usuario.id);
    if (!u || !u.ativo) {
      return res.status(401).json({ erro: 'Conta desativada ou não encontrada.' });
    }

    next();
  } catch {
    res.status(401).json({ erro: 'Token inválido ou expirado. Faça login novamente.' });
  }
}

/**
 * Restringe rota apenas a admins.
 */
function apenasAdmin(req, res, next) {
  if (req.usuario?.tipo !== 'admin') {
    return res.status(403).json({ erro: 'Acesso restrito a administradores.' });
  }
  next();
}

/**
 * Registra ação no log.
 */
function log(usuarioId, acao, detalhes = null) {
  try {
    db.prepare('INSERT INTO logs (usuario_id, acao, detalhes) VALUES (?, ?, ?)').run(
      usuarioId, acao, detalhes ? JSON.stringify(detalhes) : null
    );
  } catch { /* log nunca deve quebrar a aplicação */ }
}

module.exports = { autenticar, apenasAdmin, log, SECRET };
