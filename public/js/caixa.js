/**
 * Módulo Fluxo de Caixa — lançamentos, histórico e totalizadores.
 */

// Define data de hoje no formulário ao carregar
document.addEventListener('DOMContentLoaded', () => {
  const hoje = new Date().toISOString().slice(0, 10);
  const cx = document.getElementById('cx-data');
  if (cx) cx.value = hoje;
});

async function carregarCaixa() {
  const tipo   = document.getElementById('cx-filtro-tipo')?.value || '';
  const inicio = document.getElementById('cx-filtro-inicio')?.value || '';
  const fim    = document.getElementById('cx-filtro-fim')?.value || '';

  const params = new URLSearchParams();
  if (tipo)   params.set('tipo', tipo);
  if (inicio) params.set('data_inicio', inicio);
  if (fim)    params.set('data_fim', fim);

  try {
    const data = await API.get(`/caixa?${params}`);

    // Totalizadores
    document.getElementById('caixa-entradas').textContent = moeda(data.resumo.entradas);
    document.getElementById('caixa-saidas').textContent   = moeda(data.resumo.saidas);
    document.getElementById('caixa-saldo').textContent    = moeda(data.resumo.saldo);

    const saldoEl = document.getElementById('caixa-saldo');
    saldoEl.style.color = data.resumo.saldo >= 0 ? 'var(--primario)' : 'var(--vermelho)';

    renderizarCaixa(data.movimentacoes);
  } catch (e) {
    toast(e.message, 'erro');
  }
}

function renderizarCaixa(lista) {
  const tbody = document.getElementById('tabela-caixa');
  const usuario = getUsuario();

  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="vazio">Nenhuma movimentação encontrada.</td></tr>';
    return;
  }

  tbody.innerHTML = lista.map(m => {
    const podeRemover = usuario?.tipo === 'admin' || m.usuario_id === usuario?.id;
    return `
      <tr>
        <td>${esc(m.descricao)}</td>
        <td><span class="badge ${m.tipo === 'entrada' ? 'badge-verde' : 'badge-vermelho'}">${m.tipo}</span></td>
        <td>${esc(m.categoria)}</td>
        <td>${esc(m.forma_pagamento)}</td>
        <td style="font-weight:600;color:${m.tipo === 'entrada' ? 'var(--verde)' : 'var(--vermelho)'}">
          ${m.tipo === 'entrada' ? '+' : '-'} ${moeda(m.valor)}
        </td>
        <td>${dataFmt(m.data_mov)}</td>
        <td>
          ${podeRemover
            ? `<button class="btn btn-danger btn-sm" onclick="removerMovimentacao(${m.id})">🗑️</button>`
            : ''}
        </td>
      </tr>`;
  }).join('');
}

// ── Formulário ────────────────────────────────────────────────────────────────
document.getElementById('form-caixa')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const body = {
    tipo:            document.getElementById('cx-tipo').value,
    descricao:       document.getElementById('cx-descricao').value.trim(),
    valor:           document.getElementById('cx-valor').value,
    categoria:       document.getElementById('cx-categoria').value,
    forma_pagamento: document.getElementById('cx-pagamento').value,
    data_mov:        document.getElementById('cx-data').value,
  };

  if (!body.descricao || !body.valor) {
    toast('Preencha descrição e valor.', 'erro');
    return;
  }

  try {
    await API.post('/caixa', body);
    toast('Movimentação registrada.');
    e.target.reset();
    document.getElementById('cx-data').value = new Date().toISOString().slice(0, 10);
    carregarCaixa();
  } catch (err) {
    toast(err.message, 'erro');
  }
});

async function removerMovimentacao(id) {
  if (!confirm('Remover esta movimentação?')) return;
  try {
    await API.delete(`/caixa/${id}`);
    toast('Movimentação removida.');
    carregarCaixa();
  } catch (e) {
    toast(e.message, 'erro');
  }
}
