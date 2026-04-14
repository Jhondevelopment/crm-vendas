import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// ==========================================
// AS SUAS CHAVES DO SUPABASE
// ==========================================
const SUPABASE_URL = 'https://bskgqlhducfxfipflpqm.supabase.co'
const SUPABASE_KEY = 'sb_publishable_hPbZtYmMLtMn1yfRZa4O2w_nxf43EOa'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ==========================================
// VARIÁVEIS GLOBAIS DE ESTADO
// ==========================================
let usuarioAtual = null;
let perfilAtual = null;
let perfisEquipe = [];
let leadsData = [];
let produtosData = [];
let avisosData = [];
let logsExportacaoData = [];
let pagamentosData = []; 
let despesasData = []; 
let bonusData = [];
let notifsNaoLidas = 0;

// Instâncias de Gráficos (Para poder destruir e recriar dinamicamente)
let chartInstance = null;
let chartFugasLinhaInstance = null;
let chartFugasMotivosInstance = null;
let chartPagamentosInstance = null; 

let confirmCallback = null;
let isRegistering = false;

// ==========================================
// FUNÇÕES GERAIS E COMPONENTES DE UI
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
    
    if (hora >= 5 && hora < 12) {
        return 'Bom dia';
    }
    if (hora >= 12 && hora < 18) {
        return 'Boa tarde';
    }
    return 'Boa noite';
}

function mudarTela(id) {
    document.querySelectorAll('.tela').forEach(t => {
        t.classList.remove('ativa');
    });
    
    const tela = document.getElementById(id);
    if (tela) {
        tela.classList.add('ativa');
    }
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
    if (confirmCallback) {
        confirmCallback();
    }
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
            document.getElementById('box-senha-confirm').classList.remove('hidden');
            document.getElementById('link-esqueceu-senha').classList.add('hidden');
            
            const cVal = document.getElementById('auth-cargo').value;
            if (cVal === 'gestor_geral' || cVal === 'gestor_sub') {
                document.getElementById('box-chave').classList.remove('hidden');
            }
        } else {
            toggleModo.dataset.modo = 'login';
            document.getElementById('auth-titulo').innerText = 'Acessar Sistema';
            document.getElementById('auth-desc').innerText = 'Fricção zero. Direto ao ponto.';
            document.getElementById('btn-login').innerText = 'Entrar no HAPSIS';
            toggleModo.innerHTML = 'Novo por aqui? <a style="cursor:pointer; color:var(--accent); font-weight:bold;">cadastrar-se</a>';
            
            document.getElementById('box-nome').classList.add('hidden');
            document.getElementById('box-cargo').classList.add('hidden');
            document.getElementById('box-chave').classList.add('hidden');
            document.getElementById('box-senha-confirm').classList.add('hidden');
            document.getElementById('link-esqueceu-senha').classList.remove('hidden');
        }
    };
}

const selectCargo = document.getElementById('auth-cargo');
if (selectCargo) {
    selectCargo.addEventListener('change', (e) => {
        if (e.target.value === 'gestor_geral' || e.target.value === 'gestor_sub') {
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
            btnLogin.style.transform = 'scale(0.97)';
            btnLogin.style.opacity = '0.85';
            
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            
            if (error) {
                mostrarToast('Acesso negado. Verifique os dados.', 'erro');
                btnLogin.innerText = 'Entrar no HAPSIS';
                btnLogin.style.transform = 'none';
                btnLogin.style.opacity = '1';
            }
        } else {
            const nome = document.getElementById('auth-nome').value;
            const cargo = document.getElementById('auth-cargo').value;
            const chaveDigitada = document.getElementById('auth-chave').value;
            const senhaConfirm = document.getElementById('auth-senha-confirm').value;

            if (!nome) return mostrarToast('Por favor, informe seu nome.', 'erro');
            if (password !== senhaConfirm) return mostrarToast('As senhas não coincidem!', 'erro');
            
            if (cargo === 'gestor_geral' && chaveDigitada !== 'CEO2026') {
                return mostrarToast('Chave de Gestor Supremo incorreta!', 'erro');
            }
            if (cargo === 'gestor_sub' && chaveDigitada !== 'FINAN2026') {
                return mostrarToast('Chave de Gestor Financeiro incorreta!', 'erro');
            }

            btnLogin.innerText = 'Criando conta...';
            btnLogin.style.transform = 'scale(0.97)';
            btnLogin.style.opacity = '0.85';
            isRegistering = true; 
            
            const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
            
            if (authError) {
                mostrarToast(authError.message, 'erro');
                btnLogin.innerText = 'Cadastrar e Entrar';
                btnLogin.style.transform = 'none';
                btnLogin.style.opacity = '1';
                isRegistering = false;
            } else if (authData.user) {
                const payload = { 
                    id: authData.user.id, 
                    full_name: nome, 
                    role: cargo, 
                    equipe: 'Geral', 
                    meta_mensal: 10000,
                    nome_empresa: 'HAPSIS',
                    cor_primaria: '#f5c518',
                    taxa_comissao: 5,
                    logo_empresa: null
                };
                
                const { error: insertError } = await supabase.from('profiles').upsert([payload]);
                
                if (insertError) {
                     mostrarToast('Erro DB: ' + insertError.message, 'erro');
                     btnLogin.innerText = 'Tentar Novamente';
                     btnLogin.style.transform = 'none';
                     btnLogin.style.opacity = '1';
                     isRegistering = false;
                     return;
                }
                
                perfilAtual = payload;
                mostrarToast('Conta criada com sucesso!', 'ok');
                
                setTimeout(() => {
                    isRegistering = false;
                    iniciarApp(); 
                }, 500);
            }
        }
    };
}

const linkEsqueceu = document.getElementById('link-esqueceu-senha');
if (linkEsqueceu) {
    linkEsqueceu.onclick = () => {
        document.getElementById('modal-recuperar-senha').classList.add('ativa');
    };
}

const formRecuperar = document.getElementById('form-recuperar-senha');
if (formRecuperar) {
    formRecuperar.onsubmit = async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('inp-recuperar-email').value;
        const btn = formRecuperar.querySelector('button');
        const textOriginal = btn.innerHTML;
        
        btn.innerHTML = 'Enviando...';
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, { 
            redirectTo: window.location.origin 
        });
        
        btn.innerHTML = textOriginal;
        
        if (error) {
            mostrarToast('Erro: ' + error.message, 'erro');
        } else {
            mostrarToast('Link de recuperação enviado pro seu e-mail!', 'ok');
            document.getElementById('modal-recuperar-senha').classList.remove('ativa');
            formRecuperar.reset();
        }
    }
}

const formNovaSenha = document.getElementById('form-nova-senha');
if (formNovaSenha) {
    formNovaSenha.onsubmit = async (e) => {
        e.preventDefault();
        const novaSenha = document.getElementById('inp-nova-senha').value;
        
        const { error } = await supabase.auth.updateUser({ password: novaSenha });
        
        if (error) {
            mostrarToast('Erro ao atualizar senha: ' + error.message, 'erro');
        } else {
            mostrarToast('Senha atualizada com sucesso!', 'ok');
            document.getElementById('modal-nova-senha').classList.remove('ativa');
        }
    };
}

const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.onclick = async () => {
        const telaAuthEl = document.getElementById('tela-auth');
        if (telaAuthEl) telaAuthEl.classList.remove('entrando');
        
        await supabase.auth.signOut();
        window.location.reload();
    }
}

// ==========================================
// CONTROLE DE SESSÃO (ROTEAMENTO GLOBAL)
// ==========================================
supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
        document.getElementById('modal-nova-senha').classList.add('ativa');
    }
    
    if (session) { 
        usuarioAtual = session.user; 
        if (!isRegistering && !perfilAtual) {
            verificarPerfil(); 
        }
    } else { 
        usuarioAtual = null;
        perfilAtual = null;
        mudarTela('tela-auth'); 
    }
});

async function verificarPerfil() {
    let { data, error } = await supabase.from('profiles').select('*').eq('id', usuarioAtual.id).single();
    
    if (error || !data) {
        await new Promise(r => setTimeout(r, 1500));
        let retry = await supabase.from('profiles').select('*').eq('id', usuarioAtual.id).single();
        data = retry.data;
    }
    
    if (data) { 
        perfilAtual = data; 
        
        if (perfilAtual.role === 'gestor') {
            perfilAtual.role = 'gestor_geral';
        }
        if (perfilAtual.role === 'gerente') {
            perfilAtual.role = 'gestor_sub';
        }
        
        iniciarApp(); 
    } else {
        await supabase.auth.signOut();
        window.location.reload();
    }
}

// ==========================================
// INICIALIZAÇÃO DO APP E PERMISSÕES
// ==========================================
async function iniciarApp() {
    const elUserNome = document.getElementById('user-nome');
    if (elUserNome) {
        elUserNome.innerHTML = `<span style="font-size:12px; color:var(--muted); font-weight:normal;">${getSaudacao()},</span><br>${perfilAtual.full_name}`;
    }
    
    const { data } = await supabase.from('profiles').select('*');
    perfisEquipe = data || [];

    const perfilGestor = perfisEquipe.find(p => p.role === 'gestor_geral' || p.role === 'gestor') || perfilAtual;
    
    if (perfilGestor.cor_primaria) {
        document.documentElement.style.setProperty('--accent', perfilGestor.cor_primaria);
    }
    
    if (perfilGestor.logo_empresa) {
        const imgHtml = `<img src="${perfilGestor.logo_empresa}" style="width:100%; height:100%; object-fit:contain; border-radius:8px;" />`;
        
        const logoApp = document.getElementById('app-logo-img');
        const logoLogin = document.getElementById('login-logo-img');
        
        if (logoApp) { 
            logoApp.innerHTML = imgHtml; 
            logoApp.style.background = 'transparent'; 
            logoApp.style.border = 'none'; 
        }
        if (logoLogin) { 
            logoLogin.innerHTML = imgHtml; 
            logoLogin.style.background = 'transparent'; 
            logoLogin.style.border = 'none'; 
        }
    }

    const isVendedor = perfilAtual.role === 'vendedor';
    const isGestorSub = perfilAtual.role === 'gestor_sub';
    const isGestorGeral = perfilAtual.role === 'gestor_geral';
    const isAdmin = isGestorSub || isGestorGeral;

    document.querySelectorAll('.vendedor-only').forEach(el => {
        el.classList.toggle('hidden', !isVendedor);
    });
    
    document.querySelectorAll('.gestor-sub-only').forEach(el => {
        el.classList.toggle('hidden', !isGestorSub);
    });
    
    document.querySelectorAll('.admin-shared').forEach(el => {
        el.classList.toggle('hidden', !isAdmin);
    });
    
    document.querySelectorAll('.gestor-geral-only').forEach(el => {
        el.classList.toggle('hidden', !isGestorGeral);
    });
    
    const boxSininho = document.getElementById('box-sininho');
    if (boxSininho) {
        boxSininho.classList.toggle('hidden', !isAdmin);
    }

    document.querySelectorAll('.aba-conteudo').forEach(a => {
        a.classList.add('hidden');
    });
    
    document.querySelectorAll('.nav-item').forEach(b => {
        b.classList.remove('ativo');
    });
    
    const boxAvisos = document.getElementById('box-avisos');
    
    if (isAdmin) {
        document.getElementById('aba-chefao').classList.remove('hidden'); 
        const btnChefe = document.querySelector('[data-aba="aba-chefao"]');
        if (btnChefe) {
            btnChefe.classList.add('ativo');
        }
        if (boxAvisos) {
            boxAvisos.classList.remove('hidden');
        }
    } else {
        document.getElementById('aba-kanban').classList.remove('hidden'); 
        const btnKanban = document.querySelector('[data-aba="aba-kanban"]');
        if (btnKanban) {
            btnKanban.classList.add('ativo');
        }
        if (boxAvisos) {
            boxAvisos.classList.remove('hidden');
        }
    }
    
    const telaAuthEl = document.getElementById('tela-auth');
    if (telaAuthEl && telaAuthEl.classList.contains('ativa')) {
        telaAuthEl.classList.add('entrando');
        await new Promise(r => setTimeout(r, 700));
    }
    mudarTela('tela-app');
    
    if (btnLogin) {
        btnLogin.style.transform = 'none';
        btnLogin.style.opacity = '1';
        btnLogin.innerText = 'Entrar no HAPSIS';
    }
    
    await carregarAvisos();
    await carregarProdutos();
    await carregarBonus(); 
    await carregarLeads(); 
    configurarNotificacoes();
}

// ==========================================
// ROTEAMENTO (NAVEGAÇÃO SIDEBAR)
// ==========================================
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.nav-item').forEach(b => {
            b.classList.remove('ativo');
        });
        
        btn.classList.add('ativo');
        
        document.querySelectorAll('.aba-conteudo').forEach(a => {
            a.classList.add('hidden');
        });
        
        const abaId = btn.dataset.aba;
        const aba = document.getElementById(abaId);
        
        if (aba) {
            aba.classList.remove('hidden');
        }

        const boxAvisos = document.getElementById('box-avisos');
        if (boxAvisos) {
            if (['aba-chefao', 'aba-kanban'].includes(abaId)) {
                boxAvisos.classList.remove('hidden');
            } else {
                boxAvisos.classList.add('hidden');
            }
        }

        if (abaId === 'aba-relatorio') { 
            atualizarEstatisticas(); 
            calcularComissoesNovoModeloVendedor(); 
        }
        if (abaId === 'aba-chefao') {
            renderizarGestor();
        }
        if (abaId === 'aba-equipe') {
            renderizarAbaEquipe();
        }
        if (abaId === 'aba-auditoria') {
            renderizarAbaAuditoria();
        }
        if (abaId === 'aba-comissoes') {
            renderizarComissoesNovoModeloFinanceiro();
        }
        if (abaId === 'aba-exportacao') { 
            renderizarTabelaExportacao(); 
            carregarAuditoriaExportacao(); 
        }
        if (abaId === 'aba-arena') {
            renderizarArena();
        }
        if (abaId === 'aba-pos-venda') {
            renderizarPosVenda();
        }
        if (abaId === 'aba-config') {
            renderizarConfiguracoes();
        }
        
        if (abaId === 'aba-auditoria-descontos') {
            renderizarAuditoriaDescontos();
        }
        if (abaId === 'aba-despesas') {
            carregarDespesas(); 
        }
        if (abaId === 'aba-cobrancas') {
            renderizarCobrancas();
        }
        if (abaId === 'aba-mrr') {
            renderizarMRR();
        }
        if (abaId === 'aba-contratos') {
            renderizarContratos();
        }
        if (abaId === 'aba-bonus') {
            carregarBonus();
        }
        if (abaId === 'aba-ia-relatorios') {
            gerarRelatorioIA();
        }
    };
});

