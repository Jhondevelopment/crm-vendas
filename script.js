import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// ==========================================
// AS SUAS CHAVES DO SUPABASE
// ==========================================
const SUPABASE_URL = 'https://bskgqlhducfxfipflpqm.supabase.co'
const SUPABASE_KEY = 'sb_publishable_hPbZtYmMLtMn1yfRZa4O2w_nxf43EOa'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const CHAVE_MESTRA_GESTOR = 'CEO2026';

let usuarioAtual = null;
let perfilAtual = null;
let perfisEquipe = [];
let leadsData = [];
let produtosData = [];
let avisosData = [];
let notifsNaoLidas = 0;
let chartInstance = null;
let confirmCallback = null;
let isRegistering = false;
let graficoVendedorInstance = null;
let chartFugasInstance = null;

// ==========================================
// FUNÇÕES GERAIS E COMPONENTES
// ==========================================
function mostrarToast(msg, tipo = 'ok') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = msg;
    toast.className = `toast show ${tipo}`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

function getSaudacao() {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return 'Bom dia';
    if (hora >= 12 && hora < 18) return 'Boa tarde';
    return 'Boa noite';
}

function mudarTela(id) {
    document.querySelectorAll('.tela').forEach(t => {
        t.classList.remove('ativa');
    });
    const tela = document.getElementById(id);
    if (tela) tela.classList.add('ativa');
}

window.abrirConfirmacao = (titulo, mensagem, textoBotaoAcao, callback) => {
    document.getElementById('confirm-titulo').innerText = titulo;
    document.getElementById('confirm-msg').innerHTML = mensagem;
    document.getElementById('btn-confirm-acao').innerHTML = `<i class="ph ph-check-circle"></i> ${textoBotaoAcao}`;
    confirmCallback = callback;
    document.getElementById('modal-confirmacao').classList.add('ativa');
};

document.getElementById('btn-confirm-cancelar').onclick = () => {
    document.getElementById('modal-confirmacao').classList.remove('ativa');
    confirmCallback = null;
};

document.getElementById('btn-confirm-acao').onclick = () => {
    if (confirmCallback) confirmCallback();
    document.getElementById('modal-confirmacao').classList.remove('ativa');
};

// ==========================================
// TELA DE LOGIN / CADASTRO
// ==========================================
const toggleModo = document.getElementById('toggle-modo');
if (toggleModo) {
    toggleModo.onclick = () => {
        const isLogin = toggleModo.dataset.modo === 'login';
        if (isLogin) {
            toggleModo.dataset.modo = 'cadastro';
            document.getElementById('auth-titulo').innerText = 'Criar Nova Conta';
            document.getElementById('auth-desc').innerText = 'Preencha seus dados para começar.';
            document.getElementById('btn-login').innerText = 'Cadastrar e Entrar';
            toggleModo.innerHTML = 'Já tenho conta — <a style="cursor:pointer; color:var(--accent); font-weight:bold;">fazer login</a>';
            document.getElementById('box-nome').classList.remove('hidden');
            document.getElementById('box-cargo').classList.remove('hidden');
            if (document.getElementById('auth-cargo').value === 'gestor') {
                document.getElementById('box-chave').classList.remove('hidden');
            }
        } else {
            toggleModo.dataset.modo = 'login';
            document.getElementById('auth-titulo').innerText = 'Acessar Sistema';
            document.getElementById('auth-desc').innerText = 'Fricção zero. Direto ao ponto.';
            document.getElementById('btn-login').innerText = 'Entrar no CRM';
            toggleModo.innerHTML = 'Novo por aqui? <a style="cursor:pointer; color:var(--accent); font-weight:bold;">cadastrar-se</a>';
            document.getElementById('box-nome').classList.add('hidden');
            document.getElementById('box-cargo').classList.add('hidden');
            document.getElementById('box-chave').classList.add('hidden');
        }
    };
}

const selectCargo = document.getElementById('auth-cargo');
if (selectCargo) {
    selectCargo.addEventListener('change', (e) => {
        if (e.target.value === 'gestor') {
            document.getElementById('box-chave').classList.remove('hidden');
        } else {
            document.getElementById('box-chave').classList.add('hidden');
        }
    });
}

const btnLogin = document.getElementById('btn-login');
if (btnLogin) {
    btnLogin.onclick = async () => {
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-senha').value;
        const modo = toggleModo.dataset.modo;

        if (!email || !password) {
            return mostrarToast('Preencha e-mail e senha.', 'erro');
        }

        if (modo === 'login') {
            btnLogin.innerText = 'Autenticando...';
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                mostrarToast('Acesso negado. Verifique os dados.', 'erro');
                btnLogin.innerText = 'Entrar no CRM';
            }
        } else {
            const nome = document.getElementById('auth-nome').value;
            const cargo = document.getElementById('auth-cargo').value;
            const chaveDigitada = document.getElementById('auth-chave').value;

            if (!nome) return mostrarToast('Por favor, informe seu nome.', 'erro');
            if (cargo === 'gestor' && chaveDigitada !== CHAVE_MESTRA_GESTOR) {
                return mostrarToast('Chave de Liberação incorreta!', 'erro');
            }

            btnLogin.innerText = 'Criando conta...';
            isRegistering = true;
            
            const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
            
            if (authError) {
                mostrarToast(authError.message, 'erro');
                btnLogin.innerText = 'Cadastrar e Entrar';
                isRegistering = false;
            } else if (authData.user) {
                const payload = { 
                    id: authData.user.id, 
                    full_name: nome, 
                    role: cargo, 
                    equipe: 'Geral', 
                    meta_mensal: 10000,
                    nome_empresa: 'CRM Pro',
                    cor_primaria: '#f5c518'
                };
                await supabase.from('profiles').insert([payload]);
                mostrarToast('Conta criada com sucesso!', 'ok');
                isRegistering = false;
                verificarPerfil(); 
            }
        }
    };
}

const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.onclick = () => supabase.auth.signOut();
}

supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) { 
        usuarioAtual = session.user; 
        if (!isRegistering) verificarPerfil(); 
    } else { 
        mudarTela('tela-auth'); 
    }
});

async function verificarPerfil() {
    let { data } = await supabase.from('profiles').select('*').eq('id', usuarioAtual.id).single();
    
    if (!data) {
        await new Promise(r => setTimeout(r, 1000));
        let retry = await supabase.from('profiles').select('*').eq('id', usuarioAtual.id).single();
        data = retry.data;
    }

    if (data) { 
        perfilAtual = data; 
        iniciarApp(); 
    } else {
        const fallback = { 
            id: usuarioAtual.id, 
            full_name: 'Novo Usuário', 
            role: 'vendedor', 
            equipe: 'Geral', 
            meta_mensal: 10000,
            nome_empresa: 'CRM Pro',
            cor_primaria: '#f5c518'
        };
        await supabase.from('profiles').insert([fallback]);
        perfilAtual = fallback;
        iniciarApp();
    }
}

// ==========================================
// INICIALIZAÇÃO E HIERARQUIA DE CARGOS
// ==========================================
async function iniciarApp() {
    const elUserNome = document.getElementById('user-nome');
    if (elUserNome) {
        elUserNome.innerHTML = `<span style="font-size:12px; color:var(--muted); font-weight:normal;">${getSaudacao()},</span><br>${perfilAtual.full_name}`;
    }
    
    const { data } = await supabase.from('profiles').select('*');
    perfisEquipe = data || [];

    // APLICA O WHITE-LABEL (COR E NOME DA EMPRESA)
    const perfilGestor = perfisEquipe.find(p => p.role === 'gestor') || perfilAtual;
    if (perfilGestor.nome_empresa) {
        document.querySelectorAll('.topbar-logo').forEach(el => {
            el.innerHTML = `<div class="logo-dot"><i class="ph ph-chart-pie-slice"></i></div> ${perfilGestor.nome_empresa}`;
        });
        const authLogoSpan = document.querySelector('.auth-logo span');
        if(authLogoSpan) authLogoSpan.innerText = perfilGestor.nome_empresa;
    }
    if (perfilGestor.cor_primaria) {
        document.documentElement.style.setProperty('--accent', perfilGestor.cor_primaria);
    }

    const itensGestor = document.querySelectorAll('.gestor-only');
    const itensVendedor = document.querySelectorAll('.vendedor-only');
    const boxSininho = document.getElementById('box-sininho');

    if (perfilAtual.role === 'gestor') {
        itensGestor.forEach(item => item.classList.remove('hidden'));
        itensVendedor.forEach(item => item.classList.add('hidden')); 
        if (boxSininho) boxSininho.classList.remove('hidden');
        
        document.querySelectorAll('.aba-conteudo').forEach(a => a.classList.add('hidden'));
        document.getElementById('aba-chefao').classList.remove('hidden');
        
        const btnVisao = document.querySelector('[data-aba="aba-chefao"]');
        if (btnVisao) btnVisao.classList.add('ativo');
    } else {
        itensGestor.forEach(item => item.classList.add('hidden')); 
        itensVendedor.forEach(item => item.classList.remove('hidden'));
        if (boxSininho) boxSininho.classList.add('hidden');
        
        document.querySelectorAll('.aba-conteudo').forEach(a => a.classList.add('hidden'));
        document.getElementById('aba-kanban').classList.remove('hidden');
        
        const btnKanban = document.querySelector('[data-aba="aba-kanban"]');
        if (btnKanban) btnKanban.classList.add('ativo');
    }
    
    mudarTela('tela-app');
    carregarAvisos();
    carregarProdutos();
    carregarLeads();
    configurarNotificacoes();
}

// ==========================================
// NAVEGAÇÃO E PESQUISA GLOBAL
// ==========================================
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('ativo'));
        btn.classList.add('ativo');
        
        document.querySelectorAll('.aba-conteudo').forEach(a => a.classList.add('hidden'));
        const aba = document.getElementById(btn.dataset.aba);
        if (aba) aba.classList.remove('hidden');

        const boxAvisos = document.getElementById('box-avisos');
        if (boxAvisos) {
            if (['aba-chefao', 'aba-kanban', 'aba-agenda', 'aba-exportacao', 'aba-arena', 'aba-pos-venda'].includes(btn.dataset.aba)) {
                boxAvisos.classList.remove('hidden');
            } else {
                boxAvisos.classList.add('hidden');
            }
        }

        if (btn.dataset.aba === 'aba-relatorio') { atualizarEstatisticas(); calcularComissao(); }
        if (btn.dataset.aba === 'aba-chefao') renderizarGestor();
        if (btn.dataset.aba === 'aba-equipe') renderizarAbaEquipe();
        if (btn.dataset.aba === 'aba-auditoria') renderizarAbaAuditoria();
        if (btn.dataset.aba === 'aba-vendedores') renderizarAbaVendedores();
        if (btn.dataset.aba === 'aba-ia-relatorios') gerarRelatorioIA();
        if (btn.dataset.aba === 'aba-exportacao') renderizarTabelaExportacao();
        if (btn.dataset.aba === 'aba-arena') renderizarArena();
        if (btn.dataset.aba === 'aba-pos-venda') renderizarPosVenda();
        if (btn.dataset.aba === 'aba-config') renderizarConfiguracoes();
    };
});

const inputBusca = document.getElementById('inp-busca-global');
if (inputBusca) {
    inputBusca.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        
        document.querySelectorAll('.lead-card').forEach(card => {
            card.style.display = card.innerText.toLowerCase().includes(termo) ? 'block' : 'none';
        });
        document.querySelectorAll('#tabela-auditoria tr').forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(termo) ? '' : 'none';
        });
        document.querySelectorAll('#tbody-lista tr').forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(termo) ? '' : 'none';
        });
        document.querySelectorAll('#tbody-export tr').forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(termo) ? '' : 'none';
        });
    });
}

