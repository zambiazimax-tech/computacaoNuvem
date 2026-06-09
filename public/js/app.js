/**
 * Inicialização da aplicação: autenticação, navegação, sidebar.
 */

// ── Guard de autenticação ─────────────────────────────────────────────────────
const _token   = getToken();
const _usuario = getUsuario();

if (!_token || !_usuario) {
  location.href = '/login.html';
}

// ── Sidebar: exibe itens de admin ─────────────────────────────────────────────
if (_usuario?.tipo === 'admin') {
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
}

// ── Preenche info do usuário na sidebar ───────────────────────────────────────
document.getElementById('sidebar-nome').textContent = _usuario?.nome || '—';
document.getElementById('sidebar-tipo').textContent = _usuario?.tipo === 'admin' ? '🔑 Administrador' : '👤 Usuário';

// ── Navegação entre páginas ───────────────────────────────────────────────────
const TITULOS = {
  dashboard: 'Dashboard',
  produtos:  'Produtos',
  caixa:     'Fluxo de Caixa',
  relatorio: 'Relatórios',
  usuarios:  'Usuários',
};

function navegar(pagina, btn) {
  // Atualiza páginas
  document.querySelectorAll('.page').forEach(p => p.classList.remove('ativa'));
  document.getElementById(`page-${pagina}`)?.classList.add('ativa');

  // Atualiza nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('ativo'));
  btn?.classList.add('ativo');

  // Atualiza título
  document.getElementById('topbar-title').textContent = TITULOS[pagina] || pagina;

  // Fecha sidebar no mobile
  fecharSidebar();

  // Carrega dados da página
  const loaders = {
    dashboard: carregarDashboard,
    produtos:  carregarProdutos,
    caixa:     carregarCaixa,
    relatorio: carregarRelatorio,
    usuarios:  carregarUsuarios,
  };
  loaders[pagina]?.();
}

// ── Sidebar mobile ────────────────────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('aberta');
  document.getElementById('sidebar-overlay').classList.toggle('ativo');
}

function fecharSidebar() {
  document.getElementById('sidebar').classList.remove('aberta');
  document.getElementById('sidebar-overlay').classList.remove('ativo');
}

// ── Logout ────────────────────────────────────────────────────────────────────
function sair() {
  localStorage.clear();
  location.href = '/login.html';
}

// ── Init ──────────────────────────────────────────────────────────────────────
carregarDashboard();
