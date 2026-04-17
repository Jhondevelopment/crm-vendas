/**
 * ============================================================================
 * HAPSIS ENTERPRISE - MOTOR JAVASCRIPT v2.0
 * Arquitetura de Software Sênior (Clean Code & Robustness)
 * Código 100% Completo, Expandido e sem Abreviações.
 * ============================================================================
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

/**
 * ============================================================================
 * 1. CONFIGURAÇÕES DE BANCO DE DADOS E API (SUPABASE)
 * ============================================================================
 */
const SUPABASE_URL = 'https://bskgqlhducfxfipflpqm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hPbZtYmMLtMn1yfRZa4O2w_nxf43EOa';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * ============================================================================
 * 2. VARIÁVEIS GLOBAIS DE ESTADO (STATE MANAGEMENT)
 * ============================================================================
 */
let usuarioAtual = null;
let perfilAtual = null;
let perfisEquipe = [];

// Arrays de Dados do Banco
let leadsData = [];
let produtosData = [];
let avisosData = [];
let logsExportacaoData = [];
let pagamentosData = []; 
let despesasData = []; 
let bonusData = [];

let notifsNaoLidas = 0;
let confirmCallback = null;
let isRegistering = false;

// Instâncias Globais de Gráficos (Chart.js)
let chartInstance = null;
let chartFugasLinhaInstance = null;
let chartFugasMotivosInstance = null;
let chartPagamentosInstance = null; 
let chartOrigemInstance = null;

/**
 * ============================================================================
 * 3. UTILITÁRIOS GERAIS E COMPONENTES DE UI
 * ============================================================================
 */

/**
 * Exibe um toast (notificação flutuante) na tela
 * @param {string} msg - A mensagem a ser exibida
 * @param {string} tipo - 'ok' (sucesso) ou 'erro' (falha)
 */
function mostrarToast(msg, tipo = 'ok') {
    const toast = document.getElementById('toast');
    
    if (!toast) {
        return;
    }
    
    toast.innerText = msg;
    toast.className = `toast show ${tipo}`;
    
    // Auto-remover após 4 segundos
    setTimeout(() => { 
        toast.classList.remove('show'); 
    }, 4000);
}

/**
 * Retorna a saudação baseada no horário local do usuário
 * @returns {string} Bom dia, Boa tarde ou Boa noite
 */
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

/**
 * Alterna a visibilidade das telas principais do sistema
 * @param {string} id - O ID da tela que deve se tornar ativa
 */
function mudarTela(id) {
    const telas = document.querySelectorAll('.tela');
    
    telas.forEach(t => {
        t.classList.remove('ativa');
    });
    
    const telaDestino = document.getElementById(id);
    
    if (telaDestino) {
        telaDestino.classList.add('ativa');
    }
}

/**
 * Abre o Modal de Confirmação para ações críticas (excluir, estornar)
 * @param {string} titulo - Título do modal
 * @param {string} mensagem - Texto explicativo do risco
 * @param {string} textoBotaoAcao - Texto do botão de ação
 * @param {Function} callback - Função executada caso o usuário confirme
 */
window.abrirConfirmacao = (titulo, mensagem, textoBotaoAcao, callback) => {
    document.getElementById('confirm-titulo').innerText = titulo;
    document.getElementById('confirm-msg').innerHTML = mensagem;
    
    document.getElementById('btn-confirm-acao').innerHTML = `
        <i class="ph ph-check-circle"></i> ${textoBotaoAcao}
    `;
    
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

/**
 * ============================================================================
 * 4. MÓDULO DE AUTENTICAÇÃO E SESSÃO (LOGIN / SIGNUP)
 * ============================================================================
 */

const toggleModo = document.getElementById('toggle-modo');

if (toggleModo) {
    toggleModo.onclick = () => {
        const isLogin = toggleModo.dataset.modo === 'login';
        
        if (isLogin) {
            // Muda para o modo Cadastro
            toggleModo.dataset.modo = 'cadastro';
            
            document.getElementById('auth-titulo').innerText = 'Criar Nova Conta';
            document.getElementById('auth-desc').innerText = 'Preencha seus dados para começar.';
            document.getElementById('btn-login').innerText = 'Cadastrar e Entrar';
            
            toggleModo.innerHTML = 'Já tenho conta — <a style="cursor:pointer; color:var(--accent); font-weight:bold;">fazer login</a>';
            
            document.getElementById('box-nome').classList.remove('hidden');
            document.getElementById('box-cargo').classList.remove('hidden');
            document.getElementById('box-senha-confirm').classList.remove('hidden');
            document.getElementById('link-esqueceu-senha').classList.add('hidden');
            
            const cargoValue = document.getElementById('auth-cargo').value;
            
            if (cargoValue === 'gestor_geral' || cargoValue === 'gestor_sub') {
                document.getElementById('box-chave').classList.remove('hidden');
            }
        } else {
            // Muda para o modo Login
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
        const valorSelecionado = e.target.value;
        
        if (valorSelecionado === 'gestor_geral' || valorSelecionado === 'gestor_sub') {
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
            mostrarToast('Preencha e-mail e senha.', 'erro');
            return;
        }

        if (modo === 'login') {
            // Lógica de Sign In
            btnLogin.innerText = 'Autenticando...';
            btnLogin.style.transform = 'scale(0.97)';
            btnLogin.style.opacity = '0.85';
            
            try {
                const { error } = await supabase.auth.signInWithPassword({ 
                    email: email, 
                    password: password 
                });
                
                if (error) {
                    mostrarToast('Acesso negado. Verifique os dados.', 'erro');
                    btnLogin.innerText = 'Entrar no HAPSIS';
                    btnLogin.style.transform = 'none';
                    btnLogin.style.opacity = '1';
                }
            } catch (err) {
                console.error(err);
                mostrarToast('Erro de conexão.', 'erro');
            }
            
        } else {
            // Lógica de Sign Up
            const nome = document.getElementById('auth-nome').value;
            const cargo = document.getElementById('auth-cargo').value;
            const chaveDigitada = document.getElementById('auth-chave').value;
            const senhaConfirm = document.getElementById('auth-senha-confirm').value;

            if (!nome) {
                mostrarToast('Por favor, informe seu nome.', 'erro');
                return;
            }
            if (password !== senhaConfirm) {
                mostrarToast('As senhas não coincidem!', 'erro');
                return;
            }
            if (cargo === 'gestor_geral' && chaveDigitada !== 'CEO2026') {
                mostrarToast('Chave de Gestor Supremo incorreta!', 'erro');
                return;
            }
            if (cargo === 'gestor_sub' && chaveDigitada !== 'FINAN2026') {
                mostrarToast('Chave de Gestor Financeiro incorreta!', 'erro');
                return;
            }

            btnLogin.innerText = 'Criando conta...';
            btnLogin.style.transform = 'scale(0.97)';
            btnLogin.style.opacity = '0.85';
            isRegistering = true; 
            
            const { data: authData, error: authError } = await supabase.auth.signUp({ 
                email: email, 
                password: password 
            });
            
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
        const { error } = await supabase.auth.updateUser({ 
            password: novaSenha 
        });
        
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
        
        if (telaAuthEl) {
            telaAuthEl.classList.remove('entrando');
        }
        
        await supabase.auth.signOut();
        window.location.reload();
    }
}

// ============================================================================
// 5. CONTROLE DE SESSÃO E CARREGAMENTO DE PERFIL
// ============================================================================
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
    let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', usuarioAtual.id)
        .single();
    
    if (error || !data) {
        // Fallback: Retentativa caso a latência atrapalhe o primeiro select
        await new Promise(r => setTimeout(r, 1500));
        let retry = await supabase.from('profiles').select('*').eq('id', usuarioAtual.id).single();
        data = retry.data;
    }
    
    if (data) { 
        perfilAtual = data; 
        
        // Retrocompatibilidade
        if (perfilAtual.role === 'gestor') perfilAtual.role = 'gestor_geral';
        if (perfilAtual.role === 'gerente') perfilAtual.role = 'gestor_sub';
        
        iniciarApp(); 
    } else {
        await supabase.auth.signOut();
        window.location.reload();
    }
}

/**
 * ============================================================================
 * 6. INICIALIZAÇÃO DO APP E PERMISSÕES DA INTERFACE (RBAC)
 * ============================================================================
 */
async function iniciarApp() {
    const elUserNome = document.getElementById('user-nome');
    
    if (elUserNome) {
        elUserNome.innerHTML = `
            <span style="font-size:12px; color:var(--muted); font-weight:normal;">
                ${getSaudacao()},
            </span><br>
            ${perfilAtual.full_name}
        `;
    }
    
    // Carrega perfis da equipe para dropdowns e cálculos
    const { data } = await supabase.from('profiles').select('*');
    perfisEquipe = data || [];

    // Aplica Identidade Visual da Empresa
    const perfilGestor = perfisEquipe.find(p => p.role === 'gestor_geral' || p.role === 'gestor') || perfilAtual;
    
    if (perfilGestor.cor_primaria) {
        document.documentElement.style.setProperty('--accent', perfilGestor.cor_primaria);
    }
    
    if (perfilGestor.logo_empresa) {
        const imgHtml = `
            <img 
                src="${perfilGestor.logo_empresa}" 
                style="width:100%; height:100%; object-fit:contain; border-radius:8px;" 
            />
        `;
        const logoApp = document.getElementById('app-logo-img');
        const logoLogin = document.getElementById('login-logo-img');
        
        if (logoApp) { 
            logoApp.innerHTML = imgHtml; 
            logoApp.style.background = 'transparent'; 
            logoApp.style.border = 'none'; 
            logoApp.style.boxShadow = 'none';
        }
        if (logoLogin) { 
            logoLogin.innerHTML = imgHtml; 
            logoLogin.style.background = 'transparent'; 
            logoLogin.style.border = 'none'; 
            logoLogin.style.boxShadow = 'none';
        }
    }

    // Role-Based Access Control (Oculta tudo e exibe apenas o permitido)
    const role = perfilAtual.role;
    const isAdmin = role === 'gestor_sub' || role === 'gestor_geral';

    document.querySelectorAll('.nav-group').forEach(el => {
        el.classList.add('hidden');
    });

    if (role === 'vendedor' || role === 'sdr') {
        document.querySelectorAll('.modulo-vendas').forEach(el => el.classList.remove('hidden'));
    } else if (role === 'cs') {
        document.querySelectorAll('.modulo-cs').forEach(el => el.classList.remove('hidden'));
    } else if (role === 'marketing') {
        document.querySelectorAll('.modulo-marketing').forEach(el => el.classList.remove('hidden'));
    } else if (role === 'gestor_sub') {
        document.querySelectorAll('.modulo-cfo').forEach(el => el.classList.remove('hidden'));
        document.querySelectorAll('.modulo-vendas').forEach(el => el.classList.remove('hidden')); 
    } else if (role === 'gestor_geral') {
        document.querySelectorAll('.nav-group').forEach(el => el.classList.remove('hidden'));
    }
    
    const boxSininho = document.getElementById('box-sininho');
    if (boxSininho) {
        boxSininho.classList.toggle('hidden', !isAdmin);
    }

    const btnAvisoCfo = document.getElementById('btn-novo-aviso');
    if (btnAvisoCfo) {
        btnAvisoCfo.classList.toggle('hidden', !isAdmin);
    }

    document.querySelectorAll('.aba-conteudo').forEach(a => a.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('ativo'));
    
    const boxAvisos = document.getElementById('box-avisos');
    
    // Define a aba inicial correta com base no cargo
    if (role === 'gestor_geral' || role === 'gestor_sub') {
        const abaChefao = document.getElementById('aba-chefao');
        if (abaChefao) abaChefao.classList.remove('hidden'); 
        
        const btnChefe = document.querySelector('[data-aba="aba-chefao"]');
        if (btnChefe) btnChefe.classList.add('ativo');
        
        if (boxAvisos) boxAvisos.classList.remove('hidden');
        
    } else if (role === 'cs') {
        const abaPos = document.getElementById('aba-pos-venda');
        if (abaPos) abaPos.classList.remove('hidden');
        
        const btnCs = document.querySelector('[data-aba="aba-pos-venda"]');
        if (btnCs) btnCs.classList.add('ativo');
        
        if (boxAvisos) boxAvisos.classList.add('hidden');
        
    } else if (role === 'marketing') {
        const abaGrowth = document.getElementById('aba-growth');
        if (abaGrowth) abaGrowth.classList.remove('hidden');
        
        const btnGrowth = document.querySelector('[data-aba="aba-growth"]');
        if (btnGrowth) btnGrowth.classList.add('ativo');
        
        if (boxAvisos) boxAvisos.classList.add('hidden');
        
    } else {
        const abaKanban = document.getElementById('aba-kanban');
        if (abaKanban) abaKanban.classList.remove('hidden'); 
        
        const btnKanban = document.querySelector('[data-aba="aba-kanban"]');
        if (btnKanban) btnKanban.classList.add('ativo');
        
        if (boxAvisos) boxAvisos.classList.remove('hidden');
    }
    
    // Efeito Cinematográfico de Entrada (Netflix Blur Zoom)
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
    
    // Boot Assíncrono dos Módulos
    await carregarAvisos();
    await carregarProdutos();
    await carregarBonus(); 
    await carregarLeads(); 
    configurarNotificacoes();
}

/**
 * ============================================================================
 * 7. NAVEGAÇÃO INTERNA (ROUTER) DA SIDEBAR
 * ============================================================================
 */
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

        // Disparo otimizado de renderizações
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
        if (abaId === 'aba-growth') {
            renderizarGrowth();
        }
    };
});

// Pesquisa Global Instantânea no Topbar
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

/**
 * ============================================================================
 * 8. GESTÃO DO MURAL DE AVISOS E CATÁLOGO DE PRODUTOS
 * ============================================================================
 */