// ==========================================
// MURAL DE AVISOS
// ==========================================
async function carregarAvisos() {
    const { data } = await supabase.from('avisos').select('*').order('created_at', { ascending: false }).limit(3);
    avisosData = data || [];
    
    const lista = document.getElementById('lista-avisos');
    if (!lista) return;
    
    if (avisosData.length === 0) {
        lista.innerHTML = '<div class="empty-state" style="padding:10px;"><i class="ph ph-coffee"></i><p>Nada de novo por aqui.<br>A diretoria está quieta hoje.</p></div>'; 
        return;
    }
    
    lista.innerHTML = avisosData.map(a => `
        <div class="aviso-item" style="flex-direction: column; align-items: flex-start; gap: 6px;">
            <div style="display: flex; justify-content: space-between; width: 100%;">
                <strong style="color: var(--accent); font-size: 14px;">${a.titulo || 'Aviso'}</strong>
                ${perfilAtual.role === 'gestor' ? `<button class="aviso-del" title="Apagar aviso" onclick="window.deletarAviso(${a.id})"><i class="ph ph-trash"></i></button>` : ''}
            </div>
            <span style="font-size: 13px; line-height: 1.4; color: var(--text);">${a.mensagem}</span>
        </div>
    `).join('');
}

window.criarAviso = () => {
    document.getElementById('modal-aviso')?.classList.add('ativa');
};

const btnFecharAviso = document.getElementById('btn-fechar-aviso');
if (btnFecharAviso) {
    btnFecharAviso.onclick = () => document.getElementById('modal-aviso').classList.remove('ativa');
}

const formAviso = document.getElementById('form-aviso');
if (formAviso) {
    formAviso.onsubmit = async (e) => {
        e.preventDefault();
        const titulo = document.getElementById('inp-aviso-titulo').value;
        const msg = document.getElementById('inp-aviso-msg').value;
        
        const { error } = await supabase.from('avisos').insert([{ titulo: titulo, mensagem: msg }]);
        
        if (error) {
            mostrarToast('Erro: ' + error.message, 'erro');
        } else { 
            document.getElementById('modal-aviso').classList.remove('ativa'); 
            formAviso.reset(); 
            mostrarToast('Disparado com sucesso!', 'ok'); 
            carregarAvisos(); 
        }
    };
}

window.deletarAviso = (id) => {
    window.abrirConfirmacao('Apagar Aviso', 'Este recado será removido do mural.', 'Excluir Aviso', async () => {
        await supabase.from('avisos').delete().eq('id', id);
        mostrarToast('Aviso apagado.', 'ok');
        carregarAvisos();
    });
};

// ==========================================
// CATÁLOGO DE PRODUTOS
// ==========================================
async function carregarProdutos() {
    const { data } = await supabase.from('produtos').select('*').order('nome');
    produtosData = data || [];
    
    const selectProd = document.getElementById('inp-produto');
    if (selectProd) {
        selectProd.innerHTML = '<option value="">Selecione um Produto...</option>' + 
            produtosData.map(p => `<option value="${p.nome}" data-preco="${p.valor}">${p.nome}</option>`).join('');
    }

    const tbodyCat = document.getElementById('tbody-catalogo');
    if (tbodyCat) {
        if (produtosData.length === 0) { 
            tbodyCat.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:var(--muted);">Catálogo vazio.</td></tr>'; 
        } else {
            tbodyCat.innerHTML = produtosData.map(p => `
                <tr>
                    <td><strong style="color:var(--text)">${p.nome}</strong></td>
                    <td style="text-align:right;">R$ ${Number(p.valor).toFixed(2)}</td>
                    <td style="text-align:center;"><button class="card-del" onclick="window.deletarProduto(${p.id})"><i class="ph ph-trash"></i></button></td>
                </tr>
            `).join('');
        }
    }
}

const selectInpProduto = document.getElementById('inp-produto');
if (selectInpProduto) {
    selectInpProduto.addEventListener('change', (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        if (selectedOption && selectedOption.dataset.preco) {
            document.getElementById('inp-valor').value = selectedOption.dataset.preco;
        }
    });
}

const formProduto = document.getElementById('form-produto');
if (formProduto) {
    formProduto.onsubmit = async (e) => {
        e.preventDefault();
        const nome = document.getElementById('inp-prod-nome').value.toUpperCase();
        const valor = document.getElementById('inp-prod-preco').value;
        
        const { error } = await supabase.from('produtos').insert([{ nome, valor }]);
        
        if (error) {
            mostrarToast('Erro ao salvar produto.', 'erro');
        } else { 
            document.getElementById('modal-produto').classList.remove('ativa'); 
            formProduto.reset(); 
            mostrarToast('Produto no Catálogo!', 'ok'); 
            carregarProdutos(); 
        }
    };
}

window.deletarProduto = (id) => { 
    window.abrirConfirmacao('Excluir Produto', 'Remover do catálogo da empresa?', 'Excluir', async () => { 
        await supabase.from('produtos').delete().eq('id', id); 
        mostrarToast('Removido.', 'ok'); 
        carregarProdutos(); 
    }); 
};

// ==========================================
// LEADS E PIPELINE DE VENDAS
// ==========================================
async function carregarLeads() {
    let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
    
    if (perfilAtual.role !== 'gestor') {
        query = query.eq('user_id', usuarioAtual.id);
    }
    
    const { data, error } = await query;
    if (error) console.error("Erro leads:", error);
    
    leadsData = data || [];
    
    renderizarKanban(); 
    renderizarPosVenda();
    renderizarLista(); 
    renderizarAgenda();
    renderizarTabelaExportacao(); 
    renderizarAprovacoes();
    renderizarArena();

    if (perfilAtual.role === 'vendedor') { 
        const abaRelatorio = document.getElementById('aba-relatorio');
        if (abaRelatorio && !abaRelatorio.classList.contains('hidden')) { 
            atualizarEstatisticas(); 
            calcularComissao(); 
        }
    } else { 
        renderizarGestor();
        const abaEquipe = document.getElementById('aba-equipe'); 
        if (abaEquipe && !abaEquipe.classList.contains('hidden')) renderizarAbaEquipe();
        
        const abaAuditoria = document.getElementById('aba-auditoria'); 
        if (abaAuditoria && !abaAuditoria.classList.contains('hidden')) renderizarAbaAuditoria();
        
        const abaVendedores = document.getElementById('aba-vendedores'); 
        if (abaVendedores && !abaVendedores.classList.contains('hidden')) renderizarAbaVendedores();
    }
    
    window.atualizarMeta();
    
    if (inputBusca && inputBusca.value) {
        inputBusca.dispatchEvent(new Event('input'));
    }
}

const btnViewKanban = document.getElementById('btn-view-kanban');
const btnViewLista = document.getElementById('btn-view-lista');
const kanbanBoard = document.getElementById('kanban-board');
const listaBoard = document.getElementById('lista-board');

if (btnViewKanban && btnViewLista) {
    btnViewKanban.onclick = () => {
        btnViewKanban.classList.add('ativo'); 
        btnViewLista.classList.remove('ativo');
        kanbanBoard.classList.remove('hidden'); 
        listaBoard.classList.add('hidden');
    };
    btnViewLista.onclick = () => {
        btnViewLista.classList.add('ativo'); 
        btnViewKanban.classList.remove('ativo');
        listaBoard.classList.remove('hidden'); 
        kanbanBoard.classList.add('hidden');
    };
}

function renderizarLista() {
    const tbody = document.getElementById('tbody-lista');
    if (!tbody) return;
    
    let leadsVisao = perfilAtual.role === 'gestor' ? leadsData : leadsData.filter(l => l.user_id === usuarioAtual.id);

    if (leadsVisao.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px; color:var(--muted);">Nenhum cliente no funil.</td></tr>`;
        return;
    }

    tbody.innerHTML = leadsVisao.map(l => {
        let corBadge = l.status === 'novos' ? 'badge-azul' : (l.status === 'negociacao' ? 'badge-amarelo' : (l.status === 'perdidos' ? 'badge-vermelho' : 'badge-verde'));
        return `
        <tr onclick="window.abrirDrawerLead(${l.id})" class="clicavel">
            <td style="font-weight: bold; color: var(--text);">${l.nome}</td>
            <td>${l.produto || 'Geral'}</td>
            <td style="color: ${l.status === 'fechados' ? 'var(--fechados)' : (l.status === 'perdidos' ? 'var(--danger)' : 'var(--accent)')}; font-weight:bold; text-align:right;">R$ ${Number(l.valor).toFixed(2)}</td>
            <td><span class="badge ${corBadge}">${l.status.toUpperCase()}</span></td>
            <td style="color: var(--muted);">${l.whatsapp}</td>
        </tr>`;
    }).join('');
}

function renderizarKanban() {
    let leadsVisao = perfilAtual.role === 'gestor' ? leadsData : leadsData.filter(l => l.user_id === usuarioAtual.id);

    ['novos', 'negociacao', 'fechados', 'perdidos'].forEach(status => {
        const col = document.getElementById(`col-${status}`);
        if (!col) return;
        
        const list = leadsVisao.filter(l => l.status === status);
        col.parentElement.querySelector('.col-count').innerText = list.length;
        
        if (list.length === 0) {
            let msg = status === 'novos' ? 'Sem contatos.<br>Cadastre um novo!' : status === 'negociacao' ? 'Ninguém negociando.<br>Arraste leads para cá.' : status === 'fechados' ? 'Caixa vazio.<br>Feche uma venda!' : 'Nenhuma perda registrada.<br>Excelente!';
            let icone = status === 'novos' ? 'ph-user-plus' : status === 'negociacao' ? 'ph-handshake' : status === 'fechados' ? 'ph-money' : 'ph-shield-check';
            col.innerHTML = `<div class="empty-state"><i class="ph ${icone}"></i><p>${msg}</p></div>`;
            configurarDrag(col);
            return;
        }
        
        col.innerHTML = list.map(l => {
            let numWpp = l.whatsapp.replace(/\D/g, '');
            if (!numWpp.startsWith('55') && numWpp.length <= 11) numWpp = '55' + numWpp;

            let termometroClasse = '';
            let termometroBadge = '';
            
            let valorExibicao = `<span style="color: ${status==='fechados'?'var(--fechados)':'var(--accent)'}; font-weight:bold; font-size: 14px;">R$ ${Number(l.valor).toFixed(2)}</span>`;
            
            if (status === 'perdidos') {
                termometroClasse = 'card-pendente'; 
                termometroBadge = `<span class="badge-vermelho"><i class="ph ph-warning-circle"></i> ${l.motivo_perda || 'Perdido'}</span>`;
                valorExibicao = `<span style="color: var(--danger); font-weight:bold; font-size: 12px; text-decoration: line-through;">R$ ${Number(l.valor).toFixed(2)}</span>`;
            } else if (status === 'fechados' && l.aprovado !== true) {
                termometroClasse = 'card-pendente';
                termometroBadge = `<span class="badge-pendente"><i class="ph ph-hourglass-high"></i> Aguardando Gestor</span>`;
                valorExibicao = `<span style="color: var(--negociacao); font-weight:bold; font-size: 12px; font-style:italic;">💸 R$ ${Number(l.valor).toFixed(2)} (Não contabilizado)</span>`;
            } else if (status !== 'fechados' && l.created_at) {
                let diffDias = Math.floor(Math.abs(new Date() - new Date(l.created_at)) / (1000 * 60 * 60 * 24));
                if (diffDias <= 1) { 
                    termometroClasse = 'lead-quente'; 
                    termometroBadge = `<span class="badge-quente"><i class="ph ph-fire"></i> Novo</span>`; 
                } else if (diffDias >= 3) { 
                    termometroClasse = 'lead-frio'; 
                    termometroBadge = `<span class="badge-frio"><i class="ph ph-snowflake"></i> Esfriando</span>`; 
                }
            }

            let iconesExtras = '';
            if (l.notas) iconesExtras += `<i class="ph ph-notebook" title="Anotações" style="color:var(--novos); margin-left:6px;"></i>`;
            if (l.comprovante_url) iconesExtras += `<i class="ph ph-receipt" title="Comprovante Anexado" style="color:var(--fechados); margin-left:4px;"></i>`;

            return `
            <div class="lead-card ${termometroClasse}" draggable="true" data-id="${l.id}" onclick="window.abrirDrawerLead(${l.id})">
                <div class="card-top">
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <div class="card-nome">${l.nome} ${iconesExtras}</div>
                        <div>${termometroBadge}</div>
                    </div>
                    <button class="card-del" onclick="event.stopPropagation(); window.deletarLead(${l.id})"><i class="ph ph-trash"></i></button>
                </div>
                <div class="card-info" style="display: flex; flex-direction: column; gap: 8px;">
                    <span><i class="ph ph-package"></i> ${l.produto || 'Geral'}</span>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color:var(--muted); font-size: 12px;"><i class="ph ph-whatsapp-logo"></i> ${l.whatsapp}</span>
                        
                        <button onclick="event.stopPropagation(); window.abrirModalWhatsApp('${numWpp}', '${l.nome}')" style="background: rgba(37,211,102,0.1); border:none; color: #25d366; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 11px; display: flex; align-items: center; gap: 4px; transition:0.2s;">
                            <i class="ph ph-whatsapp-logo" style="font-size:14px;"></i> Chamar
                        </button>
                    </div>
                    ${valorExibicao}
                </div>
            </div>`;
        }).join('');
        
        configurarDrag(col);
    });

    atualizarConselheiroIA();
}

