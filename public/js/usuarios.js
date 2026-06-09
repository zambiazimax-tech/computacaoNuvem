/**
 * Módulo Usuários — CRUD restrito a admin.
 */

async function carregarUsuarios() {
  if (getUsuario()?.tipo !== 'admin') return;

  try {
    const lista = await API.get('/usuarios');
    renderizarUsuarios(lista);
  } catch (e) {
    toast(e.message, 'erro');
  }
}

function renderizarUsuarios(lista) {
  const tbody = document.getElementById('tabela-usuarios');
  const meId  = getUsuario()?.id;

  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="vazio">Nenhum usuário.</td></tr>';
    return;
  }

  tbody.innerHTML = lista.map(u => {
    const ehVoce = u.id === meId;
    return `
      <tr>
        <td><strong>${esc(u.nome)}</strong> ${ehVoce ? '<span class="badge badge-azul">você</span>' : ''}</td>
        <td>${esc(u.email)}</td>
        <td>${esc(u.telefone || '—')}</td>
        <td><span class="badge ${u.tipo === 'admin' ? 'badge-amarelo' : 'badge-azul'}">${u.tipo}</span></td>
        <td><span class="badge ${u.ativo ? 'badge-verde' : 'badge-cinza'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
        <td>${dataHoraFmt(u.criado_em)}</td>
        <td>
          ${!ehVoce ? `
            <div class="td-acoes">
              <button class="btn btn-ghost btn-sm" onclick="editarUsuario(${u.id})" title="Editar">✏️</button>
              <button class="btn btn-ghost btn-sm" onclick="toggleStatusUsuario(${u.id}, ${u.ativo})" title="${u.ativo ? 'Desativar' : 'Ativar'}">
                ${u.ativo ? '🔒' : '🔓'}
              </button>
              <button class="btn btn-danger btn-sm" onclick="excluirUsuario(${u.id})" title="Excluir">🗑️</button>
            </div>` : '—'}
        </td>
      </tr>`;
  }).join('');
}

// ── Modal usuário ─────────────────────────────────────────────────────────────
async function abrirModalUsuario(id = null) {
  document.getElementById('usr-id').value = '';
  document.getElementById('form-usuario').reset();
  document.getElementById('modal-usuario-titulo').textContent = 'Novo Usuário';
  document.getElementById('usr-senha-label').textContent = 'Senha *';
  document.getElementById('usr-senha').required = true;

  if (id) {
    try {
      const u = await API.get(`/usuarios/${id}`);
      document.getElementById('modal-usuario-titulo').textContent = 'Editar Usuário';
      document.getElementById('usr-id').value        = u.id;
      document.getElementById('usr-nome').value      = u.nome;
      document.getElementById('usr-email').value     = u.email;
      document.getElementById('usr-telefone').value  = u.telefone || '';
      document.getElementById('usr-tipo').value      = u.tipo;
      document.getElementById('usr-senha-label').textContent = 'Nova Senha (deixe em branco para manter)';
      document.getElementById('usr-senha').required  = false;
    } catch (e) { toast(e.message, 'erro'); return; }
  }

  abrirModal('modal-usuario');
}

async function editarUsuario(id) { abrirModalUsuario(id); }

async function salvarUsuario() {
  const id = document.getElementById('usr-id').value;

  const body = {
    nome:      document.getElementById('usr-nome').value.trim(),
    email:     document.getElementById('usr-email').value.trim(),
    telefone:  document.getElementById('usr-telefone').value.trim() || null,
    tipo:      document.getElementById('usr-tipo').value,
  };

  const senha = document.getElementById('usr-senha').value;
  if (senha) body.senha = senha;

  if (!body.nome || !body.email) { toast('Nome e e-mail são obrigatórios.', 'erro'); return; }
  if (!id && !senha) { toast('Senha é obrigatória para novo usuário.', 'erro'); return; }

  try {
    if (id) {
      await API.put(`/usuarios/${id}`, body);
      toast('Usuário atualizado.');
    } else {
      await API.post('/usuarios', body);
      toast('Usuário criado.');
    }
    fecharModal('modal-usuario');
    carregarUsuarios();
  } catch (e) {
    toast(e.message, 'erro');
  }
}

async function toggleStatusUsuario(id, ativo) {
  const acao = ativo ? 'desativar' : 'ativar';
  if (!confirm(`Deseja ${acao} este usuário?`)) return;
  try {
    const r = await API.patch(`/usuarios/${id}/status`);
    toast(r.mensagem);
    carregarUsuarios();
  } catch (e) {
    toast(e.message, 'erro');
  }
}

async function excluirUsuario(id) {
  if (!confirm('Excluir permanentemente este usuário?')) return;
  try {
    await API.delete(`/usuarios/${id}`);
    toast('Usuário excluído.');
    carregarUsuarios();
  } catch (e) {
    toast(e.message, 'erro');
  }
}