async function carregarAvisos() {
    const { data } = await supabase
        .from('avisos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
        
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
                ${(['gestor_geral', 'gestor_sub'].includes(perfilAtual.role)) ? `
                <button class="aviso-del" title="Apagar aviso" onclick="window.deletarAviso(${a.id})">
                    <i class="ph ph-trash"></i>
                </button>` : ''}
            </div>
            <span style="font-size: 13px; line-height: 1.4; color: var(--text2);">${a.mensagem}</span>
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
    formAviso.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const btnSubmit = formAviso.querySelector('button[type="submit"]');
            const textOriginal = btnSubmit.innerHTML;
            btnSubmit.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Disparando...';
            btnSubmit.disabled = true;

            const titulo = document.getElementById('inp-aviso-titulo').value;
            const msg = document.getElementById('inp-aviso-msg').value;
            
            const { error } = await supabase.from('avisos').insert([
                { titulo: titulo, mensagem: msg }
            ]);
            
            if (error) {
                mostrarToast('Erro: ' + error.message, 'erro'); 
            } else { 
                document.getElementById('modal-aviso').classList.remove('ativa'); 
                formAviso.reset(); 
                mostrarToast('Disparado no mural!', 'ok'); 
                carregarAvisos(); 
            }

            btnSubmit.innerHTML = textOriginal;
            btnSubmit.disabled = false;
        } catch (err) {
            console.error(err);
            mostrarToast('Erro no sistema', 'erro');
        }
    });
}

window.deletarAviso = (id) => { 
    window.abrirConfirmacao('Apagar Aviso', 'Este recado será removido do mural da equipe.', 'Excluir Aviso', async () => { 
        try {
            await supabase.from('avisos').delete().eq('id', id); 
            mostrarToast('Aviso apagado.', 'ok'); 
            carregarAvisos(); 
        } catch(err) {
            console.error(err);
            mostrarToast('Erro ao excluir', 'erro');
        }
    }); 
};

async function carregarProdutos() {
    const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome');
        
    if (error) {
        console.error('Erro ao carregar produtos', error);
    }
        
    produtosData = data || [];
    
    const selectProd = document.getElementById('inp-produto');
    if (selectProd) {
        selectProd.innerHTML = '<option value="">Selecione um Produto...</option>' + 
            produtosData.map(p => `
                <option value="${p.nome}" data-preco="${p.valor}">
                    ${p.nome}
                </option>
            `).join('');
    }
    
    const tbodyCat = document.getElementById('tbody-catalogo');
    if (tbodyCat) {
        if (produtosData.length === 0) {
            tbodyCat.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align:center; padding:20px; color:var(--muted);">
                        Catálogo de produtos vazio.
                    </td>
                </tr>`; 
        } else {
            tbodyCat.innerHTML = produtosData.map(p => `
                <tr>
                    <td><strong style="color:var(--text)">${p.nome}</strong></td>
                    <td style="text-align:right;">R$ ${Number(p.valor).toFixed(2)}</td>
                    <td style="text-align:center; color:var(--accent); font-weight:bold;">${p.taxa_comissao || 5}%</td>
                    <td style="text-align:center;">
                        <button class="card-del" onclick="window.deletarProduto(${p.id})">
                            <i class="ph ph-trash"></i>
                        </button>
                    </td>
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
    formProduto.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const btnSubmit = formProduto.querySelector('button[type="submit"]');
            const textOriginal = btnSubmit.innerHTML;
            btnSubmit.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';
            btnSubmit.disabled = true;

            const nome = document.getElementById('inp-prod-nome').value.toUpperCase();
            const valor = document.getElementById('inp-prod-preco').value;
            const taxa = document.getElementById('inp-prod-comissao').value;
            
            const { error } = await supabase.from('produtos').insert([
                { nome: nome, valor: valor, taxa_comissao: taxa }
            ]);
            
            if (error) {
                mostrarToast('Erro ao salvar.', 'erro'); 
            } else { 
                document.getElementById('modal-produto').classList.remove('ativa'); 
                formProduto.reset(); 
                mostrarToast('Nova regra de comissão salva!', 'ok'); 
                carregarProdutos(); 
            }

            btnSubmit.innerHTML = textOriginal;
            btnSubmit.disabled = false;
        } catch (err) {
            console.error(err);
        }
    });
}

window.deletarProduto = (id) => { 
    window.abrirConfirmacao('Excluir Produto', 'Remover este item do catálogo oficial?', 'Excluir', async () => { 
        try {
            await supabase.from('produtos').delete().eq('id', id); 
            mostrarToast('Produto Removido.', 'ok'); 
            carregarProdutos(); 
        } catch(err) {
            console.error(err);
        }
    }); 
};

/**
 * ============================================================================
 * 9. MÓDULO DE BÔNUS E GAMIFICAÇÃO FINANCEIRA
 * ============================================================================
 */
async function carregarBonus() {
    const { data } = await supabase
        .from('campanhas_bonus')
        .select('*')
        .order('created_at', { ascending: false });
        
    bonusData = data || [];
    
    if (perfilAtual.role === 'vendedor' || perfilAtual.role === 'sdr') {
        verificarBonusAtivo();
    } else {
        renderizarBonus();
    }
}

function renderizarBonus() {
    const tbody = document.getElementById('tbody-bonus');
    if (!tbody) return;

    if (bonusData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:30px; color:var(--muted);">
                    Nenhuma campanha de bônus lançada.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = bonusData.map(b => {
        let corStatus = b.status === 'Ativa' ? 'color: var(--fechados);' : 'color: var(--danger);';
        
        let botaoHTML = b.status === 'Ativa' 
            ? `<button class="btn-cancel" style="padding:4px 8px; width:auto; margin:0 auto; font-size:12px; color:var(--danger); border-color:var(--danger2);" onclick="window.encerrarBonus(${b.id})">
                 <i class="ph ph-stop-circle"></i> Encerrar
               </button>`
            : `<button class="btn-cancel" style="padding:4px 8px; width:auto; margin:0 auto; font-size:12px; color:var(--muted); border-color:var(--border2);" onclick="window.deletarBonus(${b.id})">
                 <i class="ph ph-trash"></i> Apagar
               </button>`;
        
        return `
        <tr>
            <td style="font-weight: bold; color: var(--text);">${b.titulo}</td>
            <td style="text-align:right;">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(b.meta_valor)}</td>
            <td style="text-align:right; font-weight:bold; color:var(--purple);">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(b.premio_valor)}</td>
            <td style="font-weight:bold; ${corStatus}">${b.status}</td>
            <td style="text-align:center;">
                ${botaoHTML}
            </td>
        </tr>`;
    }).join('');
}

window.deletarBonus = async (id) => {
    window.abrirConfirmacao('Apagar Campanha', 'Remover esta campanha do histórico financeiro?', 'Apagar Definitivo', async () => {
        try {
            await supabase.from('campanhas_bonus').delete().eq('id', id);
            mostrarToast('Campanha deletada.', 'ok'); 
            carregarBonus();
        } catch(err) {
            console.error(err);
        }
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
    formBonus.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const btnSubmit = formBonus.querySelector('button[type="submit"]');
            const textOriginal = btnSubmit.innerHTML;
            btnSubmit.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Lançando...';
            btnSubmit.disabled = true;

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
                mostrarToast('Campanha lançada para a equipe!', 'ok'); 
                carregarBonus(); 
            }

            btnSubmit.innerHTML = textOriginal;
            btnSubmit.disabled = false;
        } catch (err) {
            console.error(err);
        }
    });
}

window.encerrarBonus = (id) => {
    window.abrirConfirmacao('Encerrar Campanha', 'Deseja parar esta campanha de bônus?', 'Encerrar', async () => {
        try {
            await supabase.from('campanhas_bonus').update({ status: 'Encerrada' }).eq('id', id);
            mostrarToast('Campanha encerrada.', 'ok');
            carregarBonus();
        } catch(err) {
            console.error(err);
        }
    });
};

/**
 * ============================================================================
 * 10. O NÚCLEO DO SISTEMA: CARREGAMENTO DE LEADS E VENDAS
 * ============================================================================
 */
async function carregarLeads() {
    let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
    
    // Regra de Isolamento a Nível de Query
    if (perfilAtual.role === 'vendedor' || perfilAtual.role === 'sdr') {
        query = query.eq('user_id', usuarioAtual.id);
    }
    
    const { data, error } = await query;
    
    if (error) {
        console.error("Falha Crítica ao puxar leads do banco:", error);
    }
    
    leadsData = data || [];
    
    // Processamento Paralelo: CFO/CEO carregam módulos financeiros atrelados
    if (perfilAtual.role === 'gestor_geral' || perfilAtual.role === 'gestor_sub') {
        const pagQuery = await supabase
            .from('pagamentos_comissao')
            .select('*')
            .order('created_at', { ascending: false });
            
        pagamentosData = pagQuery.data || [];
        carregarDespesas(); 
    }

    // =======================================================
    // DISTRIBUIÇÃO DE RENDERIZAÇÃO E CONSTRUÇÃO DE INTERFACE
    // =======================================================
    if (perfilAtual.role === 'vendedor' || perfilAtual.role === 'sdr') { 
        renderizarKanban(); 
        renderizarLista(); 
        renderizarAgenda(); 
        renderizarArena();
        verificarBonusAtivo();
        
        if (!document.getElementById('aba-relatorio').classList.contains('hidden')) { 
            atualizarEstatisticas(); 
            calcularComissoesNovoModeloVendedor(); 
        }
        
    } else if (perfilAtual.role === 'cs') {
        renderizarPosVenda();
        
    } else if (perfilAtual.role === 'marketing') {
        renderizarGrowth();
        
    } else { 
        // Cargo de Administração (CEO / CFO)
        renderizarKanban();
        renderizarLista();
        renderizarAgenda();
        renderizarArena();
        renderizarGestor();
        
        if (perfilAtual.role === 'gestor_geral') {
            if (!document.getElementById('aba-equipe').classList.contains('hidden')) {
                renderizarAbaEquipe();
            }
            if (!document.getElementById('aba-auditoria').classList.contains('hidden')) {
                renderizarAbaAuditoria();
            }
        }
        
        if (!document.getElementById('aba-exportacao').classList.contains('hidden')) {
            renderizarTabelaExportacao();
        }
        if (!document.getElementById('aba-comissoes').classList.contains('hidden')) {
            renderizarComissoesNovoModeloFinanceiro();
        }
        
        renderizarAprovacoes();

        if (!document.getElementById('aba-auditoria-descontos').classList.contains('hidden')) {
            renderizarAuditoriaDescontos();
        }
        if (!document.getElementById('aba-cobrancas').classList.contains('hidden')) {
            renderizarCobrancas();
        }
        if (!document.getElementById('aba-mrr').classList.contains('hidden')) {
            renderizarMRR();
        }
        if (!document.getElementById('aba-contratos').classList.contains('hidden')) {
            renderizarContratos();
        }
    }
    
    window.atualizarMeta();
    
    // Força a barra de pesquisa a filtrar a nova carga de dados se estiver preenchida
    if (inputBusca && inputBusca.value) {
        inputBusca.dispatchEvent(new Event('input'));
    }
}

window.atualizarMeta = function() {
    let fechadosReais = leadsData.filter(l => l.status === 'fechados' && l.aprovado === true && !l.estornado);
    
    if (perfilAtual.role === 'vendedor' || perfilAtual.role === 'sdr') {
        fechadosReais = fechadosReais.filter(l => l.user_id === usuarioAtual.id);
    }
    
    const receita = fechadosReais.reduce((acc, l) => acc + Number(l.valor), 0);
    
    let objetivo = 10000;
    const perfilGestor = perfisEquipe.find(p => p.role === 'gestor_geral' || p.role === 'gestor');
    
    if (perfilGestor && perfilGestor.meta_mensal) {
        objetivo = perfilGestor.meta_mensal;
    }
    
    let porcentagem = Math.min((receita / objetivo) * 100, 100);
    
    // 1. Atualiza a Meta no Kanban
    const elMetaAtualK = document.getElementById('meta-atual'); 
    const elMetaObjK = document.getElementById('meta-objetivo'); 
    const barraK = document.getElementById('meta-barra');
    
    if (elMetaAtualK) {
        elMetaAtualK.innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(receita);
    }
    if (elMetaObjK) {
        elMetaObjK.innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(objetivo);
    }
    
    if (barraK) { 
        barraK.style.width = `${porcentagem}%`; 
        
        if (porcentagem === 100 && receita > 0) {
            barraK.classList.add('bateu-meta'); 
        } else {
            barraK.classList.remove('bateu-meta'); 
        }
    }

    // 2. Atualiza a Meta no Dashboard Executivo (CEO)
    const elMetaAtualG = document.getElementById('meta-atual-gestor'); 
    const elMetaObjG = document.getElementById('meta-objetivo-gestor'); 
    const barraG = document.getElementById('meta-barra-gestor');
    
    if (elMetaAtualG) {
        elMetaAtualG.innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(receita);
    }
    if (elMetaObjG) {
        elMetaObjG.innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(objetivo);
    }
    
    if (barraG) { 
        barraG.style.width = `${porcentagem}%`; 
        
        if (porcentagem === 100 && receita > 0) {
            barraG.classList.add('bateu-meta'); 
        } else {
            barraG.classList.remove('bateu-meta'); 
        }
    }
}

window.alterarMeta = () => {
    let valorAExibir = 10000;
    const perfilGestor = perfisEquipe.find(p => p.role === 'gestor_geral' || p.role === 'gestor');
    
    if (perfilGestor && perfilGestor.meta_mensal) {
        valorAExibir = perfilGestor.meta_mensal;
    }
    
    document.getElementById('inp-nova-meta').value = valorAExibir; 
    document.getElementById('modal-meta').classList.add('ativa');
};

const formMeta = document.getElementById('form-meta');