function configurarDrag(container) {
    container.querySelectorAll('.lead-card').forEach(c => {
        c.ondragstart = (e) => { 
            c.classList.add('dragging'); 
            e.dataTransfer.setData('id', c.dataset.id); 
        };
        c.ondragend = () => {
            c.classList.remove('dragging');
        };
    });
    
    container.ondragover = (e) => { 
        e.preventDefault(); 
        container.classList.add('drag-over'); 
    };
    
    container.ondragleave = () => {
        container.classList.remove('drag-over');
    };
    
    container.ondrop = async (e) => {
        e.preventDefault(); 
        container.classList.remove('drag-over');
        
        const idCard = e.dataTransfer.getData('id');
        const novoStatus = container.dataset.status;
        
        const lead = leadsData.find(l => l.id == idCard);
        if (!lead || lead.status === novoStatus) return;

        if (novoStatus === 'perdidos') {
            document.getElementById('inp-perda-lead-id').value = idCard;
            document.getElementById('modal-motivo-perda').classList.add('ativa');
            return; 
        }
        
        let payloadUpdate = { status: novoStatus, motivo_perda: null }; 
        
        if (novoStatus === 'fechados') {
            payloadUpdate.aprovado = false; 
            await supabase.from('leads').update(payloadUpdate).eq('id', idCard);
            carregarLeads();
            mostrarToast('Anexe o comprovante na gaveta para aprovação!', 'ok');
            
            setTimeout(() => {
                window.abrirDrawerLead(parseInt(idCard));
            }, 500);

        } else {
            await supabase.from('leads').update(payloadUpdate).eq('id', idCard);
            carregarLeads();
        }
    };
}

const formMotivoPerda = document.getElementById('form-motivo-perda');
if (formMotivoPerda) {
    formMotivoPerda.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('inp-perda-lead-id').value;
        const motivo = document.getElementById('inp-perda-motivo').value;

        const btn = formMotivoPerda.querySelector('button');
        btn.innerHTML = 'Movendo...';

        const { error } = await supabase.from('leads').update({
            status: 'perdidos',
            motivo_perda: motivo
        }).eq('id', id);

        btn.innerHTML = '<i class="ph ph-trash"></i> Confirmar Perda';
        document.getElementById('modal-motivo-perda').classList.remove('ativa');

        if (error) {
            mostrarToast('Erro Supabase: ' + error.message, 'erro');
            console.error('Erro detalhado:', error);
        } else {
            mostrarToast('Venda registrada como perdida.', 'ok');
            carregarLeads();
        }
    };
}

const formLead = document.getElementById('form-lead');
if (formLead) {
    formLead.onsubmit = async (e) => {
        e.preventDefault();
        
        let statusSelecionado = document.getElementById('inp-status').value;
        
        await supabase.from('leads').insert([{
            nome: document.getElementById('inp-nome').value,
            whatsapp: document.getElementById('inp-whatsapp').value,
            produto: document.getElementById('inp-produto').value,
            valor: document.getElementById('inp-valor').value || 0,
            status: statusSelecionado,
            user_id: usuarioAtual.id,
            aprovado: statusSelecionado === 'fechados' ? false : true,
            etapa_pos_venda: 'onboarding' 
        }]);
        
        document.getElementById('modal-lead').classList.remove('ativa');
        formLead.reset();
        mostrarToast('Cliente adicionado!', 'ok');
        carregarLeads();
    };
}

window.deletarLead = (id) => {
    window.abrirConfirmacao('Deletar Cliente', 'Excluir este cliente permanentemente?', 'Excluir', async () => {
        await supabase.from('leads').delete().eq('id', id);
        mostrarToast('Apagado.', 'ok');
        carregarLeads();
    });
};

const btnNovoLead = document.getElementById('btn-novo-lead');
if (btnNovoLead) {
    btnNovoLead.onclick = () => document.getElementById('modal-lead').classList.add('ativa');
}

const btnFecharModal = document.getElementById('btn-fechar-modal');
if (btnFecharModal) {
    btnFecharModal.onclick = () => document.getElementById('modal-lead').classList.remove('ativa');
}

// ==========================================
// ESTEIRA DE APROVAÇÃO DO GESTOR
// ==========================================
function renderizarAprovacoes() {
    const tbody = document.getElementById('tbody-aprovacoes');
    const badge = document.getElementById('badge-aprov');
    if (!tbody || !badge) return;

    const pendentes = leadsData.filter(l => l.status === 'fechados' && l.aprovado !== true);
    
    badge.innerText = pendentes.length;
    
    if (pendentes.length > 0) {
        badge.classList.remove('hidden'); 
    } else {
        badge.classList.add('hidden');
    }

    if (pendentes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px; color:var(--fechados);"><i class="ph ph-check-circle" style="font-size:32px; display:block; margin-bottom:8px;"></i>Tudo limpo! Nenhuma venda aguardando.</td></tr>`;
        return;
    }

    tbody.innerHTML = pendentes.map(l => {
        let vendedor = perfisEquipe.find(p => p.id === l.user_id)?.full_name || 'Desconhecido';
        
        let btnComprovante = l.comprovante_url 
            ? `<a href="${l.comprovante_url}" target="_blank" class="btn-anexo"><i class="ph ph-receipt"></i> Ver Anexo</a>`
            : `<span style="font-size:11px; color:var(--danger); border:1px dashed var(--danger); padding:6px 12px; border-radius:6px; display:flex; align-items:center; gap:4px;"><i class="ph ph-warning-circle"></i> Sem Anexo</span>`;

        return `
        <tr>
            <td style="font-weight: bold; color: var(--text);">${vendedor}</td>
            <td style="color: var(--muted);">${l.nome}</td>
            <td><span class="badge badge-equipe">${l.produto || 'Geral'}</span></td>
            <td style="color:var(--fechados); font-weight:bold; text-align:right;">R$ ${Number(l.valor).toFixed(2)}</td>
            <td style="text-align: right; display:flex; gap:12px; justify-content:flex-end; align-items:center;">
                ${btnComprovante}
                <button onclick="window.rejeitarVenda(${l.id})" class="btn-rejeitar"><i class="ph ph-x"></i> Rejeitar</button>
                <button onclick="window.aprovarVenda(${l.id})" class="btn-aprovar"><i class="ph ph-check-circle"></i> Aprovar</button>
            </td>
        </tr>`;
    }).join('');
}

window.aprovarVenda = async (id) => {
    await supabase.from('leads').update({ aprovado: true }).eq('id', id);
    mostrarToast('Venda Aprovada! Caiu no Pós-Venda 💰', 'ok');
    carregarLeads();
};

window.rejeitarVenda = async (id) => {
    await supabase.from('leads').update({ status: 'negociacao', aprovado: false }).eq('id', id);
    mostrarToast('Venda Rejeitada. Voltou pro funil do vendedor.', 'erro');
    carregarLeads();
};

// ==========================================
// GAVETA DO CLIENTE E UPLOAD DE COMPROVANTE
// ==========================================
window.abrirDrawerLead = (id) => {
    const lead = leadsData.find(l => l.id === id);
    if (!lead) return;

    document.getElementById('drawer-lead-id').value = lead.id;
    document.getElementById('drawer-nome').innerText = lead.nome;
    
    const elStatus = document.getElementById('drawer-status');
    elStatus.innerText = lead.status.toUpperCase();
    elStatus.className = 'badge';
    
    if (lead.status === 'novos') elStatus.classList.add('badge-azul');
    else if (lead.status === 'negociacao') elStatus.classList.add('badge-amarelo');
    else if (lead.status === 'perdidos') elStatus.classList.add('badge-vermelho');
    else elStatus.classList.add('badge-verde');

    document.getElementById('drawer-wpp').innerText = lead.whatsapp;
    document.getElementById('drawer-produto').innerText = lead.produto || 'Geral';
    document.getElementById('drawer-valor').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(lead.valor);
    
    document.getElementById('drawer-notas').value = lead.notas || '';
    document.getElementById('drawer-data-followup').value = lead.data_followup || '';

    const fileInput = document.getElementById('drawer-file-comprovante');
    if(fileInput) fileInput.value = '';
    
    document.getElementById('nome-arquivo-comprovante').innerText = 'Nenhum arquivo selecionado';
    document.getElementById('nome-arquivo-comprovante').style.color = 'var(--muted)';
    
    const boxVer = document.getElementById('box-ver-comprovante');
    const linkVer = document.getElementById('link-ver-comprovante');
    
    if(lead.comprovante_url) {
        boxVer.classList.remove('hidden');
        linkVer.href = lead.comprovante_url;
    } else {
        boxVer.classList.add('hidden');
    }

    document.getElementById('drawer-lead').classList.add('ativa');
};

const fileInputComprovante = document.getElementById('drawer-file-comprovante');
if(fileInputComprovante) {
    fileInputComprovante.addEventListener('change', (e) => {
        const nameLabel = document.getElementById('nome-arquivo-comprovante');
        if(e.target.files.length > 0) {
            nameLabel.innerText = e.target.files[0].name;
            nameLabel.style.color = 'var(--novos)';
        } else {
            nameLabel.innerText = 'Nenhum arquivo selecionado';
            nameLabel.style.color = 'var(--muted)';
        }
    });
}

window.salvarDrawerLead = async () => {
    const id = document.getElementById('drawer-lead-id').value;
    const notasStr = document.getElementById('drawer-notas').value;
    const dataFup = document.getElementById('drawer-data-followup').value;

    mostrarToast("Salvando informações...", "ok");

    const payload = {};
    if (notasStr !== '') payload.notas = notasStr; else payload.notas = null;
    if (dataFup !== '') payload.data_followup = dataFup; else payload.data_followup = null;

    const fileInput = document.getElementById('drawer-file-comprovante');
    
    if (fileInput && fileInput.files.length > 0) {
        mostrarToast("Fazendo upload do comprovante...", "ok");
        const file = fileInput.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `lead_${id}_${Date.now()}.${fileExt}`; 
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('comprovantes')
            .upload(fileName, file);
            
        if (uploadError) {
            console.error("Erro upload:", uploadError);
            mostrarToast("Falha no upload! Verifique as permissões no Supabase (SQL).", "erro");
            return; 
        } else {
            const { data: publicUrlData } = supabase.storage.from('comprovantes').getPublicUrl(fileName);
            payload.comprovante_url = publicUrlData.publicUrl;
        }
    }

    const { error } = await supabase.from('leads').update(payload).eq('id', id);
    
    if (error) { 
        mostrarToast("Erro ao salvar dados no banco", "erro"); 
    } else { 
        mostrarToast("Atualizado com sucesso!", "ok"); 
        document.getElementById('drawer-lead').classList.remove('ativa'); 
        carregarLeads(); 
    }
};

