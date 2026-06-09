/**
 * Camada de comunicação com a API.
 * Centraliza fetch, token e tratamento de erros.
 */

const TOKEN_KEY   = 'token';
const USUARIO_KEY = 'usuario';

function getToken()   { return localStorage.getItem(TOKEN_KEY); }
function getUsuario() { return JSON.parse(localStorage.getItem(USUARIO_KEY) || 'null'); }

function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` };
}

async function api(method, path, body = null) {
  const opts = { method, headers: authHeaders() };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`/api${path}`, opts);

  if (res.status === 401) {
    localStorage.clear();
    location.href = '/login.html';
    return;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(data.erro || 'Erro desconhecido.');
  return data;
}

const API = {
  get:    (path)         => api('GET',    path),
  post:   (path, body)   => api('POST',   path, body),
  put:    (path, body)   => api('PUT',    path, body),
  patch:  (path, body)   => api('PATCH',  path, body),
  delete: (path)         => api('DELETE', path),
};

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, tipo = 'sucesso') {
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Formatação ────────────────────────────────────────────────────────────────
function moeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dataFmt(iso) {
  if (!iso) return '—';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

function dataHoraFmt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR');
}

// ── Escape XSS ────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Modal helpers ─────────────────────────────────────────────────────────────
function abrirModal(id)  { document.getElementById(id).classList.add('aberto'); }
function fecharModal(id) { document.getElementById(id).classList.remove('aberto'); }