if (formMeta) {
    formMeta.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const nm = Number(document.getElementById('inp-nova-meta').value);
            
            if (isNaN(nm) || nm <= 0) {
                return mostrarToast('Valor inválido.', 'erro');
            }
            
            const btnSalvar = document.getElementById('form-meta').querySelector('button'); 
            const txtOriginal = btnSalvar.innerHTML; 
            btnSalvar.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';
            btnSalvar.disabled = true;
            
            const { error } = await supabase.from('profiles').update({ meta_mensal: nm }).eq('id', usuarioAtual.id);
            
            btnSalvar.innerHTML = txtOriginal;
            btnSalvar.disabled = false;
            
            if (error) {
                mostrarToast('Erro ao salvar meta no banco de dados.', 'erro');
            } else { 
                perfilAtual.meta_mensal = nm; 
                
                const { data } = await supabase.from('profiles').select('*'); 
                perfisEquipe = data || []; 
                
                window.atualizarMeta(); 
                document.getElementById('modal-meta').classList.remove('ativa'); 
                mostrarToast('Meta Global atualizada com sucesso!', 'ok'); 
            }
        } catch (err) {
            console.error(err);
        }
    });
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

/**
 * ============================================================================
 * 11. GERAÇÃO DOS CARDS DO KANBAN
 * ============================================================================
 */