// ==========================================
// AGENDA E ADMINISTRAÇÃO GERAL
// ==========================================
function renderizarAgenda() {
    const container = document.getElementById('lista-agenda');
    if (!container) return;

    let leadsAgendados = leadsData.filter(l => {
        if (!l.data_followup || l.status === 'fechados') return false;
        if (perfilAtual.role === 'gestor') return true;
        return l.user_id === usuarioAtual.id;
    });

    if (leadsAgendados.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="ph ph-calendar-blank"></i><p>Sua agenda está livre.<br>Nenhum retorno marcado para negociações ativas.</p></div>`; 
        return;
    }

    leadsAgendados.sort((a, b) => new Date(a.data_followup) - new Date(b.data_followup));
    let hojeStr = new Date().toISOString().split('T')[0];

    container.innerHTML = leadsAgendados.map(l => {
        let classeAtraso = ''; 
        let badgeAtraso = ''; 
        let dataShow = l.data_followup.split('-').reverse().join('/');
        
        if (l.data_followup < hojeStr) { 
            classeAtraso = 'atrasado'; 
            badgeAtraso = `<span class="agenda-data atrasado">Atrasado (${dataShow})</span>`; 
        } 
        else if (l.data_followup === hojeStr) { 
            badgeAtraso = `<span class="agenda-data hoje">Hoje</span>`; 
        } 
        else { 
            badgeAtraso = `<span class="agenda-data futuro">${dataShow}</span>`; 
        }

        let badgeVendedor = '';
        if (perfilAtual.role === 'gestor') {
            let dono = perfisEquipe.find(p => p.id === l.user_id);
            badgeVendedor = `<span style="font-size: 11px; border: 1px solid var(--border); color: var(--muted); padding: 2px 6px; border-radius: 4px; margin-left: 8px;">Resp: ${dono ? dono.full_name : 'Desconhecido'}</span>`;
        }

        return `
        <div class="agenda-item ${classeAtraso}" onclick="window.abrirDrawerLead(${l.id})">
            <div class="agenda-item-info">
                <span class="agenda-nome">${l.nome} ${badgeVendedor}</span>
                <span style="color:var(--muted); font-size:12px;">Produto: ${l.produto} | Etapa: ${l.status.toUpperCase()}</span>
            </div>
            <div style="text-align:right;">
                ${badgeAtraso}
            </div>
        </div>`;
    }).join('');
}

window.abrirModalNovaEquipe = () => {
    const select = document.getElementById('inp-add-squad-user');
    
    select.innerHTML = perfisEquipe.map(p => `
        <option value="${p.id}">${p.full_name} (${p.equipe || 'Geral'})</option>
    `).join('');
    
    document.getElementById('inp-add-squad-nome').value = '';
    document.getElementById('modal-nova-equipe').classList.add('ativa');
};

const formNovaEquipe = document.getElementById('form-nova-equipe');
if (formNovaEquipe) {
    formNovaEquipe.onsubmit = async (e) => {
        e.preventDefault();
        const nomeSquad = document.getElementById('inp-add-squad-nome').value.trim();
        const userId = document.getElementById('inp-add-squad-user').value;

        const { error } = await supabase.from('profiles').update({ equipe: nomeSquad }).eq('id', userId);
        
        if (error) {
            mostrarToast('Erro ao criar squad', 'erro');
        } else {
            mostrarToast('Squad criado com sucesso!', 'ok');
            document.getElementById('modal-nova-equipe').classList.remove('ativa');
            const { data } = await supabase.from('profiles').select('*');
            perfisEquipe = data || [];
            renderizarAbaEquipe();
            renderizarAbaVendedores();
        }
    };
}

// ==========================================
// SIMULADOR DE COMISSÕES E METAS 
// ==========================================
function calcularComissao() {
    const inputTaxa = document.getElementById('inp-comissao-taxa');
    const txtGanha = document.getElementById('val-comissao-ganha');
    const txtAberta = document.getElementById('val-comissao-aberta');

    if (!inputTaxa || !txtGanha || !txtAberta) return;

    let leadsDoUsuario = leadsData.filter(l => l.user_id === usuarioAtual.id);
    
    const montanteFechado = leadsDoUsuario.filter(l => l.status === 'fechados' && l.aprovado === true).reduce((acc, l) => acc + Number(l.valor), 0);
    const montanteAberto = leadsDoUsuario.filter(l => l.status !== 'fechados' || l.aprovado !== true).reduce((acc, l) => acc + Number(l.valor), 0);

    const calc = () => {
        let taxa = Number(inputTaxa.value) || 0;
        let ganhoReal = (montanteFechado * taxa) / 100;
        let ganhoProjetado = (montanteAberto * taxa) / 100;

        txtGanha.innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(ganhoReal);
        txtAberta.innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(ganhoProjetado);
    };

    inputTaxa.addEventListener('input', calc);
    calc(); 
}

window.atualizarMeta = function() {
    let fechadosReais = leadsData.filter(l => l.status === 'fechados' && l.aprovado === true);
    
    if (perfilAtual.role !== 'gestor') {
        fechadosReais = fechadosReais.filter(l => l.user_id === usuarioAtual.id);
    }
    
    const receita = fechadosReais.reduce((acc, l) => acc + Number(l.valor), 0);
    
    let objetivo = perfilAtual.meta_mensal || 10000;
    if (perfilAtual.role !== 'gestor') {
        const perfilGestor = perfisEquipe.find(p => p.role === 'gestor');
        if (perfilGestor) objetivo = perfilGestor.meta_mensal || 10000;
    }
    
    let porcentagem = Math.min((receita / objetivo) * 100, 100);
    
    const elMetaAtualK = document.getElementById('meta-atual');
    const elMetaObjK = document.getElementById('meta-objetivo');
    const barraK = document.getElementById('meta-barra');
    
    if (elMetaAtualK) elMetaAtualK.innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(receita);
    if (elMetaObjK) elMetaObjK.innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(objetivo);
    if (barraK) {
        barraK.style.width = `${porcentagem}%`;
        if (porcentagem === 100 && receita > 0) barraK.classList.add('bateu-meta'); else barraK.classList.remove('bateu-meta');
    }

    const elMetaAtualG = document.getElementById('meta-atual-gestor');
    const elMetaObjG = document.getElementById('meta-objetivo-gestor');
    const barraG = document.getElementById('meta-barra-gestor');
    
    if (elMetaAtualG) elMetaAtualG.innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(receita);
    if (elMetaObjG) elMetaObjG.innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(objetivo);
    if (barraG) {
        barraG.style.width = `${porcentagem}%`;
        if (porcentagem === 100 && receita > 0) barraG.classList.add('bateu-meta'); else barraG.classList.remove('bateu-meta');
    }
}

window.alterarMeta = () => {
    document.getElementById('inp-nova-meta').value = perfilAtual.meta_mensal || 10000;
    document.getElementById('modal-meta').classList.add('ativa');
};

const formMeta = document.getElementById('form-meta');
if (formMeta) {
    formMeta.onsubmit = async (e) => {
        e.preventDefault();
        const nm = Number(document.getElementById('inp-nova-meta').value);
        
        if (isNaN(nm) || nm <= 0) {
            return mostrarToast('Valor inválido.', 'erro');
        }
        
        const btnSalvar = formMeta.querySelector('button');
        const txtOriginal = btnSalvar.innerHTML;
        btnSalvar.innerHTML = 'Salvando...';
        
        const { error } = await supabase.from('profiles').update({ meta_mensal: nm }).eq('id', usuarioAtual.id);
        
        btnSalvar.innerHTML = txtOriginal;
        
        if (error) {
            console.error(error);
            mostrarToast('Erro ao salvar meta. Rode o código SQL de segurança.', 'erro');
        } else {
            perfilAtual.meta_mensal = nm;
            
            const { data } = await supabase.from('profiles').select('*');
            perfisEquipe = data || [];
            
            window.atualizarMeta();
            document.getElementById('modal-meta').classList.remove('ativa');
            mostrarToast('Meta atualizada!', 'ok');
        }
    };
}

function atualizarEstatisticas() {
    const abaRelatorio = document.getElementById('aba-relatorio');
    if (!abaRelatorio || abaRelatorio.classList.contains('hidden')) return;
    
    const ctx = document.getElementById('chart-pizza');
    if (!ctx) return;
    
    let leadsDoRelatorio = perfilAtual.role === 'gestor' ? leadsData : leadsData.filter(l => l.user_id === usuarioAtual.id);

    const qtdNovos = leadsDoRelatorio.filter(l => l.status === 'novos').length;
    const qtdNego = leadsDoRelatorio.filter(l => l.status === 'negociacao').length;
    const qtdFechados = leadsDoRelatorio.filter(l => l.status === 'fechados' && l.aprovado === true).length; 
    const receita = leadsDoRelatorio.filter(l => l.status === 'fechados' && l.aprovado === true).reduce((acc, l) => acc + Number(l.valor), 0); 
    
    const elTotal = document.getElementById('stat-total');
    const elFechados = document.getElementById('stat-fechados');
    const elValor = document.getElementById('stat-valor');
    
    if (elTotal) elTotal.innerText = leadsDoRelatorio.length;
    if (elFechados) elFechados.innerText = qtdFechados;
    if (elValor) elValor.innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(receita);

    if (chartInstance) chartInstance.destroy();
    
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Novos', 'Negociação', 'Fechados'],
            datasets: [{
                data: [qtdNovos, qtdNego, qtdFechados],
                backgroundColor: ['#4fc3f7', '#ffb74d', '#81c784'],
                borderWidth: 0
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { position: 'bottom', labels: { color: '#8890aa' } } }, 
            cutout: '75%' 
        }
    });
}

// ==========================================
// CENTRAL DE EXPORTAÇÃO (EXCEL / PDF)
// ==========================================
function getLeadsExportacao() {
    const filterStatus = document.getElementById('export-filter-status').value;
    let exportList = perfilAtual.role === 'gestor' ? leadsData : leadsData.filter(l => l.user_id === usuarioAtual.id);

    if (filterStatus === 'fechados') {
        exportList = exportList.filter(l => l.status === 'fechados' && l.aprovado === true);
    } else if (filterStatus === 'abertos') {
        exportList = exportList.filter(l => l.status !== 'fechados' || l.aprovado !== true);
    } else if (filterStatus === 'perdidos') {
        exportList = exportList.filter(l => l.status === 'perdidos');
    }
    
    return exportList;
}

function renderizarTabelaExportacao() {
    const tbody = document.getElementById('tbody-export');
    if (!tbody) return;

    const list = getLeadsExportacao();

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 30px; color:var(--muted);">Nenhum dado encontrado com o filtro atual.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(l => {
        let corBadge = l.status === 'novos' ? 'badge-azul' : (l.status === 'negociacao' ? 'badge-amarelo' : (l.status === 'perdidos' ? 'badge-vermelho' : 'badge-verde'));
        let dataStr = l.created_at ? new Date(l.created_at).toLocaleDateString('pt-BR') : '-';
        return `
        <tr>
            <td style="font-weight: bold; color: var(--text);">${l.nome}</td>
            <td style="color: var(--muted);">${l.whatsapp}</td>
            <td>${l.produto || 'Geral'}</td>
            <td style="color:var(--text); font-weight:bold; text-align:right;">R$ ${Number(l.valor).toFixed(2)}</td>
            <td><span class="badge ${corBadge}">${l.status.toUpperCase()}</span></td>
            <td style="color: var(--muted); font-size:12px;">${dataStr}</td>
        </tr>`;
    }).join('');
}

const filterSelect = document.getElementById('export-filter-status');
if (filterSelect) {
    filterSelect.addEventListener('change', renderizarTabelaExportacao);
}

window.exportarCSV = () => {
    const list = getLeadsExportacao();
    if (list.length === 0) return mostrarToast('Não há dados para exportar.', 'erro');

    const headers = ["Nome", "WhatsApp", "Produto", "Valor_R$", "Status", "Data_Criacao", "Anotacoes"];
    
    const rows = list.map(l => {
        const dataStr = l.created_at ? new Date(l.created_at).toLocaleDateString('pt-BR') : '-';
        const notasLimpa = l.notas ? l.notas.replace(/(\r\n|\n|\r)/gm, " ").replace(/;/g, ",").replace(/"/g, '""') : ""; 
        return `"${l.nome}";"${l.whatsapp}";"${l.produto || 'Geral'}";"${l.valor}";"${l.status}";"${dataStr}";"${notasLimpa}"`;
    });

    const csvContent = "\uFEFF" + headers.join(";") + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_crm_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    mostrarToast('Planilha baixada com sucesso!', 'ok');
};

window.exportarPDF = () => {
    const list = getLeadsExportacao();
    if (list.length === 0) return mostrarToast('Não há dados para exportar.', 'erro');

    let totalDinheiro = list.reduce((acc, l) => acc + Number(l.valor), 0);
    let totalStr = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(totalDinheiro);
    
    const janelaImpressao = window.open('', '_blank');
    
    let html = `
    <html>
    <head>
        <title>Relatório CRM Pro</title>
        <style>
            body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; }
            h1 { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .header-info { margin-bottom: 30px; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; border-bottom: 1px solid #ddd; text-align: left; }
            th { background-color: #f8f9fa; font-weight: bold; text-transform: uppercase; font-size: 12px; }
            td { font-size: 14px; }
            .val { font-weight: bold; text-align:right;}
            .status { font-weight: bold; text-transform: uppercase; font-size: 11px; padding: 4px 8px; border-radius: 4px; border: 1px solid #ccc; }
            @media print { body { padding: 0; } }
        </style>
    </head>
    <body>
        <h1>Relatório de Vendas (CRM Pro)</h1>
        <div class="header-info">
            <p><strong>Gerado por:</strong> ${perfilAtual.full_name}</p>
            <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
            <p><strong>Total de Registros:</strong> ${list.length}</p>
            <p><strong>Montante Total da Lista:</strong> <span style="font-size:20px; font-weight:bold; color:#21a366;">${totalStr}</span></p>
        </div>
        <table>
            <thead>
                <tr><th>Cliente</th><th>Contato</th><th>Produto</th><th style="text-align:right;">Valor</th><th>Status</th></tr>
            </thead>
            <tbody>
                ${list.map(l => `
                <tr>
                    <td>${l.nome}</td>
                    <td>${l.whatsapp}</td>
                    <td>${l.produto || '-'}</td>
                    <td class="val">R$ ${Number(l.valor).toFixed(2)}</td>
                    <td><span class="status">${l.status}</span></td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        <script>
            window.onload = () => { window.print(); window.close(); }
        </script>
    </body>
    </html>
    `;
    
    janelaImpressao.document.write(html);
    janelaImpressao.document.close();
};

// ==========================================
// PAINÉIS DE GESTÃO, FUGAS E AUDITORIA
// ==========================================
function renderizarGestor() {
    const fechadosReais = leadsData.filter(l => l.status === 'fechados' && l.aprovado === true);
    const faturamento = fechadosReais.reduce((acc, l) => acc + Number(l.valor), 0);
    
    const elFat = document.getElementById('chefao-faturamento');
    const elTick = document.getElementById('chefao-ticket');
    
    if (elFat) elFat.innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(faturamento);
    if (elTick) elTick.innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(fechadosReais.length ? faturamento / fechadosReais.length : 0);

    // Renderiza o Gráfico de Fugas
    const ctxFugas = document.getElementById('chart-fugas');
    if (ctxFugas) {
        const perdidos = leadsData.filter(l => l.status === 'perdidos');
        const contagemMotivos = {};
        
        perdidos.forEach(l => {
            const m = l.motivo_perda || 'Não informado';
            contagemMotivos[m] = (contagemMotivos[m] || 0) + 1;
        });

        const labels = Object.keys(contagemMotivos);
        const data = Object.values(contagemMotivos);

        if (chartFugasInstance) chartFugasInstance.destroy();

        chartFugasInstance = new Chart(ctxFugas, {
            type: 'bar',
            data: {
                labels: labels.length > 0 ? labels : ['Nenhuma perda'],
                datasets: [{
                    label: 'Vendas Perdidas',
                    data: data.length > 0 ? data : [0],
                    backgroundColor: '#ff5c5c',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { color: '#8890aa', stepSize: 1 } },
                    x: { ticks: { color: '#8890aa' } }
                }
            }
        });
    }

    const ranking = {};
    fechadosReais.forEach(l => {
        if (!ranking[l.user_id]) ranking[l.user_id] = 0;
        ranking[l.user_id] += Number(l.valor);
    });
    
    const arrayRank = Object.keys(ranking).map(id => {
        let p = perfisEquipe.find(x => x.id === id);
        return { nome: p?.full_name || 'Desconhecido', eqp: p?.equipe || 'Geral', total: ranking[id] };
    }).sort((a, b) => b.total - a.total);
    
    const elRank = document.getElementById('tabela-ranking');
    if (elRank) {
        elRank.innerHTML = arrayRank.map((v, i) => `
            <tr>
                <td>${i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : ''))} ${v.nome}</td>
                <td><span class="badge badge-equipe">${v.eqp}</span></td>
                <td style="color:var(--fechados); font-weight:bold; text-align:right;">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v.total)}</td>
            </tr>
        `).join('');
    }

    const prods = {};
    fechadosReais.forEach(l => {
        let p = l.produto || 'Geral';
        if (!prods[p]) prods[p] = 0;
        prods[p] += Number(l.valor);
    });
    
    const arrayProds = Object.keys(prods).map(k => ({ nome: k, total: prods[k] })).sort((a, b) => b.total - a.total);
    const elProds = document.getElementById('tabela-produtos');
    
    if (arrayProds.length === 0) {
        if (elProds) elProds.innerHTML = `<tr><td colspan="2" style="text-align:center; padding: 20px; color:var(--muted);">Nenhum produto fechado e aprovado ainda.</td></tr>`;
    } else {
        if (elProds) {
            elProds.innerHTML = arrayProds.map(p => `
                <tr>
                    <td>${p.nome}</td>
                    <td style="font-weight:bold; color:var(--text); text-align:right;">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(p.total)}</td>
                </tr>
            `).join('');
        }
    }
}

function renderizarAbaVendedores() {
    const container = document.getElementById('lista-vendedores-cards');
    if (!container) return;
    
    const vendedores = perfisEquipe.filter(p => p.role === 'vendedor');
    if (vendedores.length === 0) {
        container.innerHTML = `<div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--muted);"><i class="ph ph-users-slash" style="font-size:48px; margin-bottom:10px; display:block;"></i>Nenhum vendedor na operação.</div>`;
        return;
    }

    container.innerHTML = vendedores.map(v => {
        const leadsDoCara = leadsData.filter(l => l.user_id === v.id);
        const fechados = leadsDoCara.filter(l => l.status === 'fechados' && l.aprovado === true);
        const receita = fechados.reduce((soma, l) => soma + Number(l.valor), 0);
        const inicial = v.full_name ? v.full_name.charAt(0).toUpperCase() : 'V';

        return `
        <div class="seller-card" onclick="window.abrirRaioXVendedor('${v.id}')">
            <div class="seller-top">
                <div class="seller-avatar">${inicial}</div>
                <div class="seller-info">
                    <h4>${v.full_name}</h4>
                    <span>Equipe: <strong style="color:var(--accent);">${v.equipe || 'Geral'}</strong></span>
                </div>
            </div>
            <div class="seller-stats">
                <div><span>Leads</span><strong style="color:var(--text)">${leadsDoCara.length}</strong></div>
                <div style="text-align:right;"><span>Vendido</span><strong>${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(receita)}</strong></div>
            </div>
        </div>`;
    }).join('');
}

window.abrirRaioXVendedor = (userId) => {
    const vendedor = perfisEquipe.find(p => p.id === userId);
    if (!vendedor) return;

    const leadsDele = leadsData.filter(l => l.user_id === userId);
    const fechadosDele = leadsDele.filter(l => l.status === 'fechados' && l.aprovado === true);
    
    const receitaTotal = fechadosDele.reduce((soma, l) => soma + Number(l.valor), 0);
    const ticketMedio = fechadosDele.length > 0 ? receitaTotal / fechadosDele.length : 0;
    const taxaConversao = leadsDele.length > 0 ? (fechadosDele.length / leadsDele.length) * 100 : 0;

    document.getElementById('rx-avatar').innerText = vendedor.full_name.charAt(0).toUpperCase();
    document.getElementById('rx-nome').innerText = vendedor.full_name;
    document.getElementById('rx-equipe').innerText = vendedor.equipe || 'Geral';
    document.getElementById('rx-conversao').innerText = taxaConversao.toFixed(1) + '%';
    document.getElementById('rx-ticket').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(ticketMedio);
    document.getElementById('rx-receita').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(receitaTotal);

    const ctx = document.getElementById('chart-barras-vendedor');
    if (ctx) {
        let vendasPorDia = [0, 0, 0, 0, 0, 0, 0];
        fechadosDele.forEach(l => {
            if (l.created_at) {
                let diaDaSemana = new Date(l.created_at).getDay();
                vendasPorDia[diaDaSemana] += Number(l.valor);
            }
        });

        if (graficoVendedorInstance) graficoVendedorInstance.destroy();
        
        graficoVendedorInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
                datasets: [{
                    label: 'Faturamento (R$)',
                    data: vendasPorDia,
                    backgroundColor: '#81c784',
                    borderRadius: 6,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#2c3047' }, ticks: { color: '#8890aa' } },
                    x: { grid: { display: false }, ticks: { color: '#8890aa' } }
                }
            }
        });
    }
    document.getElementById('modal-detalhes-vendedor').classList.add('ativa');
};

window.toggleFolder = (nomeEquipeId) => {
    const content = document.getElementById(`folder-content-${nomeEquipeId}`);
    const card = document.getElementById(`folder-card-${nomeEquipeId}`);
    if (content && card) {
        content.classList.toggle('open');
        card.classList.toggle('open');
    }
};

function renderizarAbaEquipe() {
    const container = document.getElementById('container-equipes');
    if (!container) return;

    const fechados = leadsData.filter(l => l.status === 'fechados' && l.aprovado === true);
    const equipesAgrupadas = {};
    
    perfisEquipe.forEach(perfil => {
        const nomeEquipe = perfil.equipe || 'Geral';
        if (!equipesAgrupadas[nomeEquipe]) equipesAgrupadas[nomeEquipe] = [];
        equipesAgrupadas[nomeEquipe].push(perfil);
    });

    let htmlFinal = '';
    for (const [nomeEquipe, membros] of Object.entries(equipesAgrupadas)) {
        let totalDaEquipe = 0;
        
        membros.forEach(p => {
            totalDaEquipe += fechados.filter(l => l.user_id === p.id).reduce((soma, l) => soma + Number(l.valor), 0);
        });
        
        const safeId = nomeEquipe.replace(/[^a-zA-Z0-9]/g, '-');
        
        htmlFinal += `
        <div class="folder-card" id="folder-card-${safeId}">
            <div class="folder-header" onclick="window.toggleFolder('${safeId}')">
                <div class="folder-title"><i class="ph ph-caret-right"></i> 📁 ${nomeEquipe.toUpperCase()}</div>
                <div style="display:flex; align-items:center; gap:16px;">
                    <div class="folder-total">Total: ${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(totalDaEquipe)}</div>
                    ${nomeEquipe !== 'Geral' ? `<button onclick="event.stopPropagation(); window.excluirEquipe('${nomeEquipe}')" title="Desmanchar Equipe" style="background:transparent; border:none; color:var(--danger); font-size:20px; cursor:pointer; transition:0.2s;"><i class="ph ph-trash"></i></button>` : ''}
                </div>
            </div>
            <div class="folder-content" id="folder-content-${safeId}">
                <table>
                    <thead>
                        <tr>
                            <th>Colaborador</th>
                            <th>Perfil</th>
                            <th>Vendido</th>
                            <th style="text-align: right;">Gerenciar</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${membros.map(perfil => {
                            let vendasDesteUsuario = fechados.filter(l => l.user_id === perfil.id).reduce((soma, l) => soma + Number(l.valor), 0);
                            let corCargo = perfil.role === 'gestor' ? 'color: var(--accent); font-weight: bold;' : 'color: var(--muted);';
                            return `
                            <tr>
                                <td style="font-weight: 500;">${perfil.full_name}</td>
                                <td style="${corCargo}">${perfil.role.toUpperCase()}</td>
                                <td style="color:var(--fechados); font-weight:bold;">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(vendasDesteUsuario)}</td>
                                <td style="text-align: right; display:flex; justify-content:flex-end; gap:8px;">
                                    <button onclick="window.abrirModalEquipe('${perfil.id}', '${perfil.full_name}', '${nomeEquipe}')" style="background: transparent; border: 1px solid var(--border); color: var(--text); padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: 0.2s;" title="Trocar de Equipe"><i class="ph ph-arrows-left-right"></i> Mover</button>
                                    ${perfil.id !== usuarioAtual.id ? `<button onclick="window.excluirVendedor('${perfil.id}', '${perfil.full_name}')" style="background: rgba(255,92,92,0.1); border: 1px solid var(--danger); color: var(--danger); padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: 0.2s;" title="Remover Usuário"><i class="ph ph-trash"></i></button>` : ''}
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    }
    container.innerHTML = htmlFinal;
}

window.excluirEquipe = (nomeEquipe) => {
    window.abrirConfirmacao('Desmanchar Equipe', `Deseja desmanchar a equipe <strong>${nomeEquipe.toUpperCase()}</strong>?`, 'Desmanchar', async () => {
        const { error } = await supabase.from('profiles').update({ equipe: 'Geral' }).eq('equipe', nomeEquipe);
        
        if (error) {
            mostrarToast('Erro.', 'erro');
        } else {
            mostrarToast('Equipe desmanchada!', 'ok');
            const { data } = await supabase.from('profiles').select('*');
            perfisEquipe = data || [];
            renderizarAbaEquipe();
            renderizarGestor();
            renderizarAbaVendedores();
        }
    });
};

window.excluirVendedor = (userId, userName) => {
    window.abrirConfirmacao('Remover Usuário', `Remover <strong>${userName}</strong> do sistema?`, 'Remover', async () => {
        const { error } = await supabase.from('profiles').delete().eq('id', userId);
        
        if (error) {
            mostrarToast('Erro.', 'erro');
        } else {
            mostrarToast('Vendedor removido.', 'ok');
            const { data } = await supabase.from('profiles').select('*');
            perfisEquipe = data || [];
            renderizarAbaEquipe();
            window.abrirPainelAcessos();
            renderizarGestor();
            renderizarAbaVendedores();
        }
    });
};

window.abrirModalEquipe = (userId, userName, equipeAtual) => {
    document.getElementById('nome-usuario-mover').innerText = userName;
    document.getElementById('inp-equipe-userid').value = userId;
    
    const select = document.getElementById('inp-equipe-select');
    const equipesUnicas = [...new Set(perfisEquipe.map(p => p.equipe || 'Geral'))];
    select.innerHTML = equipesUnicas.map(eqp => `<option value="${eqp}" ${eqp === equipeAtual ? 'selected' : ''}>${eqp}</option>`).join('');
    
    document.getElementById('inp-equipe-nova').value = '';
    document.getElementById('modal-mudar-equipe').classList.add('ativa');
};

const btnFecharModalEquipe = document.getElementById('btn-fechar-modal-equipe');
if (btnFecharModalEquipe) {
    btnFecharModalEquipe.onclick = () => document.getElementById('modal-mudar-equipe').classList.remove('ativa');
}

const formMudarEquipe = document.getElementById('form-mudar-equipe');
if (formMudarEquipe) {
    formMudarEquipe.onsubmit = async (e) => {
        e.preventDefault();
        const userId = document.getElementById('inp-equipe-userid').value;
        const selectValor = document.getElementById('inp-equipe-select').value;
        const inputNovaValor = document.getElementById('inp-equipe-nova').value.trim();
        const equipeFinal = inputNovaValor !== '' ? inputNovaValor : selectValor;
        
        const { error } = await supabase.from('profiles').update({ equipe: equipeFinal }).eq('id', userId);
        
        if (error) {
            mostrarToast('Erro', 'erro');
        } else {
            mostrarToast(`Movido!`, 'ok');
            document.getElementById('modal-mudar-equipe').classList.remove('ativa');
            const { data } = await supabase.from('profiles').select('*');
            perfisEquipe = data || [];
            renderizarAbaEquipe();
            window.abrirPainelAcessos();
            renderizarGestor();
            renderizarAbaVendedores();
        }
    };
}

window.abrirPainelAcessos = () => {
    const tbody = document.getElementById('lista-painel-acessos');
    if (!tbody) return;
    
    tbody.innerHTML = perfisEquipe.map(perfil => {
        let isGestor = perfil.role === 'gestor';
        let corBadge = isGestor ? 'background: rgba(245,197,24,0.15); color: var(--accent);' : 'background: rgba(255,255,255,0.05); color: var(--muted);';
        
        let btnAcao = isGestor 
            ? `<button onclick="window.mudarCargoUsuario('${perfil.id}', '${perfil.full_name}', 'vendedor')" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: var(--text); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: 0.2s;"><i class="ph ph-arrow-down"></i> Rebaixar</button>` 
            : `<button onclick="window.mudarCargoUsuario('${perfil.id}', '${perfil.full_name}', 'gestor')" style="background: #b388ff; border: none; color: #fff; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; transition: 0.2s;"><i class="ph ph-arrow-up"></i> Promover</button>`;
        
        if (perfil.id === usuarioAtual.id) btnAcao = `<span style="font-size: 12px; color: var(--muted); font-style: italic;">Você</span>`;
        
        return `
        <tr>
            <td style="font-weight: bold; color: var(--text);">${perfil.full_name}</td>
            <td><span class="badge badge-equipe">${perfil.equipe || 'Geral'}</span></td>
            <td><span class="badge" style="${corBadge}">${perfil.role.toUpperCase()}</span></td>
            <td style="text-align: right;">${btnAcao}</td>
        </tr>`;
    }).join('');
    
    document.getElementById('modal-acessos').classList.add('ativa');
};

window.mudarCargoUsuario = (userId, userName, novoCargo) => {
    window.abrirConfirmacao(novoCargo === 'gestor' ? 'PROMOVER' : 'REBAIXAR', `Alterar privilégios de <strong>${userName}</strong>?`, 'Confirmar', async () => {
        const { error } = await supabase.from('profiles').update({ role: novoCargo }).eq('id', userId);
        
        if (error) {
            mostrarToast('Falha ao alterar cargo', 'erro');
        } else {
            mostrarToast(`Nível de acesso atualizado!`, 'ok');
            const { data } = await supabase.from('profiles').select('*');
            perfisEquipe = data || [];
            window.abrirPainelAcessos();
            renderizarAbaEquipe();
            renderizarAbaVendedores();
        }
    });
};

function renderizarAbaAuditoria() {
    const elTabela = document.getElementById('tabela-auditoria');
    if (!elTabela) return;
    
    if (leadsData.length === 0) {
        elTabela.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 40px; color:var(--muted);"><i class="ph ph-folder-open" style="font-size: 32px; display:block; margin-bottom:10px;"></i>Vazio.</td></tr>`;
        return;
    }
    
    elTabela.innerHTML = leadsData.map(l => {
        let corBadge = l.status === 'novos' ? 'badge-azul' : (l.status === 'negociacao' ? 'badge-amarelo' : (l.status === 'perdidos' ? 'badge-vermelho' : 'badge-verde'));
        let nomeVendedor = perfisEquipe.find(p => p.id === l.user_id)?.full_name || 'Deletado';
        
        return `
        <tr title="Responsável: ${nomeVendedor}">
            <td style="font-weight: 500;">${l.nome}</td>
            <td style="color:var(--muted); font-size:13px;">${l.whatsapp}</td>
            <td>${l.produto || 'Geral'}</td>
            <td style="font-weight:bold; text-align:right;">R$ ${Number(l.valor).toFixed(2)}</td>
            <td><span class="badge ${corBadge}">${l.status.toUpperCase()}</span></td>
            <td style="color:var(--muted);">${nomeVendedor}</td>
        </tr>`;
    }).join('');
}

// ==========================================
// NOTIFICAÇÕES E TEMPO REAL
// ==========================================
const btnSininho = document.getElementById('btn-sininho');
if (btnSininho) {
    btnSininho.onclick = () => {
        document.getElementById('notif-panel').classList.toggle('hidden');
        document.getElementById('notif-count').classList.remove('tem-notif');
        notifsNaoLidas = 0;
    };
}

function configurarNotificacoes() {
    supabase.removeAllChannels();
    
    supabase.channel('notificacoes-vendas').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, (payload) => {
        if (payload.new.status === 'fechados' && payload.old.status !== 'fechados') {
            const val = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(payload.new.valor);
            mostrarToast(`🎉 Venda de ${val} fechada!`, 'ok');
            
            if (perfilAtual && perfilAtual.role === 'gestor') {
                const lista = document.getElementById('notif-list');
                if (lista) {
                    if (lista.querySelector('.notif-empty')) lista.innerHTML = '';
                    const div = document.createElement('div');
                    div.className = 'notif-item';
                    div.innerHTML = `💰 <strong>${val}</strong><br><span style="color:var(--muted)">Produto:</span> ${payload.new.produto||'Geral'}<br><span style="color:var(--muted)">Por:</span> ${perfisEquipe.find(p=>p.id===payload.new.user_id)?.full_name||'Sua equipe'}`;
                    lista.insertBefore(div, lista.firstChild);
                }
                const panel = document.getElementById('notif-panel');
                if (panel && panel.classList.contains('hidden')) {
                    notifsNaoLidas++;
                    const b = document.getElementById('notif-count');
                    if (b) { b.innerText = notifsNaoLidas; b.classList.add('tem-notif'); }
                }
            }
            carregarLeads(); 
        }
    }).subscribe();

    supabase.channel('mudanca-cargo').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        if (payload.new.id === usuarioAtual.id && payload.new.role !== perfilAtual.role) {
            perfilAtual.role = payload.new.role; 
            if (perfilAtual.role === 'gestor') {
                mostrarToast('👑 Promovido a Gestor.', 'ok');
            } else {
                mostrarToast('⚠️ Alterado para Vendedor.', 'erro');
            }
            iniciarApp(); 
        }
    }).subscribe();
}

