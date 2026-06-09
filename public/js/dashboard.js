/**
 * Módulo Dashboard — carrega e renderiza o painel inicial.
 */

async function carregarDashboard() {
  try {
    const d = await API.get('/dashboard');

    // Cards
    document.getElementById('dash-saldo').textContent         = moeda(d.caixa.saldo);
    document.getElementById('dash-entradas-hoje').textContent = moeda(d.vendasHoje.total);
    document.getElementById('dash-entradas-qtd').textContent  = `${d.vendasHoje.qtd} lançamento(s)`;
    document.getElementById('dash-saidas-hoje').textContent   = moeda(d.caixa.saidas);
    document.getElementById('dash-estoque-baixo').textContent = d.produtos.estoque_baixo;
    document.getElementById('dash-produtos-total').textContent= `de ${d.produtos.total} produto(s)`;

    // Cor do saldo
    const saldoEl = document.getElementById('dash-saldo');
    saldoEl.style.color = d.caixa.saldo >= 0 ? 'var(--primario)' : 'var(--vermelho)';

    // Gráfico
    renderizarGrafico(d.grafico);

    // Estoque baixo
    renderizarEstoqueBaixo(d.estoqueBaixo);

    // Últimas movimentações
    renderizarUltimas(d.ultimas);

  } catch (e) {
    toast(e.message, 'erro');
  }
}

function renderizarGrafico(dados) {
  const el = document.getElementById('grafico');
  if (!dados.length) { el.innerHTML = '<div class="vazio" style="width:100%">Sem dados</div>'; return; }

  const maxVal = Math.max(...dados.flatMap(d => [d.entradas, d.saidas]), 1);

  el.innerHTML = dados.map(d => {
    const hE = Math.round((d.entradas / maxVal) * 100);
    const hS = Math.round((d.saidas   / maxVal) * 100);
    const dia = d.data ? d.data.slice(8) + '/' + d.data.slice(5, 7) : '';

    return `
      <div class="barra-grupo" title="Entradas: ${moeda(d.entradas)} | Saídas: ${moeda(d.saidas)}">
        <div class="barra-wrap">
          <div class="barra entrada" style="height:${hE}%"></div>
          <div class="barra saida"   style="height:${hS}%"></div>
        </div>
        <div class="barra-label">${dia}</div>
      </div>`;
  }).join('');
}

function renderizarEstoqueBaixo(lista) {
  const el = document.getElementById('dash-lista-estoque');
  if (!lista.length) {
    el.innerHTML = '<div class="vazio">Nenhum produto com estoque baixo 👍</div>';
    return;
  }
  el.innerHTML = lista.map(p => `
    <div class="alerta-estoque">
      ⚠️ <strong>${esc(p.nome)}</strong> — ${p.quantidade} un. (mín: ${p.estoque_minimo})
    </div>`).join('');
}

function renderizarUltimas(lista) {
  const tbody = document.getElementById('dash-ultimas');
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="vazio">Nenhuma movimentação.</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(m => `
    <tr>
      <td>${esc(m.descricao)}</td>
      <td><span class="badge ${m.tipo === 'entrada' ? 'badge-verde' : 'badge-vermelho'}">${m.tipo}</span></td>
      <td>${esc(m.categoria)}</td>
      <td style="font-weight:600;color:${m.tipo === 'entrada' ? 'var(--verde)' : 'var(--vermelho)'}">
        ${m.tipo === 'entrada' ? '+' : '-'} ${moeda(m.valor)}
      </td>
      <td>${dataFmt(m.data_mov)}</td>
      <td>${esc(m.usuario_nome)}</td>
    </tr>`).join('');
}
