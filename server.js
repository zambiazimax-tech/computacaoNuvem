/**
 * Ponto de entrada da aplicação.
 * Registra middlewares globais, rotas e inicia o servidor.
 */
const express = require('express');
const path    = require('path');

const app = express();

// ── Middlewares globais ───────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Cabeçalhos de segurança básicos
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// ── Rotas da API ──────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./src/routes/auth'));
app.use('/api/usuarios',  require('./src/routes/usuarios'));
app.use('/api/produtos',  require('./src/routes/produtos'));
app.use('/api/caixa',     require('./src/routes/caixa'));
app.use('/api/dashboard', require('./src/routes/dashboard'));

// ── Rota raiz → login ─────────────────────────────────────────────────────────
app.get('/', (req, res) => res.redirect('/login.html'));

// ── Handler de erros global ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERRO]', err.message);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✔ Servidor rodando em http://localhost:${PORT}`);
  console.log(`  Execute "node src/seed.js" para criar o admin padrão.`);
});