// ==========================================
// BARRA MÁGICA E COMANDOS
// ==========================================
const cmdPalette = document.getElementById('cmd-palette');
const cmdInput = document.getElementById('cmd-input');
const cmdList = document.getElementById('cmd-list');
const btnAbrirComandos = document.getElementById('btn-abrir-comandos');

const comandosDisponiveis = [
    { id: 'novo-lead', titulo: 'Novo Cliente', sub: 'Adicionar um lead ao funil', icone: 'ph-plus-circle', roles: ['vendedor', 'gestor'], acao: () => document.getElementById('modal-lead').classList.add('ativa') },
    { id: 'ir-pipeline', titulo: 'Ver Pipeline', sub: 'Acessar o Kanban de vendas', icone: 'ph-kanban', roles: ['vendedor', 'gestor'], acao: () => document.querySelector('[data-aba="aba-kanban"]').click() },
    { id: 'ir-posvenda', titulo: 'Esteira Pós-Venda', sub: 'Gerenciar sucesso e retenção de clientes', icone: 'ph-handshake', roles: ['vendedor', 'gestor'], acao: () => document.querySelector('[data-aba="aba-pos-venda"]').click() },
    { id: 'ir-arena', titulo: 'Arena de Vendas (Ranking)', sub: 'Ver posição e medalhas da equipe', icone: 'ph-trophy', roles: ['vendedor', 'gestor'], acao: () => document.querySelector('[data-aba="aba-arena"]').click() },
    { id: 'ir-agenda', titulo: 'Minha Agenda', sub: 'Ver tarefas e follow-ups', icone: 'ph-calendar-check', roles: ['vendedor', 'gestor'], acao: () => document.querySelector('[data-aba="aba-agenda"]').click() },
    { id: 'ir-relatorio', titulo: 'Meu Relatório', sub: 'Ver minhas estatísticas e conversão', icone: 'ph-chart-pie-slice', roles: ['vendedor', 'gestor'], acao: () => document.querySelector('[data-aba="aba-relatorio"]').click() },
    { id: 'ir-exportacao', titulo: 'Exportar Dados', sub: 'Gerar planilhas Excel e PDF', icone: 'ph-file-pdf', roles: ['gestor'], acao: () => document.querySelector('[data-aba="aba-exportacao"]').click() },
    { id: 'ajustar-meta', titulo: 'Ajustar Meta Global', sub: 'Definir objetivo de faturamento', icone: 'ph-target', roles: ['gestor'], acao: () => window.alterarMeta() },
    { id: 'novo-aviso', titulo: 'Disparar Aviso', sub: 'Mandar um recado para a equipe', icone: 'ph-megaphone', roles: ['gestor'], acao: () => window.criarAviso() },
    { id: 'ir-visao', titulo: 'Visão Global', sub: 'Acessar painel executivo', icone: 'ph-crown-simple', roles: ['gestor'], acao: () => document.querySelector('[data-aba="aba-chefao"]').click() },
    { id: 'ir-equipes', titulo: 'Gestão de Equipes', sub: 'Gerenciar squads e usuários', icone: 'ph-users', roles: ['gestor'], acao: () => document.querySelector('[data-aba="aba-equipe"]').click() },
    { id: 'ir-desempenho', titulo: 'Desempenho Individual', sub: 'Ver Raio-X dos vendedores', icone: 'ph-user-list', roles: ['gestor'], acao: () => document.querySelector('[data-aba="aba-vendedores"]').click() },
    { id: 'ir-auditoria', titulo: 'Auditoria de Leads', sub: 'Ver todos os clientes do sistema', icone: 'ph-folders', roles: ['gestor'], acao: () => document.querySelector('[data-aba="aba-auditoria"]').click() },
    { id: 'ir-config', titulo: 'White-Label (Sua Marca)', sub: 'Personalizar cor e nome da empresa', icone: 'ph-paint-brush', roles: ['gestor'], acao: () => document.querySelector('[data-aba="aba-config"]').click() },
    { id: 'ir-ia', titulo: 'Relatórios IA', sub: 'Diagnóstico Preditivo Executivo', icone: 'ph-magic-wand', roles: ['gestor'], acao: () => document.querySelector('[data-aba="aba-ia-relatorios"]').click() },
    { id: 'sair', titulo: 'Sair do Sistema', sub: 'Fazer logout', icone: 'ph-sign-out', roles: ['gestor', 'vendedor'], acao: () => supabase.auth.signOut() }
];