function gerarCardHTML(l, status, isPosVenda = false) {
    let numWpp = l.whatsapp.replace(/\D/g, ''); 
    
    if (!numWpp.startsWith('55') && numWpp.length <= 11) {
        numWpp = '55' + numWpp;
    }
    
    let termometroClasse = ''; 
    let termometroBadge = ''; 
    let valorExibicao = `<span style="color: ${status==='fechados'?'var(--fechados)':'var(--accent)'}; font-weight:bold; font-size: 14px;">R$ ${Number(l.valor).toFixed(2)}</span>`;
    
    if (status === 'abandonados') {
        termometroClasse = 'card-pendente'; 
        termometroBadge = `<span class="badge" style="background:rgba(122,131,161,0.15); color:var(--muted);"><i class="ph ph-ghost"></i> Ghosting</span>`; 
        valorExibicao = `<span style="color: var(--muted); font-weight:bold; font-size: 12px; text-decoration: line-through;">R$ ${Number(l.valor).toFixed(2)}</span>`;
    } 
    else if (l.estornado || status === 'perdidos') {
        termometroClasse = 'card-pendente'; 
        termometroBadge = `<span class="badge-vermelho"><i class="ph ph-warning-circle"></i> ${l.motivo_perda || 'Perdido'}</span>`; 
        valorExibicao = `<span style="color: var(--danger); font-weight:bold; font-size: 12px; text-decoration: line-through;">R$ ${Number(l.valor).toFixed(2)}</span>`;
    } 
    else if (l.is_inadimplente) {
        termometroClasse = 'card-pendente'; 
        termometroBadge = `<span class="badge-vermelho"><i class="ph ph-warning"></i> Em Atraso</span>`; 
    } 
    else if (status === 'fechados' && l.aprovado !== true && !isPosVenda) {
        termometroClasse = 'card-pendente'; 
        termometroBadge = `<span class="badge-pendente"><i class="ph ph-hourglass-high"></i> Aguard. Gestor</span>`; 
        valorExibicao = `<span style="color: var(--negociacao); font-weight:bold; font-size: 12px; font-style:italic;">💸 R$ ${Number(l.valor).toFixed(2)} (Aprovação)</span>`;
    } 
    else if (status !== 'fechados' && l.created_at && !isPosVenda) {
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
    
    if (l.notas) {
        iconesExtras += `<i class="ph ph-notebook" title="Anotações" style="color:var(--novos); margin-left:6px;"></i>`;
    }
    if (l.comprovante_url) {
        iconesExtras += `<i class="ph ph-receipt" title="Comprovante Financeiro" style="color:var(--fechados); margin-left:4px;"></i>`;
    }
    if (l.doc_importante_url) {
        iconesExtras += `<i class="ph ph-file-text" title="Docs Importantes" style="color:var(--novos); margin-left:4px;"></i>`;
    }
    if (l.is_recorrente) {
        iconesExtras += `<i class="ph ph-arrows-clockwise" title="Assinatura" style="color:var(--purple); margin-left:4px;"></i>`;
    }

    return `
    <div class="lead-card ${termometroClasse}" draggable="true" data-id="${l.id}" onclick="window.abrirDrawerLead(${l.id})">
        <div class="card-top">
            <div style="display:flex; flex-direction:column; gap:4px;">
                <div class="card-nome">${l.nome} ${iconesExtras}</div>
                <div>${termometroBadge}</div>
            </div>
            <button class="card-del" onclick="event.stopPropagation(); window.deletarLead(${l.id})">
                <i class="ph ph-trash"></i>
            </button>
        </div>
        <div class="card-info" style="display: flex; flex-direction: column; gap: 8px;">
            <span><i class="ph ph-package"></i> ${l.produto || 'Geral'}</span>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color:var(--muted); font-size: 12px;">
                    <i class="ph ph-whatsapp-logo"></i> ${l.whatsapp}
                </span>
                <button onclick="event.stopPropagation(); window.abrirModalWhatsApp('${numWpp}', '${l.nome}')" style="background: rgba(37,211,102,0.1); border:none; color: #25d366; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 11px; display: flex; align-items: center; gap: 4px; transition:0.2s;">
                    <i class="ph ph-whatsapp-logo" style="font-size:14px;"></i> Chamar
                </button>
            </div>
            ${valorExibicao}
        </div>
    </div>`;
}

function renderizarKanban() {
    let leadsVisao = leadsData;
    
    // Filtro Condicional baseado na Regra de Negócio (RBAC)
    if (perfilAtual.role === 'vendedor' || perfilAtual.role === 'sdr') {
        leadsVisao = leadsData.filter(l => l.user_id === usuarioAtual.id);
    }
    
    const colunas = ['novos', 'negociacao', 'fechados', 'perdidos', 'abandonados'];
    
    colunas.forEach(status => {
        const col = document.getElementById(`col-${status}`); 
        if (!col) return;
        
        const list = leadsVisao.filter(l => l.status === status);
        col.parentElement.querySelector('.col-count').innerText = list.length;
        
        if (list.length === 0) {
            let msg = status === 'novos' ? 'Sem contatos.<br>Cadastre um novo!' : 
                      status === 'negociacao' ? 'Ninguém negociando.<br>Arraste leads para cá.' : 
                      status === 'fechados' ? 'Caixa vazio.<br>Feche uma venda!' : 
                      status === 'abandonados' ? 'Nenhum fantasma.<br>Time focado!' : 
                      'Nenhuma perda registrada.<br>Excelente!';
                      
            let icone = status === 'novos' ? 'ph-user-plus' : 
                        status === 'negociacao' ? 'ph-handshake' : 
                        status === 'fechados' ? 'ph-money' : 
                        status === 'abandonados' ? 'ph-ghost' : 
                        'ph-shield-check';
            
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
    let leadsPos = leadsData.filter(l => l.status === 'fechados' && l.aprovado === true && !l.estornado);
    
    if (perfilAtual.role === 'vendedor') {
        leadsPos = leadsPos.filter(l => l.user_id === usuarioAtual.id);
    }
    
    const totalOnboarding = leadsPos.filter(l => (l.etapa_pos_venda || 'onboarding') === 'onboarding').length;
    const totalAcompanhamento = leadsPos.filter(l => l.etapa_pos_venda === 'acompanhamento').length;
    const totalUpsell = leadsPos.filter(l => l.etapa_pos_venda === 'upsell').length;
    
    if (document.getElementById('stat-pv-on')) document.getElementById('stat-pv-on').innerText = totalOnboarding; 
    if (document.getElementById('stat-pv-ac')) document.getElementById('stat-pv-ac').innerText = totalAcompanhamento; 
    if (document.getElementById('stat-pv-up')) document.getElementById('stat-pv-up').innerText = totalUpsell;

    const colunasPosVenda = ['onboarding', 'acompanhamento', 'upsell'];
    
    colunasPosVenda.forEach(etapa => {
        const col = document.getElementById(`col-pv-${etapa}`); 
        if (!col) return;
        
        const list = leadsPos.filter(l => (l.etapa_pos_venda || 'onboarding') === etapa);
        const prefixoCounter = etapa.substring(0,2);
        
        if (document.getElementById(`count-pv-${prefixoCounter}`)) {
            document.getElementById(`count-pv-${prefixoCounter}`).innerText = list.length;
        }
        
        if (list.length === 0) {
            let msg = etapa === 'onboarding' ? 'Nenhum cliente novo.' : 
                      etapa === 'acompanhamento' ? 'Nenhum acompanhamento ativo.' : 
                      'Ninguém pronto para Upsell.';
                      
            let icone = etapa === 'onboarding' ? 'ph-hand-waving' : 
                        etapa === 'acompanhamento' ? 'ph-chats-circle' : 
                        'ph-rocket-launch';
            
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
    
    let leadsVisao = leadsData;
    
    if (perfilAtual.role === 'vendedor' || perfilAtual.role === 'sdr') {
        leadsVisao = leadsData.filter(l => l.user_id === usuarioAtual.id);
    }
    
    if (leadsVisao.length === 0) { 
        tbody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align:center; padding: 30px; color:var(--muted);">
                Nenhum cliente no funil.
            </td>
        </tr>`; 
        return; 
    }
    
    tbody.innerHTML = leadsVisao.map(l => {
        let corBadge = l.status === 'novos' ? 'badge-azul' : 
                       (l.status === 'negociacao' ? 'badge-amarelo' : 
                       (l.status === 'perdidos' ? 'badge-vermelho' : 
                       (l.status === 'abandonados' ? 'badge-equipe' : 'badge-verde')));
                       
        let corValor = l.status === 'fechados' ? 'var(--fechados)' : 
                       (l.status === 'perdidos' || l.status === 'abandonados' ? 'var(--danger)' : 'var(--accent)');
                       
        return `
        <tr onclick="window.abrirDrawerLead(${l.id})" class="clicavel">
            <td style="font-weight: bold; color: var(--text);">${l.nome}</td>
            <td>${l.produto || 'Geral'}</td>
            <td style="color: ${corValor}; font-weight:bold; text-align:right;">R$ ${Number(l.valor).toFixed(2)}</td>
            <td><span class="badge ${corBadge}">${l.status.toUpperCase()}</span></td>
            <td style="color: var(--muted);">${l.whatsapp}</td>
        </tr>`;
    }).join('');
}

/**
 * ============================================================================
 * 12. DRAG AND DROP (ARRASTAR E SOLTAR COM TRAVAS DE SEGURANÇA CFO)
 * ============================================================================
 */
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
            
            if (lead.status === novoStatus) {
                return;
            }
            
            // TRAVA DE SEGURANÇA: Venda aprovada não volta (Audit compliance)
            if (lead.status === 'fechados' && lead.aprovado === true) {
                mostrarToast('Venda já aprovada no caixa! Peça um estorno ao Financeiro.', 'erro');
                return;
            }
            
            if (lead.estornado) {
                mostrarToast('Venda bloqueada por estorno.', 'erro');
                return;
            }
            
            if (novoStatus === 'perdidos') { 
                document.getElementById('inp-perda-lead-id').value = idCard; 
                document.getElementById('modal-motivo-perda').classList.add('ativa'); 
                return; 
            }
            
            if (novoStatus === 'abandonados') {
                let histAtual = lead.historico || []; 
                histAtual.push({ 
                    data: new Date().toISOString(), 
                    msg: `Movido para ABANDONADOS (Ghosting) por ${perfilAtual.full_name}` 
                });
                
                await supabase.from('leads').update({ 
                    status: 'abandonados', 
                    historico: histAtual 
                }).eq('id', idCard);
                
                mostrarToast('Cliente arquivado em Abandonados.', 'ok'); 
                carregarLeads(); 
                return;
            }
            
            let historicoAtual = lead.historico || []; 
            historicoAtual.push({ 
                data: new Date().toISOString(), 
                msg: `Movido para ${novoStatus.toUpperCase()} por ${perfilAtual.full_name}` 
            });
            
            let payloadUpdate = { 
                status: novoStatus, 
                motivo_perda: null, 
                historico: historicoAtual 
            }; 
            
            if (novoStatus === 'fechados') {
                payloadUpdate.aprovado = false; 
                await supabase.from('leads').update(payloadUpdate).eq('id', idCard); 
                
                carregarLeads(); 
                mostrarToast('Anexe o comprovante na gaveta para aprovação do Financeiro!', 'ok'); 
                
                setTimeout(() => {
                    window.abrirDrawerLead(parseInt(idCard));
                }, 500);
                
            } else { 
                await supabase.from('leads').update(payloadUpdate).eq('id', idCard); 
                carregarLeads(); 
            }
            
        } else if (tipoDrop === 'posvenda') {
            const novaEtapa = container.dataset.etapa; 
            
            if (lead.etapa_pos_venda === novaEtapa) {
                return;
            }
            
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

/**
 * ============================================================================
 * 13. MOTIVO DE PERDA PERSONALIZADO ("Outro") E CHURN
 * ============================================================================
 */
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
    formMotivoPerda.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        
        try {
            const btnSubmit = formMotivoPerda.querySelector('button[type="submit"]');
            const textOriginal = btnSubmit.innerHTML;
            btnSubmit.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Registrando...';
            btnSubmit.disabled = true;

            const id = document.getElementById('inp-perda-lead-id').value;
            let motivo = document.getElementById('inp-perda-motivo').value; 
            
            if (motivo === 'Outro') {
                motivo = document.getElementById('inp-perda-motivo-custom').value;
            }
            
            const lead = leadsData.find(l => l.id == id); 
            let historicoAtual = lead.historico || []; 
            
            if (motivo === 'Abandonou / Ghosting') {
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
            
            btnSubmit.innerHTML = textOriginal;
            btnSubmit.disabled = false;

            carregarLeads();
        } catch (err) {
            console.error(err);
            mostrarToast('Erro no processamento', 'erro');
        }
    });
}

/**
 * ============================================================================
 * 14. CADASTRO DE LEADS E INSERÇÃO NO BANCO (CRIAÇÃO COMPLETA)
 * ============================================================================
 */
const formLead = document.getElementById('form-lead');

if (formLead) {
    formLead.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        
        try {
            const btnSubmit = formLead.querySelector('button[type="submit"]');
            const textOriginal = btnSubmit.innerHTML;
            btnSubmit.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando Cliente...';
            btnSubmit.disabled = true;

            const nome = document.getElementById('inp-nome').value;
            const whatsapp = document.getElementById('inp-whatsapp').value;
            const produto = document.getElementById('inp-produto').value;
            const valorStr = document.getElementById('inp-valor').value;
            const valor = valorStr ? parseFloat(valorStr) : 0;
            
            const pagamentoEl = document.getElementById('inp-pagamento');
            const pagamento = pagamentoEl ? pagamentoEl.value : 'Pix';

            const statusEl = document.getElementById('inp-status');
            const statusSelecionado = statusEl ? statusEl.value : 'novos';
            
            const recorrenteEl = document.getElementById('inp-is-recorrente');
            const isRecorrente = recorrenteEl ? recorrenteEl.checked : false;

            const origemEl = document.getElementById('inp-origem');
            const origem = origemEl ? origemEl.value : 'Indicação';
            
            const logCriacao = [{ 
                data: new Date().toISOString(), 
                msg: `Cadastrado no HAPSIS por ${perfilAtual.full_name}` 
            }];
            
            const aprovado = (statusSelecionado === 'fechados') ? false : true;

            const payload = { 
                nome: nome, 
                whatsapp: whatsapp, 
                produto: produto, 
                valor: valor, 
                forma_pagamento: pagamento, 
                is_recorrente: isRecorrente,
                status_assinatura: isRecorrente ? 'ativa' : null,
                origem_lead: origem,
                status: statusSelecionado, 
                user_id: usuarioAtual.id, 
                aprovado: aprovado, 
                etapa_pos_venda: 'onboarding', 
                historico: logCriacao 
            };

            const { error } = await supabase.from('leads').insert([payload]);
            
            if (error) {
                console.error("Erro Supabase Insert:", error);
                mostrarToast(`Erro no banco: O banco pode estar faltando a coluna origem_lead ou is_recorrente.`, 'erro');
                btnSubmit.innerHTML = textOriginal;
                btnSubmit.disabled = false;
                return;
            }
            
            document.getElementById('modal-lead').classList.remove('ativa'); 
            formLead.reset(); 
            mostrarToast('Cliente adicionado e salvo na base!', 'ok'); 
            
            btnSubmit.innerHTML = textOriginal;
            btnSubmit.disabled = false;
            
            carregarLeads();
            
        } catch (err) {
            console.error('Erro interno FormLead:', err);
            mostrarToast('Ocorreu um erro no processamento interno.', 'erro');
        }
    });
}

window.deletarLead = (id) => { 
    window.abrirConfirmacao('Deletar Cliente', 'Tem certeza? Ação irreversível.', 'Excluir para Sempre', async () => { 
        try {
            await supabase.from('leads').delete().eq('id', id); 
            mostrarToast('Cliente Apagado.', 'ok'); 
            carregarLeads(); 
        } catch(err) {
            console.error(err);
        }
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

/**
 * ============================================================================
 * 15. GAVETA LATERAL DO CLIENTE (DRAWER) - UPLOADS, CHURN, REPASSE (SDR)
 * ============================================================================
 */
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
    
    const elOrigem = document.getElementById('drawer-origem');
    if (elOrigem) {
        elOrigem.innerText = lead.origem_lead || 'Não Informada';
    }

    // Seção Repasse SDR - Permite o qualificador jogar a bola pro Closer
    const boxRepassar = document.getElementById('box-repassar-lead');
    if (boxRepassar) {
        if (perfilAtual.role === 'sdr' && lead.status !== 'fechados') {
            boxRepassar.style.display = 'block';
            
            const selectRepasse = document.getElementById('inp-repassar-vendedor');
            const vendedores = perfisEquipe.filter(p => p.role === 'vendedor');
            
            selectRepasse.innerHTML = '<option value="">Selecione o Closer...</option>' + 
                vendedores.map(v => `<option value="${v.id}">${v.full_name}</option>`).join('');
                
        } else {
            boxRepassar.style.display = 'none';
        }
    }

    // Renderização do Histórico e Auditoria Individual do Lead
    const boxHistorico = document.getElementById('drawer-historico');
    if (boxHistorico) {
        if (!lead.historico || lead.historico.length === 0) {
            boxHistorico.innerHTML = '<i>Nenhum registro.</i>';
        } else {
            boxHistorico.innerHTML = [...lead.historico].reverse().map(h => {
                let formattedTime = new Date(h.data).toLocaleString('pt-BR', { 
                    day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' 
                });
                return `
                <div class="history-item">
                    <span class="history-time">${formattedTime}</span>
                    <span style="color:var(--text);">${h.msg}</span>
                </div>`;
            }).join('');
        }
    }

    // Gerenciador Universal de Visualização de Arquivos na Gaveta
    const setFileInput = (idInput, idLabel, idBox, linkId, url, defaultText) => {
        const fileInput = document.getElementById(idInput); 
        if (fileInput) fileInput.value = '';
        
        const labelEl = document.getElementById(idLabel); 
        if (labelEl) { 
            labelEl.innerText = defaultText; 
            labelEl.style.color = 'var(--muted)'; 
        }
        
        const boxVer = document.getElementById(idBox); 
        if (boxVer) { 
            if (url) { 
                boxVer.classList.remove('hidden'); 
                document.getElementById(linkId).href = url; 
            } else { 
                boxVer.classList.add('hidden'); 
            } 
        }
    };

    setFileInput('drawer-file-comprovante', 'nome-arquivo-comprovante', 'box-ver-comprovante', 'link-ver-comprovante', lead.comprovante_url, 'Nenhum arquivo');
    setFileInput('drawer-file-contrato', 'nome-arquivo-contrato', 'box-ver-contrato', 'link-ver-contrato', lead.contrato_url, 'Sem contrato');
    setFileInput('drawer-file-doc', 'nome-arquivo-doc', 'box-ver-doc', 'link-ver-doc', lead.doc_importante_url, 'Nenhum doc');

    // Controle e Visibilidade de Botões Críticos do Financeiro
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

window.repassarLead = async () => {
    const leadId = document.getElementById('drawer-lead-id').value;
    const novoVendedorId = document.getElementById('inp-repassar-vendedor').value;
    
    if (!novoVendedorId) {
        return mostrarToast('Selecione um Closer na lista!', 'erro');
    }

    try {
        const lead = leadsData.find(l => l.id == leadId);
        const vend = perfisEquipe.find(p => p.id == novoVendedorId);
        
        let hist = lead.historico || [];
        hist.push({ 
            data: new Date().toISOString(), 
            msg: `Lead repassado para ${vend.full_name} por ${perfilAtual.full_name} (SDR)` 
        });

        await supabase.from('leads').update({ 
            user_id: novoVendedorId, 
            historico: hist 
        }).eq('id', leadId);
        
        mostrarToast('Lead repassado com sucesso!', 'ok');
        document.getElementById('drawer-lead').classList.remove('ativa');
        
        carregarLeads();
    } catch(err) {
        console.error(err);
        mostrarToast('Erro ao repassar lead.', 'erro');
    }
};

// Listeners Dinâmicos para Nomes dos Arquivos na Gaveta
const handleFileChange = (idInput, idLabel, colorVar) => { 
    const el = document.getElementById(idInput); 
    if (el) {
        el.addEventListener('change', (e) => { 
            const label = document.getElementById(idLabel); 
            if (!label) return; 
            
            if (e.target.files.length > 0) { 
                label.innerText = e.target.files[0].name; 
                label.style.color = colorVar; 
            } else { 
                label.innerText = 'Nenhum arquivo'; 
                label.style.color = 'var(--muted)'; 
            } 
        });
    }
};

handleFileChange('drawer-file-comprovante', 'nome-arquivo-comprovante', 'var(--novos)');
handleFileChange('drawer-file-contrato', 'nome-arquivo-contrato', 'var(--purple)');
handleFileChange('drawer-file-doc', 'nome-arquivo-doc', 'var(--novos)');

window.salvarDrawerLead = async () => {
    try {
        const id = document.getElementById('drawer-lead-id').value;
        const notasStr = document.getElementById('drawer-notas').value;
        const dataFup = document.getElementById('drawer-data-followup').value;

        mostrarToast("Processando dados e arquivos para a Nuvem...", "ok");

        const payload = {};
        
        if (notasStr !== '') {
            payload.notas = notasStr; 
        } else {
            payload.notas = null;
        }
        
        if (dataFup !== '') {
            payload.data_followup = dataFup; 
        } else {
            payload.data_followup = null;
        }

        const leadAtual = leadsData.find(l => l.id == id);
        let historicoAtual = leadAtual.historico || [];
        
        historicoAtual.push({ 
            data: new Date().toISOString(), 
            msg: `Gaveta atualizada por ${perfilAtual.full_name}` 
        });
        payload.historico = historicoAtual;

        // Subrotina Segura de Upload
        const uploadFile = async (inputId, prefix, payloadKey) => {
            const fileInput = document.getElementById(inputId);
            if (fileInput && fileInput.files.length > 0) {
                const file = fileInput.files[0]; 
                const fileName = `lead_${id}_${prefix}_${Date.now()}.${file.name.split('.').pop()}`;
                
                const { data: uploadData, error: uploadError } = await supabase.storage.from('comprovantes').upload(fileName, file);
                
                if (!uploadError) {
                    payload[payloadKey] = supabase.storage.from('comprovantes').getPublicUrl(fileName).data.publicUrl;
                } else {
                    console.error(`Erro ao subir ${prefix}:`, uploadError);
                }
            }
        };

        await uploadFile('drawer-file-comprovante', 'comp', 'comprovante_url');
        await uploadFile('drawer-file-contrato', 'contrato', 'contrato_url');
        await uploadFile('drawer-file-doc', 'doc', 'doc_importante_url');

        const { error } = await supabase.from('leads').update(payload).eq('id', id);
        
        if (error) {
            mostrarToast("Erro ao salvar dados finais.", "erro"); 
        } else { 
            mostrarToast("Atualizado com sucesso!", "ok"); 
            document.getElementById('drawer-lead').classList.remove('ativa'); 
            carregarLeads(); 
        }
    } catch(err) {
        console.error(err);
        mostrarToast("Erro sistêmico ao salvar gaveta", "erro");
    }
};

window.gerarPropostaPDF = () => {
    const id = document.getElementById('drawer-lead-id').value;
    const lead = leadsData.find(l => l.id == id);
    
    if (!lead) {
        return mostrarToast('Lead não encontrado para geração de PDF.', 'erro');
    }

    const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.valor);
    const empresaNome = perfilAtual.nome_empresa || 'HAPSIS Premium';

    const janelaImpressao = window.open('', '_blank');
    let html = `
    <html>
    <head>
        <title>Proposta - ${lead.nome}</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; line-height: 1.6; } 
            .header { text-align: center; border-bottom: 2px solid #f5c518; padding-bottom: 20px; margin-bottom: 30px; } 
            .header h1 { margin: 0; color: #10121a; font-size: 28px; text-transform: uppercase; } 
            .header p { color: #555; margin-top: 5px; font-weight: bold; font-size: 14px; } 
            .content { margin-bottom: 40px; } 
            .content p { font-size: 16px; margin-bottom: 12px; } 
            .price-box { background: #f8f9fa; padding: 25px; border-left: 6px solid #81c784; font-size: 18px; margin-top: 30px; border-radius: 4px; } 
            .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #ddd; padding-top: 20px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Proposta Comercial</h1>
            <p>${empresaNome}</p>
        </div>
        <div class="content">
            <p><strong>Aos cuidados de:</strong> ${lead.nome}</p>
            <p><strong>Contato:</strong> ${lead.whatsapp}</p>
            <p><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</p><br>
            <p>Olá, ${lead.nome.split(' ')[0]}. Conforme conversamos, segue abaixo a proposta oficial para a contratação dos nossos serviços/produtos.</p>
            <p><strong>Produto/Serviço Oferecido:</strong> ${lead.produto || 'Consultoria Geral'}</p>
            <div class="price-box">
                <p style="margin:0; font-size: 20px;"><strong>Investimento Total:</strong> <span style="font-size: 28px; color: #21a366; font-weight: bold;">${valorFormatado}</span></p>
                <p style="margin-top: 12px; font-size: 15px;"><strong>Forma de Pagamento Acordada:</strong> ${lead.forma_pagamento || 'A combinar'}</p>
            </div>
        </div>
        <div class="footer">
            <p>Proposta gerada por ${perfilAtual.full_name} | ${empresaNome}</p>
            <p>Documento válido por 5 dias úteis a partir da data de emissão.</p>
        </div>
        <script>window.onload = () => { window.print(); window.close(); }</script>
    </body>
    </html>`;
    
    janelaImpressao.document.write(html);
    janelaImpressao.document.close();
};

/**
 * ============================================================================
 * 16. COFRE DE CONTRATOS (GED) - UPLOAD DIRETO DO CFO
 * ============================================================================
 */
window.abrirModalUploadCofre = () => {
    const select = document.getElementById('inp-upload-cliente');
    
    if (select) {
        // Ordena a lista de clientes para facilitar o gestor encontrar o contrato certo
        const leadsFiltrados = leadsData.sort((a,b) => a.nome.localeCompare(b.nome));
        
        select.innerHTML = '<option value="">Selecione o Cliente...</option>' + 
            leadsFiltrados.map(l => `
                <option value="${l.id}">${l.nome} (${l.produto || 'Geral'})</option>
            `).join('');
    }
    
    document.getElementById('modal-upload-cofre').classList.add('ativa');
};

const formUploadCofre = document.getElementById('form-upload-cofre');
if (formUploadCofre) {
    formUploadCofre.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const leadId = document.getElementById('inp-upload-cliente').value;
            const tipo = document.getElementById('inp-upload-tipo').value;
            const fileInput = document.getElementById('inp-upload-arquivo');
            
            if (!leadId) {
                return mostrarToast('Selecione um cliente da lista.', 'erro');
            }
            
            if (!fileInput.files.length) {
                return mostrarToast('Você precisa anexar um arquivo PDF ou Imagem.', 'erro');
            }

            const btn = formUploadCofre.querySelector('button[type="submit"]');
            const txt = btn.innerHTML;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Subindo para a Nuvem...';
            btn.disabled = true;

            const file = fileInput.files[0];
            const prefixo = tipo === 'contrato_url' ? 'contrato' : (tipo === 'comprovante_url' ? 'comp' : 'doc');
            const fileName = `cofre_${leadId}_${prefixo}_${Date.now()}.${file.name.split('.').pop()}`;
            
            const { data, error } = await supabase.storage.from('comprovantes').upload(fileName, file);

            if (error) {
                mostrarToast('Erro de upload. Verifique as regras do bucket.', 'erro');
                btn.innerHTML = txt;
                btn.disabled = false;
                return;
            }

            // Pega a URL pública gerada pelo Storage
            const url = supabase.storage.from('comprovantes').getPublicUrl(fileName).data.publicUrl;
            
            const payload = {};
            payload[tipo] = url;

            const lead = leadsData.find(l => l.id == leadId);
            let hist = lead.historico || [];
            
            hist.push({ 
                data: new Date().toISOString(), 
                msg: `Arquivo anexado diretamente via Cofre por ${perfilAtual.full_name}` 
            });
            
            payload.historico = hist;

            // Insere na linha do Cliente as novas URLs de documentos
            await supabase.from('leads').update(payload).eq('id', leadId);
            
            mostrarToast('Documento criptografado e guardado no Cofre!', 'ok');
            document.getElementById('modal-upload-cofre').classList.remove('ativa');
            
            formUploadCofre.reset();
            btn.innerHTML = txt;
            btn.disabled = false;
            
            carregarLeads();
            
        } catch(err) {
            console.error('Erro na função de upload do cofre:', err);
            mostrarToast('Erro no sistema ao fazer upload.', 'erro');
        }
    });
}

/**
 * ============================================================================
 * 17. DASHBOARD DE GROWTH E MARKETING (AQUISIÇÃO)
 * ============================================================================
 */
function renderizarGrowth() {
    const elTotal = document.getElementById('growth-leads-total');
    const elConv = document.getElementById('growth-conversao');
    const ctxOrigem = document.getElementById('chart-origem');
    const tbodyCanais = document.getElementById('tbody-growth-canais');

    if (!elTotal || !elConv || !ctxOrigem || !tbodyCanais) return;

    const totalLeads = leadsData.length;
    const fechados = leadsData.filter(l => l.status === 'fechados' && l.aprovado === true && !l.estornado);
    
    elTotal.innerText = totalLeads;
    elConv.innerText = totalLeads > 0 ? ((fechados.length / totalLeads) * 100).toFixed(1) + '%' : '0%';

    const origemCounts = {};
    const canalStats = {};

    // Agrupa e conta leads e vendas pela origem (Tag de Aquisição)
    leadsData.forEach(l => {
        const origem = l.origem_lead || 'Indicação';
        
        origemCounts[origem] = (origemCounts[origem] || 0) + 1;
        
        if (!canalStats[origem]) {
            canalStats[origem] = { leads: 0, vendas: 0 };
        }
        
        canalStats[origem].leads += 1;
        
        if (l.status === 'fechados' && l.aprovado === true && !l.estornado) {
            canalStats[origem].vendas += 1;
        }
    });

    if (chartOrigemInstance) {
        chartOrigemInstance.destroy();
    }
    
    const labelsOrigem = Object.keys(origemCounts).length > 0 ? Object.keys(origemCounts) : ['Sem Origem'];
    const dataOrigem = Object.keys(origemCounts).length > 0 ? Object.values(origemCounts) : [1];
    
    // Cores táticas
    const coresOrigem = Object.keys(origemCounts).length > 0 ? ['#38bdf8', '#fb923c', '#a78bfa', '#4ade80', '#f5c518'] : ['#2e3550'];

    chartOrigemInstance = new Chart(ctxOrigem, {
        type: 'doughnut',
        data: { 
            labels: labelsOrigem, 
            datasets: [{ 
                data: dataOrigem, 
                backgroundColor: coresOrigem, 
                borderWidth: 0 
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            cutout: '70%', 
            plugins: { 
                legend: { 
                    position: 'right', 
                    labels: { color: '#7a83a1', font: {size: 11} } 
                } 
            } 
        }
    });

    const canaisArray = Object.keys(canalStats).map(k => ({ nome: k, ...canalStats[k] })).sort((a,b) => b.leads - a.leads);
    
    if (canaisArray.length === 0) {
        tbodyCanais.innerHTML = `
        <tr>
            <td colspan="3" style="text-align:center; padding:30px; color:var(--muted);">
                Aguardando dados estruturados...
            </td>
        </tr>`;
    } else {
        tbodyCanais.innerHTML = canaisArray.map(c => `
        <tr>
            <td style="font-weight:bold; color:var(--text);">${c.nome}</td>
            <td style="text-align:right;">${c.leads}</td>
            <td style="text-align:right; color:var(--fechados); font-weight:bold;">${c.vendas}</td>
        </tr>`).join('');
    }
}

window.atualizarGrowth = () => { 
    mostrarToast('Métricas de Investimento em Ads calculadas e aplicadas.', 'ok'); 
};

/**
 * ============================================================================
 * 18. ARENA DE VENDAS E AGENDA
 * ============================================================================
 */
function renderizarArena() {
    const containerPodio = document.getElementById('arena-podio'); 
    const containerLista = document.getElementById('arena-lista'); 
    if (!containerPodio || !containerLista) return;

    // Filtra apenas as roles da operação de vendas que têm meta para bater
    const vendedores = perfisEquipe.filter(p => p.role === 'vendedor' || p.role === 'sdr');
    
    if (vendedores.length === 0) { 
        containerPodio.innerHTML = `
        <div style="text-align: center; color: var(--muted); width:100%;">
            <i class="ph ph-users-slash" style="font-size:48px; margin-bottom:10px; display:block;"></i>
            Nenhum vendedor disponível para a arena.
        </div>`; 
        containerLista.innerHTML = ''; 
        return; 
    }

    let ranking = vendedores.map(v => {
        const fechados = leadsData.filter(l => l.user_id === v.id && l.status === 'fechados' && l.aprovado === true && !l.estornado);
        const receita = fechados.reduce((soma, l) => soma + Number(l.valor), 0); 
        return { ...v, receita, qtd: fechados.length };
    }).sort((a, b) => b.receita - a.receita);

    if (ranking[0].receita === 0) { 
        containerPodio.innerHTML = `
        <div style="text-align: center; color: var(--muted); width:100%;">
            <i class="ph ph-ghost" style="font-size:48px; margin-bottom:10px; display:block;"></i>
            A arena está vazia! Nenhuma venda finalizada ainda.
        </div>`; 
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
            return `
            <div class="seller-card">
                <div class="seller-top">
                    <div class="seller-avatar" style="font-size:18px;">${inicial}</div>
                    <div class="seller-info">
                        <h4>${i+4}º - ${v.full_name}</h4>
                        <span>Equipe: <strong style="color:var(--accent);">${v.equipe || 'Geral'}</strong></span>
                    </div>
                </div>
                <div class="seller-stats">
                    <div><span>Vendas</span><strong style="color:var(--text)">${v.qtd}</strong></div>
                    <div style="text-align:right;">
                        <span>Faturamento</span>
                        <strong>${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v.receita)}</strong>
                    </div>
                </div>
            </div>`;
        }).join('');
    } else { 
        containerLista.innerHTML = '<p style="color:var(--muted); font-size:13px;">Não há outros competidores na lista no momento.</p>'; 
    }
}

function gerarCardPodio(vendedor, posicao) {
    const inicial = vendedor.full_name ? vendedor.full_name.charAt(0).toUpperCase() : 'V';
    let label = posicao === 1 ? '1º LUGAR' : (posicao === 2 ? '2º LUGAR' : '3º LUGAR');
    let coroa = posicao === 1 ? '<i class="ph ph-crown crown-icon"></i>' : '';
    
    return `
    <div class="podium-item podio-${posicao}">
        ${coroa}
        <div class="podium-avatar">${inicial}</div>
        <div class="podium-block">
            <span style="font-weight:800; font-size:11px; letter-spacing:1px;">${label}</span>
            <h4 style="margin-top:8px;">${vendedor.full_name.split(' ')[0]}</h4>
            <strong>${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(vendedor.receita)}</strong>
            <span style="margin-top:6px; font-weight:bold;">${vendedor.qtd} Vendas</span>
        </div>
    </div>`;
}

function renderizarAgenda() {
    const container = document.getElementById('lista-agenda'); 
    if (!container) return;
    
    let leadsAgendados = leadsData.filter(l => l.data_followup && l.status !== 'fechados' && l.status !== 'perdidos' && l.status !== 'abandonados' && l.user_id === usuarioAtual.id);
    
    if (leadsAgendados.length === 0) { 
        container.innerHTML = `
        <div class="empty-state">
            <i class="ph ph-calendar-blank"></i>
            <p>Sua agenda está livre.<br>Nenhum retorno marcado para negociações ativas.</p>
        </div>`; 
        return; 
    }

    leadsAgendados.sort((a, b) => new Date(a.data_followup) - new Date(b.data_followup));
    let hojeStr = new Date().toISOString().split('T')[0];
    
    let atrasados = []; 
    let hoje = []; 
    let futuros = [];

    leadsAgendados.forEach(l => { 
        if (l.data_followup < hojeStr) {
            atrasados.push(l); 
        } else if (l.data_followup === hojeStr) {
            hoje.push(l); 
        } else {
            futuros.push(l); 
        }
    });

    let html = '';
    
    if (atrasados.length > 0) {
        html += `
        <div class="agenda-group">
            <div class="agenda-group-title atrasado">
                <i class="ph ph-warning-circle"></i> Atrasados (Esfriando)
            </div>
            <div class="agenda-list">${atrasados.map(l => gerarItemAgendaHTML(l, 'atrasado')).join('')}</div>
        </div>`;
    }
    
    if (hoje.length > 0) {
        html += `
        <div class="agenda-group">
            <div class="agenda-group-title hoje">
                <i class="ph ph-calendar-star"></i> Para Hoje
            </div>
            <div class="agenda-list">${hoje.map(l => gerarItemAgendaHTML(l, 'hoje')).join('')}</div>
        </div>`;
    }
    
    if (futuros.length > 0) {
        html += `
        <div class="agenda-group">
            <div class="agenda-group-title">
                <i class="ph ph-calendar-blank"></i> Próximos Retornos
            </div>
            <div class="agenda-list">${futuros.map(l => gerarItemAgendaHTML(l, 'futuro')).join('')}</div>
        </div>`;
    }
    
    container.innerHTML = html;
}

function gerarItemAgendaHTML(l, tipo) {
    let dataShow = l.data_followup.split('-').reverse().join('/'); 
    let numWpp = l.whatsapp.replace(/\D/g, ''); 
    
    if (!numWpp.startsWith('55') && numWpp.length <= 11) {
        numWpp = '55' + numWpp;
    }
    
    let icone = tipo === 'atrasado' ? 'ph-warning' : (tipo === 'hoje' ? 'ph-star' : 'ph-calendar'); 
    let label = tipo === 'hoje' ? 'Hoje' : dataShow;
    
    return `
    <div class="agenda-item ${tipo}" onclick="window.abrirDrawerLead(${l.id})">
        <div class="agenda-item-info">
            <span class="agenda-nome">${l.nome}</span>
            <span style="color:var(--muted); font-size:12px;">
                Produto: <strong style="color:var(--text)">${l.produto}</strong> | Etapa: <strong style="color:var(--text)">${l.status.toUpperCase()}</strong>
            </span>
        </div>
        <div style="display:flex; align-items:center; gap:16px;">
            <button onclick="event.stopPropagation(); window.abrirModalWhatsApp('${numWpp}', '${l.nome}')" style="background: rgba(37,211,102,0.1); border:none; color: #25d366; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; display: flex; align-items: center; gap: 6px; transition:0.2s;">
                <i class="ph ph-whatsapp-logo" style="font-size:16px;"></i> Chamar
            </button>
            <span class="agenda-data ${tipo}"><i class="ph ${icone}"></i> ${label}</span>
        </div>
    </div>`;
}

/**
 * ============================================================================
 * 19. MÓDULOS CFO (CAIXA, DESPESAS, COBRANÇAS E MRR)
 * ============================================================================
 */
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

    if(document.getElementById('caixa-bruto')) {
        document.getElementById('caixa-bruto').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(faturamentoBruto);
    }
    
    if(document.getElementById('caixa-comissao')) {
        document.getElementById('caixa-comissao').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(comissoesDevidasGlobais + comissoesPagas);
    }
    
    if(document.getElementById('caixa-liquido')) {
        document.getElementById('caixa-liquido').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(lucroLiquido);
    }

    const contagemPgto = { 'Pix': 0, 'Cartão de Crédito': 0, 'Boleto': 0 };
    fechadosReais.forEach(l => { 
        let forma = l.forma_pagamento || 'Pix'; 
        contagemPgto[forma] = (contagemPgto[forma] || 0) + Number(l.valor); 
    });

    const ctxPagamentos = document.getElementById('chart-pagamentos');
    if (ctxPagamentos) {
        if (chartPagamentosInstance) {
            chartPagamentosInstance.destroy();
        }
        
        chartPagamentosInstance = new Chart(ctxPagamentos, { 
            type: 'doughnut', 
            data: { 
                labels: Object.keys(contagemPgto), 
                datasets: [{ 
                    data: Object.values(contagemPgto), 
                    backgroundColor: ['#4ade80', '#f5c518', '#7a83a1'], 
                    borderWidth: 0 
                }] 
            }, 
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                cutout: '70%', 
                plugins: { 
                    legend: { position: 'right', labels: { color: '#c4c9e0' } } 
                } 
            } 
        });
    }

    const vendedores = perfisEquipe.filter(p => p.role === 'vendedor' || p.role === 'sdr');
    
    if (vendedores.length === 0) { 
        tbody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align:center; padding: 30px; color:var(--muted);">
                Nenhum vendedor ou SDR na operação.
            </td>
        </tr>`; 
    } else {
        let temDevida = false; 
        let linhasHtml = '';
        
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
            
            linhasHtml += `
            <tr>
                <td style="font-weight: bold; color: var(--text);">${v.full_name}</td>
                <td><span class="badge badge-equipe">${v.equipe || 'Geral'}</span></td>
                <td style="color:var(--fechados); font-weight:bold; text-align:right;">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(receita)}</td>
                <td style="color:var(--accent); font-weight:bold; text-align:right;">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(comissaoDevida)}</td>
                <td style="text-align:center;">
                    <button class="btn-primary" style="padding: 6px 12px; font-size: 12px; margin: 0 auto; width: auto;" onclick="window.pagarComissao('${v.id}', ${comissaoDevida})">
                        <i class="ph ph-wallet"></i> Quitar
                    </button>
                </td>
            </tr>`;
        });
        
        if (!temDevida) { 
            tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding: 30px; color:var(--fechados);">
                    <i class="ph ph-check-circle" style="font-size:24px; display:block;"></i>
                    Todas as comissões pagas! O Livro-Caixa está limpo.
                </td>
            </tr>`; 
        } else { 
            tbody.innerHTML = linhasHtml; 
        }
    }

    const tbodyHistorico = document.getElementById('tbody-historico-pagamentos');
    if (tbodyHistorico) {
        if(pagamentosData.length === 0) { 
            tbodyHistorico.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center; padding: 20px; color:var(--muted);">
                    Nenhum pagamento registrado no livro-caixa de comissões.
                </td>
            </tr>`; 
        } else {
            tbodyHistorico.innerHTML = pagamentosData.map(p => {
                let nomeVend = perfisEquipe.find(x => x.id === p.user_id)?.full_name || 'Vendedor Removido'; 
                let dataLocal = new Date(p.created_at).toLocaleString('pt-BR');
                return `
                <tr>
                    <td style="font-weight: bold; color: var(--text);">${nomeVend}</td>
                    <td style="color: var(--muted); font-size:13px;">${p.responsavel_pagamento}</td>
                    <td style="color:var(--fechados); font-weight:bold; text-align:right;">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(p.valor)}</td>
                    <td style="color: var(--muted); font-size:12px; text-align:right;">${dataLocal}</td>
                </tr>`;
            }).join('');
        }
    }
}

window.pagarComissao = async (userId, valorDevido) => {
    window.abrirConfirmacao('Quitar Comissão', `Confirmar o pagamento de <strong>${new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(valorDevido)}</strong>? Isso vai zerar as dívidas atuais deste profissional.`, 'Confirmar Pagamento', async () => {
        
        mostrarToast('Processando pagamento...', 'ok');
        
        const leadsParaPagar = leadsData.filter(l => l.user_id === userId && l.status === 'fechados' && l.aprovado === true && !l.comissao_paga && !l.estornado); 
        const ids = leadsParaPagar.map(l => l.id);
        
        try {
            if(ids.length > 0) { 
                await supabase.from('leads').update({ comissao_paga: true }).in('id', ids); 
            }
            
            await supabase.from('pagamentos_comissao').insert([{ 
                user_id: userId, 
                valor: valorDevido, 
                responsavel_pagamento: perfilAtual.full_name 
            }]);
            
            mostrarToast('Comissão quitada e registrada no Livro-Caixa!', 'ok'); 
            carregarLeads(); 
        } catch(err) {
            console.error(err);
            mostrarToast('Erro ao processar baixa de comissão.', 'erro');
        }
    });
};

window.estornarVenda = async (leadId) => {
    window.abrirConfirmacao('Estornar Venda (Chargeback)', '<strong style="color:var(--danger);">Atenção Crítica:</strong> Isso vai remover o valor do Faturamento Global, retirar a comissão projetada do vendedor e marcar o cliente como ESTORNADO de forma irreversível. Você confirma?', 'Estornar Dinheiro', async () => {
        
        try {
            const lead = leadsData.find(l => l.id == leadId); 
            let historicoAtual = lead.historico || []; 
            
            historicoAtual.push({ 
                data: new Date().toISOString(), 
                msg: `⚠️ ESTORNO/CHARGEBACK registrado e validado por ${perfilAtual.full_name}` 
            });
            
            await supabase.from('leads').update({ 
                status: 'perdidos', 
                motivo_perda: 'Chargeback / Cancelamento Forçado', 
                aprovado: false, 
                estornado: true, 
                historico: historicoAtual 
            }).eq('id', leadId);
            
            mostrarToast('Venda estornada! Valores retirados dos Dashboards da empresa.', 'ok'); 
            document.getElementById('drawer-lead').classList.remove('ativa'); 
            carregarLeads();
        } catch(err) {
            console.error(err);
        }
    });
};

function renderizarAprovacoes() {
    const tbody = document.getElementById('tbody-aprovacoes'); 
    const badge = document.getElementById('badge-aprov'); 
    
    if (!tbody || !badge) return;

    const pendentes = leadsData.filter(l => l.status === 'fechados' && l.aprovado !== true && !l.estornado);
    
    badge.innerText = pendentes.length; 
    
    if (pendentes.length > 0) {
        badge.classList.remove('hidden'); 
    } else {
        badge.classList.add('hidden');
    }
    
    if (pendentes.length === 0) { 
        tbody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align:center; padding: 30px; color:var(--fechados);">
                <i class="ph ph-check-circle" style="font-size:32px; display:block; margin-bottom:8px;"></i>
                Tudo limpo! Nenhuma aprovação de caixa pendente no momento.
            </td>
        </tr>`; 
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
                <button onclick="window.rejeitarVenda(${l.id})" class="btn-rejeitar">
                    <i class="ph ph-x"></i> Rejeitar
                </button>
                <button onclick="window.aprovarVenda(${l.id})" class="btn-aprovar">
                    <i class="ph ph-check-circle"></i> Aprovar
                </button>
            </td>
        </tr>`;
    }).join('');
}

window.aprovarVenda = async (id) => {
    try {
        const lead = leadsData.find(l => l.id == id); 
        let historicoAtual = lead.historico || []; 
        
        historicoAtual.push({ 
            data: new Date().toISOString(), 
            msg: `Venda APROVADA e conferida no Financeiro por ${perfilAtual.full_name}` 
        });
        
        await supabase.from('leads').update({ 
            aprovado: true, 
            historico: historicoAtual 
        }).eq('id', id); 
        
        mostrarToast('Venda Aprovada! O cliente caiu na esteira de Pós-Venda 💰', 'ok'); 
        carregarLeads();
    } catch(err) {
        console.error(err);
    }
};

window.rejeitarVenda = async (id) => {
    try {
        const lead = leadsData.find(l => l.id == id); 
        let historicoAtual = lead.historico || []; 
        
        historicoAtual.push({ 
            data: new Date().toISOString(), 
            msg: `Venda REJEITADA no Caixa por ${perfilAtual.full_name}` 
        });
        
        await supabase.from('leads').update({ 
            status: 'negociacao', 
            aprovado: false, 
            historico: historicoAtual 
        }).eq('id', id); 
        
        mostrarToast('Venda Rejeitada. Retornou para o funil do vendedor.', 'erro'); 
        carregarLeads();
    } catch(err) {
        console.error(err);
    }
};

// ============================================================================
// 20. DESPESAS E CUSTOS OPERACIONAIS
// ============================================================================
async function carregarDespesas() { 
    const { data, error } = await supabase
        .from('despesas')
        .select('*')
        .order('vencimento', { ascending: true }); 
        
    despesasData = data || []; 
    renderizarDespesas(); 
}

function renderizarDespesas() {
    const tbody = document.getElementById('tbody-despesas'); 
    if (!tbody) return;
    
    if (despesasData.length === 0) { 
        tbody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align:center; padding:30px; color:var(--muted);">
                Nenhuma despesa ou custo operacional lançado neste mês.
            </td>
        </tr>`; 
        return; 
    }
    
    tbody.innerHTML = despesasData.map(d => {
        let statusBadge = d.status === 'Pago' 
            ? `<span class="badge badge-verde">PAGO</span>` 
            : `<span class="badge badge-vermelho">PENDENTE</span>`;
            
        let dataVenc = new Date(d.vencimento).toLocaleDateString('pt-BR');
        
        let btnAcao = d.status === 'Pendente' 
            ? `
            <div style="display:flex; justify-content:center; gap:8px;">
                <button class="btn-primary" style="padding: 4px 8px; font-size: 12px; width: auto; margin:0;" onclick="window.quitarDespesa(${d.id})">
                    <i class="ph ph-check"></i> Pagar
                </button>
                <button class="btn-cancel" style="padding: 4px 8px; font-size: 12px; width: auto; margin:0; border-color:var(--danger); color:var(--danger);" onclick="window.deletarDespesa(${d.id})">
                    <i class="ph ph-trash"></i>
                </button>
            </div>` 
            : `
            <div style="display:flex; justify-content:center; gap:8px;">
                <span style="font-size:12px; color:var(--muted); align-self:center;">
                    <i class="ph ph-check-all"></i> Quitado
                </span>
                <button class="btn-cancel" style="padding: 4px 8px; font-size: 12px; width: auto; margin:0; border-color:var(--danger); color:var(--danger);" onclick="window.deletarDespesa(${d.id})">
                    <i class="ph ph-trash"></i>
                </button>
            </div>`;
            
        return `
        <tr>
            <td style="font-weight: bold; color: var(--text);">${d.descricao}</td>
            <td><span class="badge" style="background:rgba(255,255,255,0.05); color:var(--muted);">Custo Fixo</span></td>
            <td style="color:var(--muted);">${dataVenc}</td>
            <td style="text-align:right; font-weight:bold; color:var(--danger);">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(d.valor)}</td>
            <td>${statusBadge}</td>
            <td style="text-align:center;">${btnAcao}</td>
        </tr>`;
    }).join('');
}

window.quitarDespesa = async (id) => { 
    window.abrirConfirmacao('Quitar Despesa Operacional', 'Confirmar a saída deste dinheiro do caixa e o pagamento desta conta?', 'Confirmar Pagamento', async () => { 
        mostrarToast('Processando e validando baixa...', 'ok'); 
        
        try {
            const { error } = await supabase.from('despesas').update({ status: 'Pago' }).eq('id', id); 
            
            if (error) {
                mostrarToast('Erro ao atualizar conta no sistema.', 'erro'); 
            } else { 
                mostrarToast('Despesa quitada com sucesso e registrada.', 'ok'); 
                carregarDespesas(); 
            } 
        } catch(err) {
            console.error(err);
        }
    }); 
};

window.deletarDespesa = async (id) => { 
    window.abrirConfirmacao('Excluir Despesa', 'Deseja remover completamente este lançamento de custo do sistema?', 'Apagar Registro', async () => { 
        try {
            await supabase.from('despesas').delete().eq('id', id); 
            mostrarToast('Lançamento deletado e removido dos cálculos.', 'ok'); 
            carregarDespesas(); 
        } catch(err) {
            console.error(err);
        }
    }); 
};

const formDespesa = document.getElementById('form-despesa');

if (formDespesa) {
    formDespesa.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        
        try {
            const desc = document.getElementById('inp-desp-desc').value; 
            const val = document.getElementById('inp-desp-valor').value; 
            const dataV = document.getElementById('inp-desp-data').value;
            
            const { error } = await supabase.from('despesas').insert([{ 
                descricao: desc, 
                valor: val, 
                vencimento: dataV, 
                status: 'Pendente' 
            }]);
            
            if (error) {
                mostrarToast('Erro interno ao salvar despesa.', 'erro'); 
            } else { 
                document.getElementById('modal-despesa').classList.remove('ativa'); 
                formDespesa.reset(); 
                mostrarToast('Nova Despesa Operacional registrada na matriz.', 'ok'); 
                carregarDespesas(); 
            }
        } catch(err) {
            console.error(err);
        }
    });
}

// ============================================================================
// 21. COBRANÇAS, INADIMPLÊNCIA E CARTEIRA DE ASSINANTES (MRR)
// ============================================================================
function renderizarCobrancas() {
    const tbodyAtrasados = document.getElementById('tbody-cobrancas'); 
    const tbodyEstornos = document.getElementById('tbody-estornos'); 
    
    if (!tbodyAtrasados || !tbodyEstornos) return;
    
    const inadimplentes = leadsData.filter(l => l.is_inadimplente === true && !l.estornado); 
    const estornados = leadsData.filter(l => l.estornado === true);
    
    let valorRisco = inadimplentes.reduce((acc, l) => acc + Number(l.valor), 0); 
    
    // Calcula Recuperados olhando para o histórico oficial de logs
    let recuperado = leadsData.filter(l => l.historico && l.historico.some(h => h.msg.includes('Dívida Quitada'))).reduce((acc, l) => acc + Number(l.valor), 0);
    
    if (document.getElementById('cobranca-risco')) {
        document.getElementById('cobranca-risco').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(valorRisco);
    }
    if (document.getElementById('cobranca-qtd')) {
        document.getElementById('cobranca-qtd').innerText = inadimplentes.length;
    }
    if (document.getElementById('cobranca-recuperado')) {
        document.getElementById('cobranca-recuperado').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(recuperado);
    }

    if (inadimplentes.length === 0) { 
        tbodyAtrasados.innerHTML = `
        <tr>
            <td colspan="5" style="text-align:center; padding:30px; color:var(--muted);">
                Nenhum cliente está inadimplente no momento.
            </td>
        </tr>`; 
    } else {
        tbodyAtrasados.innerHTML = inadimplentes.map(l => {
            let numWpp = l.whatsapp.replace(/\D/g, ''); 
            if (!numWpp.startsWith('55') && numWpp.length <= 11) {
                numWpp = '55' + numWpp;
            }
            
            return `
            <tr>
                <td style="font-weight: bold; color: var(--text);">${l.nome}</td>
                <td>${l.produto || 'Geral'}</td>
                <td style="color:var(--muted); font-size:12px;">${l.forma_pagamento || 'Pix'} em Atraso</td>
                <td style="text-align:right; font-weight:bold; color:var(--danger);">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(l.valor)}</td>
                <td style="text-align:center; display:flex; gap:8px; justify-content:center;">
                    <button class="btn-cancel" onclick="window.abrirModalWhatsApp('${numWpp}', '${l.nome}')" style="padding:4px 8px; width:auto; font-size:12px; border-color:#25d366; color:#25d366;">
                        <i class="ph ph-whatsapp-logo"></i> Cobrar
                    </button>
                    <button class="btn-primary" onclick="window.quitarInadimplencia(${l.id})" style="padding:4px 8px; width:auto; font-size:12px; margin-top:0;">
                        <i class="ph ph-check"></i> Baixa Pagto.
                    </button>
                </td>
            </tr>`;
        }).join('');
    }

    if (estornados.length === 0) { 
        tbodyEstornos.innerHTML = `
        <tr>
            <td colspan="4" style="text-align:center; padding:30px; color:var(--muted);">
                Nenhum estorno financeiro registrado na base.
            </td>
        </tr>`; 
    } else {
        tbodyEstornos.innerHTML = estornados.map(l => {
            return `
            <tr>
                <td style="font-weight: bold; color: var(--text);">${l.nome}</td>
                <td>${l.produto || 'Geral'}</td>
                <td style="color:var(--danger); font-size:12px;">
                    <i class="ph ph-trend-down"></i> ${l.motivo_perda || 'Chargeback Confirmado'}
                </td>
                <td style="text-align:right; font-weight:bold; color:var(--danger); text-decoration:line-through;">
                    ${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(l.valor)}
                </td>
            </tr>`;
        }).join('');
    }
}

window.marcarInadimplente = async (leadId) => { 
    window.abrirConfirmacao('Sinalizar Inadimplência Oficial', 'Tem certeza que este cliente atrasou o pagamento ou o boleto falhou? Ele será enviado para a Central de Cobranças do Financeiro e ficará amarelo no Kanban.', 'Sinalizar Atraso', async () => { 
        try {
            const lead = leadsData.find(l => l.id == leadId); 
            let historicoAtual = lead.historico || []; 
            
            historicoAtual.push({ 
                data: new Date().toISOString(), 
                msg: `⚠️ Marcado como INADIMPLENTE na mesa de cobrança por ${perfilAtual.full_name}` 
            }); 
            
            await supabase.from('leads').update({ 
                is_inadimplente: true, 
                historico: historicoAtual 
            }).eq('id', leadId); 
            
            mostrarToast('Cliente enviado oficialmente para a régua de cobrança.', 'ok'); 
            document.getElementById('drawer-lead').classList.remove('ativa'); 
            
            carregarLeads(); 
        } catch(err) {
            console.error(err);
        }
    }); 
};

window.quitarInadimplencia = async (leadId) => { 
    window.abrirConfirmacao('Baixa de Pagamento Atrasado', 'O cliente realizou o pagamento do atraso? A dívida será perdoada e ele sairá da lista de devedores.', 'Confirmar Pagamento e Baixa', async () => { 
        try {
            const lead = leadsData.find(l => l.id == leadId); 
            let historicoAtual = lead.historico || []; 
            
            historicoAtual.push({ 
                data: new Date().toISOString(), 
                msg: `✅ Dívida Quitada. Marcado como PAGO na cobrança por ${perfilAtual.full_name}` 
            }); 
            
            await supabase.from('leads').update({ 
                is_inadimplente: false, 
                historico: historicoAtual 
            }).eq('id', leadId); 
            
            mostrarToast('Pagamento registrado. Cliente recuperado e o valor voltou para o sistema!', 'ok'); 
            carregarLeads(); 
        } catch(err) {
            console.error(err);
        }
    }); 
};

// ==================== CFO: MRR (Base Recorrente) ====================
function renderizarMRR() {
    const tbody = document.getElementById('tbody-mrr'); 
    if (!tbody) return;
    
    const assinantes = leadsData.filter(l => l.is_recorrente === true && l.status === 'fechados' && l.aprovado === true && !l.estornado);
    
    let mrrAtivo = 0;
    let mrrChurn = 0;
    let qtdAtivos = 0; 
    let linhasHtml = '';

    assinantes.forEach(l => {
        const valor = Number(l.valor); 
        const statusAss = l.status_assinatura || 'ativa';
        
        if (statusAss === 'ativa') { 
            mrrAtivo += valor; 
            qtdAtivos++; 
        } else { 
            mrrChurn += valor; 
        }
        
        let badgeStatus = statusAss === 'ativa' 
            ? `<span class="badge badge-verde">ATIVA</span>` 
            : `<span class="badge badge-vermelho">CANCELADA (CHURN)</span>`;
            
        let corValor = statusAss === 'ativa' 
            ? 'color: var(--text);' 
            : 'color: var(--danger); text-decoration: line-through;';
        
        linhasHtml += `
        <tr>
            <td style="font-weight: bold; color: var(--text);">${l.nome}</td>
            <td>${l.produto || 'Geral'}</td>
            <td style="text-align:right; font-weight:bold; ${corValor}">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(valor)} /mês</td>
            <td>${badgeStatus}</td>
            <td style="text-align:center;">
                <button class="btn-cancel" style="padding:4px 8px; width:auto; margin:0 auto; font-size:12px; color:var(--danger); border-color:var(--danger2);" onclick="window.removerAssinanteBase(${l.id})">
                    <i class="ph ph-trash"></i> Remover da Base
                </button>
            </td>
        </tr>`;
    });

    if (document.getElementById('mrr-atual')) {
        document.getElementById('mrr-atual').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(mrrAtivo);
    }
    
    if (document.getElementById('mrr-ativos')) {
        document.getElementById('mrr-ativos').innerText = qtdAtivos;
    }
    
    if (document.getElementById('mrr-churn')) {
        document.getElementById('mrr-churn').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(mrrChurn);
    }
    
    if (assinantes.length === 0) { 
        tbody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align:center; padding:30px; color:var(--muted);">
                Nenhum cliente marcou a tag de Assinatura (MRR) na base de dados.
            </td>
        </tr>`; 
    } else { 
        tbody.innerHTML = linhasHtml; 
    }
}

window.cancelarAssinatura = async (leadId) => { 
    window.abrirConfirmacao('Registrar Churn e Cancelamento', 'Tem certeza que este cliente pediu o cancelamento da assinatura mensal? O valor sairá do cálculo de MRR e passará a constar como Churn na empresa.', 'Confirmar Churn (Perda)', async () => { 
        try {
            const lead = leadsData.find(l => l.id == leadId); 
            let historicoAtual = lead.historico || []; 
            
            historicoAtual.push({ 
                data: new Date().toISOString(), 
                msg: `❌ Assinatura Cancelada Definitivamente (Churn) por ${perfilAtual.full_name}` 
            }); 
            
            await supabase.from('leads').update({ 
                status_assinatura: 'cancelado', 
                historico: historicoAtual 
            }).eq('id', leadId); 
            
            mostrarToast('Assinatura e MRR cancelados.', 'ok'); 
            document.getElementById('drawer-lead').classList.remove('ativa'); 
            carregarLeads(); 
        } catch(err) {
            console.error(err);
        }
    }); 
};

window.removerAssinanteBase = (id) => {
    window.abrirConfirmacao('Remover da Base de MRR', 'Isso removerá o cliente definitivamente da lista de assinantes (a tag MRR será desmarcada) e apagará o histórico de churn/receita deste lead específico. Confirmar?', 'Remover Sem Dó', async () => {
        try {
            let lead = leadsData.find(l => l.id == id);
            let hist = lead.historico || [];
            
            hist.push({ 
                data: new Date().toISOString(), 
                msg: `Expulso da base de assinantes e da matriz de MRR por ${perfilAtual.full_name}` 
            });
            
            await supabase.from('leads').update({
                is_recorrente: false,
                status_assinatura: null,
                historico: hist
            }).eq('id', id);
            
            mostrarToast('Removido limpo da base MRR.', 'ok');
            carregarLeads();
        } catch(err) {
            console.error(err);
        }
    });
};

function renderizarContratos() {
    const tbody = document.getElementById('tbody-contratos'); 
    if (!tbody) return;
    
    // Filtra quem tem contrato, documento importante OU comprovante financeiro no cofre
    const contratos = leadsData.filter(l => (l.contrato_url && l.contrato_url !== '') || (l.doc_importante_url && l.doc_importante_url !== '') || (l.comprovante_url && l.comprovante_url !== ''));

    if (contratos.length === 0) { 
        tbody.innerHTML = `
        <tr>
            <td colspan="4" style="text-align:center; padding:30px; color:var(--muted);">
                O Cofre de GED está vazio. Nenhum contrato ou documento fiscal foi anexado na matriz.
            </td>
        </tr>`; 
        return; 
    }
    
    tbody.innerHTML = contratos.map(l => {
        let dataUpload = l.historico ? [...l.historico].reverse().find(h => h.msg.includes('Gaveta atualizada') || h.msg.includes('Cofre'))?.data : l.created_at; 
        let dataStr = dataUpload ? new Date(dataUpload).toLocaleDateString('pt-BR') : 'Data não informada';
        
        let links = '';
        
        if (l.contrato_url) {
            links += `<a href="${l.contrato_url}" target="_blank" class="btn-anexo" style="border-color:#b388ff; color:#b388ff; margin-right:6px;"><i class="ph ph-folder-lock"></i> Contrato Oficial</a>`;
        }
        if (l.doc_importante_url) {
            links += `<a href="${l.doc_importante_url}" target="_blank" class="btn-anexo" style="border-color:#4fc3f7; color:#4fc3f7; margin-right:6px;"><i class="ph ph-file-text"></i> Doc. do Cliente</a>`;
        }
        if (l.comprovante_url) {
            links += `<a href="${l.comprovante_url}" target="_blank" class="btn-anexo" style="border-color:var(--novos); color:var(--novos);"><i class="ph ph-receipt"></i> Comprovante</a>`;
        }
        
        return `
        <tr>
            <td style="font-weight: bold; color: var(--text);">${l.nome}</td>
            <td><span class="badge badge-equipe">${l.produto || 'Serviço Padrão'}</span></td>
            <td style="color:var(--muted); font-size:12px;">${dataStr}</td>
            <td style="text-align: right;">${links}</td>
        </tr>`;
    }).join('');
}

function renderizarAuditoriaDescontos() {
    const tbody = document.getElementById('tbody-auditoria-descontos'); 
    if (!tbody) return;
    
    const vendasAprovadas = leadsData.filter(l => l.status === 'fechados' && l.aprovado === true && !l.estornado); 
    let temDesconto = false; 
    let linhasHtml = '';

    vendasAprovadas.forEach(lead => {
        const produtoCatalogo = produtosData.find(p => p.nome === lead.produto); 
        if (!produtoCatalogo) return;
        
        const precoOriginal = Number(produtoCatalogo.valor); 
        const precoVendido = Number(lead.valor);
        
        // Verifica quebra de margem baseada na tabela matriz de catálogo
        if (precoVendido < precoOriginal) {
            temDesconto = true; 
            
            const vendedor = perfisEquipe.find(p => p.id === lead.user_id)?.full_name || 'Usuário Não Encontrado';
            const diferenca = precoOriginal - precoVendido; 
            const porcentagemDesconto = (diferenca / precoOriginal) * 100;
            
            let corDesconto = porcentagemDesconto > 20 
                ? 'color: var(--danger); font-weight: 800;' 
                : 'color: var(--negociacao); font-weight: bold;';
            
            linhasHtml += `
            <tr>
                <td style="font-weight: bold; color: var(--text);">${vendedor}</td>
                <td>${lead.produto}</td>
                <td style="text-align:right; color: var(--muted); text-decoration: line-through;">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(precoOriginal)}</td>
                <td style="text-align:right; color: var(--fechados); font-weight: bold;">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(precoVendido)}</td>
                <td style="text-align:center; ${corDesconto}">${porcentagemDesconto.toFixed(1)}% DE DESCONTO APLICADO</td>
            </tr>`;
        }
    });

    if (!temDesconto) { 
        tbody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align:center; padding: 40px; color:var(--fechados);">
                <i class="ph ph-shield-check" style="font-size:32px; display:block; margin-bottom:8px;"></i>
                Excelente! Nenhum vendedor quebrou a margem da base oficial. Margem de lucro corporativa protegida!
            </td>
        </tr>`; 
    } else { 
        tbody.innerHTML = linhasHtml; 
    }
}

/**
 * ============================================================================
 * 22. EXPORTAÇÃO E LOGS DE AUDITORIA DO CEO
 * ============================================================================
 */
function getLeadsExportacao() {
    const filterStatus = document.getElementById('export-filter-status').value; 
    let exportList = leadsData; 
    
    if (filterStatus === 'fechados') {
        exportList = exportList.filter(l => l.status === 'fechados' && l.aprovado === true && !l.estornado);
    } else if (filterStatus === 'abertos') {
        exportList = exportList.filter(l => l.status !== 'fechados' || (l.status === 'fechados' && !l.aprovado));
    } else if (filterStatus === 'perdidos') {
        exportList = exportList.filter(l => l.status === 'perdidos' || l.estornado); 
    } else if (filterStatus === 'abandonados') {
        exportList = exportList.filter(l => l.status === 'abandonados'); 
    }
    
    return exportList;
}

function renderizarTabelaExportacao() {
    const tbody = document.getElementById('tbody-export'); 
    if (!tbody) return;
    
    const list = getLeadsExportacao();
    
    if (list.length === 0) { 
        tbody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align:center; padding: 30px; color:var(--muted);">
                Nenhum dado encontrado para exportação com o filtro atual da tela.
            </td>
        </tr>`; 
        return; 
    }
    
    tbody.innerHTML = list.map(l => {
        let statusBadge = l.status === 'novos' ? 'badge-azul' : 
                          (l.status === 'negociacao' ? 'badge-amarelo' : 
                          (l.status === 'perdidos' || l.estornado ? 'badge-vermelho' : 
                          (l.status === 'abandonados' ? 'badge-equipe' : 'badge-verde')));
                          
        return `
        <tr>
            <td style="font-weight: bold; color: var(--text);">${l.nome}</td>
            <td style="color: var(--muted);">${l.whatsapp}</td>
            <td>${l.produto || 'Geral'}</td>
            <td style="color:var(--text); font-weight:bold; text-align:right;">R$ ${Number(l.valor).toFixed(2)}</td>
            <td><span class="badge ${statusBadge}">${l.estornado ? 'ESTORNADO NO CAIXA' : l.status.toUpperCase()}</span></td>
            <td style="color: var(--muted); font-size:12px;">${l.created_at ? new Date(l.created_at).toLocaleDateString('pt-BR') : 'Sem Registro'}</td>
        </tr>`;
    }).join('');
}

const filterSelect = document.getElementById('export-filter-status'); 
if (filterSelect) {
    filterSelect.addEventListener('change', renderizarTabelaExportacao);
}

async function registrarAuditoriaExportacao(tipo, qtd) { 
    try {
        await supabase.from('logs_exportacao').insert([{ 
            usuario: perfilAtual.full_name, 
            tipo: tipo, 
            quantidade: qtd 
        }]); 
        
        carregarAuditoriaExportacao(); 
    } catch (err) {
        console.error('Falha de escrita no log:', err);
    }
}

async function carregarAuditoriaExportacao() {
    const tbody = document.getElementById('tbody-logs-exportacao'); 
    if (!tbody) return;
    
    const { data } = await supabase
        .from('logs_exportacao')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10); 
        
    logsExportacaoData = data || [];
    
    if(logsExportacaoData.length === 0) { 
        tbody.innerHTML = `
        <tr>
            <td colspan="4" style="text-align:center; padding: 20px; color:var(--muted);">
                Nenhuma exportação corporativa realizada ainda. O log de segurança está limpo.
            </td>
        </tr>`; 
        return; 
    }
    
    tbody.innerHTML = logsExportacaoData.map(log => `
        <tr>
            <td style="font-weight: bold; color: var(--text);">${log.usuario}</td>
            <td>
                ${log.tipo === 'EXCEL' ? '<i class="ph ph-file-csv" style="color:#21a366;"></i>' : '<i class="ph ph-file-pdf" style="color:#dc3545;"></i>'} 
                ${log.tipo}
            </td>
            <td><strong style="color:var(--novos)">${log.quantidade}</strong> Leads Processados</td>
            <td style="color: var(--muted); font-size:12px; text-align:right;">${new Date(log.created_at).toLocaleString('pt-BR')}</td>
        </tr>`).join('');
}

window.exportarCSV = () => {
    const list = getLeadsExportacao(); 
    if (list.length === 0) return mostrarToast('Atenção: Não há dados para exportar na tela atual.', 'erro');
    
    const headers = ["Nome Completo do Cliente", "WhatsApp Registrado", "Produto Matriz", "Forma de Pagamento", "Valor do Contrato (R$)", "Status Final", "Data de Criação do Lead", "Anotações e Fichas"];
    
    const rows = list.map(l => `"${l.nome}";"${l.whatsapp}";"${l.produto || 'Geral'}";"${l.forma_pagamento || 'Pix'}";"${l.valor}";"${l.estornado ? 'ESTORNADO FINANCEIRAMENTE' : l.status}";"${l.created_at ? new Date(l.created_at).toLocaleDateString('pt-BR') : '-'}";"${l.notas ? l.notas.replace(/(\r\n|\n|\r)/gm, " ").replace(/;/g, ",").replace(/"/g, '""') : ""}"`);
    
    const csvContent = "\uFEFF" + headers.join(";") + "\n" + rows.join("\n"); 
    
    const link = document.createElement("a"); 
    link.setAttribute("href", URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }))); 
    link.setAttribute("download", `relatorio_corporativo_hapsis_${new Date().getTime()}.csv`); 
    
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link);
    
    registrarAuditoriaExportacao('EXCEL', list.length); 
    mostrarToast('Planilha extraída e baixada com sucesso!', 'ok');
};