const inputBusca = document.getElementById('inp-busca-global');
if (inputBusca) {
    inputBusca.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        
        document.querySelectorAll('.lead-card').forEach(card => {
            if (card.innerText.toLowerCase().includes(termo)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
        
        document.querySelectorAll('.lista-table tbody tr').forEach(row => {
            if (row.innerText.toLowerCase().includes(termo)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
}

// ==========================================
// AVISOS E CATÁLOGO DE PRODUTOS
// ==========================================
async function carregarAvisos() {
    const { data } = await supabase.from('avisos').select('*').order('created_at', { ascending: false }).limit(3);
    avisosData = data || [];
    
    const lista = document.getElementById('lista-avisos');
    if (!lista) return;
    
    if (avisosData.length === 0) { 
        lista.innerHTML = `
        <div class="empty-state" style="padding:10px;">
            <i class="ph ph-coffee"></i>
            <p>Nada de novo por aqui.<br>A diretoria está quieta hoje.</p>
        </div>`; 
        return; 
    }
    
    lista.innerHTML = avisosData.map(a => `
        <div class="aviso-item" style="flex-direction: column; align-items: flex-start; gap: 6px;">
            <div style="display: flex; justify-content: space-between; width: 100%;">
                <strong style="color: var(--accent); font-size: 14px;">${a.titulo || 'Aviso'}</strong>
                ${(['gestor_geral', 'gestor_sub'].includes(perfilAtual.role)) ? `<button class="aviso-del" title="Apagar aviso" onclick="window.deletarAviso(${a.id})"><i class="ph ph-trash"></i></button>` : ''}
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
    btnFecharAviso.onclick = () => {
        document.getElementById('modal-aviso').classList.remove('ativa');
    };
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
            document.getElementById('form-aviso').reset(); 
            mostrarToast('Disparado!', 'ok'); 
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
            tbodyCat.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--muted);">Catálogo vazio.</td></tr>'; 
        } else {
            tbodyCat.innerHTML = produtosData.map(p => `
                <tr>
                    <td><strong style="color:var(--text)">${p.nome}</strong></td>
                    <td style="text-align:right;">R$ ${Number(p.valor).toFixed(2)}</td>
                    <td style="text-align:center; color:var(--accent); font-weight:bold;">${p.taxa_comissao || 5}%</td>
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
        const taxa = document.getElementById('inp-prod-comissao').value;
        
        const { error } = await supabase.from('produtos').insert([{ nome, valor, taxa_comissao: taxa }]);
        
        if (error) {
            mostrarToast('Erro ao salvar.', 'erro'); 
        } else { 
            document.getElementById('modal-produto').classList.remove('ativa'); 
            document.getElementById('form-produto').reset(); 
            mostrarToast('Regra salva!', 'ok'); 
            carregarProdutos(); 
        }
    };
}

window.deletarProduto = (id) => { 
    window.abrirConfirmacao('Excluir Produto', 'Remover do catálogo?', 'Excluir', async () => { 
        await supabase.from('produtos').delete().eq('id', id); 
        mostrarToast('Removido.', 'ok'); 
        carregarProdutos(); 
    }); 
};

// ==========================================
// MÓDULO DE GAMIFICAÇÃO: CAMPANHAS DE BÔNUS
// ==========================================
async function carregarBonus() {
    const { data } = await supabase.from('campanhas_bonus').select('*').order('created_at', { ascending: false });
    bonusData = data || [];
    
    if (perfilAtual.role === 'vendedor') {
        verificarBonusAtivo();
    } else {
        renderizarBonus();
    }
}

function renderizarBonus() {
    const tbody = document.getElementById('tbody-bonus');
    if (!tbody) return;

    if (bonusData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--muted);">Nenhuma campanha de bônus lançada.</td></tr>`;
        return;
    }

    tbody.innerHTML = bonusData.map(b => {
        let corStatus = b.status === 'Ativa' ? 'color: var(--fechados);' : 'color: var(--danger);';
        
        let botaoHTML = b.status === 'Ativa' 
            ? `<button class="btn-cancel" style="padding:4px 8px; width:auto; margin:0 auto; font-size:12px; color:var(--danger); border-color:var(--danger);" onclick="window.encerrarBonus(${b.id})"><i class="ph ph-stop-circle"></i> Encerrar</button>`
            : `<button class="btn-cancel" style="padding:4px 8px; width:auto; margin:0 auto; font-size:12px; color:var(--muted); border-color:var(--border);" onclick="window.deletarBonus(${b.id})"><i class="ph ph-trash"></i> Apagar</button>`;
        
        return `
        <tr>
            <td style="font-weight: bold; color: var(--text);">${b.titulo}</td>
            <td style="text-align:right;">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(b.meta_valor)}</td>
            <td style="text-align:right; font-weight:bold; color:#b388ff;">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(b.premio_valor)}</td>
            <td style="font-weight:bold; ${corStatus}">${b.status}</td>
            <td style="text-align:center;">
                ${botaoHTML}
            </td>
        </tr>`;
    }).join('');
}

window.deletarBonus = async (id) => {
    window.abrirConfirmacao('Apagar Campanha', 'Remover esta campanha do histórico?', 'Apagar Definitivo', async () => {
        await supabase.from('campanhas_bonus').delete().eq('id', id);
        mostrarToast('Campanha deletada.', 'ok'); 
        carregarBonus();
    });
};

function verificarBonusAtivo() {
    const banner = document.getElementById('banner-bonus-vendedor');
    if (!banner) return;

    const campanhaAtiva = bonusData.find(b => b.status === 'Ativa');
    
    if (!campanhaAtiva) {
        banner.classList.add('hidden');
        return;
    }

    let leadsDoVendedor = leadsData.filter(l => l.user_id === usuarioAtual.id && l.status === 'fechados' && l.aprovado === true && !l.estornado);
    let receitaVendedor = leadsDoVendedor.reduce((acc, l) => acc + Number(l.valor), 0);

    document.getElementById('nome-campanha-vendedor').innerText = campanhaAtiva.titulo;
    document.getElementById('valor-premio-vendedor').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(campanhaAtiva.premio_valor);
    document.getElementById('progresso-bonus-vendedor').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(receitaVendedor);
    document.getElementById('meta-bonus-vendedor').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(campanhaAtiva.meta_valor);

    if (receitaVendedor >= campanhaAtiva.meta_valor) {
        document.getElementById('progresso-bonus-vendedor').style.color = 'var(--fechados)';
        document.getElementById('progresso-bonus-vendedor').innerHTML += ' <i class="ph ph-check-circle"></i> (META BATIDA!)';
    }

    banner.classList.remove('hidden');
}

const formBonus = document.getElementById('form-bonus');
if (formBonus) {
    formBonus.onsubmit = async (e) => {
        e.preventDefault();
        const titulo = document.getElementById('inp-bonus-titulo').value;
        const meta = document.getElementById('inp-bonus-meta').value;
        const premio = document.getElementById('inp-bonus-premio').value;
        
        const { error } = await supabase.from('campanhas_bonus').insert([{ 
            titulo: titulo, 
            meta_valor: meta, 
            premio_valor: premio, 
            status: 'Ativa' 
        }]);
        
        if (error) {
            mostrarToast('Erro ao criar bônus.', 'erro'); 
        } else { 
            document.getElementById('modal-bonus').classList.remove('ativa'); 
            formBonus.reset(); 
            mostrarToast('Campanha lançada!', 'ok'); 
            carregarBonus(); 
        }
    };
}

window.encerrarBonus = (id) => {
    window.abrirConfirmacao('Encerrar Campanha', 'Deseja parar esta campanha de bônus?', 'Encerrar', async () => {
        await supabase.from('campanhas_bonus').update({ status: 'Encerrada' }).eq('id', id);
        mostrarToast('Campanha encerrada.', 'ok');
        carregarBonus();
    });
};

// ==========================================
// LEADS PRINCIPAIS (O CORE DO SISTEMA)
// ==========================================
async function carregarLeads() {
    let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
    
    if (perfilAtual.role === 'vendedor') {
        query = query.eq('user_id', usuarioAtual.id);
    }
    
    const { data, error } = await query;
    
    if (error) {
        console.error("Erro leads:", error);
    }
    
    leadsData = data || [];
    
    if (perfilAtual.role === 'gestor_geral' || perfilAtual.role === 'gestor_sub') {
        const pagQuery = await supabase.from('pagamentos_comissao').select('*').order('created_at', { ascending: false });
        pagamentosData = pagQuery.data || [];
        
        carregarDespesas(); 
    }

    if (perfilAtual.role === 'vendedor') { 
        renderizarKanban(); 
        renderizarPosVenda(); 
        renderizarLista(); 
        renderizarAgenda(); 
        renderizarArena();
        verificarBonusAtivo();
        
        if (!document.getElementById('aba-relatorio').classList.contains('hidden')) { 
            atualizarEstatisticas(); 
            calcularComissoesNovoModeloVendedor(); 
        }
    } else { 
        renderizarGestor();
        
        if (perfilAtual.role === 'gestor_geral') {
            if (!document.getElementById('aba-equipe').classList.contains('hidden')) renderizarAbaEquipe();
            if (!document.getElementById('aba-auditoria').classList.contains('hidden')) renderizarAbaAuditoria();
        }
        
        if (!document.getElementById('aba-exportacao').classList.contains('hidden')) renderizarTabelaExportacao();
        if (!document.getElementById('aba-comissoes').classList.contains('hidden')) renderizarComissoesNovoModeloFinanceiro();
        
        renderizarAprovacoes();

        if (!document.getElementById('aba-auditoria-descontos').classList.contains('hidden')) renderizarAuditoriaDescontos();
        if (!document.getElementById('aba-cobrancas').classList.contains('hidden')) renderizarCobrancas();
        if (!document.getElementById('aba-mrr').classList.contains('hidden')) renderizarMRR();
        if (!document.getElementById('aba-contratos').classList.contains('hidden')) renderizarContratos();
    }
    
    window.atualizarMeta();
    
    if (inputBusca && inputBusca.value) {
        inputBusca.dispatchEvent(new Event('input'));
    }
}

window.atualizarMeta = function() {
    let fechadosReais = leadsData.filter(l => l.status === 'fechados' && l.aprovado === true && !l.estornado);
    
    if (perfilAtual.role === 'vendedor') {
        fechadosReais = fechadosReais.filter(l => l.user_id === usuarioAtual.id);
    }
    
    const receita = fechadosReais.reduce((acc, l) => acc + Number(l.valor), 0);
    
    let objetivo = 10000;
    const perfilGestor = perfisEquipe.find(p => p.role === 'gestor_geral' || p.role === 'gestor');
    
    if (perfilGestor && perfilGestor.meta_mensal) {
        objetivo = perfilGestor.meta_mensal;
    }
    
    let porcentagem = Math.min((receita / objetivo) * 100, 100);
    
    const elMetaAtualK = document.getElementById('meta-atual'); 
    const elMetaObjK = document.getElementById('meta-objetivo'); 
    const barraK = document.getElementById('meta-barra');
    
    if (elMetaAtualK) elMetaAtualK.innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(receita);
    if (elMetaObjK) elMetaObjK.innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(objetivo);
    if (barraK) { 
        barraK.style.width = `${porcentagem}%`; 
        if (porcentagem === 100 && receita > 0) barraK.classList.add('bateu-meta'); 
        else barraK.classList.remove('bateu-meta'); 
    }

    const elMetaAtualG = document.getElementById('meta-atual-gestor'); 
    const elMetaObjG = document.getElementById('meta-objetivo-gestor'); 
    const barraG = document.getElementById('meta-barra-gestor');
    
    if (elMetaAtualG) elMetaAtualG.innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(receita);
    if (elMetaObjG) elMetaObjG.innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(objetivo);
    if (barraG) { 
        barraG.style.width = `${porcentagem}%`; 
        if (porcentagem === 100 && receita > 0) barraG.classList.add('bateu-meta'); 
        else barraG.classList.remove('bateu-meta'); 
    }
}

window.alterarMeta = () => {
    let valorAExibir = 10000;
    const perfilGestor = perfisEquipe.find(p => p.role === 'gestor_geral' || p.role === 'gestor');
    if (perfilGestor && perfilGestor.meta_mensal) valorAExibir = perfilGestor.meta_mensal;
    document.getElementById('inp-nova-meta').value = valorAExibir; 
    document.getElementById('modal-meta').classList.add('ativa');
};

const formMeta = document.getElementById('form-meta');
if (formMeta) {
    formMeta.onsubmit = async (e) => {
        e.preventDefault();
        const nm = Number(document.getElementById('inp-nova-meta').value);
        if (isNaN(nm) || nm <= 0) return mostrarToast('Valor inválido.', 'erro');
        
        const btnSalvar = document.getElementById('form-meta').querySelector('button'); 
        const txtOriginal = btnSalvar.innerHTML; 
        btnSalvar.innerHTML = 'Salvando...';
        
        const { error } = await supabase.from('profiles').update({ meta_mensal: nm }).eq('id', usuarioAtual.id);
        btnSalvar.innerHTML = txtOriginal;
        
        if (error) mostrarToast('Erro ao salvar meta no banco de dados.', 'erro');
        else { 
            perfilAtual.meta_mensal = nm; 
            const { data } = await supabase.from('profiles').select('*'); 
            perfisEquipe = data || []; 
            window.atualizarMeta(); 
            document.getElementById('modal-meta').classList.remove('ativa'); 
            mostrarToast('Meta Global atualizada com sucesso!', 'ok'); 
        }
    };
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

// ==========================================
// GERAÇÃO DOS CARDS NO KANBAN E LISTA
// ==========================================
function gerarCardHTML(l, status, isPosVenda = false) {
    let numWpp = l.whatsapp.replace(/\D/g, ''); 
    if (!numWpp.startsWith('55') && numWpp.length <= 11) numWpp = '55' + numWpp;
    
    let termometroClasse = ''; 
    let termometroBadge = ''; 
    let valorExibicao = `<span style="color: ${status==='fechados'?'var(--fechados)':'var(--accent)'}; font-weight:bold; font-size: 14px;">R$ ${Number(l.valor).toFixed(2)}</span>`;
    
    if (status === 'abandonados') {
        termometroClasse = 'card-pendente'; 
        termometroBadge = `<span class="badge" style="background:rgba(136,144,170,0.15); color:var(--muted);"><i class="ph ph-ghost"></i> Ghosting</span>`; 
        valorExibicao = `<span style="color: var(--muted); font-weight:bold; font-size: 12px; text-decoration: line-through;">R$ ${Number(l.valor).toFixed(2)}</span>`;
    } else if (l.estornado || status === 'perdidos') {
        termometroClasse = 'card-pendente'; 
        termometroBadge = `<span class="badge-vermelho"><i class="ph ph-warning-circle"></i> ${l.motivo_perda || 'Perdido'}</span>`; 
        valorExibicao = `<span style="color: var(--danger); font-weight:bold; font-size: 12px; text-decoration: line-through;">R$ ${Number(l.valor).toFixed(2)}</span>`;
    } else if (l.is_inadimplente) {
        termometroClasse = 'card-pendente'; 
        termometroBadge = `<span class="badge-vermelho"><i class="ph ph-warning"></i> Em Atraso</span>`; 
    } else if (status === 'fechados' && l.aprovado !== true && !isPosVenda) {
        termometroClasse = 'card-pendente'; 
        termometroBadge = `<span class="badge-pendente"><i class="ph ph-hourglass-high"></i> Aguard. Gestor</span>`; 
        valorExibicao = `<span style="color: var(--negociacao); font-weight:bold; font-size: 12px; font-style:italic;">💸 R$ ${Number(l.valor).toFixed(2)} (Aprovação)</span>`;
    } else if (status !== 'fechados' && l.created_at && !isPosVenda) {
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
    if (l.comprovante_url) iconesExtras += `<i class="ph ph-receipt" title="Comprovante" style="color:var(--fechados); margin-left:4px;"></i>`;
    if (l.doc_importante_url) iconesExtras += `<i class="ph ph-file-text" title="Docs Importantes" style="color:#4fc3f7; margin-left:4px;"></i>`;
    if (l.is_recorrente) iconesExtras += `<i class="ph ph-arrows-clockwise" title="Assinatura" style="color:#b388ff; margin-left:4px;"></i>`;

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
}

function renderizarKanban() {
    let leadsVisao = leadsData.filter(l => l.user_id === usuarioAtual.id);
    
    ['novos', 'negociacao', 'fechados', 'perdidos', 'abandonados'].forEach(status => {
        const col = document.getElementById(`col-${status}`); 
        if (!col) return;
        
        const list = leadsVisao.filter(l => l.status === status);
        col.parentElement.querySelector('.col-count').innerText = list.length;
        
        if (list.length === 0) {
            let msg = status === 'novos' ? 'Sem contatos.<br>Cadastre um novo!' : status === 'negociacao' ? 'Ninguém negociando.<br>Arraste leads para cá.' : status === 'fechados' ? 'Caixa vazio.<br>Feche uma venda!' : status === 'abandonados' ? 'Nenhum fantasma.<br>Time focado!' : 'Nenhuma perda registrada.<br>Excelente!';
            let icone = status === 'novos' ? 'ph-user-plus' : status === 'negociacao' ? 'ph-handshake' : status === 'fechados' ? 'ph-money' : status === 'abandonados' ? 'ph-ghost' : 'ph-shield-check';
            
            col.innerHTML = `
            <div class="empty-state">
                <i class="ph ${icone}"></i>
                <p>${msg}</p>
            </div>`; 
            
            configurarDrag(col, 'status'); 
            return;
        }
        
        col.innerHTML = list.map(l => gerarCardHTML(l, status)).join(''); 
        configurarDrag(col, 'status');
    });
}

function renderizarPosVenda() {
    let leadsPos = leadsData.filter(l => l.user_id === usuarioAtual.id && l.status === 'fechados' && l.aprovado === true && !l.estornado);
    
    document.getElementById('stat-pv-on').innerText = leadsPos.filter(l => (l.etapa_pos_venda || 'onboarding') === 'onboarding').length; 
    document.getElementById('stat-pv-ac').innerText = leadsPos.filter(l => l.etapa_pos_venda === 'acompanhamento').length; 
    document.getElementById('stat-pv-up').innerText = leadsPos.filter(l => l.etapa_pos_venda === 'upsell').length;

    ['onboarding', 'acompanhamento', 'upsell'].forEach(etapa => {
        const col = document.getElementById(`col-pv-${etapa}`); 
        if (!col) return;
        
        const list = leadsPos.filter(l => (l.etapa_pos_venda || 'onboarding') === etapa);
        document.getElementById(`count-pv-${etapa.substring(0,2)}`).innerText = list.length;
        
        if (list.length === 0) {
            let msg = etapa === 'onboarding' ? 'Nenhum cliente novo.' : etapa === 'acompanhamento' ? 'Nenhum acompanhamento ativo.' : 'Ninguém pronto para Upsell.';
            let icone = etapa === 'onboarding' ? 'ph-hand-waving' : etapa === 'acompanhamento' ? 'ph-chats-circle' : 'ph-rocket-launch';
            
            col.innerHTML = `
            <div class="empty-state">
                <i class="ph ${icone}"></i>
                <p>${msg}</p>
            </div>`; 
            
            configurarDrag(col, 'posvenda'); 
            return;
        }
        
        col.innerHTML = list.map(l => gerarCardHTML(l, 'fechados', true)).join(''); 
        configurarDrag(col, 'posvenda');
    });
}

function renderizarLista() {
    const tbody = document.getElementById('tbody-lista'); 
    if (!tbody) return;
    
    let leadsVisao = leadsData.filter(l => l.user_id === usuarioAtual.id);
    
    if (leadsVisao.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px; color:var(--muted);">Nenhum cliente no funil.</td></tr>`; 
        return; 
    }
    
    tbody.innerHTML = leadsVisao.map(l => {
        let corBadge = l.status === 'novos' ? 'badge-azul' : (l.status === 'negociacao' ? 'badge-amarelo' : (l.status === 'perdidos' ? 'badge-vermelho' : (l.status === 'abandonados' ? 'badge-equipe' : 'badge-verde')));
        return `
        <tr onclick="window.abrirDrawerLead(${l.id})" class="clicavel">
            <td style="font-weight: bold; color: var(--text);">${l.nome}</td>
            <td>${l.produto || 'Geral'}</td>
            <td style="color: ${l.status === 'fechados' ? 'var(--fechados)' : (l.status === 'perdidos' || l.status === 'abandonados' ? 'var(--danger)' : 'var(--accent)')}; font-weight:bold; text-align:right;">R$ ${Number(l.valor).toFixed(2)}</td>
            <td><span class="badge ${corBadge}">${l.status.toUpperCase()}</span></td>
            <td style="color: var(--muted);">${l.whatsapp}</td>
        </tr>`;
    }).join('');
}

// ARRASTAR E SOLTAR (DRAG & DROP)
function configurarDrag(container, tipoDrop) {
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
        const lead = leadsData.find(l => l.id == idCard); 
        
        if (!lead) return;

        if (tipoDrop === 'status') {
            const novoStatus = container.dataset.status; 
            if (lead.status === novoStatus) return;
            
            if (novoStatus === 'perdidos') { 
                document.getElementById('inp-perda-lead-id').value = idCard; 
                document.getElementById('modal-motivo-perda').classList.add('ativa'); 
                return; 
            }
            
            if (novoStatus === 'abandonados') {
                let hA = lead.historico || []; 
                hA.push({ data: new Date().toISOString(), msg: `Movido para ABANDONADOS (Ghosting) por ${perfilAtual.full_name}` });
                await supabase.from('leads').update({ status: 'abandonados', historico: hA }).eq('id', idCard);
                mostrarToast('Cliente arquivado em Abandonados.', 'ok'); 
                carregarLeads(); 
                return;
            }
            
            let historicoAtual = lead.historico || []; 
            historicoAtual.push({ 
                data: new Date().toISOString(), 
                msg: `Movido para ${novoStatus.toUpperCase()} por ${perfilAtual.full_name}` 
            });
            
            let payloadUpdate = { status: novoStatus, motivo_perda: null, historico: historicoAtual }; 
            
            if (novoStatus === 'fechados') {
                payloadUpdate.aprovado = false; 
                await supabase.from('leads').update(payloadUpdate).eq('id', idCard); 
                carregarLeads(); 
                mostrarToast('Anexe o comprovante na gaveta para aprovação do Financeiro!', 'ok'); 
                setTimeout(() => window.abrirDrawerLead(parseInt(idCard)), 500);
            } else { 
                await supabase.from('leads').update(payloadUpdate).eq('id', idCard); 
                carregarLeads(); 
            }
        } else if (tipoDrop === 'posvenda') {
            const novaEtapa = container.dataset.etapa; 
            if (lead.etapa_pos_venda === novaEtapa) return;
            
            let historicoAtual = lead.historico || []; 
            historicoAtual.push({ 
                data: new Date().toISOString(), 
                msg: `Pós-Venda movido para ${novaEtapa.toUpperCase()} por ${perfilAtual.full_name}` 
            });
            
            await supabase.from('leads').update({ 
                etapa_pos_venda: novaEtapa, 
                historico: historicoAtual 
            }).eq('id', idCard); 
            
            carregarLeads();
        }
    };
}

// ==========================================
// CADASTRO E MOTIVO DE PERDA PERSONALIZADO
// ==========================================
const selectMotivo = document.getElementById('inp-perda-motivo'); 
const boxCustomMotivo = document.getElementById('box-motivo-custom'); 
const inputCustomMotivo = document.getElementById('inp-perda-motivo-custom');

if (selectMotivo) { 
    selectMotivo.addEventListener('change', (e) => { 
        if (e.target.value === 'Outro') { 
            boxCustomMotivo.style.display = 'block'; 
            inputCustomMotivo.required = true; 
        } else { 
            boxCustomMotivo.style.display = 'none'; 
            inputCustomMotivo.required = false; 
            inputCustomMotivo.value = ''; 
        } 
    }); 
}

const formMotivoPerda = document.getElementById('form-motivo-perda');
if (formMotivoPerda) {
    formMotivoPerda.onsubmit = async (e) => {
        e.preventDefault(); 
        const id = document.getElementById('inp-perda-lead-id').value;
        
        let motivo = document.getElementById('inp-perda-motivo').value; 
        if (motivo === 'Outro') {
            motivo = document.getElementById('inp-perda-motivo-custom').value;
        }
        
        if (motivo === 'Abandonou / Ghosting') {
            const lead = leadsData.find(l => l.id == id); 
            let historicoAtual = lead.historico || []; 
            historicoAtual.push({ 
                data: new Date().toISOString(), 
                msg: `Marcado como ABANDONADO por ${perfilAtual.full_name}` 
            });
            await supabase.from('leads').update({ 
                status: 'abandonados', 
                motivo_perda: motivo, 
                historico: historicoAtual 
            }).eq('id', id);
        } else {
            const lead = leadsData.find(l => l.id == id); 
            let historicoAtual = lead.historico || []; 
            historicoAtual.push({ 
                data: new Date().toISOString(), 
                msg: `Marcado como PERDIDO: "${motivo}" por ${perfilAtual.full_name}` 
            });
            await supabase.from('leads').update({ 
                status: 'perdidos', 
                motivo_perda: motivo, 
                historico: historicoAtual 
            }).eq('id', id);
        }
        
        document.getElementById('modal-motivo-perda').classList.remove('ativa'); 
        mostrarToast('Venda baixada no sistema.', 'ok'); 
        carregarLeads();
    };
}

const formLead = document.getElementById('form-lead');
if (formLead) {
    formLead.onsubmit = async (e) => {
        e.preventDefault(); 
        
        let statusSelecionado = document.getElementById('inp-status').value;
        let isRecorrente = document.getElementById('inp-is-recorrente').checked;
        
        let logCriacao = [{ 
            data: new Date().toISOString(), 
            msg: `Cadastrado no HAPSIS por ${perfilAtual.full_name}` 
        }];
        
        await supabase.from('leads').insert([{ 
            nome: document.getElementById('inp-nome').value, 
            whatsapp: document.getElementById('inp-whatsapp').value, 
            produto: document.getElementById('inp-produto').value, 
            valor: document.getElementById('inp-valor').value || 0, 
            forma_pagamento: document.getElementById('inp-pagamento').value, 
            is_recorrente: isRecorrente,
            status_assinatura: isRecorrente ? 'ativa' : null,
            status: statusSelecionado, 
            user_id: usuarioAtual.id, 
            aprovado: statusSelecionado === 'fechados' ? false : true, 
            etapa_pos_venda: 'onboarding', 
            historico: logCriacao 
        }]);
        
        document.getElementById('modal-lead').classList.remove('ativa'); 
        document.getElementById('form-lead').reset(); 
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
    btnNovoLead.onclick = () => {
        document.getElementById('modal-lead').classList.add('ativa');
    };
}

const btnFecharModal = document.getElementById('btn-fechar-modal');
if (btnFecharModal) {
    btnFecharModal.onclick = () => {
        document.getElementById('modal-lead').classList.remove('ativa');
    };
}

// ==========================================
// GAVETA DO CLIENTE TURBINADA
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
    else if (lead.status === 'abandonados') elStatus.classList.add('badge-equipe'); 
    else elStatus.classList.add('badge-verde');

    document.getElementById('drawer-wpp').innerText = lead.whatsapp;
    document.getElementById('drawer-produto').innerText = lead.produto || 'Geral';
    document.getElementById('drawer-pagamento').innerText = lead.forma_pagamento || 'Não informada';
    document.getElementById('drawer-valor').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(lead.valor);
    document.getElementById('drawer-notas').value = lead.notas || '';
    document.getElementById('drawer-data-followup').value = lead.data_followup || '';

    // Renderização do Histórico
    const boxHistorico = document.getElementById('drawer-historico');
    if (boxHistorico) {
        if (!lead.historico || lead.historico.length === 0) {
            boxHistorico.innerHTML = '<i>Nenhum registro.</i>';
        } else {
            boxHistorico.innerHTML = [...lead.historico].reverse().map(h => {
                let formattedTime = new Date(h.data).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
                return `<div class="history-item"><span class="history-time">${formattedTime}</span><span style="color:var(--text);">${h.msg}</span></div>`;
            }).join('');
        }
    }

    // Configura inputs de arquivo
    const setFileInput = (idInput, idLabel, idBox, linkId, url, defaultText) => {
        const fileInput = document.getElementById(idInput); if(fileInput) fileInput.value = '';
        document.getElementById(idLabel).innerText = defaultText; document.getElementById(idLabel).style.color = 'var(--muted)';
        const boxVer = document.getElementById(idBox);
        if(url) { boxVer.classList.remove('hidden'); document.getElementById(linkId).href = url; } 
        else { boxVer.classList.add('hidden'); }
    };

    setFileInput('drawer-file-comprovante', 'nome-arquivo-comprovante', 'box-ver-comprovante', 'link-ver-comprovante', lead.comprovante_url, 'Nenhum arquivo');
    setFileInput('drawer-file-contrato', 'nome-arquivo-contrato', 'box-ver-contrato', 'link-ver-contrato', lead.contrato_url, 'Sem contrato');
    setFileInput('drawer-file-doc', 'nome-arquivo-doc', 'box-ver-doc', 'link-ver-doc', lead.doc_importante_url, 'Nenhum doc');

    // Permissões de Botões Especiais
    const btnEstorno = document.getElementById('btn-estorno-venda');
    if (btnEstorno) {
        if ((perfilAtual.role === 'gestor_geral' || perfilAtual.role === 'gestor_sub') && lead.status === 'fechados' && lead.aprovado === true && !lead.estornado) {
            btnEstorno.classList.remove('hidden');
            btnEstorno.onclick = () => window.estornarVenda(lead.id);
        } else {
            btnEstorno.classList.add('hidden');
        }
    }

    const btnInadimplente = document.getElementById('btn-marcar-inadimplente');
    if (btnInadimplente) {
        if (lead.status === 'fechados' && lead.aprovado === true && !lead.estornado && !lead.is_inadimplente) {
            btnInadimplente.classList.remove('hidden');
            btnInadimplente.onclick = () => window.marcarInadimplente(lead.id);
        } else {
            btnInadimplente.classList.add('hidden');
        }
    }

    const btnChurn = document.getElementById('btn-cancelar-assinatura');
    if (btnChurn) {
        if (lead.is_recorrente && lead.status_assinatura === 'ativa' && lead.status === 'fechados') {
            btnChurn.classList.remove('hidden');
            btnChurn.onclick = () => window.cancelarAssinatura(lead.id);
        } else {
            btnChurn.classList.add('hidden');
        }
    }

    document.getElementById('drawer-lead').classList.add('ativa');
};

const handleFileChange = (idInput, idLabel, colorVar) => { 
    const el = document.getElementById(idInput); 
    if (el) el.addEventListener('change', (e) => { 
        const label = document.getElementById(idLabel); 
        if(e.target.files.length > 0) { 
            label.innerText = e.target.files[0].name; 
            label.style.color = colorVar; 
        } else { 
            label.innerText = 'Nenhum arquivo'; 
            label.style.color = 'var(--muted)'; 
        } 
    }); 
};
handleFileChange('drawer-file-comprovante', 'nome-arquivo-comprovante', 'var(--novos)');
handleFileChange('drawer-file-contrato', 'nome-arquivo-contrato', '#b388ff');
handleFileChange('drawer-file-doc', 'nome-arquivo-doc', '#4fc3f7');

window.salvarDrawerLead = async () => {
    const id = document.getElementById('drawer-lead-id').value;
    const notasStr = document.getElementById('drawer-notas').value;
    const dataFup = document.getElementById('drawer-data-followup').value;

    mostrarToast("Salvando informações...", "ok");

    const payload = {};
    if (notasStr !== '') payload.notas = notasStr; else payload.notas = null;
    if (dataFup !== '') payload.data_followup = dataFup; else payload.data_followup = null;

    const leadAtual = leadsData.find(l => l.id == id);
    let historicoAtual = leadAtual.historico || [];
    historicoAtual.push({ data: new Date().toISOString(), msg: `Gaveta atualizada por ${perfilAtual.full_name}` });
    payload.historico = historicoAtual;

    const uploadFile = async (inputId, prefix, payloadKey) => {
        const fileInput = document.getElementById(inputId);
        if (fileInput && fileInput.files.length > 0) {
            const file = fileInput.files[0]; 
            const fileName = `lead_${id}_${prefix}_${Date.now()}.${file.name.split('.').pop()}`;
            const { data: uploadData, error: uploadError } = await supabase.storage.from('comprovantes').upload(fileName, file);
            if (!uploadError) payload[payloadKey] = supabase.storage.from('comprovantes').getPublicUrl(fileName).data.publicUrl;
        }
    };

    await uploadFile('drawer-file-comprovante', 'comp', 'comprovante_url');
    await uploadFile('drawer-file-contrato', 'contrato', 'contrato_url');
    await uploadFile('drawer-file-doc', 'doc', 'doc_importante_url');

    const { error } = await supabase.from('leads').update(payload).eq('id', id);
    
    if (error) {
        mostrarToast("Erro ao salvar", "erro"); 
    } else { 
        mostrarToast("Atualizado com sucesso!", "ok"); 
        document.getElementById('drawer-lead').classList.remove('ativa'); 
        carregarLeads(); 
    }
};

window.gerarPropostaPDF = () => {
    const id = document.getElementById('drawer-lead-id').value;
    const lead = leadsData.find(l => l.id == id);
    if (!lead) return mostrarToast('Lead não encontrado.', 'erro');

    const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.valor);
    const empresaNome = perfilAtual.nome_empresa || 'HAPSIS Premium';

    const janelaImpressao = window.open('', '_blank');
    let html = `
    <html>
    <head><title>Proposta - ${lead.nome}</title>
    <style>body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; line-height: 1.6; } .header { text-align: center; border-bottom: 2px solid #f5c518; padding-bottom: 20px; margin-bottom: 30px; } .header h1 { margin: 0; color: #10121a; font-size: 28px; text-transform: uppercase; } .header p { color: #555; margin-top: 5px; font-weight: bold; font-size: 14px; } .content { margin-bottom: 40px; } .content p { font-size: 16px; margin-bottom: 12px; } .price-box { background: #f8f9fa; padding: 25px; border-left: 6px solid #81c784; font-size: 18px; margin-top: 30px; border-radius: 4px; } .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #ddd; padding-top: 20px; }</style>
    </head>
    <body>
        <div class="header"><h1>Proposta Comercial</h1><p>${empresaNome}</p></div>
        <div class="content"><p><strong>Aos cuidados de:</strong> ${lead.nome}</p><p><strong>Contato:</strong> ${lead.whatsapp}</p><p><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</p><br><p>Olá, ${lead.nome.split(' ')[0]}. Conforme conversamos, segue abaixo a proposta oficial para a contratação dos nossos serviços/produtos.</p><p><strong>Produto/Serviço Oferecido:</strong> ${lead.produto || 'Consultoria Geral'}</p>
        <div class="price-box"><p style="margin:0; font-size: 20px;"><strong>Investimento Total:</strong> <span style="font-size: 28px; color: #21a366; font-weight: bold;">${valorFormatado}</span></p><p style="margin-top: 12px; font-size: 15px;"><strong>Forma de Pagamento Acordada:</strong> ${lead.forma_pagamento || 'A combining'}</p></div></div>
        <div class="footer"><p>Proposta gerada por ${perfilAtual.full_name} | ${empresaNome}</p><p>Documento válido por 5 dias úteis a partir da data de emissão.</p></div>
        <script>window.onload = () => { window.print(); window.close(); }</script>
    </body></html>`;
    janelaImpressao.document.write(html);
    janelaImpressao.document.close();
};

// ==========================================
// ARENA E AGENDA
// ==========================================
function renderizarArena() {
    const containerPodio = document.getElementById('arena-podio'); 
    const containerLista = document.getElementById('arena-lista'); 
    if (!containerPodio || !containerLista) return;

    const vendedores = perfisEquipe.filter(p => p.role === 'vendedor');
    if (vendedores.length === 0) { 
        containerPodio.innerHTML = `<div style="text-align: center; color: var(--muted); width:100%;"><i class="ph ph-users-slash" style="font-size:48px; margin-bottom:10px; display:block;"></i>Nenhum vendedor para competir.</div>`; 
        containerLista.innerHTML = ''; 
        return; 
    }

    let ranking = vendedores.map(v => {
        const fechados = leadsData.filter(l => l.user_id === v.id && l.status === 'fechados' && l.aprovado === true && !l.estornado);
        const receita = fechados.reduce((soma, l) => soma + Number(l.valor), 0); 
        return { ...v, receita, qtd: fechados.length };
    }).sort((a, b) => b.receita - a.receita);

    if (ranking[0].receita === 0) { 
        containerPodio.innerHTML = `<div style="text-align: center; color: var(--muted); width:100%;"><i class="ph ph-ghost" style="font-size:48px; margin-bottom:10px; display:block;"></i>O pódio está vazio. Ninguém fechou vendas ainda!</div>`; 
        containerLista.innerHTML = ''; 
        return; 
    }

    let podioHtml = '';
    if (ranking[0]) podioHtml += gerarCardPodio(ranking[0], 1);
    if (ranking[1] && ranking[1].receita > 0) podioHtml = gerarCardPodio(ranking[1], 2) + podioHtml;
    if (ranking[2] && ranking[2].receita > 0) podioHtml += gerarCardPodio(ranking[2], 3);
    containerPodio.innerHTML = podioHtml;

    let resto = ranking.slice(3).concat(ranking.filter(r => r.receita === 0 && ranking.indexOf(r) < 3));
    if (resto.length > 0) {
        containerLista.innerHTML = resto.map((v, i) => {
            const inicial = v.full_name ? v.full_name.charAt(0).toUpperCase() : 'V';
            return `<div class="seller-card"><div class="seller-top"><div class="seller-avatar" style="font-size:18px;">${inicial}</div><div class="seller-info"><h4>${i+4}º - ${v.full_name}</h4><span>Equipe: <strong style="color:var(--accent);">${v.equipe || 'Geral'}</strong></span></div></div><div class="seller-stats"><div><span>Vendas</span><strong style="color:var(--text)">${v.qtd}</strong></div><div style="text-align:right;"><span>Faturamento</span><strong>${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v.receita)}</strong></div></div></div>`;
        }).join('');
    } else { 
        containerLista.innerHTML = '<p style="color:var(--muted); font-size:13px;">Não há outros competidores na lista.</p>'; 
    }
}

function gerarCardPodio(vendedor, posicao) {
    const inicial = vendedor.full_name ? vendedor.full_name.charAt(0).toUpperCase() : 'V';
    let label = posicao === 1 ? '1º LUGAR' : (posicao === 2 ? '2º LUGAR' : '3º LUGAR');
    let coroa = posicao === 1 ? '<i class="ph ph-crown crown-icon"></i>' : '';
    return `<div class="podium-item podio-${posicao}">${coroa}<div class="podium-avatar">${inicial}</div><div class="podium-block"><span style="font-weight:800; font-size:11px; letter-spacing:1px;">${label}</span><h4 style="margin-top:8px;">${vendedor.full_name.split(' ')[0]}</h4><strong>${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(vendedor.receita)}</strong><span style="margin-top:6px; font-weight:bold;">${vendedor.qtd} Vendas</span></div></div>`;
}

function renderizarAgenda() {
    const container = document.getElementById('lista-agenda'); 
    if (!container) return;
    
    let leadsAgendados = leadsData.filter(l => l.data_followup && l.status !== 'fechados' && l.status !== 'perdidos' && l.status !== 'abandonados' && l.user_id === usuarioAtual.id);
    if (leadsAgendados.length === 0) { 
        container.innerHTML = `<div class="empty-state"><i class="ph ph-calendar-blank"></i><p>Sua agenda está livre.<br>Nenhum retorno marcado para negociações ativas.</p></div>`; 
        return; 
    }

    leadsAgendados.sort((a, b) => new Date(a.data_followup) - new Date(b.data_followup));
    let hojeStr = new Date().toISOString().split('T')[0];
    let atrasados = []; let hoje = []; let futuros = [];

    leadsAgendados.forEach(l => { 
        if (l.data_followup < hojeStr) atrasados.push(l); 
        else if (l.data_followup === hojeStr) hoje.push(l); 
        else futuros.push(l); 
    });

    let html = '';
    if (atrasados.length > 0) html += `<div class="agenda-group"><div class="agenda-group-title atrasado"><i class="ph ph-warning-circle"></i> Atrasados (Esfriando)</div><div class="agenda-list">${atrasados.map(l => gerarItemAgendaHTML(l, 'atrasado')).join('')}</div></div>`;
    if (hoje.length > 0) html += `<div class="agenda-group"><div class="agenda-group-title hoje"><i class="ph ph-calendar-star"></i> Para Hoje</div><div class="agenda-list">${hoje.map(l => gerarItemAgendaHTML(l, 'hoje')).join('')}</div></div>`;
    if (futuros.length > 0) html += `<div class="agenda-group"><div class="agenda-group-title"><i class="ph ph-calendar-blank"></i> Próximos Retornos</div><div class="agenda-list">${futuros.map(l => gerarItemAgendaHTML(l, 'futuro')).join('')}</div></div>`;
    container.innerHTML = html;
}

function gerarItemAgendaHTML(l, tipo) {
    let dataShow = l.data_followup.split('-').reverse().join('/'); 
    let numWpp = l.whatsapp.replace(/\D/g, ''); 
    if (!numWpp.startsWith('55') && numWpp.length <= 11) numWpp = '55' + numWpp;
    
    let icone = tipo === 'atrasado' ? 'ph-warning' : (tipo === 'hoje' ? 'ph-star' : 'ph-calendar'); 
    let label = tipo === 'hoje' ? 'Hoje' : dataShow;
    
    return `<div class="agenda-item ${tipo}" onclick="window.abrirDrawerLead(${l.id})"><div class="agenda-item-info"><span class="agenda-nome">${l.nome}</span><span style="color:var(--muted); font-size:12px;">Produto: <strong style="color:var(--text)">${l.produto}</strong> | Etapa: <strong style="color:var(--text)">${l.status.toUpperCase()}</strong></span></div><div style="display:flex; align-items:center; gap:16px;"><button onclick="event.stopPropagation(); window.abrirModalWhatsApp('${numWpp}', '${l.nome}')" style="background: rgba(37,211,102,0.1); border:none; color: #25d366; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; display: flex; align-items: center; gap: 6px; transition:0.2s;"><i class="ph ph-whatsapp-logo" style="font-size:16px;"></i> Chamar</button><span class="agenda-data ${tipo}"><i class="ph ${icone}"></i> ${label}</span></div></div>`;
}

function calcularComissoesNovoModeloVendedor() {
    const txtGanha = document.getElementById('val-comissao-ganha'); 
    const txtAberta = document.getElementById('val-comissao-aberta'); 
    if (!txtGanha || !txtAberta) return;
    
    let leadsDoUsuario = leadsData.filter(l => l.user_id === usuarioAtual.id);
    let ganhoReal = 0; let ganhoProjetado = 0;
    
    leadsDoUsuario.forEach(lead => {
        let prod = produtosData.find(p => p.nome === lead.produto); 
        let taxaProd = prod ? (Number(prod.taxa_comissao) || 5) : 5; 
        let valorCalculado = (Number(lead.valor) * taxaProd) / 100;
        
        if(lead.status === 'fechados' && lead.aprovado === true && !lead.estornado) ganhoReal += valorCalculado; 
        else if (lead.status !== 'fechados' && lead.status !== 'perdidos' && lead.status !== 'abandonados' && !lead.estornado) ganhoProjetado += valorCalculado;
    });
    
    txtGanha.innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(ganhoReal); 
    txtAberta.innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(ganhoProjetado);
}

// ==========================================
// MÓDULOS CFO (CAIXA, DESPESAS, COBRANÇAS E MRR)
// ==========================================
function renderizarComissoesNovoModeloFinanceiro() {
    const tbody = document.getElementById('tbody-comissoes'); 
    if (!tbody) return;
    
    const fechadosReais = leadsData.filter(l => l.status === 'fechados' && l.aprovado === true && !l.estornado);
    let faturamentoBruto = fechadosReais.reduce((acc, l) => acc + Number(l.valor), 0);
    let comissoesPagas = pagamentosData.reduce((acc, p) => acc + Number(p.valor), 0);
    
    let comissoesDevidasGlobais = 0;
    fechadosReais.forEach(lead => { 
        if(!lead.comissao_paga) { 
            let prod = produtosData.find(p => p.nome === lead.produto); 
            let taxaProd = prod ? (Number(prod.taxa_comissao) || 5) : 5; 
            comissoesDevidasGlobais += (Number(lead.valor) * taxaProd) / 100; 
        } 
    });

    let lucroLiquido = faturamentoBruto - (comissoesDevidasGlobais + comissoesPagas);

    if(document.getElementById('caixa-bruto')) document.getElementById('caixa-bruto').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(faturamentoBruto);
    if(document.getElementById('caixa-comissao')) document.getElementById('caixa-comissao').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(comissoesDevidasGlobais + comissoesPagas);
    if(document.getElementById('caixa-liquido')) document.getElementById('caixa-liquido').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(lucroLiquido);

    const contagemPgto = { 'Pix': 0, 'Cartão de Crédito': 0, 'Boleto': 0 };
    fechadosReais.forEach(l => { 
        let forma = l.forma_pagamento || 'Pix'; 
        contagemPgto[forma] = (contagemPgto[forma] || 0) + Number(l.valor); 
    });

    const ctxPagamentos = document.getElementById('chart-pagamentos');
    if (ctxPagamentos) {
        if (chartPagamentosInstance) chartPagamentosInstance.destroy();
        chartPagamentosInstance = new Chart(ctxPagamentos, { type: 'doughnut', data: { labels: Object.keys(contagemPgto), datasets: [{ data: Object.values(contagemPgto), backgroundColor: ['#21a366', '#f5c518', '#8890aa'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right', labels: { color: '#8890aa' } } } } });
    }

    const vendedores = perfisEquipe.filter(p => p.role === 'vendedor');
    if (vendedores.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px; color:var(--muted);">Nenhum vendedor na operação.</td></tr>`; 
    } else {
        let temDevida = false; let linhasHtml = '';
        vendedores.forEach(v => {
            const vendasDoCara = fechadosReais.filter(l => l.user_id === v.id && !l.comissao_paga); 
            if(vendasDoCara.length === 0) return; 
            temDevida = true;
            
            const receita = vendasDoCara.reduce((acc, l) => acc + Number(l.valor), 0);
            let comissaoDevida = 0; 
            vendasDoCara.forEach(lead => { 
                let prod = produtosData.find(p => p.nome === lead.produto); 
                let taxaProd = prod ? (Number(prod.taxa_comissao) || 5) : 5; 
                comissaoDevida += (Number(lead.valor) * taxaProd) / 100; 
            });
            
            linhasHtml += `<tr><td style="font-weight: bold; color: var(--text);">${v.full_name}</td><td><span class="badge badge-equipe">${v.equipe || 'Geral'}</span></td><td style="color:var(--fechados); font-weight:bold; text-align:right;">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(receita)}</td><td style="color:var(--accent); font-weight:bold; text-align:right;">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(comissaoDevida)}</td><td style="text-align:center;"><button class="btn-primary" style="padding: 6px 12px; font-size: 12px; margin: 0 auto; width: auto;" onclick="window.pagarComissao('${v.id}', ${comissaoDevida})"><i class="ph ph-wallet"></i> Quitar</button></td></tr>`;
        });
        if (!temDevida) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px; color:var(--fechados);"><i class="ph ph-check-circle" style="font-size:24px; display:block;"></i>Todas as comissões pagas!</td></tr>`; } 
        else { tbody.innerHTML = linhasHtml; }
    }

    const tbodyHistorico = document.getElementById('tbody-historico-pagamentos');
    if (tbodyHistorico) {
        if(pagamentosData.length === 0) { 
            tbodyHistorico.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color:var(--muted);">Nenhum pagamento registrado no livro-caixa.</td></tr>`; 
        } else {
            tbodyHistorico.innerHTML = pagamentosData.map(p => {
                let nomeVend = perfisEquipe.find(x => x.id === p.user_id)?.full_name || 'Vendedor Removido'; 
                let dataLocal = new Date(p.created_at).toLocaleString('pt-BR');
                return `<tr><td style="font-weight: bold; color: var(--text);">${nomeVend}</td><td style="color: var(--muted); font-size:13px;">${p.responsavel_pagamento}</td><td style="color:var(--fechados); font-weight:bold; text-align:right;">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(p.valor)}</td><td style="color: var(--muted); font-size:12px; text-align:right;">${dataLocal}</td></tr>`;
            }).join('');
        }
    }
}

window.pagarComissao = async (userId, valorDevido) => {
    window.abrirConfirmacao('Quitar Comissão', `Confirmar o pagamento de <strong>${new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(valorDevido)}</strong>? Isso vai zerar as dívidas atuais deste vendedor.`, 'Confirmar Pagamento', async () => {
        mostrarToast('Processando pagamento...', 'ok');
        const leadsParaPagar = leadsData.filter(l => l.user_id === userId && l.status === 'fechados' && l.aprovado === true && !l.comissao_paga && !l.estornado); 
        const ids = leadsParaPagar.map(l => l.id);
        
        if(ids.length > 0) { await supabase.from('leads').update({ comissao_paga: true }).in('id', ids); }
        await supabase.from('pagamentos_comissao').insert([{ user_id: userId, valor: valorDevido, responsavel_pagamento: perfilAtual.full_name }]);
        mostrarToast('Comissão quitada e registrada no Livro-Caixa!', 'ok'); 
        carregarLeads(); 
    });
};

window.estornarVenda = async (leadId) => {
    window.abrirConfirmacao('Estornar Venda (Chargeback)', '<strong style="color:var(--danger);">Atenção:</strong> Isso vai remover o valor do Faturamento, retirar a comissão do vendedor e marcar o cliente como ESTORNADO. Confirma?', 'Estornar', async () => {
        const lead = leadsData.find(l => l.id == leadId); 
        let historicoAtual = lead.historico || []; 
        historicoAtual.push({ data: new Date().toISOString(), msg: `⚠️ ESTORNO/CHARGEBACK registrado por ${perfilAtual.full_name}` });
        
        await supabase.from('leads').update({ 
            status: 'perdidos', 
            motivo_perda: 'Chargeback / Cancelamento', 
            aprovado: false, 
            estornado: true, 
            historico: historicoAtual 
        }).eq('id', leadId);
        
        mostrarToast('Venda estornada! Valores retirados da empresa.', 'ok'); 
        document.getElementById('drawer-lead').classList.remove('ativa'); 
        carregarLeads();
    });
};

function renderizarAprovacoes() {
    const tbody = document.getElementById('tbody-aprovacoes'); 
    const badge = document.getElementById('badge-aprov'); 
    if (!tbody || !badge) return;

    const pendentes = leadsData.filter(l => l.status === 'fechados' && l.aprovado !== true && !l.estornado);
    badge.innerText = pendentes.length; 
    if (pendentes.length > 0) badge.classList.remove('hidden'); else badge.classList.add('hidden');
    
    if (pendentes.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px; color:var(--fechados);"><i class="ph ph-check-circle" style="font-size:32px; display:block; margin-bottom:8px;"></i>Tudo limpo! Nenhuma aprovação pendente.</td></tr>`; 
        return; 
    }
    
    tbody.innerHTML = pendentes.map(l => {
        let vendedor = perfisEquipe.find(p => p.id === l.user_id)?.full_name || 'Desconhecido';
        let btnComprovante = l.comprovante_url ? `<a href="${l.comprovante_url}" target="_blank" class="btn-anexo"><i class="ph ph-receipt"></i> Ver Anexo</a>` : `<span style="font-size:11px; color:var(--danger); border:1px dashed var(--danger); padding:6px 12px; border-radius:6px; display:flex; align-items:center; gap:4px;"><i class="ph ph-warning-circle"></i> Sem Anexo</span>`;
        return `<tr><td style="font-weight: bold; color: var(--text);">${vendedor}</td><td style="color: var(--muted);">${l.nome}</td><td><span class="badge badge-equipe">${l.produto || 'Geral'}</span></td><td style="color:var(--fechados); font-weight:bold; text-align:right;">R$ ${Number(l.valor).toFixed(2)}</td><td style="text-align: right; display:flex; gap:12px; justify-content:flex-end; align-items:center;">${btnComprovante}<button onclick="window.rejeitarVenda(${l.id})" class="btn-rejeitar"><i class="ph ph-x"></i> Rejeitar</button><button onclick="window.aprovarVenda(${l.id})" class="btn-aprovar"><i class="ph ph-check-circle"></i> Aprovar</button></td></tr>`;
    }).join('');
}

window.aprovarVenda = async (id) => {
    const lead = leadsData.find(l => l.id == id); 
    let historicoAtual = lead.historico || []; 
    historicoAtual.push({ data: new Date().toISOString(), msg: `Venda APROVADA no Financeiro por ${perfilAtual.full_name}` });
    await supabase.from('leads').update({ aprovado: true, historico: historicoAtual }).eq('id', id); 
    mostrarToast('Venda Aprovada! Caiu no Pós-Venda 💰', 'ok'); 
    carregarLeads();
};

window.rejeitarVenda = async (id) => {
    const lead = leadsData.find(l => l.id == id); 
    let historicoAtual = lead.historico || []; 
    historicoAtual.push({ data: new Date().toISOString(), msg: `Venda REJEITADA no Financeiro por ${perfilAtual.full_name}` });
    await supabase.from('leads').update({ status: 'negociacao', aprovado: false, historico: historicoAtual }).eq('id', id); 
    mostrarToast('Venda Rejeitada. Voltou pro funil.', 'erro'); 
    carregarLeads();
};

// ==================== CFO: DESPESAS ====================
async function carregarDespesas() { 
    const { data, error } = await supabase.from('despesas').select('*').order('vencimento', { ascending: true }); 
    despesasData = data || []; 
    renderizarDespesas(); 
}

function renderizarDespesas() {
    const tbody = document.getElementById('tbody-despesas'); 
    if (!tbody) return;
    
    if (despesasData.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--muted);">Nenhuma despesa lançada neste mês.</td></tr>`; 
        return; 
    }
    
    tbody.innerHTML = despesasData.map(d => {
        let statusBadge = d.status === 'Pago' ? `<span class="badge badge-verde">PAGO</span>` : `<span class="badge badge-vermelho">PENDENTE</span>`;
        let dataVenc = new Date(d.vencimento).toLocaleDateString('pt-BR');
        
        let btnAcao = d.status === 'Pendente' 
            ? `<div style="display:flex; justify-content:center; gap:8px;"><button class="btn-primary" style="padding: 4px 8px; font-size: 12px; width: auto; margin:0;" onclick="window.quitarDespesa(${d.id})"><i class="ph ph-check"></i> Pagar</button><button class="btn-cancel" style="padding: 4px 8px; font-size: 12px; width: auto; margin:0; border-color:var(--danger); color:var(--danger);" onclick="window.deletarDespesa(${d.id})"><i class="ph ph-trash"></i></button></div>` 
            : `<div style="display:flex; justify-content:center; gap:8px;"><span style="font-size:12px; color:var(--muted); align-self:center;"><i class="ph ph-check-all"></i> Quitado</span><button class="btn-cancel" style="padding: 4px 8px; font-size: 12px; width: auto; margin:0; border-color:var(--danger); color:var(--danger);" onclick="window.deletarDespesa(${d.id})"><i class="ph ph-trash"></i></button></div>`;
            
        return `<tr><td style="font-weight: bold; color: var(--text);">${d.descricao}</td><td><span class="badge" style="background:rgba(255,255,255,0.05); color:var(--muted);">Fixo</span></td><td style="color:var(--muted);">${dataVenc}</td><td style="text-align:right; font-weight:bold; color:var(--danger);">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(d.valor)}</td><td>${statusBadge}</td><td style="text-align:center;">${btnAcao}</td></tr>`;
    }).join('');
}

window.quitarDespesa = async (id) => { 
    window.abrirConfirmacao('Quitar Despesa', 'Confirmar o pagamento desta conta?', 'Confirmar Pagamento', async () => { 
        mostrarToast('Processando...', 'ok'); 
        const { error } = await supabase.from('despesas').update({ status: 'Pago' }).eq('id', id); 
        if (error) mostrarToast('Erro ao atualizar conta.', 'erro'); 
        else { mostrarToast('Despesa quitada com sucesso!', 'ok'); carregarDespesas(); } 
    }); 
};

window.deletarDespesa = async (id) => { 
    window.abrirConfirmacao('Excluir Despesa', 'Remover este lançamento do sistema?', 'Apagar', async () => { 
        await supabase.from('despesas').delete().eq('id', id); 
        mostrarToast('Lançamento deletado.', 'ok'); 
        carregarDespesas(); 
    }); 
};

const formDespesa = document.getElementById('form-despesa');
if (formDespesa) {
    formDespesa.onsubmit = async (e) => {
        e.preventDefault(); 
        const desc = document.getElementById('inp-desp-desc').value; 
        const val = document.getElementById('inp-desp-valor').value; 
        const dataV = document.getElementById('inp-desp-data').value;
        const { error } = await supabase.from('despesas').insert([{ descricao: desc, valor: val, vencimento: dataV, status: 'Pendente' }]);
        
        if (error) mostrarToast('Erro ao salvar despesa.', 'erro'); 
        else { document.getElementById('modal-despesa').classList.remove('ativa'); formDespesa.reset(); mostrarToast('Despesa registrada.', 'ok'); carregarDespesas(); }
    };
}

// ==================== CFO: COBRANÇAS E ESTORNOS ====================
function renderizarCobrancas() {
    const tbodyAtrasados = document.getElementById('tbody-cobrancas'); 
    const tbodyEstornos = document.getElementById('tbody-estornos'); 
    if (!tbodyAtrasados || !tbodyEstornos) return;
    
    const inadimplentes = leadsData.filter(l => l.is_inadimplente === true && !l.estornado); 
    const estornados = leadsData.filter(l => l.estornado === true);
    
    let valorRisco = inadimplentes.reduce((acc, l) => acc + Number(l.valor), 0); 
    let recuperado = leadsData.filter(l => l.historico && l.historico.some(h => h.msg.includes('Dívida Quitada'))).reduce((acc, l) => acc + Number(l.valor), 0);
    
    if (document.getElementById('cobranca-risco')) document.getElementById('cobranca-risco').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(valorRisco);
    if (document.getElementById('cobranca-qtd')) document.getElementById('cobranca-qtd').innerText = inadimplentes.length;
    if (document.getElementById('cobranca-recuperado')) document.getElementById('cobranca-recuperado').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(recuperado);

    if (inadimplentes.length === 0) { 
        tbodyAtrasados.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--muted);">Nenhum cliente inadimplente.</td></tr>`; 
    } else {
        tbodyAtrasados.innerHTML = inadimplentes.map(l => {
            let numWpp = l.whatsapp.replace(/\D/g, ''); if (!numWpp.startsWith('55') && numWpp.length <= 11) numWpp = '55' + numWpp;
            return `<tr><td style="font-weight: bold; color: var(--text);">${l.nome}</td><td>${l.produto || 'Geral'}</td><td style="color:var(--muted); font-size:12px;">${l.forma_pagamento || 'Pix'} em Atraso</td><td style="text-align:right; font-weight:bold; color:var(--danger);">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(l.valor)}</td><td style="text-align:center; display:flex; gap:8px; justify-content:center;"><button class="btn-cancel" onclick="window.abrirModalWhatsApp('${numWpp}', '${l.nome}')" style="padding:4px 8px; width:auto; font-size:12px; border-color:#25d366; color:#25d366;"><i class="ph ph-whatsapp-logo"></i> Cobrar</button><button class="btn-primary" onclick="window.quitarInadimplencia(${l.id})" style="padding:4px 8px; width:auto; font-size:12px; margin-top:0;"><i class="ph ph-check"></i> Baixa Pagto.</button></td></tr>`;
        }).join('');
    }

    if (estornados.length === 0) { 
        tbodyEstornos.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px; color:var(--muted);">Nenhum estorno registrado na base.</td></tr>`; 
    } else {
        tbodyEstornos.innerHTML = estornados.map(l => {
            return `<tr><td style="font-weight: bold; color: var(--text);">${l.nome}</td><td>${l.produto || 'Geral'}</td><td style="color:var(--danger); font-size:12px;"><i class="ph ph-trend-down"></i> ${l.motivo_perda || 'Chargeback'}</td><td style="text-align:right; font-weight:bold; color:var(--danger); text-decoration:line-through;">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(l.valor)}</td></tr>`;
        }).join('');
    }
}

window.marcarInadimplente = async (leadId) => { 
    window.abrirConfirmacao('Sinalizar Inadimplência', 'Tem certeza que este cliente atrasou o pagamento ou o boleto falhou? Ele será enviado para a Central de Cobranças do Financeiro.', 'Sinalizar Atraso', async () => { 
        const lead = leadsData.find(l => l.id == leadId); 
        let historicoAtual = lead.historico || []; 
        historicoAtual.push({ data: new Date().toISOString(), msg: `⚠️ Marcado como INADIMPLENTE por ${perfilAtual.full_name}` }); 
        
        await supabase.from('leads').update({ is_inadimplente: true, historico: historicoAtual }).eq('id', leadId); 
        mostrarToast('Cliente enviado para cobrança.', 'ok'); 
        document.getElementById('drawer-lead').classList.remove('ativa'); 
        carregarLeads(); 
    }); 
};

window.quitarInadimplencia = async (leadId) => { 
    window.abrirConfirmacao('Baixa de Pagamento', 'O cliente realizou o pagamento do atraso? Isso vai tirá-lo da lista de inadimplentes.', 'Confirmar Pagamento', async () => { 
        const lead = leadsData.find(l => l.id == leadId); 
        let historicoAtual = lead.historico || []; 
        historicoAtual.push({ data: new Date().toISOString(), msg: `✅ Dívida Quitada. Marcado como PAGO por ${perfilAtual.full_name}` }); 
        
        await supabase.from('leads').update({ is_inadimplente: false, historico: historicoAtual }).eq('id', leadId); 
        mostrarToast('Pagamento registrado. Cliente recuperado!', 'ok'); 
        carregarLeads(); 
    }); 
};

// ==================== CFO: MRR ====================
function renderizarMRR() {
    const tbody = document.getElementById('tbody-mrr'); if (!tbody) return;
    const assinantes = leadsData.filter(l => l.is_recorrente === true && l.status === 'fechados' && l.aprovado === true && !l.estornado);
    let mrrAtivo = 0, mrrChurn = 0, qtdAtivos = 0; let linhasHtml = '';

    assinantes.forEach(l => {
        const valor = Number(l.valor); const statusAss = l.status_assinatura || 'ativa';
        if (statusAss === 'ativa') { mrrAtivo += valor; qtdAtivos++; } else { mrrChurn += valor; }
        
        let badgeStatus = statusAss === 'ativa' ? `<span class="badge badge-verde">ATIVA</span>` : `<span class="badge badge-vermelho">CANCELADA</span>`;
        let corValor = statusAss === 'ativa' ? 'color: var(--text);' : 'color: var(--danger); text-decoration: line-through;';
        linhasHtml += `<tr><td style="font-weight: bold; color: var(--text);">${l.nome}</td><td>${l.produto || 'Geral'}</td><td style="text-align:right; font-weight:bold; ${corValor}">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(valor)} /mês</td><td>${badgeStatus}</td></tr>`;
    });

    if (document.getElementById('mrr-atual')) document.getElementById('mrr-atual').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(mrrAtivo);
    if (document.getElementById('mrr-ativos')) document.getElementById('mrr-ativos').innerText = qtdAtivos;
    if (document.getElementById('mrr-churn')) document.getElementById('mrr-churn').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(mrrChurn);
    if (assinantes.length === 0) { tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px; color:var(--muted);">Nenhum cliente com assinatura (MRR) na base.</td></tr>`; } else { tbody.innerHTML = linhasHtml; }
}

window.cancelarAssinatura = async (leadId) => { 
    window.abrirConfirmacao('Registrar Churn', 'Tem certeza que este cliente cancelou a assinatura mensal? O valor sairá do cálculo de MRR.', 'Confirmar Cancelamento', async () => { 
        const lead = leadsData.find(l => l.id == leadId); 
        let historicoAtual = lead.historico || []; 
        historicoAtual.push({ data: new Date().toISOString(), msg: `❌ Assinatura Cancelada (Churn) por ${perfilAtual.full_name}` }); 
        
        await supabase.from('leads').update({ status_assinatura: 'cancelado', historico: historicoAtual }).eq('id', leadId); 
        mostrarToast('Assinatura cancelada.', 'ok'); 
        document.getElementById('drawer-lead').classList.remove('ativa'); 
        carregarLeads(); 
    }); 
};

// ==================== CFO: CONTRATOS (GED) ====================
function renderizarContratos() {
    const tbody = document.getElementById('tbody-contratos'); if (!tbody) return;
    const contratos = leadsData.filter(l => (l.contrato_url && l.contrato_url !== '') || (l.doc_importante_url && l.doc_importante_url !== ''));

    if (contratos.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px; color:var(--muted);">O cofre está vazio. Nenhum contrato ou documento foi anexado na gaveta dos clientes.</td></tr>`; 
        return; 
    }
    
    tbody.innerHTML = contratos.map(l => {
        let dataUpload = l.historico ? [...l.historico].reverse().find(h => h.msg.includes('Gaveta atualizada'))?.data : l.created_at; 
        let dataStr = dataUpload ? new Date(dataUpload).toLocaleDateString('pt-BR') : '-';
        let links = '';
        
        if (l.contrato_url) links += `<a href="${l.contrato_url}" target="_blank" class="btn-anexo" style="border-color:#b388ff; color:#b388ff; margin-right:6px;"><i class="ph ph-folder-lock"></i> Ver Contrato</a>`;
        if (l.doc_importante_url) links += `<a href="${l.doc_importante_url}" target="_blank" class="btn-anexo" style="border-color:#4fc3f7; color:#4fc3f7;"><i class="ph ph-file-text"></i> Ver Docs</a>`;
        
        return `<tr><td style="font-weight: bold; color: var(--text);">${l.nome}</td><td><span class="badge badge-equipe">${l.produto || 'Geral'}</span></td><td style="color:var(--muted); font-size:12px;">${dataStr}</td><td style="text-align: right;">${links}</td></tr>`;
    }).join('');
}

// ==================== CFO: AUDITORIA DE DESCONTOS ====================
function renderizarAuditoriaDescontos() {
    const tbody = document.getElementById('tbody-auditoria-descontos'); if (!tbody) return;
    const vendasAprovadas = leadsData.filter(l => l.status === 'fechados' && l.aprovado === true && !l.estornado); 
    let temDesconto = false; let linhasHtml = '';

    vendasAprovadas.forEach(lead => {
        const produtoCatalogo = produtosData.find(p => p.nome === lead.produto); if (!produtoCatalogo) return;
        const precoOriginal = Number(produtoCatalogo.valor); const precoVendido = Number(lead.valor);
        
        if (precoVendido < precoOriginal) {
            temDesconto = true; 
            const vendedor = perfisEquipe.find(p => p.id === lead.user_id)?.full_name || 'Desconhecido';
            const diferenca = precoOriginal - precoVendido; const porcentagemDesconto = (diferenca / precoOriginal) * 100;
            let corDesconto = porcentagemDesconto > 20 ? 'color: var(--danger); font-weight: 800;' : 'color: var(--negociacao); font-weight: bold;';
            
            linhasHtml += `<tr><td style="font-weight: bold; color: var(--text);">${vendedor}</td><td>${lead.produto}</td><td style="text-align:right; color: var(--muted); text-decoration: line-through;">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(precoOriginal)}</td><td style="text-align:right; color: var(--fechados); font-weight: bold;">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(precoVendido)}</td><td style="text-align:center; ${corDesconto}">${porcentagemDesconto.toFixed(1)}% OFF</td></tr>`;
        }
    });

    if (!temDesconto) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 40px; color:var(--fechados);"><i class="ph ph-shield-check" style="font-size:32px; display:block; margin-bottom:8px;"></i>Nenhum vendedor aplicou descontos na base original. Margem protegida!</td></tr>`; } 
    else { tbody.innerHTML = linhasHtml; }
}

// ==========================================
// EXPORTAÇÃO E LOGS DE AUDITORIA
// ==========================================
function getLeadsExportacao() {
    const filterStatus = document.getElementById('export-filter-status').value; let exportList = leadsData; 
    
    if (filterStatus === 'fechados') exportList = exportList.filter(l => l.status === 'fechados' && l.aprovado === true && !l.estornado);
    else if (filterStatus === 'abertos') exportList = exportList.filter(l => l.status !== 'fechados' || (l.status === 'fechados' && !l.aprovado));
    else if (filterStatus === 'perdidos') exportList = exportList.filter(l => l.status === 'perdidos' || l.estornado); 
    else if (filterStatus === 'abandonados') exportList = exportList.filter(l => l.status === 'abandonados'); 
    
    return exportList;
}

function renderizarTabelaExportacao() {
    const tbody = document.getElementById('tbody-export'); if (!tbody) return;
    const list = getLeadsExportacao();
    
    if (list.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 30px; color:var(--muted);">Nenhum dado encontrado com o filtro atual.</td></tr>`; 
        return; 
    }
    
    tbody.innerHTML = list.map(l => {
        let statusBadge = l.status === 'novos' ? 'badge-azul' : (l.status === 'negociacao' ? 'badge-amarelo' : (l.status === 'perdidos' || l.estornado ? 'badge-vermelho' : (l.status === 'abandonados' ? 'badge-equipe' : 'badge-verde')));
        return `<tr><td style="font-weight: bold; color: var(--text);">${l.nome}</td><td style="color: var(--muted);">${l.whatsapp}</td><td>${l.produto || 'Geral'}</td><td style="color:var(--text); font-weight:bold; text-align:right;">R$ ${Number(l.valor).toFixed(2)}</td><td><span class="badge ${statusBadge}">${l.estornado ? 'ESTORNADO' : l.status.toUpperCase()}</span></td><td style="color: var(--muted); font-size:12px;">${l.created_at ? new Date(l.created_at).toLocaleDateString('pt-BR') : '-'}</td></tr>`;
    }).join('');
}

const filterSelect = document.getElementById('export-filter-status'); if (filterSelect) filterSelect.addEventListener('change', renderizarTabelaExportacao);

async function registrarAuditoriaExportacao(tipo, qtd) { await supabase.from('logs_exportacao').insert([{ usuario: perfilAtual.full_name, tipo: tipo, quantidade: qtd }]); carregarAuditoriaExportacao(); }

async function carregarAuditoriaExportacao() {
    const tbody = document.getElementById('tbody-logs-exportacao'); if (!tbody) return;
    const { data } = await supabase.from('logs_exportacao').select('*').order('created_at', { ascending: false }).limit(10); logsExportacaoData = data || [];
    if(logsExportacaoData.length === 0) { tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color:var(--muted);">Nenhuma exportação realizada ainda.</td></tr>`; return; }
    tbody.innerHTML = logsExportacaoData.map(log => `<tr><td style="font-weight: bold; color: var(--text);">${log.usuario}</td><td>${log.tipo === 'EXCEL' ? '<i class="ph ph-file-csv" style="color:#21a366;"></i>' : '<i class="ph ph-file-pdf" style="color:#dc3545;"></i>'} ${log.tipo}</td><td><strong style="color:var(--novos)">${log.quantidade}</strong> leads</td><td style="color: var(--muted); font-size:12px; text-align:right;">${new Date(log.created_at).toLocaleString('pt-BR')}</td></tr>`).join('');
}

window.exportarCSV = () => {
    const list = getLeadsExportacao(); if (list.length === 0) return mostrarToast('Não há dados para exportar.', 'erro');
    const headers = ["Nome", "WhatsApp", "Produto", "Forma_Pagto", "Valor_R$", "Status", "Data_Criacao", "Anotacoes"];
    const rows = list.map(l => `"${l.nome}";"${l.whatsapp}";"${l.produto || 'Geral'}";"${l.forma_pagamento || 'Pix'}";"${l.valor}";"${l.estornado ? 'ESTORNADO' : l.status}";"${l.created_at ? new Date(l.created_at).toLocaleDateString('pt-BR') : '-'}";"${l.notas ? l.notas.replace(/(\r\n|\n|\r)/gm, " ").replace(/;/g, ",").replace(/"/g, '""') : ""}"`);
    const csvContent = "\uFEFF" + headers.join(";") + "\n" + rows.join("\n"); const link = document.createElement("a"); link.setAttribute("href", URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }))); link.setAttribute("download", `relatorio_hapsis_${new Date().getTime()}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); registrarAuditoriaExportacao('EXCEL', list.length); mostrarToast('Planilha baixada!', 'ok');
};

window.exportarPDF = () => {
    const list = getLeadsExportacao(); if (list.length === 0) return mostrarToast('Não há dados para exportar.', 'erro');
    const janela = window.open('', '_blank');
    let html = `<html><head><title>Relatório</title><style>body{font-family:Arial;padding:40px;color:#333;}h1{border-bottom:2px solid #333;}table{width:100%;border-collapse:collapse;margin-top:20px;}th,td{padding:12px;border-bottom:1px solid #ddd;text-align:left;}th{background:#f8f9fa;}@media print{body{padding:0;}}</style></head><body><h1>Relatório HAPSIS</h1><p>Gerado por: ${perfilAtual.full_name} | Total: ${list.length}</p><table><thead><tr><th>Cliente</th><th>Contato</th><th>Produto</th><th>Valor</th><th>Status</th></tr></thead><tbody>${list.map(l => `<tr><td>${l.nome}</td><td>${l.whatsapp}</td><td>${l.produto||'-'}</td><td>R$ ${Number(l.valor).toFixed(2)}</td><td>${l.estornado ? 'ESTORNADO' : l.status}</td></tr>`).join('')}</tbody></table><script>window.onload=()=>{window.print();window.close();}</script></body></html>`;
    janela.document.write(html); janela.document.close(); registrarAuditoriaExportacao('PDF', list.length);
};

// ==========================================
// PAINEL EXECUTIVO CORPORATIVO (DASHBOARD CEO)
// ==========================================
function renderizarGestor() {
    const fechadosReais = leadsData.filter(l => l.status === 'fechados' && l.aprovado === true && !l.estornado); const faturamento = fechadosReais.reduce((acc, l) => acc + Number(l.valor), 0);
    
    if (document.getElementById('chefao-faturamento')) document.getElementById('chefao-faturamento').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(faturamento);
    if (document.getElementById('chefao-ticket')) document.getElementById('chefao-ticket').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(fechadosReais.length ? faturamento / fechadosReais.length : 0);
    if (document.getElementById('chefao-forecast')) { let somaNovos = leadsData.filter(l => l.status === 'novos').reduce((acc, l) => acc + Number(l.valor), 0); let somaNegociacao = leadsData.filter(l => l.status === 'negociacao').reduce((acc, l) => acc + Number(l.valor), 0); document.getElementById('chefao-forecast').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format((somaNovos * 0.10) + (somaNegociacao * 0.50)); }

    const ctxFugasLinha = document.getElementById('chart-fugas-linha'); const ctxFugasMotivos = document.getElementById('chart-fugas-motivos');
    if (ctxFugasLinha && ctxFugasMotivos) {
        const perdidos = leadsData.filter(l => l.status === 'perdidos' || l.estornado || l.status === 'abandonados'); 
        const contagemMotivos = {}; 
        perdidos.forEach(l => { const m = l.motivo_perda || 'Ghosting / Sem Registro'; contagemMotivos[m] = (contagemMotivos[m] || 0) + 1; });
        
        if (chartFugasMotivosInstance) chartFugasMotivosInstance.destroy(); 
        chartFugasMotivosInstance = new Chart(ctxFugasMotivos, { type: 'doughnut', data: { labels: Object.keys(contagemMotivos).length > 0 ? Object.keys(contagemMotivos) : ['Sem perdas'], datasets: [{ data: Object.values(contagemMotivos).length > 0 ? Object.values(contagemMotivos) : [1], backgroundColor: ['#ff5c5c', '#ff8a65', '#e57373', '#f06292', '#ba68c8', '#8890aa'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right', labels: { color: '#8890aa', font: {size: 10} } } } } });

        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']; let valores7Dias = [0,0,0,0,0,0,0]; let labels7Dias = []; let hoje = new Date(); for(let i=6; i>=0; i--) { let d = new Date(); d.setDate(hoje.getDate() - i); labels7Dias.push(diasSemana[d.getDay()]); }
        perdidos.forEach(l => { let dataPerda = new Date(l.created_at); if (l.historico && l.historico.length > 0) { const logPerda = l.historico.find(h => h.msg.includes('PERDIDO') || h.msg.includes('ESTORNO') || h.msg.includes('ABANDONADO')); if (logPerda) dataPerda = new Date(logPerda.data); } let diffDias = Math.floor((hoje.getTime() - dataPerda.getTime()) / (1000 * 3600 * 24)); if(diffDias >= 0 && diffDias <= 6) { valores7Dias[6 - diffDias] += Number(l.valor); } });
        
        if (chartFugasLinhaInstance) chartFugasLinhaInstance.destroy(); 
        chartFugasLinhaInstance = new Chart(ctxFugasLinha, { type: 'line', data: { labels: labels7Dias, datasets: [{ label: 'Valor Perdido (R$)', data: valores7Dias, borderColor: '#ff5c5c', backgroundColor: 'rgba(255,92,92,0.1)', borderWidth: 2, pointBackgroundColor: '#ff5c5c', fill: true, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#2c3047' }, ticks: { color: '#8890aa' } }, x: { grid: { display: false }, ticks: { color: '#8890aa' } } } } });
    }

    const ranking = {}; fechadosReais.forEach(l => { ranking[l.user_id] = (ranking[l.user_id] || 0) + Number(l.valor); }); const arrayRank = Object.keys(ranking).map(id => { let p = perfisEquipe.find(x => x.id === id); return { nome: p?.full_name || 'Desconhecido', eqp: p?.equipe || 'Geral', total: ranking[id] }; }).sort((a, b) => b.total - a.total);
    if (document.getElementById('tabela-ranking')) document.getElementById('tabela-ranking').innerHTML = arrayRank.map((v, i) => `<tr><td>${i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : ''))} ${v.nome}</td><td><span class="badge badge-equipe">${v.eqp}</span></td><td style="color:var(--fechados); font-weight:bold; text-align:right;">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v.total)}</td></tr>`).join('');

    const prods = {}; fechadosReais.forEach(l => { let p = l.produto || 'Geral'; prods[p] = (prods[p] || 0) + Number(l.valor); }); const arrayProds = Object.keys(prods).map(k => ({ nome: k, total: prods[k] })).sort((a, b) => b.total - a.total);
    if (document.getElementById('tabela-produtos')) { if (arrayProds.length === 0) { document.getElementById('tabela-produtos').innerHTML = `<tr><td colspan="2" style="text-align:center; padding: 20px; color:var(--muted);">Nenhum produto fechado ainda.</td></tr>`; } else { document.getElementById('tabela-produtos').innerHTML = arrayProds.map(p => `<tr><td>${p.nome}</td><td style="font-weight:bold; color:var(--text); text-align:right;">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(p.total)}</td></tr>`).join(''); } }
}

function renderizarAbaAuditoria() {
    const elTabela = document.getElementById('tabela-auditoria'); if (!elTabela) return;
    if (leadsData.length === 0) { elTabela.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 40px; color:var(--muted);"><i class="ph ph-folder-open" style="font-size: 32px; display:block; margin-bottom:10px;"></i>Vazio.</td></tr>`; return; }
    
    elTabela.innerHTML = leadsData.map(l => {
        let statusBadge = l.status === 'novos' ? 'badge-azul' : (l.status === 'negociacao' ? 'badge-amarelo' : (l.status === 'perdidos' || l.estornado ? 'badge-vermelho' : (l.status === 'abandonados' ? 'badge-equipe' : 'badge-verde')));
        return `<tr><td style="font-weight: 500;">${l.nome}</td><td style="color:var(--muted); font-size:13px;">${l.whatsapp}</td><td>${l.produto || 'Geral'}</td><td style="font-weight:bold; text-align:right;">R$ ${Number(l.valor).toFixed(2)}</td><td><span class="badge ${statusBadge}">${l.estornado ? 'ESTORNADO' : l.status.toUpperCase()}</span></td><td style="color:var(--muted);">${perfisEquipe.find(p => p.id === l.user_id)?.full_name || 'Deletado'}</td></tr>`;
    }).join('');
}

// ==========================================
// GESTÃO DE EQUIPES E WHITE-LABEL
// ==========================================
window.toggleFolder = (nomeEquipeId) => { const content = document.getElementById(`folder-content-${nomeEquipeId}`); const card = document.getElementById(`folder-card-${nomeEquipeId}`); if (content && card) { content.classList.toggle('open'); card.classList.toggle('open'); } };

function renderizarAbaEquipe() {
    const container = document.getElementById('container-equipes'); if (!container) return;
    const fechados = leadsData.filter(l => l.status === 'fechados' && l.aprovado === true && !l.estornado); const equipesAgrupadas = {};
    perfisEquipe.forEach(p => { const ne = p.equipe || 'Geral'; if (!equipesAgrupadas[ne]) { equipesAgrupadas[ne] = []; } equipesAgrupadas[ne].push(p); });

    container.innerHTML = Object.entries(equipesAgrupadas).map(([nomeEquipe, membros]) => {
        let total = 0, ativos = 0; membros.forEach(p => { total += fechados.filter(l => l.user_id === p.id).reduce((s, l) => s + Number(l.valor), 0); ativos += leadsData.filter(l => l.user_id === p.id && l.status !== 'fechados' && l.status !== 'perdidos' && l.status !== 'abandonados' && !l.estornado).length; });
        const sId = nomeEquipe.replace(/[^a-zA-Z0-9]/g, '-');
        
        return `<div class="folder-card" id="folder-card-${sId}"><div class="folder-header" onclick="window.toggleFolder('${sId}')"><div class="folder-title"><i class="ph ph-caret-right"></i> 📁 ${nomeEquipe.toUpperCase()} <span style="font-size:11px; font-weight:normal; color:var(--muted); margin-left:8px;">${membros.length} Membros | ${ativos} Leads</span></div><div style="display:flex; align-items:center; gap:16px;"><div class="folder-total">Receita: ${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(total)}</div>${(nomeEquipe !== 'Geral' && perfilAtual.role === 'gestor_geral') ? `<button onclick="event.stopPropagation(); window.excluirEquipe('${nomeEquipe}')" style="background:transparent; border:none; color:var(--danger); font-size:20px; cursor:pointer;"><i class="ph ph-trash"></i></button>` : ''}</div></div><div class="folder-content" id="folder-content-${sId}"><table><thead><tr><th>Colaborador</th><th>Perfil</th><th>Vendido</th><th style="text-align: right;">Gerenciar</th></tr></thead><tbody>${membros.map(perfil => { let vend = fechados.filter(l => l.user_id === perfil.id).reduce((s, l) => s + Number(l.valor), 0); let cg = perfil.role === 'gestor_geral' || perfil.role === 'gestor' ? 'color:var(--accent); font-weight:bold;' : (perfil.role === 'gestor_sub' || perfil.role === 'gerente' ? 'color:#b388ff; font-weight:bold;' : 'color:var(--muted);'); let roleStr = perfil.role === 'gestor_geral' || perfil.role === 'gestor' ? 'Gestor Geral' : (perfil.role === 'gestor_sub' || perfil.role === 'gerente' ? 'Gestor Sub' : 'Vendedor'); return `<tr><td style="font-weight: 500;">${perfil.full_name}</td><td style="${cg}">${roleStr.toUpperCase()}</td><td style="color:var(--fechados); font-weight:bold;">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(vend)}</td><td style="text-align: right; display:flex; justify-content:flex-end; gap:8px;">${(perfilAtual.role === 'gestor_geral') ? `<button onclick="window.abrirModalEquipe('${perfil.id}', '${perfil.full_name}', '${nomeEquipe}', 0)" style="background: transparent; border: 1px solid var(--border); color: var(--text); padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px;"><i class="ph ph-arrows-left-right"></i> Mover</button>${perfil.id !== usuarioAtual.id ? `<button onclick="window.excluirVendedor('${perfil.id}', '${perfil.full_name}')" style="background: rgba(255,92,92,0.1); border: 1px solid var(--danger); color: var(--danger); padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px;"><i class="ph ph-trash"></i></button>` : ''}` : `<span style="font-size:11px; color:var(--muted); font-style:italic;">Acesso Restrito</span>`}</td></tr>`; }).join('')}</tbody></table></div></div>`;
    }).join('');
}

window.abrirModalNovaEquipe = () => { document.getElementById('inp-add-squad-user').innerHTML = perfisEquipe.map(p => `<option value="${p.id}">${p.full_name} (${p.equipe || 'Geral'})</option>`).join(''); document.getElementById('inp-add-squad-nome').value = ''; document.getElementById('modal-nova-equipe').classList.add('ativa'); };
if (document.getElementById('form-nova-equipe')) { document.getElementById('form-nova-equipe').onsubmit = async (e) => { e.preventDefault(); const { error } = await supabase.from('profiles').update({ equipe: document.getElementById('inp-add-squad-nome').value.trim() }).eq('id', document.getElementById('inp-add-squad-user').value); if (error) mostrarToast('Erro', 'erro'); else { mostrarToast('Squad criado!', 'ok'); document.getElementById('modal-nova-equipe').classList.remove('ativa'); const { data } = await supabase.from('profiles').select('*'); perfisEquipe = data || []; renderizarAbaEquipe(); } }; }
window.excluirEquipe = (n) => { window.abrirConfirmacao('Desmanchar', `Deseja desmanchar a equipe <strong>${n}</strong>?`, 'Desmanchar', async () => { await supabase.from('profiles').update({ equipe: 'Geral' }).eq('equipe', n); mostrarToast('Desmanchada!', 'ok'); const { data } = await supabase.from('profiles').select('*'); perfisEquipe = data || []; renderizarAbaEquipe(); renderizarGestor(); }); };
window.excluirVendedor = (id, nome) => { window.abrirConfirmacao('Remover', `Remover <strong>${nome}</strong>?`, 'Remover', async () => { await supabase.from('profiles').delete().eq('id', id); mostrarToast('Removido.', 'ok'); const { data } = await supabase.from('profiles').select('*'); perfisEquipe = data || []; renderizarAbaEquipe(); window.abrirPainelAcessos(); renderizarGestor(); }); };
window.abrirModalEquipe = (id, nome, eq) => { document.getElementById('nome-usuario-mover').innerText = nome; document.getElementById('inp-equipe-userid').value = id; document.getElementById('inp-equipe-select').innerHTML = [...new Set(perfisEquipe.map(p => p.equipe || 'Geral'))].map(e => `<option value="${e}" ${e === eq ? 'selected' : ''}>${e}</option>`).join(''); document.getElementById('inp-equipe-nova').value = ''; document.getElementById('modal-mudar-equipe').classList.add('ativa'); };
if (document.getElementById('btn-fechar-modal-equipe')) document.getElementById('btn-fechar-modal-equipe').onclick = () => document.getElementById('modal-mudar-equipe').classList.remove('ativa');
if (document.getElementById('form-mudar-equipe')) { document.getElementById('form-mudar-equipe').onsubmit = async (e) => { e.preventDefault(); const vNovo = document.getElementById('inp-equipe-nova').value.trim(); const vF = vNovo !== '' ? vNovo : document.getElementById('inp-equipe-select').value; await supabase.from('profiles').update({ equipe: vF }).eq('id', document.getElementById('inp-equipe-userid').value); mostrarToast('Atualizado!', 'ok'); document.getElementById('modal-mudar-equipe').classList.remove('ativa'); const { data } = await supabase.from('profiles').select('*'); perfisEquipe = data || []; renderizarAbaEquipe(); window.abrirPainelAcessos(); renderizarGestor(); }; }

window.abrirPainelAcessos = () => { const tbody = document.getElementById('lista-painel-acessos'); if (!tbody) return; tbody.innerHTML = perfisEquipe.map(p => `<tr><td style="font-weight:bold;">${p.full_name}</td><td><span class="badge badge-equipe">${p.equipe || 'Geral'}</span></td><td><span class="badge" style="${p.role === 'gestor_geral' || p.role === 'gestor' ? 'color:var(--accent);' : (p.role === 'gestor_sub' || p.role === 'gerente' ? 'color:#b388ff;' : 'color:var(--muted);')}">${p.role === 'gestor_geral' || p.role === 'gestor' ? 'GESTOR GERAL' : (p.role === 'gestor_sub' || p.role === 'gerente' ? 'GESTOR SUB' : 'VENDEDOR')}</span></td><td style="text-align: right;">${p.id === usuarioAtual.id ? `<span style="font-size: 12px; color: var(--muted); font-style: italic;">Você</span>` : `<select onchange="window.mudarCargoUsuario('${p.id}', '${p.full_name}', this.value)" style="background:#0d0f18; border:1px solid var(--border); color:var(--text); padding:4px 8px; border-radius:6px; font-size:12px;"><option value="vendedor" ${p.role==='vendedor'?'selected':''}>Vendedor</option><option value="gestor_sub" ${(p.role==='gestor_sub'||p.role==='gerente')?'selected':''}>Gestor Sub</option><option value="gestor_geral" ${(p.role==='gestor_geral'||p.role==='gestor')?'selected':''}>Gestor Geral</option></select>`}</td></tr>`).join(''); document.getElementById('modal-acessos').classList.add('ativa'); };
window.mudarCargoUsuario = async (id, n, c) => { await supabase.from('profiles').update({ role: c }).eq('id', id); mostrarToast(`Nível de ${n} atualizado!`, 'ok'); const { data } = await supabase.from('profiles').select('*'); perfisEquipe = data || []; window.abrirPainelAcessos(); renderizarAbaEquipe(); };

function renderizarConfiguracoes() { const perfilGestor = perfisEquipe.find(p => p.role === 'gestor_geral') || perfilAtual; document.getElementById('inp-config-logo').value = perfilGestor.logo_empresa || ''; document.getElementById('inp-config-cor').value = perfilGestor.cor_primaria || '#f5c518'; document.getElementById('inp-config-cor-texto').value = perfilGestor.cor_primaria || '#f5c518'; }
const inpCor = document.getElementById('inp-config-cor'); const inpCorTexto = document.getElementById('inp-config-cor-texto');
if (inpCor && inpCorTexto) { inpCor.addEventListener('input', (e) => { inpCorTexto.value = e.target.value; document.documentElement.style.setProperty('--accent', e.target.value); }); inpCorTexto.addEventListener('input', (e) => { inpCor.value = e.target.value; document.documentElement.style.setProperty('--accent', e.target.value); }); }
if (document.getElementById('form-config')) { document.getElementById('form-config').onsubmit = async (e) => { e.preventDefault(); const btn = document.getElementById('form-config').querySelector('button'); btn.innerHTML = 'Aplicando...'; const { error } = await supabase.from('profiles').update({ logo_empresa: document.getElementById('inp-config-logo').value, cor_primaria: document.getElementById('inp-config-cor').value }).eq('id', usuarioAtual.id); btn.innerHTML = '<i class="ph ph-check-circle"></i> Aplicar Identidade Visual'; if (error) mostrarToast('Erro ao salvar configurações.', 'erro'); else { mostrarToast('Marca atualizada!', 'ok'); setTimeout(() => window.location.reload(), 1000); } }; }

// ==========================================
// BARRA MÁGICA, NOTIFICAÇÕES E IA
// ==========================================
const cmdPalette = document.getElementById('cmd-palette'); const cmdInput = document.getElementById('cmd-input'); const cmdList = document.getElementById('cmd-list');
const comandosDisponiveis = [
    { id: 'novo-lead', titulo: 'Novo Cliente', sub: 'Adicionar um lead ao funil', icone: 'ph-plus-circle', roles: ['vendedor'], acao: () => document.getElementById('modal-lead').classList.add('ativa') },
    { id: 'ir-pipeline', titulo: 'Ver Pipeline', sub: 'Acessar o Kanban de vendas', icone: 'ph-kanban', roles: ['vendedor'], acao: () => document.querySelector('[data-aba="aba-kanban"]').click() },
    { id: 'ir-posvenda', titulo: 'Esteira Pós-Venda', sub: 'Gerenciar sucesso e retenção', icone: 'ph-handshake', roles: ['vendedor'], acao: () => document.querySelector('[data-aba="aba-pos-venda"]').click() },
    { id: 'ir-arena', titulo: 'Arena de Vendas (Ranking)', sub: 'Ver posição e medalhas', icone: 'ph-trophy', roles: ['vendedor'], acao: () => document.querySelector('[data-aba="aba-arena"]').click() },
    { id: 'ir-agenda', titulo: 'Minha Agenda', sub: 'Ver tarefas e follow-ups', icone: 'ph-calendar-check', roles: ['vendedor'], acao: () => document.querySelector('[data-aba="aba-agenda"]').click() },
    { id: 'ir-visao', titulo: 'Painel Executivo', sub: 'Acessar visão corporativa', icone: 'ph-chart-line-up', roles: ['gestor_sub', 'gestor_geral'], acao: () => document.querySelector('[data-aba="aba-chefao"]').click() },
    { id: 'ir-aprovacoes', titulo: 'Aprovações de Caixa', sub: 'Validar vendas da equipe', icone: 'ph-seal-check', roles: ['gestor_sub', 'gestor_geral'], acao: () => document.querySelector('[data-aba="aba-aprovacoes"]').click() },
    { id: 'ir-comissoes', titulo: 'Caixa & Comissões', sub: 'Livro-caixa e pagamentos', icone: 'ph-money', roles: ['gestor_sub', 'gestor_geral'], acao: () => document.querySelector('[data-aba="aba-comissoes"]').click() },
    { id: 'ir-despesas', titulo: 'Contas a Pagar', sub: 'Lançar despesas financeiras', icone: 'ph-receipt', roles: ['gestor_sub'], acao: () => document.querySelector('[data-aba="aba-despesas"]').click() },
    { id: 'ir-cobrancas', titulo: 'Central de Inadimplência', sub: 'Gerenciar atrasos e estornos', icone: 'ph-warning-octagon', roles: ['gestor_sub'], acao: () => document.querySelector('[data-aba="aba-cobrancas"]').click() },
    { id: 'ir-mrr', titulo: 'Controle de MRR', sub: 'Gerenciar receita recorrente', icone: 'ph-arrows-clockwise', roles: ['gestor_sub'], acao: () => document.querySelector('[data-aba="aba-mrr"]').click() },
    { id: 'ir-contratos', titulo: 'Cofre de Contratos', sub: 'Arquivos de clientes', icone: 'ph-folder-lock', roles: ['gestor_sub'], acao: () => document.querySelector('[data-aba="aba-contratos"]').click() },
    { id: 'ir-auditoria-desconto', titulo: 'Auditoria de Descontos', sub: 'Analisar perdas na margem', icone: 'ph-scissors', roles: ['gestor_sub'], acao: () => document.querySelector('[data-aba="aba-auditoria-descontos"]').click() },
    { id: 'ir-exportacao', titulo: 'Exportar Relatórios', sub: 'Gerar planilhas', icone: 'ph-file-csv', roles: ['gestor_sub', 'gestor_geral'], acao: () => document.querySelector('[data-aba="aba-exportacao"]').click() },
    { id: 'ajustar-meta', titulo: 'Ajustar Meta', sub: 'Definir objetivo de faturamento', icone: 'ph-target', roles: ['gestor_geral'], acao: () => window.alterarMeta() },
    { id: 'novo-aviso', titulo: 'Disparar Aviso', sub: 'Mandar recado para a equipe', icone: 'ph-megaphone', roles: ['gestor_geral', 'gestor_sub'], acao: () => window.criarAviso() },
    { id: 'ir-equipes', titulo: 'Gestão de Equipes', sub: 'Gerenciar squads', icone: 'ph-users', roles: ['gestor_geral'], acao: () => document.querySelector('[data-aba="aba-equipe"]').click() },
    { id: 'sair', titulo: 'Sair do Sistema', sub: 'Fazer logout', icone: 'ph-sign-out', roles: ['gestor_geral', 'gestor_sub', 'vendedor'], acao: () => supabase.auth.signOut() }
];

let comandosFiltrados = []; let indiceSelecionado = 0;
function abrirBarraMagica() { if (!perfilAtual) return; cmdPalette.classList.add('ativa'); cmdInput.value = ''; filtrarComandos(''); cmdInput.focus(); }
function fecharBarraMagica() { cmdPalette.classList.remove('ativa'); if (cmdInput) cmdInput.blur(); }
function executarComando(index) { if (comandosFiltrados[index]) { fecharBarraMagica(); comandosFiltrados[index].acao(); } }
function renderizarComandos() { if (comandosFiltrados.length === 0) { cmdList.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--muted);">Sem comandos encontrados.</div>`; return; } cmdList.innerHTML = comandosFiltrados.map((cmd, i) => `<div class="cmd-item ${i === indiceSelecionado ? 'selecionado' : ''}" onclick="window.executarCmdClick(${i})" onmouseenter="window.setCmdIndex(${i})"><i class="ph ${cmd.icone}"></i><div class="cmd-item-texts"><span class="cmd-item-title">${cmd.titulo}</span><span class="cmd-item-sub">${cmd.sub}</span></div></div>`).join(''); }
function filtrarComandos(t) { const b = t.toLowerCase(); comandosFiltrados = comandosDisponiveis.filter(c => c.roles.includes(perfilAtual.role) && (c.titulo.toLowerCase().includes(b) || c.sub.toLowerCase().includes(b))); indiceSelecionado = 0; renderizarComandos(); }
window.executarCmdClick = (i) => executarComando(i); window.setCmdIndex = (i) => { indiceSelecionado = i; const itens = cmdList.querySelectorAll('.cmd-item'); itens.forEach((item, j) => { if (j === i) item.classList.add('selecionado'); else item.classList.remove('selecionado'); }); };

if (document.getElementById('btn-abrir-comandos')) document.getElementById('btn-abrir-comandos').onclick = () => abrirBarraMagica();
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') { e.preventDefault(); e.stopPropagation(); if (cmdPalette.classList.contains('ativa')) fecharBarraMagica(); else abrirBarraMagica(); return; }
    if (cmdPalette.classList.contains('ativa')) {
        if (e.key === 'Escape') fecharBarraMagica();
        if (e.key === 'ArrowDown') { e.preventDefault(); indiceSelecionado = (indiceSelecionado + 1) % comandosFiltrados.length; window.setCmdIndex(indiceSelecionado); const itens = cmdList.querySelectorAll('.cmd-item'); if (itens[indiceSelecionado]) itens[indiceSelecionado].scrollIntoView({block: "nearest"}); }
        if (e.key === 'ArrowUp') { e.preventDefault(); indiceSelecionado = (indiceSelecionado - 1 + comandosFiltrados.length) % comandosFiltrados.length; window.setCmdIndex(indiceSelecionado); const itens = cmdList.querySelectorAll('.cmd-item'); if (itens[indiceSelecionado]) itens[indiceSelecionado].scrollIntoView({block: "nearest"}); }
        if (e.key === 'Enter') { e.preventDefault(); executarComando(indiceSelecionado); }
    }
});
if (cmdInput) cmdInput.addEventListener('input', (e) => filtrarComandos(e.target.value));
if (cmdPalette) cmdPalette.addEventListener('mousedown', (e) => { if (e.target === cmdPalette) fecharBarraMagica(); });

function configurarNotificacoes() {
    supabase.removeAllChannels();
    supabase.channel('notificacoes-vendas').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, (payload) => {
        if (payload.new.status === 'fechados' && payload.old.status !== 'fechados') {
            const val = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(payload.new.valor); mostrarToast(`🎉 Venda de ${val} fechada!`, 'ok');
            if (perfilAtual && (perfilAtual.role === 'gestor_geral' || perfilAtual.role === 'gestor_sub')) {
                const lista = document.getElementById('notif-list');
                if (lista) { if (lista.querySelector('.notif-empty')) lista.innerHTML = ''; const div = document.createElement('div'); div.className = 'notif-item'; div.innerHTML = `💰 <strong>${val}</strong><br><span style="color:var(--muted)">Produto:</span> ${payload.new.produto||'Geral'}<br><span style="color:var(--muted)">Por:</span> ${perfisEquipe.find(p=>p.id===payload.new.user_id)?.full_name||'Sua equipe'}`; lista.insertBefore(div, lista.firstChild); }
                if (document.getElementById('notif-panel') && document.getElementById('notif-panel').classList.contains('hidden')) { notifsNaoLidas++; document.getElementById('notif-count').innerText = notifsNaoLidas; document.getElementById('notif-count').classList.add('tem-notif'); }
            }
            carregarLeads(); 
        }
    }).subscribe();
    supabase.channel('mudanca-cargo').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        if (payload.new.id === usuarioAtual.id && payload.new.role !== perfilAtual.role) { mostrarToast('Seu acesso mudou.', 'ok'); setTimeout(()=> window.location.reload(), 2000); }
        if (payload.new.id === usuarioAtual.id && payload.new.logo_empresa !== perfilAtual.logo_empresa) { setTimeout(()=> window.location.reload(), 1000); }
    }).subscribe();
}

async function gerarRelatorioIA() {
    const apiKey = 'COLE_SUA_CHAVE_OPENAI_AQUI'; 
    const url = 'https://api.openai.com/v1/chat/completions';
    const textoTela = document.querySelector('.ia-report-text'); if (!textoTela) return;
    textoTela.innerHTML = '<span style="color: var(--novos);"><i class="ph ph-spinner ph-spin"></i> O Cérebro da IA está analisando seus dados de caixa...</span>';

    const fechados = leadsData.filter(l => l.status === 'fechados' && !l.estornado);
    const perdidos = leadsData.filter(l => l.status === 'perdidos' || l.estornado || l.status === 'abandonados');
    const receita = fechados.reduce((acc, l) => acc + Number(l.valor), 0);
    const risco = leadsData.filter(l => l.is_inadimplente).reduce((acc, l) => acc + Number(l.valor), 0);

    const prompt = `Aja como um Diretor de Vendas e CFO experiente, focado em alta performance (Growth). Aqui estão os dados atuais da minha empresa neste mês: - Vendas Fechadas: ${fechados.length} - Faturamento Aprovado: R$ ${receita.toFixed(2)} - Vendas Perdidas/Abandonadas: ${perdidos.length} - Dinheiro em Risco (Inadimplência): R$ ${risco.toFixed(2)}. Faça uma análise rápida, agressiva e direta (máximo de 3 parágrafos) sobre a saúde do meu negócio. Dê um conselho tático do que eu devo cobrar da minha equipe comercial agora. Use formatação HTML básica (<b>, <ul>, <br>) para destacar pontos. Não use Markdown.`;

    try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: 'Você é o motor de IA corporativo do sistema HAPSIS.' }, { role: 'user', content: prompt }], temperature: 0.7 }) });
        const data = await response.json();
        if (data.error) { textoTela.innerHTML = `<span style="color: var(--danger);">Erro da OpenAI: ${data.error.message}</span>`; return; }
        textoTela.innerHTML = data.choices[0].message.content;
    } catch (error) { textoTela.innerHTML = `<span style="color: var(--danger);"><i class="ph ph-warning"></i> Falha de conexão com os servidores da OpenAI.</span>`; }
}

// ==========================================
// FUNÇÕES DO WHATSAPP
// ==========================================
window.abrirModalWhatsApp = (numero, nome) => {
    document.getElementById('wpp-numero').value = numero; document.getElementById('wpp-nome').value = nome;
    const customInput = document.getElementById('wpp-custom-msg'); if (customInput) customInput.value = '';
    document.getElementById('modal-whatsapp').classList.add('ativa');
};

window.enviarWhatsApp = (tipo) => {
    const numero = document.getElementById('wpp-numero').value; const nome = document.getElementById('wpp-nome').value;
    const nomeVendedor = perfilAtual ? perfilAtual.full_name : 'Nossa Equipe'; const nomeEmpresa = perfilAtual ? perfilAtual.nome_empresa : 'HAPSIS';
    let mensagem = '';
    
    if (tipo === 'apresentacao') mensagem = `Olá ${nome}, tudo bem? Sou o ${nomeVendedor} da ${nomeEmpresa}. Vi que você demonstrou interesse em nossos serviços. Podemos conversar?`;
    else if (tipo === 'followup') mensagem = `Oi ${nome}! Passando para saber se conseguiu dar uma olhada na nossa proposta. Ficou alguma dúvida?`;
    else if (tipo === 'cobranca') mensagem = `Olá ${nome}, tudo bem? Notamos uma pendência no seu último pagamento. Como podemos te ajudar a regularizar?`;
    else if (tipo === 'custom') {
        mensagem = document.getElementById('wpp-custom-msg').value;
        if (!mensagem.trim()) { mostrarToast('Digite uma mensagem antes de enviar.', 'erro'); return; }
    }
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`, '_blank'); document.getElementById('modal-whatsapp').classList.remove('ativa');
};