/**
 * Seed inicial: cria admin padrão e categorias base.
 * Execute: node src/seed.js
 */
const db = require('./db');

// Admin padrão — senha em texto puro
const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?').get('admin@admin.com');
if (!existe) {
  db.prepare(
    'INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)'
  ).run('Administrador', 'admin@admin.com', 'admin123', 'admin');
  console.log('✔ Admin criado');
  console.log('  email: admin@admin.com');
  console.log('  senha: admin123');
} else {
  console.log('ℹ Admin já existe.');
}

// Categorias padrão
const cats = ['Alimentos','Bebidas','Limpeza','Higiene','Eletrônicos','Vestuário','Outros'];
const ins  = db.prepare('INSERT OR IGNORE INTO categorias (nome) VALUES (?)');
cats.forEach(c => ins.run(c));
console.log('✔ Categorias inseridas.');

console.log('Seed concluído.');
process.exit(0);