window.exportarPDF = () => {
    const list = getLeadsExportacao(); 
    
    if (list.length === 0) return mostrarToast('Atenção: Não há dados para montar o relatório PDF.', 'erro');
    
    const janela = window.open('', '_blank');
    let html = `
    <html>
        <head>
            <title>Relatório Gerencial HAPSIS</title>
            <style>
                body{font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding:40px; color:#333; line-height: 1.6;}
                h1{border-bottom:3px solid #f5c518; padding-bottom: 15px; color: #10121a; text-transform: uppercase;}
                table{width:100%; border-collapse:collapse; margin-top:30px;}
                th, td{padding:14px; border-bottom:1px solid #ddd; text-align:left; font-size: 14px;}
                th{background:#f8f9fa; color: #555;}
                .header-info { margin-top: 15px; font-weight: bold; color: #666; font-size: 14px; }
                @media print{body{padding:0;}}
            </style>
        </head>
        <body>
            <h1>Relatório Executivo de Vendas</h1>
            <div class="header-info">
                <p>Data de Extração: ${new Date().toLocaleDateString('pt-BR')}</p>
                <p>Emitido e Assinado por: ${perfilAtual.full_name}</p>
                <p>Volume de Dados Lidos: ${list.length} Registros Consolidados</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Nome do Cliente</th>
                        <th>WhatsApp</th>
                        <th>Produto Matriz</th>
                        <th style="text-align:right;">Valor Final</th>
                        <th>Status Atual</th>
                    </tr>
                </thead>
                <tbody>
                    ${list.map(l => `
                    <tr>
                        <td><strong>${l.nome}</strong></td>
                        <td>${l.whatsapp}</td>
                        <td>${l.produto||'-'}</td>
                        <td style="text-align:right; font-weight:bold; color:#21a366;">R$ ${Number(l.valor).toFixed(2)}</td>
                        <td>${l.estornado ? 'ESTORNADO/CHURN' : l.status.toUpperCase()}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
            <script>window.onload=()=>{window.print();window.close();}</script>
        </body>
    </html>`;
    
    janela.document.write(html); 
    janela.document.close(); 
    
    registrarAuditoriaExportacao('PDF', list.length);
};

// ============================================================================
// 23. PAINEL EXECUTIVO CORPORATIVO (DASHBOARD CEO/GROWTH)
// ============================================================================
function renderizarGestor() {
    const fechadosReais = leadsData.filter(l => l.status === 'fechados' && l.aprovado === true && !l.estornado); 
    const faturamento = fechadosReais.reduce((acc, l) => acc + Number(l.valor), 0);
    
    if (document.getElementById('chefao-faturamento')) {
        document.getElementById('chefao-faturamento').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(faturamento);
    }
    
    if (document.getElementById('chefao-ticket')) {
        document.getElementById('chefao-ticket').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(fechadosReais.length ? faturamento / fechadosReais.length : 0);
    }
    
    if (document.getElementById('chefao-forecast')) { 
        let somaNovos = leadsData.filter(l => l.status === 'novos').reduce((acc, l) => acc + Number(l.valor), 0); 
        let somaNegociacao = leadsData.filter(l => l.status === 'negociacao').reduce((acc, l) => acc + Number(l.valor), 0); 
        
        // Ponderação do pipeline preditivo: 10% de conversão dos novos, 50% de chance dos em negociação
        document.getElementById('chefao-forecast').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format((somaNovos * 0.10) + (somaNegociacao * 0.50)); 
    }

    // =======================================================
    // MOTOR GRÁFICO (Chart.js) PARA O DASHBOARD
    // =======================================================
    const ctxFugasLinha = document.getElementById('chart-fugas-linha'); 
    const ctxFugasMotivos = document.getElementById('chart-fugas-motivos');
    
    if (ctxFugasLinha && ctxFugasMotivos) {
        
        const perdidos = leadsData.filter(l => l.status === 'perdidos' || l.estornado || l.status === 'abandonados'); 
        const contagemMotivos = {}; 
        
        perdidos.forEach(l => { 
            const m = l.motivo_perda || 'Ghosting / Sem Registro'; 
            contagemMotivos[m] = (contagemMotivos[m] || 0) + 1; 
        });
        
        if (chartFugasMotivosInstance) {
            chartFugasMotivosInstance.destroy(); 
        }
        
        const labelsFugas = Object.keys(contagemMotivos).length > 0 ? Object.keys(contagemMotivos) : ['Sem perdas na operação'];
        const dataFugas = Object.keys(contagemMotivos).length > 0 ? Object.values(contagemMotivos) : [1];
        
        // Correção Crítica de Design: Se não tiver perda, pinta de cinza corporativo e não de cor de erro
        const coresFugas = Object.keys(contagemMotivos).length > 0 
            ? ['#f05252', '#fb923c', '#f87171', '#f43f5e', '#c084fc', '#8890aa'] 
            : ['#2e3550'];

        chartFugasMotivosInstance = new Chart(ctxFugasMotivos, { 
            type: 'doughnut', 
            data: { 
                labels: labelsFugas, 
                datasets: [{ 
                    data: dataFugas, 
                    backgroundColor: coresFugas, 
                    borderWidth: 0 
                }] 
            }, 
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                cutout: '72%', 
                plugins: { 
                    legend: { position: 'right', labels: { color: '#c4c9e0', font: {size: 11} } } 
                } 
            } 
        });

        // Monta o array da última semana para o gráfico de linha de perdas financeiras
        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']; 
        let valores7Dias = [0,0,0,0,0,0,0]; 
        let labels7Dias = []; 
        let hoje = new Date(); 
        
        for(let i=6; i>=0; i--) { 
            let d = new Date(); 
            d.setDate(hoje.getDate() - i); 
            labels7Dias.push(diasSemana[d.getDay()]); 
        }
        
        perdidos.forEach(l => { 
            let dataPerda = new Date(l.created_at); 
            
            if (l.historico && l.historico.length > 0) { 
                const logPerda = l.historico.find(h => h.msg.includes('PERDIDO') || h.msg.includes('ESTORNO') || h.msg.includes('ABANDONADO')); 
                if (logPerda) {
                    dataPerda = new Date(logPerda.data); 
                }
            } 
            
            let diffDias = Math.floor((hoje.getTime() - dataPerda.getTime()) / (1000 * 3600 * 24)); 
            
            if(diffDias >= 0 && diffDias <= 6) { 
                valores7Dias[6 - diffDias] += Number(l.valor); 
            } 
        });
        
        if (chartFugasLinhaInstance) {
            chartFugasLinhaInstance.destroy(); 
        }
        
        chartFugasLinhaInstance = new Chart(ctxFugasLinha, { 
            type: 'line', 
            data: { 
                labels: labels7Dias, 
                datasets: [{ 
                    label: 'Volume Monetário Perdido (R$)', 
                    data: valores7Dias, 
                    borderColor: '#f05252', 
                    backgroundColor: 'rgba(240,82,82,0.1)', 
                    borderWidth: 2.5, 
                    pointBackgroundColor: '#f05252', 
                    fill: true, 
                    tension: 0.45 
                }] 
            }, 
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: { display: false } }, 
                scales: { 
                    y: { beginAtZero: true, grid: { color: '#2e3550' }, ticks: { color: '#7a83a1' } }, 
                    x: { grid: { display: false }, ticks: { color: '#7a83a1' } } 
                } 
            } 
        });
    }

    // =======================================================
    // TABELAS DINÂMICAS DO PAINEL DO CEO
    // =======================================================
    const ranking = {}; 
    
    fechadosReais.forEach(l => { 
        ranking[l.user_id] = (ranking[l.user_id] || 0) + Number(l.valor); 
    }); 
    
    const arrayRank = Object.keys(ranking).map(id => { 
        let p = perfisEquipe.find(x => x.id === id); 
        return { nome: p?.full_name || 'Desconhecido', eqp: p?.equipe || 'Geral', total: ranking[id] }; 
    }).sort((a, b) => b.total - a.total);
    
    if (document.getElementById('tabela-ranking')) {
        document.getElementById('tabela-ranking').innerHTML = arrayRank.map((v, i) => `
        <tr>
            <td style="font-weight: bold; color: var(--text);">${i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : ''))} ${v.nome}</td>
            <td><span class="badge badge-equipe">${v.eqp}</span></td>
            <td style="color:var(--fechados); font-weight:900; text-align:right;">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v.total)}</td>
        </tr>`).join('');
    }

    const prods = {}; 
    
    fechadosReais.forEach(l => { 
        let p = l.produto || 'Consultoria Geral'; 
        prods[p] = (prods[p] || 0) + Number(l.valor); 
    }); 
    
    const arrayProds = Object.keys(prods).map(k => ({ nome: k, total: prods[k] })).sort((a, b) => b.total - a.total);
    
    if (document.getElementById('tabela-produtos')) { 
        if (arrayProds.length === 0) { 
            document.getElementById('tabela-produtos').innerHTML = `
            <tr>
                <td colspan="2" style="text-align:center; padding: 20px; color:var(--muted);">
                    Nenhum produto ou assinatura fechada de forma oficial até o momento.
                </td>
            </tr>`; 
        } else { 
            document.getElementById('tabela-produtos').innerHTML = arrayProds.map(p => `
            <tr>
                <td style="color: var(--text); font-weight:600;">${p.nome}</td>
                <td style="font-weight:900; color:var(--text); text-align:right;">
                    ${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(p.total)}
                </td>
            </tr>`).join(''); 
        } 
    }
}

// Fim do Motor Javascript Enterprise HAPSIS v2.0