let comandosFiltrados = [];
let indiceSelecionado = 0;

function abrirBarraMagica() {
    if (!perfilAtual) return; 
    cmdPalette.classList.add('ativa');
    cmdInput.value = '';
    filtrarComandos('');
    cmdInput.focus();
}

function fecharBarraMagica() {
    cmdPalette.classList.remove('ativa');
    if (cmdInput) cmdInput.blur();
}

function executarComando(index) {
    if (comandosFiltrados[index]) {
        fecharBarraMagica();
        comandosFiltrados[index].acao();
    }
}

function renderizarComandos() {
    if (comandosFiltrados.length === 0) {
        cmdList.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--muted);">Nenhum comando encontrado.</div>`;
        return;
    }
    cmdList.innerHTML = comandosFiltrados.map((cmd, index) => `
        <div class="cmd-item ${index === indiceSelecionado ? 'selecionado' : ''}" onclick="window.executarCmdClick(${index})" onmouseenter="window.setCmdIndex(${index})">
            <i class="ph ${cmd.icone}"></i>
            <div class="cmd-item-texts">
                <span class="cmd-item-title">${cmd.titulo}</span>
                <span class="cmd-item-sub">${cmd.sub}</span>
            </div>
        </div>
    `).join('');
}

function filtrarComandos(termo) {
    const roleUsuario = perfilAtual.role;
    const busca = termo.toLowerCase();
    
    comandosFiltrados = comandosDisponiveis.filter(cmd => {
        if (!cmd.roles.includes(roleUsuario)) return false;
        return cmd.titulo.toLowerCase().includes(busca) || cmd.id.includes(busca) || cmd.sub.toLowerCase().includes(busca);
    });
    
    indiceSelecionado = 0;
    renderizarComandos();
}

