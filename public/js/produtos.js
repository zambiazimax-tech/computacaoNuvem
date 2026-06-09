/**
 * Módulo Produtos — CRUD completo com controle de estoque.
 */

let _categorias = [];

async function carregarProdutos() {
  const busca     = document.getElementById('prod-busca')?.value || '';
  const catId     = document.getElementById('prod-categoria')?.value || '';
  const estBaixo  = document.getElementById('prod-estoque-filtro')?.value || '';

  const params = new URLSearchParams();
  if (busca)    params.set('busca', busca);
  if (catId)    params.set('categoria_id', catId);
  if (estBaixo) params.set('estoque_baixo', estBaixo);

  try {
    const produtos = await API.get(`/produtos?${params}`);
    renderizarProdutos(produtos);

    // Carrega categorias nos filtros (uma vez)
    if (!_categorias.length) await carregarCategorias();
  } catch (e) {
    toast(e.message, 'erro');
  }
}

async function carregarCategorias() {
  try {
    _categorias = await API.get('/produtos/categorias');

    // Filtro
    const sel = document.getElementById('prod-categoria');
    if (sel) {
      sel.innerHTML = '<option value="">Todas</option>' +
        _categorias.map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
    }

    // Modal
    const selModal = document.getElementById('prod-cat-modal');
    if (selModal) {
      selModal.innerHTML = '<option value="">Sem categoria</option>' +
        _categorias.map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
    }
  } catch { /* silencioso */ }
}

function renderizarProdutos(lista) {
  const tbody = document.getElementById('tabela-produtos');
  const isAdmin = getUsuario()?.tipo === 'admin';

  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="vazio">Nenhum produto encontrado.</td></tr>';
    return;
  }

  tbody.innerHTML = lista.map(p => {
    const estoqueBadge = p.quantidade <= p.estoque_minimo
      ? `<span class="badge badge-vermelho">${p.quantidade}</span>`
      : `<span class="badge badge-verde">${p.quantidade}</span>`;

    const acoes = isAdmin ? `
      <div class="td-acoes">
        <button class="btn btn-ghost btn-sm" onclick="editarProduto(${p.id})" title="Editar">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="desativarProduto(${p.id})" title="Desativar">🗑️</button>
      </div>` : '—';

    return `
      <tr>
        <td><strong>${esc(p.nome)}</strong></td>
        <td>${esc(p.codigo_barras || '—')}</td>
        <td>${esc(p.categoria_nome || '—')}</td>
        <td>${moeda(p.preco_custo)}</td>
        <td>${moeda(p.preco_venda)}</td>
        <td>${estoqueBadge} <small style="color:var(--cinza-400)">mín:${p.estoque_minimo}</small></td>
        <td>${esc(p.fornecedor || '—')}</td>
        <td>${acoes}</td>
      </tr>`;
  }).join('');
}

function limparFiltrosProdutos() {
  document.getElementById('prod-busca').value = '';
  document.getElementById('prod-categoria').value = '';
  document.getElementById('prod-estoque-filtro').value = '';
  carregarProdutos();
}

// ── Modal produto ─────────────────────────────────────────────────────────────
async function abrirModalProduto(id = null) {
  await carregarCategorias();
  document.getElementById('prod-id').value = '';
  document.getElementById('form-produto').reset();
  document.getElementById('modal-produto-titulo').textContent = 'Novo Produto';

  if (id) {
    try {
      const p = await API.get(`/produtos/${id}`);
      document.getElementById('modal-produto-titulo').textContent = 'Editar Produto';
      document.getElementById('prod-id').value          = p.id;
      document.getElementById('prod-nome').value        = p.nome;
      document.getElementById('prod-codigo').value      = p.codigo_barras || '';
      document.getElementById('prod-cat-modal').value   = p.categoria_id || '';
      document.getElementById('prod-custo').value       = p.preco_custo;
      document.getElementById('prod-venda').value       = p.preco_venda;
      document.getElementById('prod-qtd').value         = p.quantidade;
      document.getElementById('prod-min').value         = p.estoque_minimo;
      document.getElementById('prod-fornecedor').value  = p.fornecedor || '';
      document.getElementById('prod-descricao').value   = p.descricao || '';
    } catch (e) { toast(e.message, 'erro'); return; }
  }

  abrirModal('modal-produto');
}

async function editarProduto(id) { abrirModalProduto(id); }

async function salvarProduto() {
  const id = document.getElementById('prod-id').value;

  const body = {
    nome:           document.getElementById('prod-nome').value.trim(),
    codigo_barras:  document.getElementById('prod-codigo').value.trim() || null,
    categoria_id:   document.getElementById('prod-cat-modal').value || null,
    preco_custo:    document.getElementById('prod-custo').value,
    preco_venda:    document.getElementById('prod-venda').value,
    quantidade:     document.getElementById('prod-qtd').value,
    estoque_minimo: document.getElementById('prod-min').value,
    fornecedor:     document.getElementById('prod-fornecedor').value.trim() || null,
    descricao:      document.getElementById('prod-descricao').value.trim() || null,
  };

  if (!body.nome) { toast('Nome do produto é obrigatório.', 'erro'); return; }
  if (!body.preco_venda) { toast('Preço de venda é obrigatório.', 'erro'); return; }

  try {
    if (id) {
      await API.put(`/produtos/${id}`, body);
      toast('Produto atualizado.');
    } else {
      await API.post('/produtos', body);
      toast('Produto criado.');
    }
    fecharModal('modal-produto');
    carregarProdutos();
  } catch (e) {
    toast(e.message, 'erro');
  }
}

async function desativarProduto(id) {
  if (!confirm('Desativar este produto?')) return;
  try {
    await API.delete(`/produtos/${id}`);
    toast('Produto desativado.');
    carregarProdutos();
  } catch (e) {
    toast(e.message, 'erro');
  }
}
