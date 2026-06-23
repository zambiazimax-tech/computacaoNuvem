/**
 * Seed inicial: cria admin padrão e categorias base.
 * Execute: node src/seed.js
 */
const bcrypt = require('bcryptjs');
const db = require('./db');

// Admin padrão
const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?').get('admin@admin.com');
if (!existe) {
  const hash = bcrypt.hashSync('123456', 10);
  db.prepare(`
    INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)
  `).run('Administrador', 'admin@admin.com', hash, 'admin');
  console.log('✔ Admin criado: admin@admin.com / 123456');
} else {
  console.log('ℹ Admin já existe.');
}

// Categorias padrão
const cats = ['Alimentos','Bebidas','Limpeza','Higiene','Eletrônicos','Vestuário','Outros'];
const ins = db.prepare('INSERT OR IGNORE INTO categorias (nome) VALUES (?)');
cats.forEach(c => ins.run(c));
console.log('✔ Categorias inseridas.');

console.log('Seed concluído.');
process.exit(0);