window.executarCmdClick = (index) => executarComando(index);

window.setCmdIndex = (index) => {
    indiceSelecionado = index;
    const itens = cmdList.querySelectorAll('.cmd-item');
    itens.forEach((item, i) => {
        if (i === index) item.classList.add('selecionado');
        else item.classList.remove('selecionado');
    });
};

if (btnAbrirComandos) {
    btnAbrirComandos.onclick = () => abrirBarraMagica();
}

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') {
        e.preventDefault();
        e.stopPropagation();
        if (cmdPalette.classList.contains('ativa')) fecharBarraMagica();
        else abrirBarraMagica();
        return;
    }
    
    if (cmdPalette.classList.contains('ativa')) {
        if (e.key === 'Escape') fecharBarraMagica();
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            indiceSelecionado = (indiceSelecionado + 1) % comandosFiltrados.length;
            window.setCmdIndex(indiceSelecionado);
            const itens = cmdList.querySelectorAll('.cmd-item');
            if (itens[indiceSelecionado]) itens[indiceSelecionado].scrollIntoView({block: "nearest"});
        }
        
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            indiceSelecionado = (indiceSelecionado - 1 + comandosFiltrados.length) % comandosFiltrados.length;
            window.setCmdIndex(indiceSelecionado);
            const itens = cmdList.querySelectorAll('.cmd-item');
            if (itens[indiceSelecionado]) itens[indiceSelecionado].scrollIntoView({block: "nearest"});
        }
        
        if (e.key === 'Enter') {
            e.preventDefault();
            executarComando(indiceSelecionado);
        }
    }
});

if (cmdInput) {
    cmdInput.addEventListener('input', (e) => filtrarComandos(e.target.value));
}

if (cmdPalette) {
    cmdPalette.addEventListener('mousedown', (e) => { 
        if (e.target === cmdPalette) fecharBarraMagica(); 
    });
}

// ==========================================
// TEMPLATES INTELIGENTES DE WHATSAPP
// ==========================================
window.abrirModalWhatsApp = (numero, nome) => {
    document.getElementById('wpp-numero').value = numero;
    document.getElementById('wpp-nome').value = nome;
    document.getElementById('modal-whatsapp').classList.add('ativa');
};

window.enviarWhatsApp = (tipo) => {
    let num = document.getElementById('wpp-numero').value;
    let nome = document.getElementById('wpp-nome').value.split(' ')[0]; 
    let text = "";
    
    if(tipo === 'apresentacao') {
        text = `Olá ${nome}, aqui é do CRM Pro! Tudo bem? Vi que você tem interesse em nossos serviços.`;
    } else if(tipo === 'followup') {
        text = `Fala ${nome}! Tudo certo? Estou passando para lembrar da nossa proposta e saber se ficou alguma dúvida.`;
    } else if(tipo === 'cobranca') {
        text = `Oi ${nome}, conseguimos avançar com o pagamento da nossa etapa? Qualquer coisa estou por aqui!`;
    }
    
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, '_blank');
    document.getElementById('modal-whatsapp').classList.remove('ativa');
};

