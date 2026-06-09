/**
 * Módulo Relatórios — diário e mensal.
 */

// Popula selects de mês e ano ao carregar
document.addEventListener('DOMContentLoaded', () => {
  const hoje = new Date();
  const selMes = document.getElementById('rel-mes');
  const selAno = document.getElementById('rel-ano');
  if (!selMes || !selAno) return;

  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                 'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  selMes.innerHTML = meses.map((m, i) =>
    `<option value="${String(i+1).padStart(2,'0')}" ${i === hoje.getMonth() ? 'selected' : ''}>${m}</option>`
  ).join('');

  for (let a = hoje.getFullYear(); a >= hoje.getFullYear() - 3; a--) {
    selAno.innerHTML += `<option value="${a}" ${a === hoje.getFullYear() ? 'selected' : ''}>${a}</option>`;
  }
});

async function carregarRelatorio() {
  const mes = document.getElementById('rel-mes')?.value;
  const ano = document.getElementById('rel-ano')?.value;
  if (!mes || !ano) return;

  try {
    const data = await API.get(`/caixa/relatorio/mensal?mes=${mes}&ano=${ano}`);

    document.getElementById('rel-entradas').textContent = moeda(data.totalEntradas);
    document.getElementById('rel-saidas').textContent   = moeda(data.totalSaidas);
    document.getElementById('rel-saldo').textContent    = moeda(data.saldo);

    const saldoEl = document.getElementById('rel-saldo');
    saldoEl.style.color = data.saldo >= 0 ? 'var(--primario)' : 'var(--vermelho)';

    const tbody = document.getElementById('tabela-relatorio');

    if (!data.dias.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="vazio">Sem movimentações neste período.</td></tr>';
      return;
    }

    tbody.innerHTML = data.dias.map(d => `
      <tr>
        <td>${dataFmt(d.data)}</td>
        <td style="color:var(--verde);font-weight:600">+ ${moeda(d.entradas)}</td>
        <td style="color:var(--vermelho);font-weight:600">- ${moeda(d.saidas)}</td>
        <td style="font-weight:700;color:${d.saldo >= 0 ? 'var(--primario)' : 'var(--vermelho)'}">
          ${moeda(d.saldo)}
        </td>
      </tr>`).join('');
  } catch (e) {
    toast(e.message, 'erro');
  }
}