// ==========================================
// ESTEIRA PÓS-VENDA (CUSTOMER SUCCESS)
// ==========================================
function renderizarPosVenda() {
    let leadsPV = perfilAtual.role === 'gestor' 
        ? leadsData.filter(l => l.status === 'fechados' && l.aprovado === true)
        : leadsData.filter(l => l.user_id === usuarioAtual.id && l.status === 'fechados' && l.aprovado === true);

    ['onboarding', 'acompanhamento', 'upsell'].forEach(etapa => {
        const col = document.getElementById(`col-pv-${etapa}`);
        if (!col) return;
        
        const list = leadsPV.filter(l => (l.etapa_pos_venda || 'onboarding') === etapa);
        const labelEl = col.parentElement.querySelector('.col-label');
        labelEl.innerHTML = labelEl.innerHTML.split(' <span')[0] + ` <span style="font-size:12px; color:var(--muted);">(${list.length})</span>`;
        
        if (list.length === 0) {
            col.innerHTML = `<div class="empty-state"><i class="ph ph-ghost"></i><p>Nenhum cliente nesta etapa.</p></div>`;
            configurarDragPV(col);
            return;
        }
        
        col.innerHTML = list.map(l => {
            let numWpp = l.whatsapp.replace(/\D/g, '');
            if (!numWpp.startsWith('55') && numWpp.length <= 11) numWpp = '55' + numWpp;
            
            return `
            <div class="lead-card" draggable="true" data-id="${l.id}" onclick="window.abrirDrawerLead(${l.id})">
                <div class="card-top">
                    <div class="card-nome">${l.nome}</div>
                </div>
                <div class="card-info" style="display: flex; flex-direction: column; gap: 8px;">
                    <span><i class="ph ph-package"></i> ${l.produto || 'Geral'}</span>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color:var(--muted); font-size: 12px;"><i class="ph ph-whatsapp-logo"></i> ${l.whatsapp}</span>
                        <button onclick="event.stopPropagation(); window.abrirModalWhatsApp('${numWpp}', '${l.nome}')" style="background: rgba(37,211,102,0.1); border:none; color: #25d366; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 11px; display: flex; align-items: center; gap: 4px; transition:0.2s;">
                            <i class="ph ph-whatsapp-logo" style="font-size:14px;"></i> Chamar
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');
        
        configurarDragPV(col);
    });
}

function configurarDragPV(container) {
    container.querySelectorAll('.lead-card').forEach(c => {
        c.ondragstart = (e) => { c.classList.add('dragging'); e.dataTransfer.setData('id_pv', c.dataset.id); };
        c.ondragend = () => { c.classList.remove('dragging'); };
    });
    container.ondragover = (e) => { e.preventDefault(); container.classList.add('drag-over'); };
    container.ondragleave = () => { container.classList.remove('drag-over'); };
    container.ondrop = async (e) => {
        e.preventDefault(); 
        container.classList.remove('drag-over');
        const idCard = e.dataTransfer.getData('id_pv');
        if(!idCard) return;
        const novaEtapa = container.dataset.etapa;
        await supabase.from('leads').update({ etapa_pos_venda: novaEtapa }).eq('id', idCard);
        carregarLeads();
    };
}

// ==========================================
// ARENA DE VENDAS (GAMIFICAÇÃO)
// ==========================================
function renderizarArena() {
    const container = document.getElementById('arena-podio');
    if (!container) return;

    const fechadosReais = leadsData.filter(l => l.status === 'fechados' && l.aprovado === true);
    const ranking = {};
    
    perfisEquipe.forEach(p => {
        if(p.role === 'vendedor') {
            ranking[p.id] = { nome: p.full_name, total: 0, img: p.full_name.charAt(0).toUpperCase() };
        }
    });

    fechadosReais.forEach(l => {
        if (ranking[l.user_id]) ranking[l.user_id].total += Number(l.valor);
    });

    const arrayRank = Object.values(ranking).sort((a, b) => b.total - a.total);

    if (arrayRank.length === 0) {
        container.innerHTML = `<div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--muted);"><i class="ph ph-ghost" style="font-size:48px; margin-bottom:10px; display:block;"></i>A Arena está vazia. Cadastre vendedores e aprove vendas!</div>`;
        return;
    }

    container.innerHTML = arrayRank.map((v, i) => {
        let badge = '';
        let icone = '';
        let cor = '';
        
        if (v.total >= 50000) { 
            badge = 'Lobo de Wall Street'; icone = '🐺'; cor = 'var(--accent)'; 
        } else if (v.total >= 10000) { 
            badge = 'Tubarão das Vendas'; icone = '🦈'; cor = 'var(--novos)'; 
        } else { 
            badge = 'Iniciante Promissor'; icone = '👶'; cor = 'var(--muted)'; 
        }

        let trofeu = i === 0 ? '🥇 1º LUGAR' : (i === 1 ? '🥈 2º LUGAR' : (i === 2 ? '🥉 3º LUGAR' : `${i+1}º LUGAR`));

        return `
        <div class="seller-card" style="border-top: 4px solid ${cor}; background: linear-gradient(180deg, var(--surface) 0%, rgba(0,0,0,0.2) 100%); text-align:center;">
            <div style="font-size:12px; color:var(--muted); text-transform:uppercase; font-weight:900; letter-spacing:1px; margin-bottom:16px;">${trofeu}</div>
            
            <div class="seller-avatar" style="background:rgba(255,255,255,0.05); color:${cor}; margin: 0 auto 12px auto; width:64px; height:64px; font-size:28px;">${v.img}</div>
            
            <h4 style="font-size:20px; font-family:var(--font-head); color:#fff; margin-bottom:4px;">${v.nome}</h4>
            <span style="color:${cor}; font-weight:bold; font-size:13px; display:block; margin-bottom: 24px;">${icone} ${badge}</span>
            
            <div style="border-top: 1px solid var(--border2); padding-top: 16px;">
                <div style="font-size:28px; font-weight:800; color:var(--text); font-family:var(--font-head);">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v.total)}</div>
            </div>
        </div>`;
    }).join('');
}

// ==========================================
// FASE 4: CONSELHEIRO PREDITIVO E IA
// ==========================================
function atualizarConselheiroIA() {
    const boxIA = document.getElementById('box-ia-conselheiro');
    const elMsg = document.getElementById('ia-mensagem');
    const elAcao = document.getElementById('ia-acao');
    
    if (!boxIA || !elMsg || !elAcao) return;

    let meusLeadsAbertos = leadsData.filter(l => l.user_id === usuarioAtual.id && l.status !== 'fechados');
    
    if (meusLeadsAbertos.length === 0) { 
        boxIA.classList.add('hidden'); 
        return; 
    }

    let leadsComDias = meusLeadsAbertos.map(l => {
        let diffDias = l.created_at ? Math.floor(Math.abs(new Date() - new Date(l.created_at)) / (1000 * 60 * 60 * 24)) : 0;
        return { ...l, dias: diffDias };
    });

    let leadsFrios = leadsComDias.filter(l => l.dias >= 3).sort((a, b) => b.valor - a.valor);
    let leadsQuentes = leadsComDias.filter(l => l.dias <= 1).sort((a, b) => b.valor - a.valor);

    boxIA.classList.remove('hidden');

    if (leadsFrios.length > 0) {
        let alvo = leadsFrios[0];
        let numWpp = alvo.whatsapp.replace(/\D/g, '');
        if (!numWpp.startsWith('55') && numWpp.length <= 11) numWpp = '55' + numWpp;
        let valorFmt = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(alvo.valor);
        
        elMsg.innerHTML = `O cliente <strong>${alvo.nome}</strong> está esfriando na sua mesa há ${alvo.dias} dias. Essa venda de <strong>${valorFmt}</strong> é essencial. Envie uma mensagem agora!`;
        elAcao.innerHTML = `<button onclick="window.abrirModalWhatsApp('${numWpp}', '${alvo.nome}')"><i class="ph ph-whatsapp-logo"></i> Recuperar Venda</button>`;
    } else if (leadsQuentes.length > 0) {
        let alvo = leadsQuentes[0];
        let numWpp = alvo.whatsapp.replace(/\D/g, '');
        if (!numWpp.startsWith('55') && numWpp.length <= 11) numWpp = '55' + numWpp;
        
        elMsg.innerHTML = `O funil está aquecido! Você tem <strong>${leadsQuentes.length} lead(s) pegando fogo</strong> 🔥 hoje. O seu alvo principal é <strong>${alvo.nome}</strong>. Mantenha a pressão!`;
        elAcao.innerHTML = `<button onclick="window.abrirModalWhatsApp('${numWpp}', '${alvo.nome}')"><i class="ph ph-fire"></i> Chamar Cliente</button>`;
    } else {
        elMsg.innerHTML = `Seu funil está morno hoje. Nenhum cliente esfriando, mas ninguém novo entrou nas últimas 24 horas. Que tal prospectar agora?`;
        elAcao.innerHTML = `<button onclick="document.getElementById('modal-lead').classList.add('ativa')"><i class="ph ph-plus-circle"></i> Adicionar Lead</button>`;
    }
}

function gerarRelatorioIA() {
    const boxText = document.getElementById('text-report-ia');
    if (!boxText || leadsData.length === 0) {
        if (boxText) boxText.innerHTML = "Não há dados suficientes no sistema para gerar uma análise preditiva.";
        return;
    }

    const totalLeads = leadsData.length;
    const fechados = leadsData.filter(l => l.status === 'fechados' && l.aprovado === true);
    const faturamento = fechados.reduce((acc, l) => acc + Number(l.valor), 0);
    const taxaConversao = ((fechados.length / totalLeads) * 100).toFixed(1);
    
    const abertos = leadsData.filter(l => l.status !== 'fechados' || l.aprovado !== true);
    const valorPendente = abertos.reduce((acc, l) => acc + Number(l.valor), 0);
    
    const prods = {};
    fechados.forEach(l => {
        let p = l.produto || 'Geral';
        prods[p] = (prods[p] || 0) + 1;
    });
    
    const bestProduto = Object.keys(prods).length > 0 
        ? Object.keys(prods).reduce((a, b) => prods[a] > prods[b] ? a : b) 
        : "Nenhum";

    let diagnostico = "";
    if (taxaConversao < 15) {
        diagnostico = "A equipe está enfrentando dificuldades no fechamento. Recomendo focar em treinamentos de negociação e reaquecer os contatos antigos.";
    } else if (taxaConversao >= 15 && taxaConversao < 30) {
        diagnostico = "O fluxo de vendas está saudável, mas há espaço para otimização. Sugiro focar no produto campeão para aumentar o ticket médio.";
    } else {
        diagnostico = "Excelente performance! A equipe está em modo de alta conversão. Mantenha o ritmo de entrada de novos leads para escalar os ganhos.";
    }

    setTimeout(() => {
        boxText.innerHTML = `
            <p>Após analisar os <strong>${totalLeads} clientes</strong> cadastrados no sistema, identifiquei que a empresa gerou <strong>${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(faturamento)}</strong> em receita fechada.</p>
            <p>A taxa de conversão atual da equipe é de <strong>${taxaConversao}%</strong>. O serviço de maior aderência no mercado está sendo o <strong>"${bestProduto}"</strong>.</p>
            <p><strong>Dinheiro na mesa:</strong> Atualmente existem <strong>${abertos.length} negociações abertas</strong>, totalizando <strong>${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(valorPendente)}</strong> travados no funil.</p>
            <p><strong>Diagnóstico IA:</strong> ${diagnostico}</p>
        `;
    }, 800);
}

// ==========================================
// PAINEL WHITE-LABEL E PROPOSTAS
// ==========================================
function renderizarConfiguracoes() {
    const perfilGestor = perfisEquipe.find(p => p.role === 'gestor') || perfilAtual;
    document.getElementById('inp-config-nome').value = perfilGestor.nome_empresa || 'CRM Pro';
    document.getElementById('inp-config-cor').value = perfilGestor.cor_primaria || '#f5c518';
    document.getElementById('inp-config-cor-texto').value = perfilGestor.cor_primaria || '#f5c518';
}

const inpCor = document.getElementById('inp-config-cor');
const inpCorTexto = document.getElementById('inp-config-cor-texto');
if(inpCor && inpCorTexto) {
    inpCor.addEventListener('input', (e) => {
        inpCorTexto.value = e.target.value;
        document.documentElement.style.setProperty('--accent', e.target.value); 
    });
    inpCorTexto.addEventListener('input', (e) => {
        inpCor.value = e.target.value;
        document.documentElement.style.setProperty('--accent', e.target.value);
    });
}

const formConfig = document.getElementById('form-config');
if (formConfig) {
    formConfig.onsubmit = async (e) => {
        e.preventDefault();
        const novoNome = document.getElementById('inp-config-nome').value;
        const novaCor = document.getElementById('inp-config-cor').value;

        const btn = formConfig.querySelector('button');
        btn.innerHTML = 'Aplicando...';

        const { error } = await supabase.from('profiles').update({ 
            nome_empresa: novoNome, 
            cor_primaria: novaCor 
        }).eq('id', usuarioAtual.id);

        btn.innerHTML = '<i class="ph ph-check-circle"></i> Aplicar Marca';

        if (error) {
            mostrarToast('Erro ao salvar configurações.', 'erro');
        } else {
            mostrarToast('Marca atualizada com sucesso!', 'ok');
            setTimeout(() => location.reload(), 1000); 
        }
    };
}

window.gerarPropostaPDF = () => {
    const id = document.getElementById('drawer-lead-id').value;
    const lead = leadsData.find(l => l.id == id);
    if (!lead) return mostrarToast('Erro ao encontrar cliente.', 'erro');

    const perfilGestor = perfisEquipe.find(p => p.role === 'gestor') || perfilAtual;
    const nomeEmpresa = perfilGestor.nome_empresa || 'Nossa Empresa';
    const corEmpresa = perfilGestor.cor_primaria || '#f5c518';
    
    const valorFormatado = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(lead.valor);
    const dataAtual = new Date().toLocaleDateString('pt-BR');

    const janelaPDF = window.open('', '_blank');
    
    const htmlProposta = `
    <html>
    <head>
        <title>Proposta Comercial - ${lead.nome}</title>
        <style>
            body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; line-height: 1.6; }
            .header { border-bottom: 4px solid ${corEmpresa}; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .header h1 { margin: 0; font-size: 32px; color: #10121a; }
            .header p { margin: 0; color: #666; font-weight: bold; }
            .client-box { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid ${corEmpresa}; margin-bottom: 30px; }
            .client-box h3 { margin-top: 0; margin-bottom: 10px; font-size: 16px; text-transform: uppercase; color: #555; }
            .client-box p { margin: 5px 0; font-size: 18px; }
            .service-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            .service-table th, .service-table td { padding: 15px; text-align: left; border-bottom: 1px solid #eee; }
            .service-table th { background: #f1f1f1; font-weight: bold; text-transform: uppercase; font-size: 13px; }
            .service-table td { font-size: 16px; }
            .total-row { font-size: 22px; font-weight: bold; color: ${corEmpresa}; }
            .footer { margin-top: 50px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; }
            .signature { margin-top: 60px; display: flex; justify-content: space-between; }
            .sig-box { width: 45%; text-align: center; border-top: 1px solid #333; padding-top: 10px; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="header">
            <div>
                <h1>PROPOSTA COMERCIAL</h1>
                <p>Documento Oficial - N° ${Math.floor(Math.random() * 9000) + 1000}</p>
            </div>
            <div style="text-align: right;">
                <h2 style="margin: 0; color: ${corEmpresa};">${nomeEmpresa}</h2>
                <p>Data: ${dataAtual}</p>
            </div>
        </div>

        <div class="client-box">
            <h3>Preparado exclusivamente para:</h3>
            <p><strong>Cliente:</strong> ${lead.nome}</p>
            <p><strong>Contato:</strong> ${lead.whatsapp}</p>
        </div>

        <table class="service-table">
            <thead>
                <tr>
                    <th>Descrição do Serviço / Produto</th>
                    <th style="text-align: right;">Investimento</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>${lead.produto || 'Serviço Premium Exclusivo'}</strong><br><span style="font-size: 13px; color: #666;">Conforme alinhamento e negociação prévia.</span></td>
                    <td style="text-align: right; font-weight: bold;">${valorFormatado}</td>
                </tr>
                <tr>
                    <td style="text-align: right; text-transform: uppercase; font-weight: bold;">Total a investir:</td>
                    <td class="total-row" style="text-align: right;">${valorFormatado}</td>
                </tr>
            </tbody>
        </table>

        <div style="background: rgba(245,197,24,0.1); padding: 15px; border-radius: 8px; font-size: 14px; border: 1px dashed ${corEmpresa};">
            <strong>Condições Gerais:</strong> Esta proposta é válida por 7 dias a partir da data de emissão. O início dos serviços/entrega está condicionado à aprovação e assinatura deste documento.
        </div>

        <div class="signature">
            <div class="sig-box">
                Assinatura do Cliente
            </div>
            <div class="sig-box">
                ${nomeEmpresa}
            </div>
        </div>

        <div class="footer">
            Gerado automaticamente por ${nomeEmpresa} CRM.
        </div>

        <script>
            window.onload = () => { setTimeout(() => { window.print(); }, 500); }
        </script>
    </body>
    </html>
    `;
    
    janelaPDF.document.write(htmlProposta);
    janelaPDF.document.close();
};