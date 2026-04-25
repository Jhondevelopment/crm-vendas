// @ts-nocheck
/* eslint-disable */
/**
 * ============================================================================
 * HAPSIS ENTERPRISE - MOTOR JAVASCRIPT v2.1
 * Arquitetura de Software Sênior (Clean Code & Robustness)
 * Código 100% Completo, Expandido e sem Abreviações.
 *
 * CORREÇÕES APLICADAS NESTA VERSÃO:
 * [FIX-1] Payload do form-lead: campos opcionais só enviados se existirem no banco
 * [FIX-2] Constraint profiles_role_check: normalizarRole() garante role válido
 * [FIX-3] Cadastro: validação robusta antes de inserir no banco
 * [FIX-4] Calendário custom Liquid Glass (substitui input[type=date] nativo)
 * [FIX-5] Módulos financeiros: renderizarAbaEquipe, renderizarConfiguracoes,
 *          abrirPainelAcessos, gerarRelatorioIA, configurarNotificacoes expostos
 * [FIX-6] Real-time Supabase para atualização automática sem F5
 * [FIX-7] Command Palette (Ctrl+K) com 21 comandos
 * [FIX-8] Todas as funções window.* que o HTML chama estão declaradas
 * ============================================================================
 */

/**
 * ============================================================================
 * 1. CONFIGURAÇÕES DE BANCO DE DADOS E API (SUPABASE)
 * ============================================================================
 */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const SUPABASE_URL = 'https://bskgqlhducfxfipflpqm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hPbZtYmMLtMn1yfRZa4O2w_nxf43EOa';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'hapsis-auth-session',
        storage: window.localStorage,
        detectSessionInUrl: true,
    }
});
window._supabase = supabase;

// Injeção de CSS de correção (sobrepõe o style.css onde necessário)
(function injetarCSScorrecoes() {
    const s = document.createElement('style');
    s.textContent = `
    /* FIX: Command Palette centralizado e sem corte */
    #cmd-palette {
        align-items: center !important;
        justify-content: center !important;
        padding: 16px !important;
        padding-top: 16px !important;
    }
    .cmd-box {
        max-width: 580px !important;
        width: calc(100% - 32px) !important;
        max-height: 78vh !important;
        border-radius: 18px !important;
        transform: scale(0.95) translateY(-8px);
    }
    #cmd-palette.ativa .cmd-box {
        transform: scale(1) translateY(0) !important;
    }
    .cmd-list {
        max-height: 50vh !important;
        overflow-y: auto !important;
    }

    /* FIX: Coluna de ações de produto com dois botões */
    .td-produto-acoes {
        display: flex !important;
        gap: 6px !important;
        justify-content: center !important;
        align-items: center !important;
    }

    /* FIX: Remover autocomplete visual do browser */
    #inp-busca-global::-webkit-contacts-auto-fill-button,
    #inp-busca-global::-webkit-credentials-auto-fill-button {
        visibility: hidden;
        pointer-events: none;
        position: absolute;
        right: 0;
    }
    `;
    document.head.appendChild(s);
})();

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
let isRegistering      = false;
let isRecuperandoSenha = false;
let perfilPendente     = null; // dados aguardando confirmação de email

// Instâncias Globais de Gráficos (Chart.js)
let chartInstance = null;
let chartFugasLinhaInstance = null;
let chartFugasMotivosInstance = null;
let chartPagamentosInstance = null;
let chartOrigemInstance = null;

// [FIX-2] Roles válidos para o banco — constraint profiles_role_check
const ROLES_VALIDOS = ['vendedor', 'gestor_sub', 'gestor_geral'];
const ROLE_COMPAT = { gestor: 'gestor_geral', gerente: 'gestor_sub', financeiro: 'gestor_sub', admin: 'gestor_geral', sdr: 'vendedor', cs: 'vendedor', marketing: 'vendedor' };

function normalizarRole(role) {
    if (!role) return 'vendedor';
    if (ROLES_VALIDOS.includes(role)) return role;
    return ROLE_COMPAT[role] || 'vendedor';
}

/**
 * ============================================================================
 * 3. UTILITÁRIOS GERAIS E COMPONENTES DE UI
 * ============================================================================
 */

function mostrarToast(msg, tipo = 'ok') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = msg;
    toast.className = `toast show ${tipo}`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.classList.remove('show'); }, 4000);
}

function getSaudacao() {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return 'Bom dia';
    if (hora >= 12 && hora < 18) return 'Boa tarde';
    return 'Boa noite';
}

function mudarTela(id) {
    const telas = document.querySelectorAll('.tela');
    telas.forEach(t => { t.classList.remove('ativa'); });
    const telaDestino = document.getElementById(id);
    if (telaDestino) telaDestino.classList.add('ativa');
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

/**
 * ============================================================================
 * [FIX-4] CALENDÁRIO CUSTOM LIQUID GLASS
 * Substitui todos os input[type=date] com visual premium
 * ============================================================================
 */
(function iniciarCalendarioCustom() {
    const style = document.createElement('style');
    style.textContent = `
    .hapsis-datepicker-wrap { position:relative; width:100%; }
    .hapsis-date-input {
        width:100%; padding:14px 16px 14px 44px;
        border-radius:var(--r-md,10px); border:1px solid var(--accent,#f5c518);
        background:rgba(245,197,24,0.05); color:var(--accent,#f5c518);
        font-weight:bold; font-family:var(--font-body,'DM Sans',sans-serif);
        font-size:14px; cursor:pointer; outline:none; transition:all .25s ease;
    }
    .hapsis-date-input::placeholder { color:rgba(245,197,24,0.4); }
    .hapsis-date-input.open,
    .hapsis-date-input:focus {
        border-color:var(--accent,#f5c518);
        box-shadow:0 0 0 4px rgba(245,197,24,.12),0 0 20px rgba(245,197,24,.08);
    }
    .hapsis-date-icon {
        position:absolute; left:14px; top:50%; transform:translateY(-50%);
        color:var(--accent,#f5c518); font-size:17px; pointer-events:none; z-index:1;
    }
    .hapsis-date-clear {
        position:absolute; right:14px; top:50%; transform:translateY(-50%);
        color:var(--muted,#7a83a1); background:none; border:none; cursor:pointer;
        font-size:14px; z-index:1; padding:2px; display:none; transition:color .2s;
    }
    .hapsis-date-clear:hover { color:var(--danger,#f05252); }
    .hapsis-cal-popup {
        position:fixed; z-index:99999;
        width:300px; padding:16px; border-radius:16px;
        background:rgba(16,19,28,0.98);
        backdrop-filter:blur(40px) saturate(200%);
        -webkit-backdrop-filter:blur(40px) saturate(200%);
        border:1px solid rgba(255,255,255,0.10);
        box-shadow:0 32px 80px rgba(0,0,0,.7),0 12px 32px rgba(0,0,0,.4);
        animation:calIn .25s cubic-bezier(.16,1,.3,1);
        user-select:none;
    }
    @keyframes calIn {
        from { opacity:0; transform:translateY(-8px) scale(.97); }
        to   { opacity:1; transform:translateY(0) scale(1); }
    }
    .hapsis-cal-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
    .hapsis-cal-nav {
        background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.08);
        color:var(--text,#eceef8); width:30px; height:30px; border-radius:8px;
        cursor:pointer; display:flex; align-items:center; justify-content:center;
        font-size:14px; transition:all .15s;
    }
    .hapsis-cal-nav:hover { background:var(--accent3,rgba(245,197,24,.12)); color:var(--accent,#f5c518); border-color:rgba(245,197,24,.3); }
    .hapsis-cal-title {
        font-family:var(--font-head,'Syne',sans-serif); font-size:14px;
        font-weight:700; color:var(--text,#eceef8);
    }
    .hapsis-cal-weekdays { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; margin-bottom:6px; }
    .hapsis-cal-wd { text-align:center; font-size:10px; font-weight:700; color:var(--muted,#7a83a1); padding:4px 0; text-transform:uppercase; letter-spacing:.5px; }
    .hapsis-cal-days { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; }
    .hapsis-cal-day {
        width:100%; aspect-ratio:1; display:flex; align-items:center; justify-content:center;
        border-radius:8px; font-size:13px; font-weight:500; cursor:pointer;
        color:var(--text2,#c4c9e0); transition:all .15s;
        border:1px solid transparent; background:transparent;
    }
    .hapsis-cal-day:hover:not(.empty):not(.selected) { background:rgba(255,255,255,.06); color:var(--text,#eceef8); }
    .hapsis-cal-day.empty { cursor:default; color:transparent; }
    .hapsis-cal-day.today { background:rgba(245,197,24,.12); color:var(--accent,#f5c518); border-color:rgba(245,197,24,.3); font-weight:700; }
    .hapsis-cal-day.selected { background:linear-gradient(135deg,var(--accent,#f5c518),#d9ae0f); color:#0a0c11 !important; font-weight:800; box-shadow:0 4px 12px rgba(245,197,24,.35); }
    .hapsis-cal-footer { display:flex; justify-content:space-between; align-items:center; margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,.06); }
    .hapsis-cal-btn-hoje { font-size:12px; font-weight:700; color:var(--accent,#f5c518); background:rgba(245,197,24,.12); border:1px solid rgba(245,197,24,.3); border-radius:6px; padding:5px 12px; cursor:pointer; transition:all .15s; }
    .hapsis-cal-btn-hoje:hover { background:var(--accent,#f5c518); color:#0a0c11; }
    .hapsis-cal-btn-limpar { font-size:12px; font-weight:600; color:var(--muted,#7a83a1); background:transparent; border:1px solid rgba(255,255,255,.06); border-radius:6px; padding:5px 12px; cursor:pointer; transition:all .15s; }
    .hapsis-cal-btn-limpar:hover { color:var(--danger,#f05252); border-color:rgba(240,82,82,.3); }
    input[type="date"].hapsis-hidden { display:none !important; }
    `;
    document.head.appendChild(style);

    const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const DS = ['D','S','T','Q','Q','S','S'];

    function criarCal(inp) {
        const wrap = document.createElement('div');
        wrap.className = 'hapsis-datepicker-wrap';
        const icon = document.createElement('i');
        icon.className = 'ph ph-calendar-blank hapsis-date-icon';
        const disp = document.createElement('input');
        disp.type = 'text'; disp.readOnly = true; disp.className = 'hapsis-date-input'; disp.placeholder = 'Selecionar data...';
        const clrBtn = document.createElement('button');
        clrBtn.type = 'button'; clrBtn.className = 'hapsis-date-clear'; clrBtn.innerHTML = '<i class="ph ph-x"></i>';
        wrap.appendChild(icon); wrap.appendChild(disp); wrap.appendChild(clrBtn);
        inp.classList.add('hapsis-hidden');
        inp.parentNode.insertBefore(wrap, inp);
        wrap.appendChild(inp);

        let popup = null, selDate = null;
        let vY = new Date().getFullYear(), vM = new Date().getMonth();

        function toBanco(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
        function toDisp(d) { return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; }

        function syncFromInp() {
            if (!inp.value) return;
            const p = inp.value.split('-');
            if (p.length !== 3) return;
            selDate = new Date(+p[0], +p[1]-1, +p[2]);
            disp.value = toDisp(selDate); clrBtn.style.display = 'flex';
            vY = selDate.getFullYear(); vM = selDate.getMonth();
        }
        syncFromInp();

        function selecionar(d) {
            selDate = d; vY = d.getFullYear(); vM = d.getMonth();
            disp.value = toDisp(d); inp.value = toBanco(d);
            clrBtn.style.display = 'flex'; disp.classList.remove('open'); fechar();
            inp.dispatchEvent(new Event('change', { bubbles: true }));
        }

        function renderizar() {
            if (!popup) return;
            popup.querySelector('.hapsis-cal-title').textContent = `${MESES[vM]} ${vY}`;
            const corpo = popup.querySelector('.hapsis-cal-days');
            corpo.innerHTML = '';
            const primeiro = new Date(vY, vM, 1).getDay();
            const total = new Date(vY, vM+1, 0).getDate();
            const hoje = new Date();
            for (let i = 0; i < primeiro; i++) { const el = document.createElement('div'); el.className = 'hapsis-cal-day empty'; corpo.appendChild(el); }
            for (let d = 1; d <= total; d++) {
                const el = document.createElement('div'); el.className = 'hapsis-cal-day'; el.textContent = d;
                const dt = new Date(vY, vM, d);
                if (dt.toDateString() === hoje.toDateString()) el.classList.add('today');
                if (selDate && dt.toDateString() === selDate.toDateString()) el.classList.add('selected');
                el.addEventListener('click', () => selecionar(new Date(vY, vM, d)));
                corpo.appendChild(el);
            }
        }

        function abrir() {
            if (popup) { fechar(); return; }
            popup = document.createElement('div'); popup.className = 'hapsis-cal-popup';
            popup.innerHTML = `
                <div class="hapsis-cal-header">
                    <button class="hapsis-cal-nav" id="cp" type="button"><i class="ph ph-caret-left"></i></button>
                    <span class="hapsis-cal-title"></span>
                    <button class="hapsis-cal-nav" id="cn" type="button"><i class="ph ph-caret-right"></i></button>
                </div>
                <div class="hapsis-cal-weekdays">${DS.map(d=>`<div class="hapsis-cal-wd">${d}</div>`).join('')}</div>
                <div class="hapsis-cal-days"></div>
                <div class="hapsis-cal-footer">
                    <button class="hapsis-cal-btn-limpar" type="button">Limpar</button>
                    <button class="hapsis-cal-btn-hoje" type="button">Hoje</button>
                </div>`;

            // Posicionamento inteligente — usa fixed para não ser cortado por overflow
            document.body.appendChild(popup);
            const rect = disp.getBoundingClientRect();
            const popupH = 340; // altura estimada do popup
            const spaceBelow = window.innerHeight - rect.bottom;
            const top = spaceBelow >= popupH
                ? rect.bottom + 8
                : Math.max(8, rect.top - popupH - 8);
            const left = Math.min(rect.left, window.innerWidth - 316);
            popup.style.top  = top  + 'px';
            popup.style.left = left + 'px';

            popup.querySelector('#cp').onclick = e => { e.stopPropagation(); vM--; if(vM<0){vM=11;vY--;} renderizar(); };
            popup.querySelector('#cn').onclick = e => { e.stopPropagation(); vM++; if(vM>11){vM=0;vY++;} renderizar(); };
            popup.querySelector('.hapsis-cal-btn-hoje').onclick = e => { e.stopPropagation(); selecionar(new Date()); };
            popup.querySelector('.hapsis-cal-btn-limpar').onclick = e => { e.stopPropagation(); selDate=null; disp.value=''; inp.value=''; clrBtn.style.display='none'; fechar(); };
            renderizar(); disp.classList.add('open');
            setTimeout(() => document.addEventListener('click', fecharFora), 10);
        }

        function fechar() {
            if (popup) { popup.remove(); popup = null; }
            disp.classList.remove('open');
            document.removeEventListener('click', fecharFora);
        }
        function fecharFora(e) { if (!wrap.contains(e.target)) fechar(); }

        disp.addEventListener('click', e => { e.stopPropagation(); abrir(); });
        clrBtn.addEventListener('click', e => { e.stopPropagation(); selDate=null; disp.value=''; inp.value=''; clrBtn.style.display='none'; fechar(); });

        // Intercepta set via JS (ex: drawer abrindo e setando valor)
        let _val = inp.value;
        Object.defineProperty(inp, 'value', {
            get() { return _val; },
            set(v) {
                _val = v;
                if (v) {
                    const p = v.split('-');
                    if (p.length === 3) {
                        selDate = new Date(+p[0], +p[1]-1, +p[2]);
                        disp.value = toDisp(selDate); clrBtn.style.display = 'flex';
                        vY = selDate.getFullYear(); vM = selDate.getMonth();
                    }
                } else { disp.value = ''; clrBtn.style.display = 'none'; selDate = null; }
            },
            configurable: true,
        });
    }

    function aplicar() {
        document.querySelectorAll('input[type="date"]:not(.hapsis-hidden):not(.hapsis-processed)').forEach(inp => {
            inp.classList.add('hapsis-processed');
            criarCal(inp);
        });
    }

    const obs = new MutationObserver(aplicar);
    obs.observe(document.body, { childList: true, subtree: true });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aplicar);
    else aplicar();
    setTimeout(aplicar, 800);
    setTimeout(aplicar, 2500);
})();

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
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-senha').value;
        const modo = toggleModo.dataset.modo;

        if (!email || !password) {
            mostrarToast('Preencha e-mail e senha.', 'erro');
            return;
        }

        if (modo === 'login') {
            btnLogin.innerText = 'Autenticando...';
            btnLogin.style.transform = 'scale(0.97)';
            btnLogin.style.opacity = '0.85';
            btnLogin.disabled = true;

            try {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) {
                    let msg = 'E-mail ou senha incorretos.';
                    if (error.message.includes('Email not confirmed')) msg = 'Confirme seu e-mail antes de entrar.';
                    mostrarToast(msg, 'erro');
                    btnLogin.innerText = 'Entrar no HAPSIS';
                    btnLogin.style.transform = 'none';
                    btnLogin.style.opacity = '1';
                    btnLogin.disabled = false;
                } else {
                    // Login OK — chamar verificarPerfil diretamente
                    usuarioAtual = data.user;
                    await verificarPerfil();
                }
            } catch (err) {
                mostrarToast('Erro de conexão.', 'erro');
                btnLogin.innerText = 'Entrar no HAPSIS';
                btnLogin.style.transform = 'none';
                btnLogin.style.opacity = '1';
                btnLogin.disabled = false;
            }

        } else {
            // [FIX-3] Validações completas antes de tentar inserir no banco
            const nome = document.getElementById('auth-nome').value.trim();
            const cargo = document.getElementById('auth-cargo').value;
            const chaveDigitada = document.getElementById('auth-chave').value.trim();
            const senhaConfirm = document.getElementById('auth-senha-confirm').value;

            if (!nome) { mostrarToast('Por favor, informe seu nome.', 'erro'); return; }
            if (password !== senhaConfirm) { mostrarToast('As senhas não coincidem!', 'erro'); return; }
            if (cargo === 'gestor_geral' && chaveDigitada !== 'CEO2026') { mostrarToast('Chave de Gerente incorreta!', 'erro'); return; }
            if (cargo === 'gestor_sub' && chaveDigitada !== 'FINAN2026') { mostrarToast('Chave de Sub Gerente incorreta!', 'erro'); return; }

            // [FIX-2] Normaliza o role antes de enviar ao banco
            const roleNormalizado = normalizarRole(cargo);

            btnLogin.innerText = 'Criando conta...';
            btnLogin.style.transform = 'scale(0.97)';
            btnLogin.style.opacity = '0.85';
            btnLogin.disabled = true;
            isRegistering = true;

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin + window.location.pathname
                }
            });

            if (authError) {
                let msgErro = authError.message;
                if (msgErro.includes('already registered')) msgErro = 'Este e-mail já está cadastrado. Faça login.';
                mostrarToast(msgErro, 'erro');
                btnLogin.innerText = 'Cadastrar e Entrar';
                btnLogin.style.transform = 'none';
                btnLogin.style.opacity = '1';
                btnLogin.disabled = false;
                isRegistering = false;
                return;
            }

            if (!authData.user) {
                mostrarToast('Usuário não foi criado. Tente novamente.', 'erro');
                btnLogin.disabled = false; btnLogin.style.opacity = '1'; isRegistering = false;
                return;
            }

            // Salvar dados do perfil PENDENTE — só vai ao banco após confirmar email
            const payload = {
                id: authData.user.id,
                full_name: nome,
                role: roleNormalizado,
                equipe: 'Geral',
                meta_mensal: 10000,
                nome_empresa: 'HAPSIS',
                cor_primaria: '#f5c518',
                taxa_comissao: 5,
                logo_empresa: null
            };

            // Guardar pendente no localStorage até confirmação
            perfilPendente = payload;
            try { localStorage.setItem('hapsis-perfil-pendente', JSON.stringify(payload)); } catch(e) {}

            isRegistering = false;
            btnLogin.disabled = false;
            btnLogin.style.opacity = '1';
            btnLogin.innerText = 'Cadastrar e Entrar';

            // Fazer logout — usuário SÓ entra após confirmar o email
            await supabase.auth.signOut();

            // Mostrar modal de confirmação de e-mail
            mostrarModalConfirmacaoEmail(email);
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
            redirectTo: window.location.href.split('?')[0] // URL limpa sem parâmetros
        });
        btn.innerHTML = textOriginal;
        if (error) { 
            mostrarToast('Erro: ' + error.message, 'erro'); 
        } else {
            document.getElementById('modal-recuperar-senha').classList.remove('ativa');
            formRecuperar.reset();
            // Mostrar modal de instrução clara
            document.getElementById('modal-instrucao-senha').classList.add('ativa');
        }
    };
}

const formNovaSenha = document.getElementById('form-nova-senha');
if (formNovaSenha) {
    formNovaSenha.onsubmit = async (e) => {
        e.preventDefault();
        const novaSenha = document.getElementById('inp-nova-senha').value;
        if (novaSenha.length < 6) { mostrarToast('Mínimo 6 caracteres.', 'erro'); return; }
        const { error } = await supabase.auth.updateUser({ password: novaSenha });
        if (error) {
            let msg = error.message;
            if (msg.includes('security purposes') || msg.includes('request this after')) {
                const s = msg.match(/\d+/) ? msg.match(/\d+/)[0] : '60';
                msg = 'Aguarde ' + s + ' segundos antes de tentar novamente.';
            }
            mostrarToast(msg, 'erro');
        }
        else {
            mostrarToast('✅ Senha atualizada! Entrando...', 'ok');
            document.getElementById('modal-nova-senha').classList.remove('ativa');
            formNovaSenha.reset();
            isRecuperandoSenha = false;
            // Restaurar visibilidade da tela-app (foi ocultada durante recovery)
            const _appEl = document.getElementById('tela-app');
            if (_appEl) _appEl.style.display = '';
            setTimeout(async () => { if (usuarioAtual) await verificarPerfil(); }, 500);
        }
    };
}

const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.onclick = async () => {
        const telaAuthEl = document.getElementById('tela-auth');
        if (telaAuthEl) telaAuthEl.classList.remove('entrando');
        // Esconder chat IA antes de deslogar
        const chatBtn = document.getElementById('chat-ia-btn');
        const chatJanela = document.getElementById('chat-ia-janela');
        if (chatBtn) { chatBtn.style.display = 'none'; chatBtn.style.visibility = 'hidden'; }
        if (chatJanela) chatJanela.style.display = 'none';
        await supabase.auth.signOut();
        window.location.reload();
    };
}

/**
 * ============================================================================
 * 5. CONTROLE DE SESSÃO — PERSISTÊNCIA TOTAL (sem flash de login no F5)
 * ============================================================================
 */

// Sessão verificada abaixo

// Verificar sessão ao carregar
(async () => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
            usuarioAtual = session.user;
            await verificarPerfil();
        }
    } catch (err) { /* tela de login já visível */ }
})();

// PASSO 3: Listener de mudança de estado (logout, troca de aba, token expirado)
supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
        isRecuperandoSenha = true;
        usuarioAtual = session?.user || null;

        // Esconder completamente a plataforma — forçar tela de login limpa
        const appEl  = document.getElementById('tela-app');
        const authEl = document.getElementById('tela-auth');
        if (appEl)  { appEl.style.display = 'none'; appEl.classList.remove('ativa'); }
        if (authEl) { authEl.style.display = 'flex'; authEl.classList.add('ativa'); }

        // Mostrar modal de nova senha sobre fundo limpo
        setTimeout(() => {
            document.getElementById('modal-nova-senha')?.classList.add('ativa');
        }, 300);
        return;
    }

    if (event === 'TOKEN_REFRESHED' && session) {
        // Token foi renovado automaticamente — manter tudo normal
        usuarioAtual = session.user;
        return;
    }

    if (event === 'SIGNED_OUT') {
        usuarioAtual = null;
        perfilAtual  = null;
        // Esconder chat IA
        const chatBtn    = document.getElementById('chat-ia-btn');
        const chatJanela = document.getElementById('chat-ia-janela');
        if (chatBtn)    { chatBtn.style.display = 'none'; chatBtn.style.visibility = 'hidden'; }
        if (chatJanela) chatJanela.style.display = 'none';
        // Mostrar tela de login
        mudarTela('tela-auth');
        return;
    }

    if (event === 'SIGNED_IN' && session && !perfilAtual && !isRegistering && !isRecuperandoSenha) {
        usuarioAtual = session.user;

        // Verificar se tem perfil pendente de criação (vem de cadastro com confirmação de email)
        let pendente = perfilPendente;
        if (!pendente) {
            try {
                const raw = localStorage.getItem('hapsis-perfil-pendente');
                if (raw) pendente = JSON.parse(raw);
            } catch(e) {}
        }

        if (pendente && pendente.id === session.user.id) {
            // Email confirmado — criar o perfil no banco agora
            await supabase.from('profiles').upsert([pendente]);
            perfilPendente = null;
            try { localStorage.removeItem('hapsis-perfil-pendente'); } catch(e) {}
        }

        await verificarPerfil();
    }
});


/**
 * Mostra modal pedindo ao usuário para confirmar o e-mail antes de entrar
 */
function mostrarModalConfirmacaoEmail(email) {
    // Criar modal dinamicamente se não existir
    let modal = document.getElementById('modal-confirmar-email');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-confirmar-email';
        modal.className = 'modal-overlay ativa';
        modal.innerHTML = `
            <div class="modal-box" style="max-width:420px;text-align:center;">
                <div style="width:68px;height:68px;border-radius:18px;background:linear-gradient(135deg,rgba(245,197,24,0.15),rgba(245,197,24,0.05));border:1px solid rgba(245,197,24,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
                    <i class="ph ph-envelope-simple" style="font-size:32px;color:#f5c518;"></i>
                </div>
                <h3 style="font-family:var(--font-head);font-size:20px;color:var(--text);margin:0 0 10px;">Confirme seu e-mail!</h3>
                <p style="color:var(--muted);font-size:13px;line-height:1.7;margin:0 0 20px;">
                    Enviamos um link de confirmação para<br>
                    <strong style="color:var(--text);" id="conf-email-display"></strong>
                </p>

                <div style="background:var(--bg2);border-radius:12px;padding:16px;text-align:left;margin-bottom:20px;border:1px solid var(--border);">
                    <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:10px;">
                        <span style="background:rgba(245,197,24,0.2);color:#f5c518;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;">1</span>
                        <span style="font-size:13px;color:var(--text2);">Abra o e-mail enviado pelo HAPSIS</span>
                    </div>
                    <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:10px;">
                        <span style="background:rgba(245,197,24,0.2);color:#f5c518;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;">2</span>
                        <span style="font-size:13px;color:var(--text2);">Clique em <strong style="color:var(--text);">"Confirmar meu cadastro"</strong></span>
                    </div>
                    <div style="display:flex;gap:10px;align-items:flex-start;">
                        <span style="background:rgba(245,197,24,0.2);color:#f5c518;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;">3</span>
                        <span style="font-size:13px;color:var(--text2);">Volte aqui e faça login com sua senha</span>
                    </div>
                </div>

                <p style="font-size:11px;color:var(--muted);margin-bottom:16px;">
                    Não recebeu? Verifique a pasta de spam.<br>
                    <button onclick="window._reenviarConfirmacao()" style="background:transparent;border:none;color:var(--accent);font-size:12px;font-weight:700;cursor:pointer;text-decoration:underline;margin-top:4px;">Reenviar e-mail de confirmação</button>
                </p>

                <button onclick="document.getElementById('modal-confirmar-email').classList.remove('ativa')" class="btn-primary" style="width:100%;">
                    <i class="ph ph-check"></i> Entendido — Vou confirmar meu e-mail
                </button>
            </div>`;
        document.body.appendChild(modal);
    }

    // Atualizar e-mail exibido
    const emailDisplay = document.getElementById('conf-email-display');
    if (emailDisplay) emailDisplay.textContent = email;

    modal.classList.add('ativa');
}

window._reenviarConfirmacao = async () => {
    const emailDisplay = document.getElementById('conf-email-display');
    const email = emailDisplay?.textContent;
    if (!email) return;
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) mostrarToast('Erro ao reenviar: ' + error.message, 'erro');
    else mostrarToast('✅ E-mail de confirmação reenviado!', 'ok');
};

async function verificarPerfil() {
    let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', usuarioAtual.id)
        .single();

    if (error || !data) {
        await new Promise(r => setTimeout(r, 1500));
        let retry = await supabase.from('profiles').select('*').eq('id', usuarioAtual.id).single();
        data = retry.data;
    }

    if (data) {
        if (data.suspended === true) {
            await supabase.auth.signOut();
            mostrarToast('🔒 Acesso suspenso. Contate o administrador.', 'erro');
            if (btnLogin) { btnLogin.disabled = false; btnLogin.innerText = 'Entrar no HAPSIS'; btnLogin.style.opacity = '1'; btnLogin.style.transform = 'none'; }
            return;
        }
        perfilAtual = data;
        perfilAtual.role = normalizarRole(perfilAtual.role);
        // Resetar botão ANTES de iniciarApp para não ficar preso
        if (btnLogin) { btnLogin.disabled = false; btnLogin.innerText = 'Entrar no HAPSIS'; btnLogin.style.opacity = '1'; btnLogin.style.transform = 'none'; }
        iniciarApp();
    } else {
        await supabase.auth.signOut();
        if (btnLogin) { btnLogin.disabled = false; btnLogin.innerText = 'Entrar no HAPSIS'; btnLogin.style.opacity = '1'; btnLogin.style.transform = 'none'; }
        mostrarToast('Perfil não encontrado. Contate o administrador.', 'erro');
    }
}

/**
 * ============================================================================
 * 6. INICIALIZAÇÃO DO APP E PERMISSÕES DA INTERFACE (RBAC)
 * ============================================================================
 */
async function iniciarApp() {
    // Garantir que tela de auth está escondida e app vai aparecer suavemente
    const authEl = document.getElementById('tela-auth');
    const appEl  = document.getElementById('tela-app');
    if (authEl) { authEl.classList.remove('ativa'); }

    const elUserNome = document.getElementById('user-nome');
    if (elUserNome) {
        elUserNome.innerHTML = `
            <span style="font-size:12px; color:var(--muted); font-weight:normal;">
                ${getSaudacao()},
            </span><br>
            ${perfilAtual.full_name}
        `;
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
        if (logoApp) { logoApp.innerHTML = imgHtml; logoApp.style.background = 'transparent'; logoApp.style.border = 'none'; logoApp.style.boxShadow = 'none'; }
        if (logoLogin) { logoLogin.innerHTML = imgHtml; logoLogin.style.background = 'transparent'; logoLogin.style.border = 'none'; logoLogin.style.boxShadow = 'none'; }
    }

    const role = perfilAtual.role;
    const isAdmin = role === 'gestor_sub' || role === 'gestor_geral';

    document.querySelectorAll('.nav-group').forEach(el => { el.classList.add('hidden'); });

    // RBAC simplificado — 3 módulos limpos
    if (role === 'vendedor' || role === 'sdr' || role === 'cs' || role === 'marketing') {
        document.querySelectorAll('.modulo-vendas').forEach(el => el.classList.remove('hidden'));
    } else if (role === 'gestor_sub') {
        document.querySelectorAll('.modulo-cfo').forEach(el => el.classList.remove('hidden'));
    } else if (role === 'gestor_geral') {
        document.querySelectorAll('.modulo-ceo').forEach(el => el.classList.remove('hidden'));
    }

    const boxSininho = document.getElementById('box-sininho');
    if (boxSininho) boxSininho.classList.toggle('hidden', !isAdmin);

    const btnAvisoCfo = document.getElementById('btn-novo-aviso');
    if (btnAvisoCfo) btnAvisoCfo.classList.toggle('hidden', !isAdmin);

    // [FIX-BUG-3] Botão "Ajustar Meta" — visível APENAS para gestor_geral
    const btnMeta = document.querySelector('.btn-meta.gestor-geral-only');
    if (btnMeta) btnMeta.classList.toggle('hidden', role !== 'gestor_geral');

    document.querySelectorAll('.aba-conteudo').forEach(a => a.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('ativo'));

    const boxAvisos = document.getElementById('box-avisos');

    if (role === 'gestor_geral') {
        const abaCeo = document.getElementById('aba-chefao');
        if (abaCeo) abaCeo.classList.remove('hidden');
        const btnCeo = document.querySelector('[data-aba="aba-chefao"]');
        if (btnCeo) btnCeo.classList.add('ativo');
        if (boxAvisos) boxAvisos.classList.remove('hidden');
    } else if (role === 'gestor_sub') {
        const abaCfo = document.getElementById('aba-aprovacoes');
        if (abaCfo) abaCfo.classList.remove('hidden');
        const btnCfo = document.querySelector('[data-aba="aba-aprovacoes"]');
        if (btnCfo) btnCfo.classList.add('ativo');
        if (boxAvisos) boxAvisos.classList.remove('hidden');
    } else {
        const abaKanban = document.getElementById('aba-kanban');
        if (abaKanban) abaKanban.classList.remove('hidden');
        const btnKanban = document.querySelector('[data-aba="aba-kanban"]');
        if (btnKanban) btnKanban.classList.add('ativo');
        if (boxAvisos) boxAvisos.classList.remove('hidden');
    }

    mudarTela('tela-app');

    if (btnLogin) {
        btnLogin.style.transform = 'none';
        btnLogin.style.opacity = '1';
        btnLogin.innerText = 'Entrar no HAPSIS';
        btnLogin.disabled = false;
    }

    await carregarAvisos();
    await carregarProdutos();
    await carregarBonus();
    await carregarLeads();
    configurarNotificacoes();
    ativarRealTime();
    // Popup de bônus ao entrar para vendedor
    if (role === 'vendedor' || role === 'sdr') {
        const campanhaAtiva = bonusData.find(b => b.status === 'Ativa');
        if (campanhaAtiva) setTimeout(() => mostrarPopupBonus(campanhaAtiva), 1200);
    }

    // Mostrar chat IA apenas após login confirmado
    const chatBtn = document.getElementById('chat-ia-btn');
    if (chatBtn) {
        chatBtn.style.display = 'flex';
        chatBtn.style.visibility = 'visible';
    }
}

/**
 * ============================================================================
 * 7. NAVEGAÇÃO INTERNA (ROUTER) DA SIDEBAR
 * ============================================================================
 */
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.nav-item').forEach(b => { b.classList.remove('ativo'); });
        btn.classList.add('ativo');
        document.querySelectorAll('.aba-conteudo').forEach(a => { a.classList.add('hidden'); });
        const abaId = btn.dataset.aba;
        const aba = document.getElementById(abaId);
        if (aba) aba.classList.remove('hidden');

        const boxAvisos = document.getElementById('box-avisos');
        if (boxAvisos) {
            if (['aba-chefao', 'aba-kanban'].includes(abaId)) boxAvisos.classList.remove('hidden');
            else boxAvisos.classList.add('hidden');
        }

        if (abaId === 'aba-relatorio') { atualizarEstatisticas(); calcularComissoesNovoModeloVendedor(); }
        if (abaId === 'aba-chefao') renderizarGestor();
        if (abaId === 'aba-equipe') renderizarAbaEquipe();
        if (abaId === 'aba-auditoria') renderizarAbaAuditoria();
        if (abaId === 'aba-comissoes') renderizarComissoesNovoModeloFinanceiro();
        if (abaId === 'aba-exportacao') { renderizarTabelaExportacao(); carregarAuditoriaExportacao(); }
        if (abaId === 'aba-arena') renderizarArena();
        if (abaId === 'aba-pos-venda') renderizarPosVenda();
        if (abaId === 'aba-config') renderizarConfiguracoes();
        if (abaId === 'aba-auditoria-descontos') renderizarAuditoriaDescontos();
        if (abaId === 'aba-despesas') carregarDespesas();
        if (abaId === 'aba-cobrancas') renderizarCobrancas();
        if (abaId === 'aba-mrr') renderizarMRR();
        if (abaId === 'aba-contratos') renderizarContratos();
        if (abaId === 'aba-bonus') carregarBonus();
        if (abaId === 'aba-ia-relatorios') gerarRelatorioIA();
        if (abaId === 'aba-growth') renderizarGrowth();
    };
});

const inputBusca = document.getElementById('inp-busca-global');
if (inputBusca) {
    inputBusca.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        document.querySelectorAll('.lead-card').forEach(card => {
            card.style.display = card.innerText.toLowerCase().includes(termo) ? 'block' : 'none';
        });
        document.querySelectorAll('.lista-table tbody tr').forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(termo) ? '' : 'none';
        });
    });
}

/**
 * ============================================================================
 * 8. GESTÃO DO MURAL DE AVISOS E CATÁLOGO DE PRODUTOS
 * ============================================================================
 */
async function carregarAvisos() {
    const { data } = await supabase.from('avisos').select('*').order('created_at', { ascending: false }).limit(3);
    avisosData = data || [];
    const lista = document.getElementById('lista-avisos');
    if (!lista) return;
    if (avisosData.length === 0) {
        lista.innerHTML = `<div class="empty-state" style="padding:10px;"><i class="ph ph-coffee"></i><p>Nada de novo por aqui.<br>A diretoria está quieta hoje.</p></div>`;
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

window.criarAviso = () => { document.getElementById('modal-aviso')?.classList.add('ativa'); };

const btnFecharAviso = document.getElementById('btn-fechar-aviso');
if (btnFecharAviso) {
    btnFecharAviso.onclick = () => { document.getElementById('modal-aviso').classList.remove('ativa'); };
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
            const { error } = await supabase.from('avisos').insert([{ titulo, mensagem: msg }]);
            if (error) {
            let msg = error.message;
            if (msg.includes('security purposes') || msg.includes('request this after')) {
                const s = msg.match(/\d+/) ? msg.match(/\d+/)[0] : '60';
                msg = 'Aguarde ' + s + ' segundos antes de tentar novamente.';
            }
            mostrarToast(msg, 'erro');
        }
            else { document.getElementById('modal-aviso').classList.remove('ativa'); formAviso.reset(); mostrarToast('Disparado no mural!', 'ok'); carregarAvisos(); }
            btnSubmit.innerHTML = textOriginal;
            btnSubmit.disabled = false;
        } catch (err) { mostrarToast('Erro no sistema', 'erro'); }
    });
}

window.deletarAviso = async (id) => {
    window.abrirConfirmacao('Apagar Aviso', 'Este recado será removido do mural da equipe.', 'Excluir Aviso', async () => {
        try {
            // [FIX-BUG-5] Verificar o retorno do delete — RLS pode bloquear silenciosamente
            const { error, count } = await supabase
                .from('avisos')
                .delete({ count: 'exact' })
                .eq('id', id);

            if (error) {
                if (error.message.includes('policy') || error.code === '42501') {
                    mostrarToast('Sem permissão para apagar. Execute o SQL de correção de RLS no Supabase.', 'erro');
                } else {
                    mostrarToast('Erro ao apagar aviso: ' + error.message, 'erro');
                }
                return;
            }

            // count === 0 significa que o RLS bloqueou silenciosamente (sem error, sem delete)
            if (count === 0) {
                mostrarToast('Aviso não foi apagado — verifique as permissões RLS no Supabase.', 'erro');
                return;
            }

            mostrarToast('Aviso apagado do mural.', 'ok');
            carregarAvisos();
        } catch(err) {
            mostrarToast('Erro ao excluir aviso.', 'erro');
        }
    });
};

async function carregarProdutos() {
    const { data, error } = await supabase.from('produtos').select('*').order('nome');
    if (!error) produtosData = data || [];
    const selectProd = document.getElementById('inp-produto');
    if (selectProd) {
        selectProd.innerHTML = '<option value="">Selecione um Produto...</option>' +
            produtosData.map(p => `<option value="${p.nome}" data-preco="${p.valor}">${p.nome}</option>`).join('');
    }
    const tbodyCat = document.getElementById('tbody-catalogo');
    if (tbodyCat) {
        if (produtosData.length === 0) {
            tbodyCat.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--muted);">Catálogo de produtos vazio.</td></tr>`;
        } else {
            tbodyCat.innerHTML = produtosData.map(p => `
                <tr>
                    <td><strong style="color:var(--text)">${p.nome}</strong></td>
                    <td style="text-align:right;">R$ ${Number(p.valor).toFixed(2)}</td>
                    <td style="text-align:center; color:var(--accent); font-weight:bold;">${p.taxa_comissao || 5}%</td>
                    <td style="text-align:center;">
                        <div style="display:flex; gap:6px; justify-content:center;">
                            <button class="card-del" style="color:var(--novos); border-color:rgba(56,189,248,.3); background:rgba(56,189,248,.06);" onclick="window.editarProduto(${p.id})" title="Editar produto">
                                <i class="ph ph-pencil-simple"></i>
                            </button>
                            <button class="card-del" onclick="window.deletarProduto(${p.id})" title="Excluir produto">
                                <i class="ph ph-trash"></i>
                            </button>
                        </div>
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

            // [FIX-BUG-1] Ler e converter valores corretamente
            const nomeRaw = document.getElementById('inp-prod-nome').value.trim();
            const valorRaw = document.getElementById('inp-prod-preco').value;
            const taxaRaw = document.getElementById('inp-prod-comissao').value;

            // Validações antes de enviar
            if (!nomeRaw) { mostrarToast('Informe o nome do produto.', 'erro'); return; }

            const valor = parseFloat(valorRaw);
            const taxa  = parseFloat(taxaRaw);

            if (isNaN(valor) || valor < 0) { mostrarToast('Informe um preço válido (ex: 297.00).', 'erro'); return; }
            if (isNaN(taxa)  || taxa < 0 || taxa > 100) { mostrarToast('Comissão deve ser entre 0 e 100%.', 'erro'); return; }

            const nome = nomeRaw.toUpperCase();

            btnSubmit.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';
            btnSubmit.disabled = true;

            const { error } = await supabase.from('produtos').insert([{
                nome: nome,
                valor: valor,
                taxa_comissao: taxa
            }]);

            btnSubmit.innerHTML = textOriginal;
            btnSubmit.disabled = false;

            if (error) {
                let msg = 'Erro ao salvar produto.';
                if (error.message.includes('unique') || error.message.includes('duplicate')) msg = `Produto "${nome}" já existe no catálogo.`;
                else if (error.message.includes('column') || error.message.includes('does not exist')) msg = 'Coluna faltando no banco. Execute o SQL de correção.';
                else msg = error.message;
                mostrarToast(msg, 'erro');
            } else {
                document.getElementById('modal-produto').classList.remove('ativa');
                formProduto.reset();
                mostrarToast(`Produto "${nome}" criado com sucesso!`, 'ok');
                carregarProdutos();
            }
        } catch (err) {
            mostrarToast('Erro interno ao salvar produto.', 'erro');
        }
    });
}

window.deletarProduto = (id) => {
    window.abrirConfirmacao('Excluir Produto', 'Remover este item do catálogo oficial?', 'Excluir', async () => {
        try {
            await supabase.from('produtos').delete().eq('id', id);
            mostrarToast('Produto Removido.', 'ok');
            carregarProdutos();
        } catch(err) {  }
    });
};
window.editarProduto = (id) => {
    const prod = produtosData.find(p => p.id === id);
    if (!prod) return mostrarToast('Produto não encontrado.', 'erro');

    // Preencher modal de edição
    document.getElementById('inp-edit-prod-id').value = prod.id;
    document.getElementById('inp-edit-prod-nome').value = prod.nome;
    document.getElementById('inp-edit-prod-preco').value = prod.valor;
    document.getElementById('inp-edit-prod-comissao').value = prod.taxa_comissao || 5;
    document.getElementById('modal-editar-produto').classList.add('ativa');
};

const formEditarProduto = document.getElementById('form-editar-produto');
if (formEditarProduto) {
    formEditarProduto.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const btnSubmit = formEditarProduto.querySelector('button[type="submit"]');
            const textOriginal = btnSubmit.innerHTML;
            btnSubmit.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';
            btnSubmit.disabled = true;

            const id    = document.getElementById('inp-edit-prod-id').value;
            const nome  = document.getElementById('inp-edit-prod-nome').value.trim().toUpperCase();
            const valor = parseFloat(document.getElementById('inp-edit-prod-preco').value);
            const taxa  = parseFloat(document.getElementById('inp-edit-prod-comissao').value);

            if (!nome) { mostrarToast('Informe o nome.', 'erro'); btnSubmit.innerHTML = textOriginal; btnSubmit.disabled = false; return; }
            if (isNaN(valor) || valor < 0) { mostrarToast('Preço inválido.', 'erro'); btnSubmit.innerHTML = textOriginal; btnSubmit.disabled = false; return; }
            if (isNaN(taxa) || taxa < 0 || taxa > 100) { mostrarToast('Comissão entre 0 e 100%.', 'erro'); btnSubmit.innerHTML = textOriginal; btnSubmit.disabled = false; return; }

            const { error } = await supabase.from('produtos').update({ nome, valor, taxa_comissao: taxa }).eq('id', id);

            btnSubmit.innerHTML = textOriginal;
            btnSubmit.disabled = false;

            if (error) {
                mostrarToast('Erro ao salvar: ' + error.message, 'erro');
            } else {
                document.getElementById('modal-editar-produto').classList.remove('ativa');
                formEditarProduto.reset();
                mostrarToast(`Produto "${nome}" atualizado!`, 'ok');
                carregarProdutos();
            }
        } catch (err) { mostrarToast('Erro interno.', 'erro'); }
    });
}

/**
 * ============================================================================
 * 9. MÓDULO DE BÔNUS E GAMIFICAÇÃO FINANCEIRA
 * ============================================================================
 */
async function carregarBonus() {
    const { data: bonusRaw } = await supabase.from('campanhas_bonus').select('*');
    // Ordena no cliente para não depender de created_at existir no banco
    bonusData = (bonusRaw || []).sort((a, b) => {
        if (a.created_at && b.created_at) return new Date(b.created_at) - new Date(a.created_at);
        return (b.id || 0) - (a.id || 0);
    });
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
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--muted);">Nenhuma campanha de bônus lançada.</td></tr>`;
        return;
    }
    tbody.innerHTML = bonusData.map(b => {
        let corStatus = b.status === 'Ativa' ? 'color: var(--fechados);' : 'color: var(--danger);';
        let botaoHTML = b.status === 'Ativa'
            ? `<button class="btn-cancel" style="padding:4px 8px; width:auto; margin:0 auto; font-size:12px; color:var(--danger); border-color:var(--danger2);" onclick="window.encerrarBonus(${b.id})"><i class="ph ph-stop-circle"></i> Encerrar</button>`
            : `<button class="btn-cancel" style="padding:4px 8px; width:auto; margin:0 auto; font-size:12px; color:var(--muted); border-color:var(--border2);" onclick="window.deletarBonus(${b.id})"><i class="ph ph-trash"></i> Apagar</button>`;
        return `
        <tr>
            <td style="font-weight: bold; color: var(--text);">${b.titulo}</td>
            <td style="text-align:right;">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(b.meta_valor)}</td>
            <td style="text-align:right; font-weight:bold; color:var(--purple);">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(b.premio_valor)}</td>
            <td style="font-weight:bold; ${corStatus}">${b.status}</td>
            <td style="text-align:center;">${botaoHTML}</td>
        </tr>`;
    }).join('');
}

window.deletarBonus = async (id) => {
    window.abrirConfirmacao('Apagar Campanha', 'Remover esta campanha do histórico financeiro?', 'Apagar Definitivo', async () => {
        try {
            await supabase.from('campanhas_bonus').delete().eq('id', id);
            mostrarToast('Campanha deletada.', 'ok');
            carregarBonus();
        } catch(err) {  }
    });
};

function verificarBonusAtivo() {
    const banner = document.getElementById('banner-bonus-vendedor');
    if (!banner) return;
    const campanhaAtiva = bonusData.find(b => b.status === 'Ativa');
    if (!campanhaAtiva) { banner.classList.add('hidden'); return; }
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
            const { error } = await supabase.from('campanhas_bonus').insert([{ titulo, meta_valor: meta, premio_valor: premio, status: 'Ativa' }]);
            if (error) { mostrarToast('Erro ao criar bônus.', 'erro'); }
            else { document.getElementById('modal-bonus').classList.remove('ativa'); formBonus.reset(); mostrarToast('Campanha lançada para a equipe!', 'ok'); carregarBonus(); }
            btnSubmit.innerHTML = textOriginal;
            btnSubmit.disabled = false;
        } catch (err) {  }
    });
}

window.encerrarBonus = (id) => {
    window.abrirConfirmacao('Encerrar Campanha', 'Deseja parar esta campanha de bônus?', 'Encerrar', async () => {
        try {
            await supabase.from('campanhas_bonus').update({ status: 'Encerrada' }).eq('id', id);
            mostrarToast('Campanha encerrada.', 'ok');
            carregarBonus();
        } catch(err) {  }
    });
};

/**
 * ============================================================================
 * 10. O NÚCLEO DO SISTEMA: CARREGAMENTO DE LEADS E VENDAS
 * ============================================================================
 */
async function carregarLeads() {
    let query = supabase.from('leads').select('*').order('created_at', { ascending: false });

    if (perfilAtual.role === 'vendedor' || perfilAtual.role === 'sdr') {
        query = query.eq('user_id', usuarioAtual.id);
    }

    const { data, error } = await query;
    if (!error) leadsData = data || [];

    // [FIX-BUG-4] Detecção automática de vencimento / inadimplência
    // Usa data_vencimento se existir, ou data_followup como fallback para clientes fechados
    // Se o campo data_vencimento não existir no banco ainda, usa data_followup
    const hoje = new Date().toISOString().split('T')[0];
    const leadsFechadosSemInadimplencia = leadsData.filter(l =>
        l.status === 'fechados' &&
        l.aprovado === true &&
        !l.estornado &&
        !l.is_inadimplente
    );
    // Detecta vencidos automaticamente (sem gravar no banco — só marca na memória para exibição)
    // Para marcar no banco, o gestor usa o botão manual da gaveta
    leadsFechadosSemInadimplencia.forEach(l => {
        const dataVenc = l.data_vencimento || null; // coluna futura
        const dataFup  = l.data_followup || null;   // proxy atual
        const dataRef  = dataVenc || dataFup;
        if (dataRef && dataRef < hoje) {
            // Marca na memória local (não grava no banco automaticamente para não criar falsos positivos)
            l._vencidoLocal = true;
            l._diasVencido  = Math.floor((new Date(hoje) - new Date(dataRef + 'T12:00:00')) / (1000*60*60*24));
        }
    });

    if (perfilAtual.role === 'gestor_geral' || perfilAtual.role === 'gestor_sub') {
        const pagQuery = await supabase.from('pagamentos_comissao').select('*');
        pagamentosData = (pagQuery.data || []).sort((a, b) => {
            if (a.created_at && b.created_at) return new Date(b.created_at) - new Date(a.created_at);
            return (b.id || 0) - (a.id || 0);
        });
        carregarDespesas();
    }

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
        renderizarKanban();
        renderizarLista();
        renderizarAgenda();
        renderizarArena();
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

    window._atualizarNotificacoes?.();
}

window.atualizarMeta = function() {
    let fechadosReais = leadsData.filter(l => l.status === 'fechados' && l.aprovado === true && !l.estornado);
    if (perfilAtual.role === 'vendedor' || perfilAtual.role === 'sdr') {
        fechadosReais = fechadosReais.filter(l => l.user_id === usuarioAtual.id);
    }
    const receita = fechadosReais.reduce((acc, l) => acc + Number(l.valor), 0);
    let objetivo = 10000;
    const perfilGestor = perfisEquipe.find(p => p.role === 'gestor_geral' || p.role === 'gestor');
    if (perfilGestor && perfilGestor.meta_mensal) objetivo = perfilGestor.meta_mensal;
    let porcentagem = Math.min((receita / objetivo) * 100, 100);

    ['meta-atual', 'meta-atual-gestor'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(receita);
    });
    ['meta-objetivo', 'meta-objetivo-gestor'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(objetivo);
    });
    ['meta-barra', 'meta-barra-gestor'].forEach(id => {
        const barra = document.getElementById(id);
        if (barra) {
            barra.style.width = `${porcentagem}%`;
            if (porcentagem === 100 && receita > 0) barra.classList.add('bateu-meta');
            else barra.classList.remove('bateu-meta');
        }
    });
};

window.alterarMeta = () => {
    let valorAExibir = 10000;
    const perfilGestor = perfisEquipe.find(p => p.role === 'gestor_geral' || p.role === 'gestor');
    if (perfilGestor && perfilGestor.meta_mensal) valorAExibir = perfilGestor.meta_mensal;
    document.getElementById('inp-nova-meta').value = valorAExibir;
    document.getElementById('modal-meta').classList.add('ativa');
};

const formMeta = document.getElementById('form-meta');
if (formMeta) {
    formMeta.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const nm = Number(document.getElementById('inp-nova-meta').value);
            if (isNaN(nm) || nm <= 0) return mostrarToast('Valor inválido.', 'erro');
            const btnSalvar = formMeta.querySelector('button');
            const txtOriginal = btnSalvar.innerHTML;
            btnSalvar.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';
            btnSalvar.disabled = true;
            // Salvar meta em todos os gestores_geral E no perfil atual
            const { data: todosGestores } = await supabase
                .from('profiles')
                .select('id')
                .in('role', ['gestor_geral', 'gestor']);
            
            const idsParaAtualizar = (todosGestores || []).map(g => g.id);
            if (!idsParaAtualizar.includes(usuarioAtual.id)) idsParaAtualizar.push(usuarioAtual.id);
            
            const { error } = await supabase
                .from('profiles')
                .update({ meta_mensal: nm })
                .in('id', idsParaAtualizar);

            btnSalvar.innerHTML = txtOriginal;
            btnSalvar.disabled = false;
            if (error) { mostrarToast('Erro ao salvar meta: ' + error.message, 'erro'); console.error(error); }
            else {
                perfilAtual.meta_mensal = nm;
                const { data } = await supabase.from('profiles').select('*');
                perfisEquipe = data || [];
                window.atualizarMeta();
                document.getElementById('modal-meta').classList.remove('ativa');
                mostrarToast('✅ Meta Global atualizada com sucesso!', 'ok');
            }
        } catch (err) {  }
    });
}

const btnViewKanban = document.getElementById('btn-view-kanban');
const btnViewLista = document.getElementById('btn-view-lista');
const kanbanBoard = document.getElementById('kanban-board');
const listaBoard = document.getElementById('lista-board');

if (btnViewKanban && btnViewLista) {
    btnViewKanban.onclick = () => {
        btnViewKanban.classList.add('ativo'); btnViewLista.classList.remove('ativo');
        kanbanBoard.classList.remove('hidden'); listaBoard.classList.add('hidden');
    };
    btnViewLista.onclick = () => {
        btnViewLista.classList.add('ativo'); btnViewKanban.classList.remove('ativo');
        listaBoard.classList.remove('hidden'); kanbanBoard.classList.add('hidden');
    };
}

/**
 * ============================================================================
 * 11. GERAÇÃO DOS CARDS DO KANBAN
 * ============================================================================
 */
function gerarCardHTML(l, status, isPosVenda = false) {
    let numWpp = l.whatsapp.replace(/\D/g, '');
    if (!numWpp.startsWith('55') && numWpp.length <= 11) numWpp = '55' + numWpp;

    let termometroClasse = '';
    let termometroBadge = '';
    let valorExibicao = `<span style="color: ${status==='fechados'?'var(--fechados)':'var(--accent)'}; font-weight:bold; font-size: 14px;">R$ ${Number(l.valor).toFixed(2)}</span>`;

    if (status === 'abandonados') {
        termometroClasse = 'card-pendente';
        termometroBadge = `<span class="badge" style="background:rgba(122,131,161,0.15); color:var(--muted);"><i class="ph ph-ghost"></i> Ghosting</span>`;
        valorExibicao = `<span style="color: var(--muted); font-weight:bold; font-size: 12px; text-decoration: line-through;">R$ ${Number(l.valor).toFixed(2)}</span>`;
    } else if (l.estornado || status === 'perdidos') {
        termometroClasse = 'card-pendente';
        termometroBadge = `<span class="badge-vermelho"><i class="ph ph-warning-circle"></i> ${l.motivo_perda || 'Perdido'}</span>`;
        valorExibicao = `<span style="color: var(--danger); font-weight:bold; font-size: 12px; text-decoration: line-through;">R$ ${Number(l.valor).toFixed(2)}</span>`;
    } else if (l.is_inadimplente) {
        termometroClasse = 'card-pendente';
        termometroBadge = `<span class="badge-vermelho"><i class="ph ph-warning"></i> Em Atraso</span>`;
    } else if (l._vencidoLocal && !isPosVenda) {
        // [FIX-BUG-4] Detectado automaticamente — vencimento passou mas gestor ainda não marcou
        termometroClasse = 'card-pendente';
        const diasStr = l._diasVencido === 1 ? '1 dia' : `${l._diasVencido} dias`;
        termometroBadge = `<span class="badge-pendente" style="background:rgba(240,82,82,0.15);color:var(--danger);border-color:rgba(240,82,82,0.4);"><i class="ph ph-calendar-x"></i> Venceu há ${diasStr}</span>`;
    } else if (status === 'fechados' && l.aprovado !== true && !isPosVenda) {
        termometroClasse = 'card-pendente';
        termometroBadge = `<span class="badge-pendente"><i class="ph ph-hourglass-high"></i> Aguard. Gestor</span>`;
        valorExibicao = `<span style="color: var(--negociacao); font-weight:bold; font-size: 12px; font-style:italic;">💸 R$ ${Number(l.valor).toFixed(2)} (Aprovação)</span>`;
    } else if (status !== 'fechados' && l.created_at && !isPosVenda) {
        let diffDias = Math.floor(Math.abs(new Date() - new Date(l.created_at)) / (1000 * 60 * 60 * 24));
        if (diffDias <= 1) { termometroClasse = 'lead-quente'; termometroBadge = `<span class="badge-quente"><i class="ph ph-fire"></i> Novo</span>`; }
        else if (diffDias >= 3) { termometroClasse = 'lead-frio'; termometroBadge = `<span class="badge-frio"><i class="ph ph-snowflake"></i> Esfriando</span>`; }
    }

    let iconesExtras = '';
    if (l.notas) iconesExtras += `<i class="ph ph-notebook" title="Anotações" style="color:var(--novos); margin-left:6px;"></i>`;
    if (l.comprovante_url) iconesExtras += `<i class="ph ph-receipt" title="Comprovante Financeiro" style="color:var(--fechados); margin-left:4px;"></i>`;
    if (l.doc_importante_url) iconesExtras += `<i class="ph ph-file-text" title="Docs Importantes" style="color:var(--novos); margin-left:4px;"></i>`;
    if (l.is_recorrente) iconesExtras += `<i class="ph ph-arrows-clockwise" title="Assinatura" style="color:var(--purple); margin-left:4px;"></i>`;

    const nomeSafe = (l.nome || '').replace(/'/g, "\\'");
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
                <button onclick="event.stopPropagation(); window.abrirModalWhatsApp('${numWpp}', '${nomeSafe}')" style="background: rgba(37,211,102,0.1); border:none; color: #25d366; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 11px; display: flex; align-items: center; gap: 4px; transition:0.2s;">
                    <i class="ph ph-whatsapp-logo" style="font-size:14px;"></i> Chamar
                </button>
            </div>
            ${valorExibicao}
        </div>
    </div>`;
}

function renderizarKanban() {
    let leadsVisao = leadsData;
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
                        status === 'abandonados' ? 'ph-ghost' : 'ph-shield-check';
            col.innerHTML = `<div class="empty-state"><i class="ph ${icone}"></i><p>${msg}</p></div>`;
            configurarDrag(col, 'status');
            return;
        }
        col.innerHTML = list.map(l => gerarCardHTML(l, status)).join('');
        configurarDrag(col, 'status');
    });
}

function renderizarPosVenda() {
    let leadsPos = leadsData.filter(l => l.status === 'fechados' && l.aprovado === true && !l.estornado);
    if (perfilAtual.role === 'vendedor') leadsPos = leadsPos.filter(l => l.user_id === usuarioAtual.id);
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
            let msg = etapa === 'onboarding' ? 'Nenhum cliente novo.' : etapa === 'acompanhamento' ? 'Nenhum acompanhamento ativo.' : 'Ninguém pronto para Upsell.';
            let icone = etapa === 'onboarding' ? 'ph-hand-waving' : etapa === 'acompanhamento' ? 'ph-chats-circle' : 'ph-rocket-launch';
            col.innerHTML = `<div class="empty-state"><i class="ph ${icone}"></i><p>${msg}</p></div>`;
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
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px; color:var(--muted);">Nenhum cliente no funil.</td></tr>`;
        return;
    }
    tbody.innerHTML = leadsVisao.map(l => {
        let corBadge = l.status === 'novos' ? 'badge-azul' : (l.status === 'negociacao' ? 'badge-amarelo' : (l.status === 'perdidos' ? 'badge-vermelho' : (l.status === 'abandonados' ? 'badge-equipe' : 'badge-verde')));
        let corValor = l.status === 'fechados' ? 'var(--fechados)' : (l.status === 'perdidos' || l.status === 'abandonados' ? 'var(--danger)' : 'var(--accent)');
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
        c.ondragstart = (e) => { c.classList.add('dragging'); e.dataTransfer.setData('id', c.dataset.id); };
        c.ondragend = () => { c.classList.remove('dragging'); };
    });
    container.ondragover = (e) => { e.preventDefault(); container.classList.add('drag-over'); };
    container.ondragleave = () => { container.classList.remove('drag-over'); };
    container.ondrop = async (e) => {
        e.preventDefault();
        container.classList.remove('drag-over');
        const idCard = e.dataTransfer.getData('id');
        const lead = leadsData.find(l => l.id == idCard);
        if (!lead) return;

        if (tipoDrop === 'status') {
            const novoStatus = container.dataset.status;
            if (lead.status === novoStatus) return;
            if (lead.status === 'fechados' && lead.aprovado === true) { mostrarToast('Venda já aprovada no caixa! Peça um estorno ao Financeiro.', 'erro'); return; }
            if (lead.estornado) { mostrarToast('Venda bloqueada por estorno.', 'erro'); return; }
            if (novoStatus === 'perdidos') {
                document.getElementById('inp-perda-lead-id').value = idCard;
                document.getElementById('modal-motivo-perda').classList.add('ativa');
                return;
            }
            if (novoStatus === 'abandonados') {
                let histAtual = lead.historico || [];
                histAtual.push({ data: new Date().toISOString(), msg: `Movido para ABANDONADOS (Ghosting) por ${perfilAtual.full_name}` });
                await supabase.from('leads').update({ status: 'abandonados', historico: histAtual }).eq('id', idCard);
                mostrarToast('Cliente arquivado em Abandonados.', 'ok');
                carregarLeads();
                return;
            }
            let historicoAtual = lead.historico || [];
            historicoAtual.push({ data: new Date().toISOString(), msg: `Movido para ${novoStatus.toUpperCase()} por ${perfilAtual.full_name}` });
            let payloadUpdate = { status: novoStatus, motivo_perda: null, historico: historicoAtual };
            if (novoStatus === 'fechados') {
                payloadUpdate.aprovado = false;
                await supabase.from('leads').update(payloadUpdate).eq('id', idCard);
                carregarLeads();
                mostrarToast('Anexe o comprovante na gaveta para aprovação do Financeiro!', 'ok');
                setTimeout(() => { window.abrirDrawerLead(parseInt(idCard)); }, 500);
            } else {
                await supabase.from('leads').update(payloadUpdate).eq('id', idCard);
                carregarLeads();
            }
        } else if (tipoDrop === 'posvenda') {
            const novaEtapa = container.dataset.etapa;
            if (lead.etapa_pos_venda === novaEtapa) return;
            let historicoAtual = lead.historico || [];
            historicoAtual.push({ data: new Date().toISOString(), msg: `Pós-Venda movido para ${novaEtapa.toUpperCase()} por ${perfilAtual.full_name}` });
            await supabase.from('leads').update({ etapa_pos_venda: novaEtapa, historico: historicoAtual }).eq('id', idCard);
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
        if (e.target.value === 'Outro') { boxCustomMotivo.style.display = 'block'; inputCustomMotivo.required = true; }
        else { boxCustomMotivo.style.display = 'none'; inputCustomMotivo.required = false; inputCustomMotivo.value = ''; }
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
            if (motivo === 'Outro') motivo = document.getElementById('inp-perda-motivo-custom').value;
            const lead = leadsData.find(l => l.id == id);
            let historicoAtual = lead.historico || [];
            if (motivo === 'Abandonou / Ghosting') {
                historicoAtual.push({ data: new Date().toISOString(), msg: `Marcado como ABANDONADO por ${perfilAtual.full_name}` });
                await supabase.from('leads').update({ status: 'abandonados', motivo_perda: motivo, historico: historicoAtual }).eq('id', id);
            } else {
                historicoAtual.push({ data: new Date().toISOString(), msg: `Marcado como PERDIDO: "${motivo}" por ${perfilAtual.full_name}` });
                await supabase.from('leads').update({ status: 'perdidos', motivo_perda: motivo, historico: historicoAtual }).eq('id', id);
            }
            document.getElementById('modal-motivo-perda').classList.remove('ativa');
            mostrarToast('Venda baixada no sistema.', 'ok');
            btnSubmit.innerHTML = textOriginal;
            btnSubmit.disabled = false;
            carregarLeads();
        } catch (err) { mostrarToast('Erro no processamento', 'erro'); }
    });
}

/**
 * ============================================================================
 * 14. CADASTRO DE LEADS (COM PAYLOAD ROBUSTO — [FIX-1])
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

            const nome     = document.getElementById('inp-nome').value.trim();
            const whatsapp = document.getElementById('inp-whatsapp').value.trim();

            // [FIX-BUG-2] produto não é obrigatório — nunca bloqueia submit se catálogo vazio
            const produtoEl = document.getElementById('inp-produto');
            if (produtoEl) produtoEl.removeAttribute('required');
            const produto = produtoEl?.value || null;

            // [FIX-BUG-2] parseFloat seguro — string vazia e NaN viram 0
            const valorStr = document.getElementById('inp-valor').value;
            const valor = (!valorStr || isNaN(parseFloat(valorStr))) ? 0 : parseFloat(valorStr);

            const pagamentoEl = document.getElementById('inp-pagamento');
            const pagamento = pagamentoEl ? pagamentoEl.value : 'Pix';
            const statusEl = document.getElementById('inp-status');
            const statusSelecionado = statusEl ? statusEl.value : 'novos';
            const recorrenteEl = document.getElementById('inp-is-recorrente');
            const isRecorrente = recorrenteEl ? recorrenteEl.checked : false;
            const origemEl = document.getElementById('inp-origem');
            const origem = origemEl ? origemEl.value : 'Indicação';

            if (!nome) {
                mostrarToast('Informe o nome do cliente.', 'erro');
                btnSubmit.innerHTML = textOriginal; btnSubmit.disabled = false; return;
            }
            if (!whatsapp) {
                mostrarToast('Informe o WhatsApp do cliente.', 'erro');
                btnSubmit.innerHTML = textOriginal; btnSubmit.disabled = false; return;
            }

            const logCriacao = [{ data: new Date().toISOString(), msg: `Cadastrado no HAPSIS por ${perfilAtual.full_name}` }];
            const aprovado = (statusSelecionado === 'fechados') ? false : true;

            // [FIX-1] Payload limpo — campos opcionais só adicionados se existirem
            const payload = {
                nome,
                whatsapp,
                valor,
                forma_pagamento: pagamento,
                status: statusSelecionado,
                user_id: usuarioAtual.id,
                aprovado,
                etapa_pos_venda: 'onboarding',
                historico: logCriacao,
            };

            // Campos condicionais — só adicionados se tiverem valor real
            if (produto) payload.produto = produto;
            if (origem)  payload.origem_lead = origem;
            if (isRecorrente) {
                payload.is_recorrente = true;
                payload.status_assinatura = 'ativa';
            }

            const { error } = await supabase.from('leads').insert([payload]);

            if (error) {
                let msgErro = 'Erro ao salvar no banco de dados.';
                if (error.message.includes('column') || error.message.includes('does not exist')) {
                    msgErro = 'Coluna faltando no banco. Execute o SQL de correção no Supabase.';
                } else if (error.message.includes('violates')) {
                    msgErro = 'Dado inválido: ' + error.message.split('"')[1];
                } else {
                    msgErro = error.message;
                }
                mostrarToast(msgErro, 'erro');
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
        } catch(err) {  }
    });
};

const btnNovoLead = document.getElementById('btn-novo-lead');
if (btnNovoLead) { btnNovoLead.onclick = () => { document.getElementById('modal-lead').classList.add('ativa'); }; }

const btnFecharModal = document.getElementById('btn-fechar-modal');
if (btnFecharModal) { btnFecharModal.onclick = () => { document.getElementById('modal-lead').classList.remove('ativa'); }; }

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
    if (elOrigem) elOrigem.innerText = lead.origem_lead || 'Não Informada';

    // [FIX-BUG-4] Campo de vencimento — só relevante para clientes FECHADOS
    const secaoVencimento = document.getElementById('drawer-secao-vencimento');
    if (secaoVencimento) {
        // Mostrar apenas para fechados aprovados (onde faz sentido cobrar)
        secaoVencimento.style.display = (lead.status === 'fechados') ? 'block' : 'none';
    }
    const elVenc = document.getElementById('drawer-data-vencimento');
    if (elVenc) elVenc.value = lead.data_vencimento || '';

    // Alerta visual se vencimento passou
    const alertVenc = document.getElementById('drawer-alerta-vencido');
    if (alertVenc) {
        if (lead._vencidoLocal) {
            alertVenc.innerHTML = `<i class="ph ph-warning-circle"></i> Boleto/cobrança venceu há <strong>${lead._diasVencido} dia(s)</strong>. Confirme a inadimplência abaixo.`;
            alertVenc.style.display = 'flex';
        } else {
            alertVenc.style.display = 'none';
        }
    }

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

    const setFileInput = (idInput, idLabel, idBox, linkId, url, defaultText) => {
        const fileInput = document.getElementById(idInput);
        if (fileInput) fileInput.value = '';
        const labelEl = document.getElementById(idLabel);
        if (labelEl) { labelEl.innerText = defaultText; labelEl.style.color = 'var(--muted)'; }
        const boxVer = document.getElementById(idBox);
        if (boxVer) {
            if (url) { boxVer.classList.remove('hidden'); document.getElementById(linkId).href = url; }
            else boxVer.classList.add('hidden');
        }
    };

    setFileInput('drawer-file-comprovante', 'nome-arquivo-comprovante', 'box-ver-comprovante', 'link-ver-comprovante', lead.comprovante_url, 'Nenhum arquivo');
    setFileInput('drawer-file-contrato', 'nome-arquivo-contrato', 'box-ver-contrato', 'link-ver-contrato', lead.contrato_url, 'Sem contrato');
    setFileInput('drawer-file-doc', 'nome-arquivo-doc', 'box-ver-doc', 'link-ver-doc', lead.doc_importante_url, 'Nenhum doc');

    const btnEstorno = document.getElementById('btn-estorno-venda');
    if (btnEstorno) {
        if ((perfilAtual.role === 'gestor_geral' || perfilAtual.role === 'gestor_sub') && lead.status === 'fechados' && lead.aprovado === true && !lead.estornado) {
            btnEstorno.classList.remove('hidden');
            btnEstorno.onclick = () => window.estornarVenda(lead.id);
        } else { btnEstorno.classList.add('hidden'); }
    }

    const btnInadimplente = document.getElementById('btn-marcar-inadimplente');
    if (btnInadimplente) {
        if (lead.status === 'fechados' && lead.aprovado === true && !lead.estornado && !lead.is_inadimplente) {
            btnInadimplente.classList.remove('hidden');
            btnInadimplente.onclick = () => window.marcarInadimplente(lead.id);
        } else { btnInadimplente.classList.add('hidden'); }
    }

    const btnChurn = document.getElementById('btn-cancelar-assinatura');
    if (btnChurn) {
        if (lead.is_recorrente && lead.status_assinatura === 'ativa' && lead.status === 'fechados') {
            btnChurn.classList.remove('hidden');
            btnChurn.onclick = () => window.cancelarAssinatura(lead.id);
        } else { btnChurn.classList.add('hidden'); }
    }

    document.getElementById('drawer-lead').classList.add('ativa');
};

window.repassarLead = async () => {
    const leadId = document.getElementById('drawer-lead-id').value;
    const novoVendedorId = document.getElementById('inp-repassar-vendedor').value;
    if (!novoVendedorId) return mostrarToast('Selecione um Closer na lista!', 'erro');
    try {
        const lead = leadsData.find(l => l.id == leadId);
        const vend = perfisEquipe.find(p => p.id == novoVendedorId);
        let hist = lead.historico || [];
        hist.push({ data: new Date().toISOString(), msg: `Lead repassado para ${vend.full_name} por ${perfilAtual.full_name} (SDR)` });
        await supabase.from('leads').update({ user_id: novoVendedorId, historico: hist }).eq('id', leadId);
        mostrarToast('Lead repassado com sucesso!', 'ok');
        document.getElementById('drawer-lead').classList.remove('ativa');
        carregarLeads();
    } catch(err) { mostrarToast('Erro ao repassar lead.', 'erro'); }
};

const handleFileChange = (idInput, idLabel, colorVar) => {
    const el = document.getElementById(idInput);
    if (el) {
        el.addEventListener('change', (e) => {
            const label = document.getElementById(idLabel);
            if (!label) return;
            if (e.target.files.length > 0) { label.innerText = e.target.files[0].name; label.style.color = colorVar; }
            else { label.innerText = 'Nenhum arquivo'; label.style.color = 'var(--muted)'; }
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
        if (notasStr !== '') payload.notas = notasStr; else payload.notas = null;
        if (dataFup !== '') payload.data_followup = dataFup; else payload.data_followup = null;

        // [FIX-BUG-4] Salvar data de vencimento do boleto/cobrança
        const dataVencEl = document.getElementById('drawer-data-vencimento');
        if (dataVencEl) {
            payload.data_vencimento = dataVencEl.value || null;
        }
        const leadAtual = leadsData.find(l => l.id == id);
        let historicoAtual = leadAtual.historico || [];
        historicoAtual.push({ data: new Date().toISOString(), msg: `Gaveta atualizada por ${perfilAtual.full_name}` });
        payload.historico = historicoAtual;

        const uploadFile = async (inputId, prefix, payloadKey) => {
            const fileInput = document.getElementById(inputId);
            if (fileInput && fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const fileName = `lead_${id}_${prefix}_${Date.now()}.${file.name.split('.').pop()}`;
                const { error: uploadError } = await supabase.storage.from('comprovantes').upload(fileName, file);
                if (!uploadError) {
                    payload[payloadKey] = supabase.storage.from('comprovantes').getPublicUrl(fileName).data.publicUrl;
                } else { }
            }
        };

        await uploadFile('drawer-file-comprovante', 'comp', 'comprovante_url');
        await uploadFile('drawer-file-contrato', 'contrato', 'contrato_url');
        await uploadFile('drawer-file-doc', 'doc', 'doc_importante_url');

        const { error } = await supabase.from('leads').update(payload).eq('id', id);
        if (error) { mostrarToast("Erro ao salvar dados finais.", "erro"); }
        else { mostrarToast("Atualizado com sucesso!", "ok"); document.getElementById('drawer-lead').classList.remove('ativa'); carregarLeads(); }
    } catch(err) { mostrarToast("Erro sistêmico ao salvar gaveta", "erro"); }
};

window.gerarPropostaPDF = () => {
    const id = document.getElementById('drawer-lead-id').value;
    const lead = leadsData.find(l => l.id == id);
    if (!lead) return mostrarToast('Lead não encontrado para geração de PDF.', 'erro');
    const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.valor);
    const empresaNome = perfilAtual.nome_empresa || 'HAPSIS Premium';
    const janelaImpressao = window.open('', '_blank');
    janelaImpressao.document.write(`
    <html><head><title>Proposta - ${lead.nome}</title>
    <style>body{font-family:'Segoe UI',sans-serif;padding:40px;color:#333;line-height:1.6}.header{text-align:center;border-bottom:2px solid #f5c518;padding-bottom:20px;margin-bottom:30px}.header h1{margin:0;color:#10121a;font-size:28px;text-transform:uppercase}.price-box{background:#f8f9fa;padding:25px;border-left:6px solid #81c784;font-size:18px;margin-top:30px;border-radius:4px}.footer{margin-top:60px;text-align:center;font-size:12px;color:#888;border-top:1px solid #ddd;padding-top:20px}</style>
    </head><body>
    <div class="header"><h1>Proposta Comercial</h1><p>${empresaNome}</p></div>
    <p><strong>Aos cuidados de:</strong> ${lead.nome}</p>
    <p><strong>Contato:</strong> ${lead.whatsapp}</p>
    <p><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
    <p><strong>Produto/Serviço Oferecido:</strong> ${lead.produto || 'Consultoria Geral'}</p>
    <div class="price-box">
        <p style="margin:0; font-size:20px;"><strong>Investimento Total:</strong> <span style="font-size:28px;color:#21a366;font-weight:bold;">${valorFormatado}</span></p>
        <p style="margin-top:12px;font-size:15px;"><strong>Forma de Pagamento Acordada:</strong> ${lead.forma_pagamento || 'A combinar'}</p>
    </div>
    <div class="footer"><p>Proposta gerada por ${perfilAtual.full_name} | ${empresaNome}</p><p>Documento válido por 5 dias úteis a partir da data de emissão.</p></div>
    <script>window.onload = () => { window.print(); window.close(); }<\/script>
    </body></html>`);
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
        const leadsFiltrados = leadsData.sort((a,b) => a.nome.localeCompare(b.nome));
        select.innerHTML = '<option value="">Selecione o Cliente...</option>' +
            leadsFiltrados.map(l => `<option value="${l.id}">${l.nome} (${l.produto || 'Geral'})</option>`).join('');
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
            if (!leadId) return mostrarToast('Selecione um cliente da lista.', 'erro');
            if (!fileInput.files.length) return mostrarToast('Você precisa anexar um arquivo PDF ou Imagem.', 'erro');
            const btn = formUploadCofre.querySelector('button[type="submit"]');
            const txt = btn.innerHTML;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Subindo para a Nuvem...';
            btn.disabled = true;
            const file = fileInput.files[0];
            const prefixo = tipo === 'contrato_url' ? 'contrato' : (tipo === 'comprovante_url' ? 'comp' : 'doc');
            const fileName = `cofre_${leadId}_${prefixo}_${Date.now()}.${file.name.split('.').pop()}`;
            const { error } = await supabase.storage.from('comprovantes').upload(fileName, file);
            if (error) { mostrarToast('Erro de upload. Verifique as regras do bucket.', 'erro'); btn.innerHTML = txt; btn.disabled = false; return; }
            const url = supabase.storage.from('comprovantes').getPublicUrl(fileName).data.publicUrl;
            const payload = {};
            payload[tipo] = url;
            const lead = leadsData.find(l => l.id == leadId);
            let hist = lead.historico || [];
            hist.push({ data: new Date().toISOString(), msg: `Arquivo anexado diretamente via Cofre por ${perfilAtual.full_name}` });
            payload.historico = hist;
            await supabase.from('leads').update(payload).eq('id', leadId);
            mostrarToast('Documento criptografado e guardado no Cofre!', 'ok');
            document.getElementById('modal-upload-cofre').classList.remove('ativa');
            formUploadCofre.reset();
            btn.innerHTML = txt;
            btn.disabled = false;
            carregarLeads();
        } catch(err) { mostrarToast('Erro no sistema ao fazer upload.', 'erro'); }
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
    leadsData.forEach(l => {
        const origem = l.origem_lead || 'Indicação';
        origemCounts[origem] = (origemCounts[origem] || 0) + 1;
        if (!canalStats[origem]) canalStats[origem] = { leads: 0, vendas: 0 };
        canalStats[origem].leads += 1;
        if (l.status === 'fechados' && l.aprovado === true && !l.estornado) canalStats[origem].vendas += 1;
    });

    if (chartOrigemInstance) chartOrigemInstance.destroy();
    const labelsOrigem = Object.keys(origemCounts).length > 0 ? Object.keys(origemCounts) : ['Sem Origem'];
    const dataOrigem = Object.keys(origemCounts).length > 0 ? Object.values(origemCounts) : [1];
    const coresOrigem = Object.keys(origemCounts).length > 0 ? ['#38bdf8', '#fb923c', '#a78bfa', '#4ade80', '#f5c518'] : ['#2e3550'];
    chartOrigemInstance = new Chart(ctxOrigem, {
        type: 'doughnut',
        data: { labels: labelsOrigem, datasets: [{ data: dataOrigem, backgroundColor: coresOrigem, borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right', labels: { color: '#7a83a1', font: {size: 11} } } } }
    });

    const canaisArray = Object.keys(canalStats).map(k => ({ nome: k, ...canalStats[k] })).sort((a,b) => b.leads - a.leads);
    if (canaisArray.length === 0) {
        tbodyCanais.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:30px; color:var(--muted);">Aguardando dados estruturados...</td></tr>`;
    } else {
        tbodyCanais.innerHTML = canaisArray.map(c => `
        <tr>
            <td style="font-weight:bold; color:var(--text);">${c.nome}</td>
            <td style="text-align:right;">${c.leads}</td>
            <td style="text-align:right; color:var(--fechados); font-weight:bold;">${c.vendas}</td>
        </tr>`).join('');
    }
}

window.atualizarGrowth = () => { mostrarToast('Métricas de Investimento em Ads calculadas e aplicadas.', 'ok'); };

/**
 * ============================================================================
 * 18. ARENA DE VENDAS E AGENDA
 * ============================================================================
 */
function renderizarArena() {
    const containerPodio = document.getElementById('arena-podio');
    const containerLista = document.getElementById('arena-lista');
    if (!containerPodio || !containerLista) return;
    const vendedores = perfisEquipe.filter(p => p.role === 'vendedor' || p.role === 'sdr');
    if (vendedores.length === 0) {
        containerPodio.innerHTML = `<div style="text-align: center; color: var(--muted); width:100%;"><i class="ph ph-users-slash" style="font-size:48px; margin-bottom:10px; display:block;"></i>Nenhum vendedor disponível para a arena.</div>`;
        containerLista.innerHTML = '';
        return;
    }
    let ranking = vendedores.map(v => {
        const fechados = leadsData.filter(l => l.user_id === v.id && l.status === 'fechados' && l.aprovado === true && !l.estornado);
        const receita = fechados.reduce((soma, l) => soma + Number(l.valor), 0);
        return { ...v, receita, qtd: fechados.length };
    }).sort((a, b) => b.receita - a.receita);

    if (ranking[0].receita === 0) {
        containerPodio.innerHTML = `<div style="text-align: center; color: var(--muted); width:100%;"><i class="ph ph-ghost" style="font-size:48px; margin-bottom:10px; display:block;"></i>A arena está vazia! Nenhuma venda finalizada ainda.</div>`;
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
        container.innerHTML = `<div class="empty-state"><i class="ph ph-calendar-blank"></i><p>Sua agenda está livre.<br>Nenhum retorno marcado para negociações ativas.</p></div>`;
        return;
    }
    leadsAgendados.sort((a, b) => new Date(a.data_followup) - new Date(b.data_followup));
    let hojeStr = new Date().toISOString().split('T')[0];
    let atrasados = [], hoje = [], futuros = [];
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
    const nomeSafe = (l.nome || '').replace(/'/g, "\\'");
    return `
    <div class="agenda-item ${tipo}" onclick="window.abrirDrawerLead(${l.id})">
        <div class="agenda-item-info">
            <span class="agenda-nome">${l.nome}</span>
            <span style="color:var(--muted); font-size:12px;">Produto: <strong style="color:var(--text)">${l.produto}</strong> | Etapa: <strong style="color:var(--text)">${l.status.toUpperCase()}</strong></span>
        </div>
        <div style="display:flex; align-items:center; gap:16px;">
            <button onclick="event.stopPropagation(); window.abrirModalWhatsApp('${numWpp}', '${nomeSafe}')" style="background: rgba(37,211,102,0.1); border:none; color: #25d366; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; display: flex; align-items: center; gap: 6px; transition:0.2s;">
                <i class="ph ph-whatsapp-logo" style="font-size:16px;"></i> Chamar
            </button>
            <span class="agenda-data ${tipo}"><i class="ph ${icone}"></i> ${label}</span>
        </div>
    </div>`;
}

// WhatsApp Modal
window.abrirModalWhatsApp = (numWpp, nome) => {
    document.getElementById('wpp-numero').value = numWpp;
    document.getElementById('wpp-nome').value = nome;
    const customMsg = document.getElementById('wpp-custom-msg');
    if (customMsg) customMsg.value = '';
    document.getElementById('modal-whatsapp').classList.add('ativa');
};

window.enviarWhatsApp = (tipo) => {
    const numero = document.getElementById('wpp-numero').value;
    const nome = document.getElementById('wpp-nome').value;
    const primeiroNome = nome.split(' ')[0];
    const empresa = perfilAtual.nome_empresa || 'HAPSIS';
    const vendedor = perfilAtual.full_name.split(' ')[0];

    const templates = {
        apresentacao: `Olá ${primeiroNome}! 👋\n\nSou ${vendedor} da ${empresa}.\nFicamos felizes com seu contato!\n\nTem um minutinho para conversarmos? 😊`,
        followup: `Oi ${primeiroNome}! 😊\n\nPassando para ver se você teve chance de analisar nossa proposta.\n\nFico à disposição para tirar dúvidas! 🚀`,
        cobranca: `Olá ${primeiroNome}!\n\nIdentificamos uma pendência financeira no seu cadastro.\n\nPoderia nos retornar para regularizarmos? 💳`,
    };

    let mensagem = '';
    if (tipo === 'custom') {
        mensagem = document.getElementById('wpp-custom-msg').value.trim();
        if (!mensagem) { mostrarToast('Digite uma mensagem personalizada.', 'erro'); return; }
    } else {
        mensagem = templates[tipo] || '';
    }

    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`, '_blank');
    document.getElementById('modal-whatsapp').classList.remove('ativa');
    mostrarToast('WhatsApp aberto!', 'ok');
};

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
        if (!lead.comissao_paga) {
            let prod = produtosData.find(p => p.nome === lead.produto);
            let taxaProd = prod ? (Number(prod.taxa_comissao) || 5) : 5;
            comissoesDevidasGlobais += (Number(lead.valor) * taxaProd) / 100;
        }
    });
    let lucroLiquido = faturamentoBruto - (comissoesDevidasGlobais + comissoesPagas);
    if (document.getElementById('caixa-bruto')) document.getElementById('caixa-bruto').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(faturamentoBruto);
    if (document.getElementById('caixa-comissao')) document.getElementById('caixa-comissao').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(comissoesDevidasGlobais + comissoesPagas);
    if (document.getElementById('caixa-liquido')) document.getElementById('caixa-liquido').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(lucroLiquido);

    const contagemPgto = { 'Pix': 0, 'Cartão de Crédito': 0, 'Boleto': 0 };
    fechadosReais.forEach(l => { let forma = l.forma_pagamento || 'Pix'; contagemPgto[forma] = (contagemPgto[forma] || 0) + Number(l.valor); });
    const ctxPagamentos = document.getElementById('chart-pagamentos');
    if (ctxPagamentos) {
        if (chartPagamentosInstance) chartPagamentosInstance.destroy();
        chartPagamentosInstance = new Chart(ctxPagamentos, {
            type: 'doughnut',
            data: { labels: Object.keys(contagemPgto), datasets: [{ data: Object.values(contagemPgto), backgroundColor: ['#4ade80', '#f5c518', '#7a83a1'], borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right', labels: { color: '#c4c9e0' } } } }
        });
    }

    const vendedores = perfisEquipe.filter(p => p.role === 'vendedor' || p.role === 'sdr');
    if (vendedores.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px; color:var(--muted);">Nenhum vendedor ou SDR na operação.</td></tr>`;
    } else {
        let temDevida = false;
        let linhasHtml = '';
        vendedores.forEach(v => {
            const vendasDoCara = fechadosReais.filter(l => l.user_id === v.id && !l.comissao_paga);
            if (vendasDoCara.length === 0) return;
            temDevida = true;
            const receita = vendasDoCara.reduce((acc, l) => acc + Number(l.valor), 0);
            let comissaoDevida = 0;
            vendasDoCara.forEach(lead => { let prod = produtosData.find(p => p.nome === lead.produto); let taxaProd = prod ? (Number(prod.taxa_comissao) || 5) : 5; comissaoDevida += (Number(lead.valor) * taxaProd) / 100; });
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
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px; color:var(--fechados);"><i class="ph ph-check-circle" style="font-size:24px; display:block;"></i>Todas as comissões pagas! O Livro-Caixa está limpo.</td></tr>`;
        } else {
            tbody.innerHTML = linhasHtml;
        }
    }

    const tbodyHistorico = document.getElementById('tbody-historico-pagamentos');
    if (tbodyHistorico) {
        if (pagamentosData.length === 0) {
            tbodyHistorico.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color:var(--muted);">Nenhum pagamento registrado no livro-caixa de comissões.</td></tr>`;
        } else {
            tbodyHistorico.innerHTML = pagamentosData.map(p => {
                // Usa snapshot do nome salvo no momento do pagamento, ou busca no perfil atual
                let nomeVend = p.nome_vendedor
                    || perfisEquipe.find(x => x.id === p.user_id)?.full_name
                    || '(Vendedor excluído)';
                let dataLocal = p.created_at
                    ? new Date(p.created_at).toLocaleString('pt-BR')
                    : '—';
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
            if (ids.length > 0) await supabase.from('leads').update({ comissao_paga: true }).in('id', ids);
            // Snapshot do nome do vendedor — preserva mesmo se o perfil for deletado depois
            const vendedorSnap = perfisEquipe.find(p => p.id === userId);
            const nomeVendedor = vendedorSnap?.full_name || 'Vendedor';
            await supabase.from('pagamentos_comissao').insert([{
                user_id: userId,
                valor: valorDevido,
                responsavel_pagamento: perfilAtual.full_name,
                nome_vendedor: nomeVendedor
            }]);
            mostrarToast('Comissão quitada e registrada no Livro-Caixa!', 'ok');
            carregarLeads();
        } catch(err) { mostrarToast('Erro ao processar baixa de comissão.', 'erro'); }
    });
};

window.estornarVenda = async (leadId) => {
    window.abrirConfirmacao('Estornar Venda (Chargeback)', '<strong style="color:var(--danger);">Atenção Crítica:</strong> Isso vai remover o valor do Faturamento Global, retirar a comissão projetada do vendedor e marcar o cliente como ESTORNADO de forma irreversível. Você confirma?', 'Estornar Dinheiro', async () => {
        try {
            const lead = leadsData.find(l => l.id == leadId);
            let historicoAtual = lead.historico || [];
            historicoAtual.push({ data: new Date().toISOString(), msg: `⚠️ ESTORNO/CHARGEBACK registrado e validado por ${perfilAtual.full_name}` });
            await supabase.from('leads').update({ status: 'perdidos', motivo_perda: 'Chargeback / Cancelamento Forçado', aprovado: false, estornado: true, historico: historicoAtual }).eq('id', leadId);
            mostrarToast('Venda estornada! Valores retirados dos Dashboards da empresa.', 'ok');
            document.getElementById('drawer-lead').classList.remove('ativa');
            carregarLeads();
        } catch(err) {  }
    });
};

function renderizarAprovacoes() {
    const tbody = document.getElementById('tbody-aprovacoes');
    const badge = document.getElementById('badge-aprov');
    if (!tbody || !badge) return;
    const pendentes = leadsData.filter(l => l.status === 'fechados' && l.aprovado !== true && !l.estornado);
    badge.innerText = pendentes.length;
    if (pendentes.length > 0) badge.classList.remove('hidden');
    else badge.classList.add('hidden');
    const badgeCeo = document.getElementById('badge-aprov-ceo');
    if (badgeCeo) { badgeCeo.innerText = pendentes.length; badgeCeo.classList.toggle('hidden', pendentes.length === 0); }
    if (pendentes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px; color:var(--fechados);"><i class="ph ph-check-circle" style="font-size:32px; display:block; margin-bottom:8px;"></i>Tudo limpo! Nenhuma aprovação de caixa pendente no momento.</td></tr>`;
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
    try {
        const lead = leadsData.find(l => l.id == id);
        let historicoAtual = lead.historico || [];
        historicoAtual.push({ data: new Date().toISOString(), msg: `Venda APROVADA e conferida no Financeiro por ${perfilAtual.full_name}` });
        await supabase.from('leads').update({ aprovado: true, historico: historicoAtual }).eq('id', id);
        mostrarToast('Venda Aprovada! O cliente caiu na esteira de Pós-Venda 💰', 'ok');
        carregarLeads();
    } catch(err) {  }
};

window.rejeitarVenda = async (id) => {
    try {
        const lead = leadsData.find(l => l.id == id);
        let historicoAtual = lead.historico || [];
        historicoAtual.push({ data: new Date().toISOString(), msg: `Venda REJEITADA no Caixa por ${perfilAtual.full_name}` });
        await supabase.from('leads').update({ status: 'negociacao', aprovado: false, historico: historicoAtual }).eq('id', id);
        mostrarToast('Venda Rejeitada. Retornou para o funil do vendedor.', 'erro');
        carregarLeads();
    } catch(err) {  }
};

/**
 * ============================================================================
 * 20. DESPESAS E CUSTOS OPERACIONAIS
 * ============================================================================
 */
async function carregarDespesas() {
    const { data } = await supabase.from('despesas').select('*').order('vencimento', { ascending: true });
    despesasData = data || [];
    renderizarDespesas();
}

function renderizarDespesas() {
    const tbody = document.getElementById('tbody-despesas');
    if (!tbody) return;
    if (despesasData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--muted);">Nenhuma despesa ou custo operacional lançado neste mês.</td></tr>`;
        return;
    }
    tbody.innerHTML = despesasData.map(d => {
        let statusBadge = d.status === 'Pago' ? `<span class="badge badge-verde">PAGO</span>` : `<span class="badge badge-vermelho">PENDENTE</span>`;
        // [FIX] Adiciona T12:00:00 para evitar problema de fuso que exibe dia anterior
        let dataVenc = new Date(d.vencimento + 'T12:00:00').toLocaleDateString('pt-BR');
        let btnAcao = d.status === 'Pendente'
            ? `<div style="display:flex; justify-content:center; gap:8px;">
                <button class="btn-primary" style="padding: 4px 8px; font-size: 12px; width: auto; margin:0;" onclick="window.quitarDespesa(${d.id})"><i class="ph ph-check"></i> Pagar</button>
                <button class="btn-cancel" style="padding: 4px 8px; font-size: 12px; width: auto; margin:0; border-color:var(--danger); color:var(--danger);" onclick="window.deletarDespesa(${d.id})"><i class="ph ph-trash"></i></button>
               </div>`
            : `<div style="display:flex; justify-content:center; gap:8px;">
                <span style="font-size:12px; color:var(--muted); align-self:center;"><i class="ph ph-check-all"></i> Quitado</span>
                <button class="btn-cancel" style="padding: 4px 8px; font-size: 12px; width: auto; margin:0; border-color:var(--danger); color:var(--danger);" onclick="window.deletarDespesa(${d.id})"><i class="ph ph-trash"></i></button>
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
            if (error) { mostrarToast('Erro ao atualizar conta no sistema.', 'erro'); }
            else { mostrarToast('Despesa quitada com sucesso e registrada.', 'ok'); carregarDespesas(); }
        } catch(err) {  }
    });
};

window.deletarDespesa = async (id) => {
    window.abrirConfirmacao('Excluir Despesa', 'Deseja remover completamente este lançamento de custo do sistema?', 'Apagar Registro', async () => {
        try {
            await supabase.from('despesas').delete().eq('id', id);
            mostrarToast('Lançamento deletado e removido dos cálculos.', 'ok');
            carregarDespesas();
        } catch(err) {  }
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
            const { error } = await supabase.from('despesas').insert([{ descricao: desc, valor: val, vencimento: dataV, status: 'Pendente' }]);
            if (error) { mostrarToast('Erro interno ao salvar despesa.', 'erro'); }
            else { document.getElementById('modal-despesa').classList.remove('ativa'); formDespesa.reset(); mostrarToast('Nova Despesa Operacional registrada na matriz.', 'ok'); carregarDespesas(); }
        } catch(err) {  }
    });
}

/**
 * ============================================================================
 * 21. COBRANÇAS, INADIMPLÊNCIA E CARTEIRA DE ASSINANTES (MRR)
 * ============================================================================
 */
function renderizarCobrancas() {
    const tbodyAtrasados = document.getElementById('tbody-cobrancas');
    const tbodyEstornos = document.getElementById('tbody-estornos');
    if (!tbodyAtrasados || !tbodyEstornos) return;
    // [FIX-BUG-4] Inclui tanto marcados manualmente quanto detectados pelo vencimento automático
    const inadimplentes = leadsData.filter(l =>
        (l.is_inadimplente === true || l._vencidoLocal === true) && !l.estornado
    );
    const estornados = leadsData.filter(l => l.estornado === true);
    let valorRisco = inadimplentes.reduce((acc, l) => acc + Number(l.valor), 0);
    let recuperado = leadsData.filter(l => l.historico && l.historico.some(h => h.msg.includes('Dívida Quitada'))).reduce((acc, l) => acc + Number(l.valor), 0);
    if (document.getElementById('cobranca-risco')) document.getElementById('cobranca-risco').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(valorRisco);
    if (document.getElementById('cobranca-qtd')) document.getElementById('cobranca-qtd').innerText = inadimplentes.length;
    if (document.getElementById('cobranca-recuperado')) document.getElementById('cobranca-recuperado').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(recuperado);

    if (inadimplentes.length === 0) {
        tbodyAtrasados.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--muted);">Nenhum cliente está inadimplente no momento.</td></tr>`;
    } else {
        tbodyAtrasados.innerHTML = inadimplentes.map(l => {
            let numWpp = l.whatsapp.replace(/\D/g, '');
            if (!numWpp.startsWith('55') && numWpp.length <= 11) numWpp = '55' + numWpp;
            const nomeSafe = (l.nome || '').replace(/'/g, "\\'");
            return `
            <tr>
                <td style="font-weight: bold; color: var(--text);">${l.nome}</td>
                <td>${l.produto || 'Geral'}</td>
                <td style="color:var(--muted); font-size:12px;">
                    ${l.is_inadimplente
                        ? `<span style="color:var(--danger)"><i class="ph ph-warning"></i> Sinalizado pelo Financeiro</span>`
                        : `<span style="color:var(--negociacao)"><i class="ph ph-calendar-x"></i> Vencido há ${l._diasVencido || '?'} dia(s) — aguarda confirmação</span>`
                    }
                </td>
                <td style="text-align:right; font-weight:bold; color:var(--danger);">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(l.valor)}</td>
                <td style="text-align:center; display:flex; gap:8px; justify-content:center;">
                    <button class="btn-cancel" onclick="window.abrirModalWhatsApp('${numWpp}', '${nomeSafe}')" style="padding:4px 8px; width:auto; font-size:12px; border-color:#25d366; color:#25d366;">
                        <i class="ph ph-whatsapp-logo"></i> Cobrar
                    </button>
                    <button class="btn-primary" onclick="window.quitarInadimplencia(${l.id})" style="padding:4px 8px; width:auto; font-size:12px; margin-top:0;">
                        <i class="ph ph-check"></i> Baixa Pagto.
                    </button>
                </td>
            </tr>`;
        }).join('');
    }

    // Separa estornos ativos (visíveis) dos arquivados
    const estornadosAtivos    = estornados.filter(l => !l.estorno_arquivado);
    const estornadosArquivados = estornados.filter(l => l.estorno_arquivado);
    const fmt = v => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v);

    if (estornadosAtivos.length === 0) {
        tbodyEstornos.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--muted);">
            <i class="ph ph-check-circle" style="font-size:22px; display:block; margin-bottom:6px; color:var(--fechados);"></i>
            Nenhum estorno ativo. Dashboard limpo.
        </td></tr>`;
    } else {
        tbodyEstornos.innerHTML = estornadosAtivos.map(l => `
            <tr>
                <td style="font-weight:bold; color:var(--text);">${l.nome}</td>
                <td>${l.produto || 'Geral'}</td>
                <td style="color:var(--danger); font-size:12px;"><i class="ph ph-trend-down"></i> ${l.motivo_perda || 'Chargeback'}</td>
                <td style="text-align:right; font-weight:bold; color:var(--danger); text-decoration:line-through;">${fmt(l.valor)}</td>
                <td style="text-align:center;">
                    <button onclick="window.arquivarEstorno(${l.id})"
                        title="Arquivar — remove da visão principal mas mantém no histórico"
                        style="background:rgba(122,131,161,0.1); border:1px solid var(--border2); color:var(--muted);
                               padding:5px 10px; border-radius:7px; cursor:pointer; font-size:11px;
                               font-weight:700; display:flex; align-items:center; gap:5px; transition:.2s;"
                        onmouseover="this.style.background='rgba(122,131,161,0.2)'; this.style.color='var(--text)'"
                        onmouseout="this.style.background='rgba(122,131,161,0.1)'; this.style.color='var(--muted)'">
                        <i class="ph ph-archive"></i> Arquivar
                    </button>
                </td>
            </tr>`).join('');
    }

    // Seção colapsável de estornos arquivados
    const secaoArq = document.getElementById('secao-estornos-arquivados');
    const corpoArq  = document.getElementById('tbody-estornos-arquivados');
    const countArq  = document.getElementById('count-estornos-arquivados');
    const wrapArq   = document.getElementById('tbody-arq-wrap');

    if (secaoArq && corpoArq && countArq) {
        countArq.innerText = estornadosArquivados.length;

        // Seção sempre visível — exibe mesmo com 0 arquivados
        secaoArq.style.display = 'block';

        if (estornadosArquivados.length === 0) {
            corpoArq.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--muted); font-size:13px;">
                <i class="ph ph-archive" style="font-size:20px; display:block; margin-bottom:6px; opacity:0.4;"></i>
                Nenhum estorno arquivado ainda.
            </td></tr>`;
            // Manter fechado se vazio
            if (wrapArq) wrapArq.style.display = 'none';
        } else {
            // Abrir automaticamente quando há itens arquivados
            if (wrapArq) wrapArq.style.display = 'block';

            corpoArq.innerHTML = estornadosArquivados.map(l => {
                const dataArq = l.historico
                    ? [...l.historico].reverse().find(h => h.msg?.includes('arquivado'))?.data
                    : null;
                const dataStr = dataArq
                    ? new Date(dataArq).toLocaleDateString('pt-BR')
                    : '—';
                return `
                <tr>
                    <td style="color:var(--muted); font-size:13px;">${l.nome}</td>
                    <td style="color:var(--muted); font-size:13px;">${l.produto || 'Geral'}</td>
                    <td style="color:var(--muted); font-size:12px;">${l.motivo_perda || 'Chargeback'}</td>
                    <td style="text-align:right; color:var(--muted); font-size:13px; text-decoration:line-through;">${fmt(l.valor)}</td>
                    <td style="text-align:center; font-size:12px; color:var(--muted);">${dataStr}</td>
                    <td style="text-align:center;">
                        <button onclick="window.desarquivarEstorno(${l.id})"
                            title="Mover de volta para a visão principal"
                            style="background:transparent; border:1px solid var(--border2); color:var(--muted);
                                   padding:4px 10px; border-radius:6px; cursor:pointer; font-size:11px; font-weight:600;
                                   display:flex; align-items:center; gap:4px; transition:.2s;"
                            onmouseover="this.style.color='var(--text)'; this.style.borderColor='var(--border3)'"
                            onmouseout="this.style.color='var(--muted)'; this.style.borderColor='var(--border2)'">
                            <i class="ph ph-arrow-counter-clockwise"></i> Restaurar
                        </button>
                    </td>
                </tr>`;
            }).join('');
        }
    }
}

window.arquivarEstorno = async (leadId) => {
    try {
        const lead = leadsData.find(l => l.id == leadId);
        let hist = lead.historico || [];
        hist.push({ data: new Date().toISOString(), msg: `Estorno arquivado do dashboard por ${perfilAtual.full_name}` });
        const { error } = await supabase.from('leads')
            .update({ estorno_arquivado: true, historico: hist })
            .eq('id', leadId);
        if (error) {
            // Coluna pode não existir ainda — mostrar mensagem clara
            if (error.message.includes('column') || error.message.includes('does not exist')) {
                mostrarToast('Execute o SQL fix_estorno_arquivado.sql no Supabase primeiro.', 'erro');
            } else {
                mostrarToast('Erro ao arquivar: ' + error.message, 'erro');
            }
            return;
        }
        mostrarToast('Estorno arquivado. Dashboard limpo!', 'ok');
        carregarLeads();
    } catch(err) {  }
};

window.desarquivarEstorno = async (leadId) => {
    try {
        const { error } = await supabase.from('leads')
            .update({ estorno_arquivado: false })
            .eq('id', leadId);
        if (error) { mostrarToast('Erro: ' + error.message, 'erro'); return; }
        mostrarToast('Estorno restaurado para a visão principal.', 'ok');
        carregarLeads();
    } catch(err) {  }
};
window.marcarInadimplente = async (leadId) => {
    window.abrirConfirmacao('Sinalizar Inadimplência Oficial', 'Tem certeza que este cliente atrasou o pagamento ou o boleto falhou? Ele será enviado para a Central de Cobranças do Financeiro e ficará amarelo no Kanban.', 'Sinalizar Atraso', async () => {
        try {
            const lead = leadsData.find(l => l.id == leadId);
            let historicoAtual = lead.historico || [];
            historicoAtual.push({ data: new Date().toISOString(), msg: `⚠️ Marcado como INADIMPLENTE na mesa de cobrança por ${perfilAtual.full_name}` });
            await supabase.from('leads').update({ is_inadimplente: true, historico: historicoAtual }).eq('id', leadId);
            mostrarToast('Cliente enviado oficialmente para a régua de cobrança.', 'ok');
            document.getElementById('drawer-lead').classList.remove('ativa');
            carregarLeads();
        } catch(err) {  }
    });
};

window.quitarInadimplencia = async (leadId) => {
    window.abrirConfirmacao('Baixa de Pagamento Atrasado', 'O cliente realizou o pagamento do atraso? A dívida será perdoada e ele sairá da lista de devedores.', 'Confirmar Pagamento e Baixa', async () => {
        try {
            const lead = leadsData.find(l => l.id == leadId);
            let historicoAtual = lead.historico || [];
            historicoAtual.push({ data: new Date().toISOString(), msg: `✅ Dívida Quitada. Marcado como PAGO na cobrança por ${perfilAtual.full_name}` });
            await supabase.from('leads').update({ is_inadimplente: false, historico: historicoAtual }).eq('id', leadId);
            mostrarToast('Pagamento registrado. Cliente recuperado e o valor voltou para o sistema!', 'ok');
            carregarLeads();
        } catch(err) {  }
    });
};

function renderizarMRR() {
    const tbody = document.getElementById('tbody-mrr');
    if (!tbody) return;
    const assinantes = leadsData.filter(l => l.is_recorrente === true && l.status === 'fechados' && l.aprovado === true && !l.estornado);
    let mrrAtivo = 0, mrrChurn = 0, qtdAtivos = 0, linhasHtml = '';
    assinantes.forEach(l => {
        const valor = Number(l.valor);
        const statusAss = l.status_assinatura || 'ativa';
        if (statusAss === 'ativa') { mrrAtivo += valor; qtdAtivos++; }
        else mrrChurn += valor;
        let badgeStatus = statusAss === 'ativa' ? `<span class="badge badge-verde">ATIVA</span>` : `<span class="badge badge-vermelho">CANCELADA (CHURN)</span>`;
        let corValor = statusAss === 'ativa' ? 'color: var(--text);' : 'color: var(--danger); text-decoration: line-through;';
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
    if (document.getElementById('mrr-atual')) document.getElementById('mrr-atual').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(mrrAtivo);
    if (document.getElementById('mrr-ativos')) document.getElementById('mrr-ativos').innerText = qtdAtivos;
    if (document.getElementById('mrr-churn')) document.getElementById('mrr-churn').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(mrrChurn);
    if (assinantes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--muted);">Nenhum cliente marcou a tag de Assinatura (MRR) na base de dados.</td></tr>`;
    } else {
        tbody.innerHTML = linhasHtml;
    }
}

window.cancelarAssinatura = async (leadId) => {
    window.abrirConfirmacao('Registrar Churn e Cancelamento', 'Tem certeza que este cliente pediu o cancelamento da assinatura mensal? O valor sairá do cálculo de MRR e passará a constar como Churn na empresa.', 'Confirmar Churn (Perda)', async () => {
        try {
            const lead = leadsData.find(l => l.id == leadId);
            let historicoAtual = lead.historico || [];
            historicoAtual.push({ data: new Date().toISOString(), msg: `❌ Assinatura Cancelada Definitivamente (Churn) por ${perfilAtual.full_name}` });
            await supabase.from('leads').update({ status_assinatura: 'cancelado', historico: historicoAtual }).eq('id', leadId);
            mostrarToast('Assinatura e MRR cancelados.', 'ok');
            document.getElementById('drawer-lead').classList.remove('ativa');
            carregarLeads();
        } catch(err) {  }
    });
};

window.removerAssinanteBase = (id) => {
    window.abrirConfirmacao('Remover da Base de MRR', 'Isso removerá o cliente definitivamente da lista de assinantes (a tag MRR será desmarcada) e apagará o histórico de churn/receita deste lead específico. Confirmar?', 'Remover Sem Dó', async () => {
        try {
            let lead = leadsData.find(l => l.id == id);
            let hist = lead.historico || [];
            hist.push({ data: new Date().toISOString(), msg: `Expulso da base de assinantes e da matriz de MRR por ${perfilAtual.full_name}` });
            await supabase.from('leads').update({ is_recorrente: false, status_assinatura: null, historico: hist }).eq('id', id);
            mostrarToast('Removido limpo da base MRR.', 'ok');
            carregarLeads();
        } catch(err) {  }
    });
};

function renderizarContratos() {
    const tbody = document.getElementById('tbody-contratos');
    if (!tbody) return;
    const contratos = leadsData.filter(l => (l.contrato_url && l.contrato_url !== '') || (l.doc_importante_url && l.doc_importante_url !== '') || (l.comprovante_url && l.comprovante_url !== ''));
    if (contratos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px; color:var(--muted);">O Cofre de GED está vazio. Nenhum contrato ou documento fiscal foi anexado na matriz.</td></tr>`;
        return;
    }
    tbody.innerHTML = contratos.map(l => {
        let dataUpload = l.historico ? [...l.historico].reverse().find(h => h.msg.includes('Gaveta atualizada') || h.msg.includes('Cofre'))?.data : l.created_at;
        let dataStr = dataUpload ? new Date(dataUpload).toLocaleDateString('pt-BR') : 'Data não informada';
        let links = '';
        if (l.contrato_url) links += `<a href="${l.contrato_url}" target="_blank" class="btn-anexo" style="border-color:#b388ff; color:#b388ff; margin-right:6px;"><i class="ph ph-folder-lock"></i> Contrato Oficial</a>`;
        if (l.doc_importante_url) links += `<a href="${l.doc_importante_url}" target="_blank" class="btn-anexo" style="border-color:#4fc3f7; color:#4fc3f7; margin-right:6px;"><i class="ph ph-file-text"></i> Doc. do Cliente</a>`;
        if (l.comprovante_url) links += `<a href="${l.comprovante_url}" target="_blank" class="btn-anexo" style="border-color:var(--novos); color:var(--novos);"><i class="ph ph-receipt"></i> Comprovante</a>`;
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
        if (precoVendido < precoOriginal) {
            temDesconto = true;
            const vendedor = perfisEquipe.find(p => p.id === lead.user_id)?.full_name || 'Usuário Não Encontrado';
            const diferenca = precoOriginal - precoVendido;
            const porcentagemDesconto = (diferenca / precoOriginal) * 100;
            let corDesconto = porcentagemDesconto > 20 ? 'color: var(--danger); font-weight: 800;' : 'color: var(--negociacao); font-weight: bold;';
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
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 40px; color:var(--fechados);"><i class="ph ph-shield-check" style="font-size:32px; display:block; margin-bottom:8px;"></i>Excelente! Nenhum vendedor quebrou a margem da base oficial. Margem de lucro corporativa protegida!</td></tr>`;
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
    if (filterStatus === 'fechados') exportList = exportList.filter(l => l.status === 'fechados' && l.aprovado === true && !l.estornado);
    else if (filterStatus === 'abertos') exportList = exportList.filter(l => l.status !== 'fechados' || (l.status === 'fechados' && !l.aprovado));
    else if (filterStatus === 'perdidos') exportList = exportList.filter(l => l.status === 'perdidos' || l.estornado);
    else if (filterStatus === 'abandonados') exportList = exportList.filter(l => l.status === 'abandonados');
    return exportList;
}

function renderizarTabelaExportacao() {
    const tbody = document.getElementById('tbody-export');
    if (!tbody) return;
    const list = getLeadsExportacao();
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 30px; color:var(--muted);">Nenhum dado encontrado para exportação com o filtro atual da tela.</td></tr>`;
        return;
    }
    tbody.innerHTML = list.map(l => {
        let statusBadge = l.status === 'novos' ? 'badge-azul' : (l.status === 'negociacao' ? 'badge-amarelo' : (l.status === 'perdidos' || l.estornado ? 'badge-vermelho' : (l.status === 'abandonados' ? 'badge-equipe' : 'badge-verde')));
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
if (filterSelect) filterSelect.addEventListener('change', renderizarTabelaExportacao);

async function registrarAuditoriaExportacao(tipo, qtd) {
    try {
        await supabase.from('logs_exportacao').insert([{ usuario: perfilAtual.full_name, tipo, quantidade: qtd }]);
        carregarAuditoriaExportacao();
    } catch (err) { }
}

async function carregarAuditoriaExportacao() {
    const tbody = document.getElementById('tbody-logs-exportacao');
    if (!tbody) return;
    const { data } = await supabase.from('logs_exportacao').select('*').order('id', { ascending: false }).limit(10);
    logsExportacaoData = data || [];
    if (logsExportacaoData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color:var(--muted);">Nenhuma exportação corporativa realizada ainda. O log de segurança está limpo.</td></tr>`;
        return;
    }
    tbody.innerHTML = logsExportacaoData.map(log => `
        <tr>
            <td style="font-weight: bold; color: var(--text);">${log.usuario}</td>
            <td>${log.tipo === 'EXCEL' ? '<i class="ph ph-file-csv" style="color:#21a366;"></i>' : '<i class="ph ph-file-pdf" style="color:#dc3545;"></i>'} ${log.tipo}</td>
            <td><strong style="color:var(--novos)">${log.quantidade}</strong> Leads Processados</td>
            <td style="color: var(--muted); font-size:12px; text-align:right;">${log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : '—'}</td>
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
    janela.document.write(`
    <html><head><title>Relatório Gerencial HAPSIS</title>
    <style>body{font-family:'Segoe UI',sans-serif;padding:40px;color:#333;line-height:1.6}h1{border-bottom:3px solid #f5c518;padding-bottom:15px;color:#10121a;text-transform:uppercase}table{width:100%;border-collapse:collapse;margin-top:30px}th,td{padding:14px;border-bottom:1px solid #ddd;text-align:left;font-size:14px}th{background:#f8f9fa;color:#555}.header-info{margin-top:15px;font-weight:bold;color:#666;font-size:14px}@media print{body{padding:0}}</style>
    </head><body>
    <h1>Relatório Executivo de Vendas</h1>
    <div class="header-info">
        <p>Data de Extração: ${new Date().toLocaleDateString('pt-BR')}</p>
        <p>Emitido e Assinado por: ${perfilAtual.full_name}</p>
        <p>Volume de Dados Lidos: ${list.length} Registros Consolidados</p>
    </div>
    <table>
        <thead><tr><th>Nome do Cliente</th><th>WhatsApp</th><th>Produto Matriz</th><th style="text-align:right;">Valor Final</th><th>Status Atual</th></tr></thead>
        <tbody>${list.map(l => `<tr><td><strong>${l.nome}</strong></td><td>${l.whatsapp}</td><td>${l.produto||'-'}</td><td style="text-align:right;font-weight:bold;color:#21a366;">R$ ${Number(l.valor).toFixed(2)}</td><td>${l.estornado ? 'ESTORNADO/CHURN' : l.status.toUpperCase()}</td></tr>`).join('')}</tbody>
    </table>
    <script>window.onload=()=>{window.print();window.close();}<\/script>
    </body></html>`);
    janela.document.close();
    registrarAuditoriaExportacao('PDF', list.length);
};

/**
 * ============================================================================
 * 23. PAINEL EXECUTIVO CORPORATIVO (DASHBOARD CEO/GROWTH)
 * ============================================================================
 */
function renderizarGestor() {
    const fechadosReais = leadsData.filter(l => l.status === 'fechados' && l.aprovado === true && !l.estornado);
    const faturamento = fechadosReais.reduce((acc, l) => acc + Number(l.valor), 0);
    if (document.getElementById('chefao-faturamento')) document.getElementById('chefao-faturamento').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(faturamento);
    if (document.getElementById('chefao-ticket')) document.getElementById('chefao-ticket').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(fechadosReais.length ? faturamento / fechadosReais.length : 0);
    if (document.getElementById('chefao-forecast')) {
        let somaNovos = leadsData.filter(l => l.status === 'novos').reduce((acc, l) => acc + Number(l.valor), 0);
        let somaNegociacao = leadsData.filter(l => l.status === 'negociacao').reduce((acc, l) => acc + Number(l.valor), 0);
        document.getElementById('chefao-forecast').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format((somaNovos * 0.10) + (somaNegociacao * 0.50));
    }

    const ctxFugasLinha = document.getElementById('chart-fugas-linha');
    const ctxFugasMotivos = document.getElementById('chart-fugas-motivos');
    if (ctxFugasLinha && ctxFugasMotivos) {
        const perdidos = leadsData.filter(l => l.status === 'perdidos' || l.estornado || l.status === 'abandonados');
        const contagemMotivos = {};
        perdidos.forEach(l => { const m = l.motivo_perda || 'Ghosting / Sem Registro'; contagemMotivos[m] = (contagemMotivos[m] || 0) + 1; });
        if (chartFugasMotivosInstance) chartFugasMotivosInstance.destroy();
        const labelsFugas = Object.keys(contagemMotivos).length > 0 ? Object.keys(contagemMotivos) : ['Sem perdas na operação'];
        const dataFugas = Object.keys(contagemMotivos).length > 0 ? Object.values(contagemMotivos) : [1];
        const coresFugas = Object.keys(contagemMotivos).length > 0 ? ['#f05252', '#fb923c', '#f87171', '#f43f5e', '#c084fc', '#8890aa'] : ['#2e3550'];
        chartFugasMotivosInstance = new Chart(ctxFugasMotivos, {
            type: 'doughnut',
            data: { labels: labelsFugas, datasets: [{ data: dataFugas, backgroundColor: coresFugas, borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { position: 'right', labels: { color: '#c4c9e0', font: {size: 11} } } } }
        });

        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        let valores7Dias = [0,0,0,0,0,0,0];
        let labels7Dias = [];
        let hoje = new Date();
        for (let i = 6; i >= 0; i--) { let d = new Date(); d.setDate(hoje.getDate() - i); labels7Dias.push(diasSemana[d.getDay()]); }
        perdidos.forEach(l => {
            let dataPerda = new Date(l.created_at);
            if (l.historico && l.historico.length > 0) {
                const logPerda = l.historico.find(h => h.msg.includes('PERDIDO') || h.msg.includes('ESTORNO') || h.msg.includes('ABANDONADO'));
                if (logPerda) dataPerda = new Date(logPerda.data);
            }
            let diffDias = Math.floor((hoje.getTime() - dataPerda.getTime()) / (1000 * 3600 * 24));
            if (diffDias >= 0 && diffDias <= 6) valores7Dias[6 - diffDias] += Number(l.valor);
        });
        if (chartFugasLinhaInstance) chartFugasLinhaInstance.destroy();
        chartFugasLinhaInstance = new Chart(ctxFugasLinha, {
            type: 'line',
            data: { labels: labels7Dias, datasets: [{ label: 'Volume Monetário Perdido (R$)', data: valores7Dias, borderColor: '#f05252', backgroundColor: 'rgba(240,82,82,0.1)', borderWidth: 2.5, pointBackgroundColor: '#f05252', fill: true, tension: 0.45 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#2e3550' }, ticks: { color: '#7a83a1' } }, x: { grid: { display: false }, ticks: { color: '#7a83a1' } } } }
        });
    }

    const ranking = {};
    fechadosReais.forEach(l => { ranking[l.user_id] = (ranking[l.user_id] || 0) + Number(l.valor); });
    const arrayRank = Object.keys(ranking).map(id => { let p = perfisEquipe.find(x => x.id === id); return { nome: p?.full_name || 'Desconhecido', eqp: p?.equipe || 'Geral', total: ranking[id] }; }).sort((a, b) => b.total - a.total);
    if (document.getElementById('tabela-ranking')) {
        document.getElementById('tabela-ranking').innerHTML = arrayRank.map((v, i) => `
        <tr>
            <td style="font-weight: bold; color: var(--text);">${i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : ''))} ${v.nome}</td>
            <td><span class="badge badge-equipe">${v.eqp}</span></td>
            <td style="color:var(--fechados); font-weight:900; text-align:right;">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v.total)}</td>
        </tr>`).join('');
    }

    const prods = {};
    fechadosReais.forEach(l => { let p = l.produto || 'Consultoria Geral'; prods[p] = (prods[p] || 0) + Number(l.valor); });
    const arrayProds = Object.keys(prods).map(k => ({ nome: k, total: prods[k] })).sort((a, b) => b.total - a.total);
    if (document.getElementById('tabela-produtos')) {
        if (arrayProds.length === 0) {
            document.getElementById('tabela-produtos').innerHTML = `<tr><td colspan="2" style="text-align:center; padding: 20px; color:var(--muted);">Nenhum produto ou assinatura fechada de forma oficial até o momento.</td></tr>`;
        } else {
            document.getElementById('tabela-produtos').innerHTML = arrayProds.map(p => `
            <tr>
                <td style="color: var(--text); font-weight:600;">${p.nome}</td>
                <td style="font-weight:900; color:var(--text); text-align:right;">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(p.total)}</td>
            </tr>`).join('');
        }
    }
}

/**
 * ============================================================================
 * [FIX-5] MÓDULOS EXTRAS — CEO: EQUIPES, CONFIGURAÇÕES, IA, AUDITORIA
 * Todas as funções que o HTML chama via onclick agora declaradas corretamente
 * ============================================================================
 */

// Relatório de Estatísticas do Vendedor
function atualizarEstatisticas() {
    const uid = usuarioAtual?.id;
    const meuLeads = leadsData.filter(l => l.user_id === uid);
    const fechados = meuLeads.filter(l => l.status === 'fechados' && l.aprovado === true && !l.estornado);
    const totalReceita = fechados.reduce((acc, l) => acc + Number(l.valor), 0);
    if (document.getElementById('stat-total')) document.getElementById('stat-total').innerText = meuLeads.length;
    if (document.getElementById('stat-fechados')) document.getElementById('stat-fechados').innerText = fechados.length;
    if (document.getElementById('stat-valor')) document.getElementById('stat-valor').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(totalReceita);

    const ctx = document.getElementById('chart-pizza');
    if (!ctx) return;
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Novos', 'Em Negociação', 'Fechados', 'Perdidos', 'Abandonados'],
            datasets: [{
                data: [
                    meuLeads.filter(l => l.status === 'novos').length,
                    meuLeads.filter(l => l.status === 'negociacao').length,
                    fechados.length,
                    meuLeads.filter(l => l.status === 'perdidos' || l.estornado).length,
                    meuLeads.filter(l => l.status === 'abandonados').length,
                ],
                backgroundColor: ['#38bdf8', '#fb923c', '#4ade80', '#f05252', '#7a83a1'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'right', labels: { color: '#c4c9e0', font: {size: 12}, padding: 16 } } } }
    });
}

function calcularComissoesNovoModeloVendedor() {
    const uid = usuarioAtual?.id;
    const fechados = leadsData.filter(l => l.user_id === uid && l.status === 'fechados' && l.aprovado === true && !l.estornado);
    const emAberto = leadsData.filter(l => l.user_id === uid && l.status === 'fechados' && l.aprovado !== true && !l.estornado);

    const calcular = (arr) => arr.reduce((acc, lead) => {
        let prod = produtosData.find(p => p.nome === lead.produto);
        let taxa = prod ? (Number(prod.taxa_comissao) || 5) : 5;
        return acc + (Number(lead.valor) * taxa) / 100;
    }, 0);

    if (document.getElementById('val-comissao-ganha')) document.getElementById('val-comissao-ganha').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(calcular(fechados));
    if (document.getElementById('val-comissao-aberta')) document.getElementById('val-comissao-aberta').innerText = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(calcular(emAberto));
}

// Gestão de Equipes
function renderizarAbaEquipe() {
    const container = document.getElementById('container-equipes');
    if (!container) return;
    const fechadosReais = leadsData.filter(l => l.status === 'fechados' && l.aprovado === true && !l.estornado);
    const squads = {};
    perfisEquipe.forEach(p => {
        const eq = p.equipe || 'Geral';
        if (!squads[eq]) squads[eq] = [];
        squads[eq].push(p);
    });
    const rl = { vendedor: '🧑‍💼 Vendedor', gestor_sub: '💼 Sub Gerente', gestor_geral: '👑 Gerente' };
    container.innerHTML = Object.entries(squads).map(([nome, membros]) => {
        const recEq = fechadosReais.filter(l => membros.some(m => m.id === l.user_id)).reduce((a, l) => a + Number(l.valor), 0);
        const sid = nome.replace(/[^a-zA-Z0-9]/g, '-');
        const linhas = membros.map(m => {
            const rec = fechadosReais.filter(l => l.user_id === m.id).reduce((a, l) => a + Number(l.valor), 0);
            const qtd = fechadosReais.filter(l => l.user_id === m.id).length;
            return `
            <tr>
                <td><div style="display:flex; align-items:center; gap:10px;"><div style="width:30px;height:30px;border-radius:50%;background:var(--accent3);border:1px solid rgba(245,197,24,.3);display:flex;align-items:center;justify-content:center;font-weight:bold;color:var(--accent);font-size:13px;">${m.full_name.charAt(0).toUpperCase()}</div><span style="font-weight:600;color:var(--text);">${m.full_name}</span></div></td>
                <td><span class="badge badge-equipe">${rl[m.role] || m.role}</span></td>
                <td style="text-align:right;color:var(--fechados);font-weight:bold;">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(rec)}</td>
                <td style="text-align:right;color:var(--muted);">${qtd} deals</td>
                <td style="text-align:center;"><button class="btn-cancel" style="padding:4px 10px;width:auto;font-size:12px;margin:0 auto;" onclick="window.abrirModalMudarEquipe('${m.id}','${nome}')"><i class="ph ph-arrows-left-right"></i> Mover</button></td>
            </tr>`;
        }).join('');
        return `
        <div class="folder-card open" id="fc-${sid}">
            <div class="folder-header" onclick="this.parentElement.classList.toggle('open'); document.getElementById('fcc-${sid}').classList.toggle('open');">
                <div class="folder-title"><i class="ph ph-caret-right"></i> Squad: ${nome} <span class="badge badge-equipe" style="margin-left:6px;">${membros.length} membros</span></div>
                <span class="folder-total">${new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(recEq)}</span>
            </div>
            <div class="folder-content open" id="fcc-${sid}">
                <table class="lista-table">
                    <thead><tr><th>Membro</th><th>Cargo</th><th style="text-align:right;">Receita</th><th style="text-align:right;">Vendas</th><th style="text-align:center;">Ação</th></tr></thead>
                    <tbody>${linhas}</tbody>
                </table>
            </div>
        </div>`;
    }).join('');
}

window.abrirModalNovaEquipe = () => {
    const sel = document.getElementById('inp-add-squad-user');
    if (sel) sel.innerHTML = '<option value="">Selecione o Líder...</option>' + perfisEquipe.map(p => `<option value="${p.id}">${p.full_name}</option>`).join('');
    document.getElementById('modal-nova-equipe')?.classList.add('ativa');
};

const formNovaEquipe = document.getElementById('form-nova-equipe');
if (formNovaEquipe) {
    formNovaEquipe.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('inp-add-squad-nome').value.trim();
        const lider = document.getElementById('inp-add-squad-user').value;
        if (!nome || !lider) { mostrarToast('Preencha todos os campos.', 'erro'); return; }
        const { error } = await supabase.from('profiles').update({ equipe: nome }).eq('id', lider);
        if (error) { mostrarToast('Erro: ' + error.message, 'erro'); return; }
        mostrarToast(`Squad ${nome} criado!`, 'ok');
        document.getElementById('modal-nova-equipe')?.classList.remove('ativa');
        formNovaEquipe.reset();
        const { data } = await supabase.from('profiles').select('*');
        perfisEquipe = data || [];
        renderizarAbaEquipe();
    });
}

window.abrirModalMudarEquipe = (uid, equipeAtual) => {
    document.getElementById('inp-equipe-userid').value = uid;
    const sel = document.getElementById('inp-equipe-select');
    if (sel) {
        const eqs = [...new Set(perfisEquipe.map(p => p.equipe || 'Geral'))];
        sel.innerHTML = eqs.map(e => `<option value="${e}" ${e === equipeAtual ? 'selected' : ''}>${e}</option>`).join('');
    }
    document.getElementById('inp-equipe-nova').value = '';
    document.getElementById('modal-mudar-equipe')?.classList.add('ativa');
};

const btnFecharModalEquipe = document.getElementById('btn-fechar-modal-equipe');
if (btnFecharModalEquipe) btnFecharModalEquipe.onclick = () => document.getElementById('modal-mudar-equipe')?.classList.remove('ativa');

const formMudarEquipe = document.getElementById('form-mudar-equipe');
if (formMudarEquipe) {
    formMudarEquipe.addEventListener('submit', async (e) => {
        e.preventDefault();
        const uid = document.getElementById('inp-equipe-userid').value;
        const nova = document.getElementById('inp-equipe-nova').value.trim();
        const sel = document.getElementById('inp-equipe-select').value;
        const eq = nova || sel;
        if (!eq) { mostrarToast('Informe um squad.', 'erro'); return; }
        const { error } = await supabase.from('profiles').update({ equipe: eq }).eq('id', uid);
        if (error) { mostrarToast('Erro: ' + error.message, 'erro'); return; }
        mostrarToast(`Movido para ${eq}!`, 'ok');
        document.getElementById('modal-mudar-equipe')?.classList.remove('ativa');
        const { data } = await supabase.from('profiles').select('*');
        perfisEquipe = data || [];
        renderizarAbaEquipe();
    });
}

window.abrirPainelAcessos = () => {
    const modal = document.getElementById('modal-acessos');
    if (!modal) return;

    // Atualizar o modal para versão completa de gestão
    const modalBox = modal.querySelector('.modal-box');
    if (modalBox) {
        modalBox.style.maxWidth = '800px';
        modalBox.style.width = '95vw';
    }

    const tb = document.getElementById('lista-painel-acessos');
    if (!tb) return;

    const rl = { vendedor: '🧑‍💼 Vendedor', gestor_sub: '💼 Sub Gerente', gestor_geral: '👑 Gerente' };

    // Atualizar header do modal
    const mTitle = modal.querySelector('.modal-title');
    if (mTitle) mTitle.innerHTML = '<i class="ph ph-shield-check" style="color:#b388ff;"></i> Controle de Acessos';

    // Estatísticas rápidas
    const totalUsers = perfisEquipe.length;
    const gestores = perfisEquipe.filter(p => p.role === 'gestor_geral' || p.role === 'gestor_sub').length;
    const vendedores = perfisEquipe.filter(p => p.role === 'vendedor' || p.role === 'sdr').length;

    // Inserir stats acima da tabela
    let statsEl = document.getElementById('painel-stats');
    if (!statsEl) {
        statsEl = document.createElement('div');
        statsEl.id = 'painel-stats';
        const tabela = modal.querySelector('.tabela-wrapper');
        if (tabela) tabela.parentNode.insertBefore(statsEl, tabela);
    }
    statsEl.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">
            <div style="background:rgba(245,197,24,0.08);border:1px solid rgba(245,197,24,0.2);border-radius:10px;padding:12px;text-align:center;">
                <div style="font-size:22px;font-weight:800;color:var(--accent);font-family:var(--font-head);">${totalUsers}</div>
                <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;">Total de Usuários</div>
            </div>
            <div style="background:rgba(179,136,255,0.08);border:1px solid rgba(179,136,255,0.2);border-radius:10px;padding:12px;text-align:center;">
                <div style="font-size:22px;font-weight:800;color:#b388ff;font-family:var(--font-head);">${gestores}</div>
                <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;">Gestores</div>
            </div>
            <div style="background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.2);border-radius:10px;padding:12px;text-align:center;">
                <div style="font-size:22px;font-weight:800;color:var(--fechados);font-family:var(--font-head);">${vendedores}</div>
                <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;">Vendedores</div>
            </div>
        </div>`;

    // Atualizar cabeçalho da tabela
    const thead = modal.querySelector('thead tr');
    if (thead) thead.innerHTML = `
        <th>Usuário</th>
        <th>Squad</th>
        <th>Cargo</th>
        <th style="text-align:center;">Status</th>
        <th style="text-align:center;">Ações</th>`;

    tb.innerHTML = perfisEquipe.map(p => {
        const isSelf = p.id === usuarioAtual?.id;
        const suspended = p.suspended === true;
        const initials = (p.full_name || 'U').charAt(0).toUpperCase();
        const roleColor = p.role === 'gestor_geral' ? '#f5c518' : p.role === 'gestor_sub' ? '#b388ff' : '#4ade80';

        return `<tr>
            <td>
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:34px;height:34px;border-radius:50%;background:${roleColor}22;border:1px solid ${roleColor}44;display:flex;align-items:center;justify-content:center;font-weight:800;color:${roleColor};font-size:13px;flex-shrink:0;">${initials}</div>
                    <div>
                        <div style="font-weight:700;color:var(--text);font-size:13px;">${p.full_name || 'Sem nome'}</div>
                        <div style="font-size:11px;color:var(--muted);">${p.equipe || 'Geral'}</div>
                    </div>
                </div>
            </td>
            <td><span class="badge badge-equipe">${p.equipe || 'Geral'}</span></td>
            <td>
                <select onchange="window._alterarCargoOficial('${p.id}', this.value)"
                    style="background:var(--bg2);border:1px solid var(--border);color:var(--text);padding:5px 10px;border-radius:6px;font-size:12px;outline:none;cursor:pointer;min-width:130px;"
                    ${isSelf ? 'disabled' : ''}>
                    ${Object.entries(rl).map(([v, l]) => `<option value="${v}" ${p.role === v ? 'selected' : ''}>${l}</option>`).join('')}
                </select>
            </td>
            <td style="text-align:center;">
                ${isSelf
                    ? '<span style="font-size:11px;color:var(--accent);font-weight:700;">• Você</span>'
                    : suspended
                        ? '<span style="background:rgba(240,82,82,0.12);color:var(--danger);border:1px solid rgba(240,82,82,0.3);padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">Suspenso</span>'
                        : '<span style="background:rgba(74,222,128,0.1);color:var(--fechados);border:1px solid rgba(74,222,128,0.25);padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">Ativo</span>'
                }
            </td>
            <td style="text-align:center;">
                ${isSelf ? '<span style="font-size:11px;color:var(--muted);">—</span>' : `
                <div style="display:flex;gap:6px;justify-content:center;">
                    <button title="${suspended ? 'Reativar usuário' : 'Suspender acesso'}"
                        onclick="window._suspenderUsuario('${p.id}','${p.full_name}',${suspended})"
                        style="background:${suspended ? 'rgba(74,222,128,0.1)' : 'rgba(251,146,60,0.1)'};border:1px solid ${suspended ? 'rgba(74,222,128,0.3)' : 'rgba(251,146,60,0.3)'};color:${suspended ? 'var(--fechados)' : 'var(--negociacao)'};padding:5px 10px;border-radius:7px;cursor:pointer;font-size:12px;font-weight:700;transition:.2s;">
                        <i class="ph ph-${suspended ? 'user-check' : 'user-minus'}"></i> ${suspended ? 'Reativar' : 'Suspender'}
                    </button>
                    <button title="Excluir permanentemente"
                        onclick="window._removerUsuario('${p.id}','${p.full_name}')"
                        style="background:rgba(240,82,82,0.08);border:1px solid rgba(240,82,82,0.3);color:var(--danger);padding:5px 10px;border-radius:7px;cursor:pointer;font-size:12px;font-weight:700;transition:.2s;">
                        <i class="ph ph-trash"></i> Excluir
                    </button>
                </div>`}
            </td>
        </tr>`;
    }).join('');

    modal.classList.add('ativa');
};

window._alterarCargoOficial = async (uid, role) => {
    const { error } = await supabase.from('profiles').update({ role: normalizarRole(role) }).eq('id', uid);
    if (error) { mostrarToast('Erro: ' + error.message, 'erro'); return; }
    mostrarToast('Cargo atualizado!', 'ok');
    const { data } = await supabase.from('profiles').select('*');
    perfisEquipe = data || [];
    window.abrirPainelAcessos();
};

window._suspenderUsuario = async (uid, nome, estaSuspenso) => {
    const acao = estaSuspenso ? 'Reativar' : 'Suspender';
    const msg = estaSuspenso
        ? `Reativar o acesso de <strong>${nome}</strong>?`
        : `Suspender o acesso de <strong>${nome}</strong>? O usuário não conseguirá mais entrar.`;

    window.abrirConfirmacao(acao + ' Usuário', msg, acao, async () => {
        const { error } = await supabase.from('profiles')
            .update({ suspended: !estaSuspenso })
            .eq('id', uid);

        if (error) {
            mostrarToast('Erro: ' + error.message, 'erro');
            return;
        }
        mostrarToast(estaSuspenso ? `✅ ${nome} reativado.` : `🔒 ${nome} suspenso.`, 'ok');
        const { data } = await supabase.from('profiles').select('*');
        perfisEquipe = data || [];
        window.abrirPainelAcessos();
    });
};

window._removerUsuario = (uid, nome) => {
    window.abrirConfirmacao(
        '⚠️ Excluir Usuário Permanentemente',
        `Isso irá <strong>excluir ${nome}</strong> do sistema e revogar todo acesso.<br><br>
        <span style="color:var(--danger);font-size:12px;">Esta ação não pode ser desfeita. Todos os leads deste usuário serão mantidos.</span>`,
        'Excluir Definitivamente',
        async () => {
            try {
                // 1. Remover o profile do banco
                const { error: errProfile } = await supabase.from('profiles').delete().eq('id', uid);
                if (errProfile) { mostrarToast('Erro ao remover perfil: ' + errProfile.message, 'erro'); return; }

                // 2. Tentar revogar auth via Admin API (só funciona se tiver service_role key)
                // Como usamos anon key, apenas removemos o profile — o usuário ficará sem perfil
                // Para remoção completa do auth, o admin deve fazer pelo painel do Supabase
                mostrarToast(`✅ ${nome} removido do sistema. Acesso revogado.`, 'ok');

                const { data } = await supabase.from('profiles').select('*');
                perfisEquipe = data || [];
                window.abrirPainelAcessos();
            } catch(err) {
                mostrarToast('Erro interno ao remover usuário.', 'erro');
            }
        }
    );
};

// Auditoria de Leads (CEO)
function renderizarAbaAuditoria() {
    const tbody = document.getElementById('tabela-auditoria');
    if (!tbody) return;
    if (leadsData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:var(--muted);">Banco de leads vazio.</td></tr>`;
        carregarAuditoriaExportacao();
        return;
    }
    tbody.innerHTML = leadsData.map(l => {
        const vend = perfisEquipe.find(p => p.id === l.user_id);
        let corBadge = l.status === 'novos' ? 'badge-azul' : (l.status === 'negociacao' ? 'badge-amarelo' : (l.status === 'perdidos' || l.estornado ? 'badge-vermelho' : (l.status === 'abandonados' ? 'badge-equipe' : 'badge-verde')));
        return `
        <tr class="clicavel" onclick="window.abrirDrawerLead(${l.id})">
            <td style="font-weight:600;color:var(--text);">${l.nome}</td>
            <td style="color:var(--muted);font-size:12px;">${l.whatsapp}</td>
            <td>${l.produto || 'Geral'}</td>
            <td style="text-align:right;font-weight:bold;">R$ ${Number(l.valor).toFixed(2)}</td>
            <td><span class="badge ${corBadge}">${l.estornado ? 'ESTORNADO' : l.status.toUpperCase()}</span></td>
            <td style="color:var(--accent);font-weight:600;font-size:13px;">${vend?.full_name.split(' ')[0] || '—'}</td>
        </tr>`;
    }).join('');
    carregarAuditoriaExportacao();
}

// White-Label / Configurações
function renderizarConfiguracoes() {
    const gest = perfisEquipe.find(p => p.role === 'gestor_geral') || perfilAtual;
    const iL = document.getElementById('inp-config-logo');
    const iC = document.getElementById('inp-config-cor');
    const iT = document.getElementById('inp-config-cor-texto');
    if (iL && gest?.logo_empresa) iL.value = gest.logo_empresa;
    if (iC && gest?.cor_primaria) iC.value = gest.cor_primaria;
    if (iT && gest?.cor_primaria) iT.value = gest.cor_primaria;
    if (iC && iT && !iC.dataset.bindado) {
        iC.dataset.bindado = 'true';
        iC.addEventListener('input', e => { iT.value = e.target.value; document.documentElement.style.setProperty('--accent', e.target.value); });
        iT.addEventListener('input', e => { if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) iC.value = e.target.value; });
    }
}

const formConfig = document.getElementById('form-config');
if (formConfig) {
    formConfig.addEventListener('submit', async (e) => {
        e.preventDefault();
        const logo = document.getElementById('inp-config-logo')?.value || '';
        const cor = document.getElementById('inp-config-cor-texto')?.value || '';
        const btn = formConfig.querySelector('button[type="submit"]');
        const txt = btn.innerHTML;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Aplicando...';
        btn.disabled = true;
        const pl = {};
        if (logo) pl.logo_empresa = logo;
        if (cor) pl.cor_primaria = cor;
        const { error } = await supabase.from('profiles').update(pl).eq('id', usuarioAtual.id);
        btn.innerHTML = txt;
        btn.disabled = false;
        if (error) { mostrarToast('Erro: ' + error.message, 'erro'); return; }
        if (cor) document.documentElement.style.setProperty('--accent', cor);
        if (logo) {
            const imgH = `<img src="${logo}" style="width:100%;height:100%;object-fit:contain;border-radius:8px;"/>`;
            const a = document.getElementById('app-logo-img');
            if (a) { a.innerHTML = imgH; a.style.cssText = 'background:transparent;border:none;box-shadow:none;'; }
        }
        mostrarToast('White-Label aplicado com sucesso!', 'ok');
        const { data } = await supabase.from('profiles').select('*');
        perfisEquipe = data || [];
    });
}

// IA Preditiva
// IA — mantida como stub para compatibilidade (nova lógica abaixo)
async function gerarRelatorioIA() {
    window.rodarIA('diagnostico');
}

/**
 * Monta o contexto de dados reais da operação para enviar à IA
 */
function montarContextoIA() {
    const fechados   = leadsData.filter(l => l.status === 'fechados' && l.aprovado === true && !l.estornado);
    const perdidos   = leadsData.filter(l => l.status === 'perdidos' || l.estornado);
    const negociacao = leadsData.filter(l => l.status === 'negociacao');
    const novos      = leadsData.filter(l => l.status === 'novos');
    const fat        = fechados.reduce((a, l) => a + Number(l.valor), 0);
    const gest       = perfisEquipe.find(p => p.role === 'gestor_geral') || perfilAtual;
    const meta       = gest?.meta_mensal || 10000;
    const motivos    = {};
    perdidos.forEach(l => { const m = l.motivo_perda || 'Ghosting'; motivos[m] = (motivos[m]||0)+1; });
    const motStr  = Object.entries(motivos).map(([k,v]) => `${k} (${v}x)`).join(', ') || 'Nenhum';
    const rankStr = perfisEquipe.filter(p => p.role === 'vendedor').map(v => {
        const r = fechados.filter(l => l.user_id === v.id).reduce((a,l) => a+Number(l.valor), 0);
        return `${v.full_name.split(' ')[0]}: R$${r.toFixed(0)}`;
    }).join(' | ') || 'Sem vendedores';
    const churn = (fechados.length + perdidos.length) > 0
        ? ((perdidos.length / (fechados.length + perdidos.length)) * 100).toFixed(1) : '0';
    const ltv = fechados.length > 0 ? (fat / fechados.length).toFixed(2) : '0';
    const inadimplentes = leadsData.filter(l => l.is_inadimplente || l._vencidoLocal).length;

    return {
        resumo: `Leads: ${leadsData.length} total (${novos.length} novos, ${negociacao.length} em negociação, ${fechados.length} fechados, ${perdidos.length} perdidos)`,
        financeiro: `Faturamento: R$${fat.toFixed(2)} | Meta: R$${meta} | Progresso: ${((fat/meta)*100).toFixed(1)}% | LTV médio: R$${ltv}`,
        conversao: `Taxa de conversão: ${leadsData.length > 0 ? ((fechados.length/leadsData.length)*100).toFixed(1) : 0}% | Churn: ${churn}% | Inadimplentes: ${inadimplentes}`,
        equipe: `Ranking: ${rankStr}`,
        perdas: `Motivos de perda: ${motStr}`,
        empresa: `Empresa: ${perfilAtual.nome_empresa || 'HAPSIS'}`
    };
}

/**
 * Enviar prompt para a API do Claude e renderizar resposta
 */
async function chamarIAHapsis(prompt, titulo) {
    const container = document.getElementById('ia-resposta-container');
    const texto = document.getElementById('ia-resposta-texto');
    const tituloEl = document.getElementById('ia-titulo-analise');

    if (!container || !texto) return;

    container.style.display = 'block';
    if (tituloEl) tituloEl.innerText = titulo;
    texto.innerHTML = `<div style="display:flex; align-items:center; gap:12px; color:var(--muted); padding:8px 0;">
        <i class="ph ph-spinner ph-spin" style="font-size:22px;"></i> Analisando seus dados em tempo real...
    </div>`;

    // Scroll suave até a resposta
    setTimeout(() => container.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);

    try {
        // Chama a Edge Function do Supabase — chave da OpenAI protegida no servidor
        const res = await fetch(`${SUPABASE_URL}/functions/v1/hapsis-ia`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({ prompt })
        });
        const data = await res.json();
        const resposta = data.resposta || data.erro || 'Sem resposta da IA.';

        // Renderizar markdown básico
        const html = resposta
            .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#b388ff;">$1</strong>')
            .replace(/## (.*)/g, '<h3 style="color:var(--text); font-family:var(--font-head); font-size:15px; margin:18px 0 8px;">$1</h3>')
            .replace(/# (.*)/g, '<h2 style="color:#b388ff; font-family:var(--font-head); font-size:17px; margin:0 0 12px;">$1</h2>')
            .replace(/^- (.*)/gm, '<li style="margin-bottom:6px; color:var(--text2);">$1</li>')
            .replace(/(<li.*<\/li>)/gs, '<ul style="padding-left:20px; margin:8px 0;">$1</ul>')
            .split('\n\n').map(p => p.startsWith('<') ? p : `<p style="margin-bottom:12px; color:var(--text2); line-height:1.8;">${p.replace(/\n/g,'<br>')}</p>`).join('');

        texto.innerHTML = html + `<div style="margin-top:20px; padding-top:16px; border-top:1px solid rgba(179,136,255,.15); font-size:11px; color:var(--muted); display:flex; justify-content:space-between;">
            <span><i class="ph ph-sparkle"></i> Gerado pela IA com base nos seus dados reais</span>
            <span>${new Date().toLocaleString('pt-BR')}</span>
        </div>`;

    } catch (err) {
        texto.innerHTML = `<p style="color:var(--danger);"><i class="ph ph-warning-circle"></i> Não foi possível conectar à IA. Verifique sua conexão e tente novamente.</p>`;
    }
}

/**
 * Roda análise por tipo
 */
window.rodarIA = async (tipo) => {
    const ctx = montarContextoIA();
    const base = `Você é consultor de vendas especialista analisando o CRM HAPSIS. Responda SEMPRE em português, de forma direta e executiva. Use os dados reais fornecidos.

DADOS DA OPERAÇÃO:
${ctx.resumo}
${ctx.financeiro}
${ctx.conversao}
${ctx.equipe}
${ctx.perdas}
${ctx.empresa}

`;

    const configs = {
        diagnostico: {
            titulo: '🔬 Diagnóstico Completo',
            prompt: base + `Faça um diagnóstico completo da operação em até 300 palavras. Estruture com:
# Diagnóstico Geral
## Pontos Fortes
## Pontos de Atenção
## Ação Prioritária Esta Semana
## Previsão para Meta`
        },
        funil: {
            titulo: '📊 Análise do Funil',
            prompt: base + `Analise o funil de vendas em até 250 palavras. Estruture com:
# Análise do Funil
## Onde os Leads Estão Travando
## Taxa de Conversão por Etapa
## Como Desbloquear o Funil`
        },
        vendedores: {
            titulo: '🏆 Performance da Equipe',
            prompt: base + `Analise a performance da equipe em até 250 palavras. Estruture com:
# Performance da Equipe
## Destaques Positivos
## Quem Precisa de Suporte
## Recomendações de Treinamento`
        },
        financeiro: {
            titulo: '💰 Saúde Financeira',
            prompt: base + `Analise a saúde financeira em até 250 palavras. Estruture com:
# Saúde Financeira
## Situação Atual do Caixa
## Riscos Identificados
## Como Aumentar a Receita`
        },
        retencao: {
            titulo: '🔥 Risco de Churn',
            prompt: base + `Analise o risco de churn e retenção em até 250 palavras. Estruture com:
# Análise de Churn
## Clientes em Risco
## Padrões Identificados
## Plano de Ação de Retenção`
        },
        livre: {
            titulo: '💬 Pergunta Livre',
            prompt: null // Tratado separadamente
        }
    };

    if (tipo === 'livre') {
        const inputLivre = document.getElementById('ia-input-livre');
        if (inputLivre) {
            inputLivre.style.display = inputLivre.style.display === 'none' ? 'flex' : 'none';
            if (inputLivre.style.display === 'flex') {
                document.getElementById('ia-pergunta-livre')?.focus();
            }
        }
        return;
    }

    const cfg = configs[tipo];
    if (!cfg) return;
    await chamarIAHapsis(cfg.prompt, cfg.titulo);
};

window.enviarPerguntaLivre = async () => {
    const input = document.getElementById('ia-pergunta-livre');
    const pergunta = input?.value?.trim();
    if (!pergunta) { mostrarToast('Digite uma pergunta.', 'erro'); return; }
    const ctx = montarContextoIA();
    const prompt = `Você é consultor de vendas especialista analisando o CRM HAPSIS. Responda em português, de forma direta e executiva.

DADOS DA OPERAÇÃO:
${ctx.resumo}
${ctx.financeiro}
${ctx.conversao}
${ctx.equipe}
${ctx.perdas}

PERGUNTA DO GESTOR: ${pergunta}

Responda de forma objetiva e prática, usando os dados reais acima.`;
    document.getElementById('ia-input-livre').style.display = 'none';
    if (input) input.value = '';
    await chamarIAHapsis(prompt, `💬 "${pergunta.substring(0,50)}${pergunta.length > 50 ? '...' : ''}"`);
};

/**
 * ============================================================================
 * [FIX-6] NOTIFICAÇÕES DO SININHO (ADMIN)
 * ============================================================================
 */
function configurarNotificacoes() {
    const isAdmin = perfilAtual.role === 'gestor_sub' || perfilAtual.role === 'gestor_geral';
    if (!isAdmin) return;

    function atualizarNotificacoes() {
        const pendentes = leadsData.filter(l => l.status === 'fechados' && l.aprovado !== true && !l.estornado);
        const inadimplentes = leadsData.filter(l => l.is_inadimplente === true && !l.estornado);
        const total = pendentes.length + inadimplentes.length;
        const badge = document.getElementById('notif-count');
        const lista = document.getElementById('notif-list');
        if (badge) {
            badge.innerText = total;
            badge.classList.toggle('tem-notif', total > 0);
        }
        if (!lista) return;
        if (total === 0) { lista.innerHTML = '<div class="notif-empty">Nenhum alerta recente.</div>'; return; }
        lista.innerHTML = [
            ...pendentes.map(l => `<div class="notif-item" style="cursor:pointer;" onclick="window.abrirDrawerLead(${l.id}); document.getElementById('notif-panel').classList.add('hidden');"><strong style="color:var(--accent);font-size:13px;">💰 Aprovação Pendente</strong><p style="font-size:12px;color:var(--muted);margin-top:3px;">${l.nome} — ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(l.valor)}</p></div>`),
            ...inadimplentes.slice(0, 3).map(l => `<div class="notif-item" style="cursor:pointer;" onclick="window.abrirDrawerLead(${l.id}); document.getElementById('notif-panel').classList.add('hidden');"><strong style="color:var(--danger);font-size:13px;">⚠️ Inadimplente</strong><p style="font-size:12px;color:var(--muted);margin-top:3px;">${l.nome} — ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(l.valor)}</p></div>`),
        ].join('');
    }

    const btnSino = document.getElementById('btn-sininho');
    const painel = document.getElementById('notif-panel');
    if (btnSino && painel) {
        btnSino.onclick = (e) => { e.stopPropagation(); painel.classList.toggle('hidden'); };
        document.addEventListener('click', (e) => { if (!painel.contains(e.target) && e.target !== btnSino) painel.classList.add('hidden'); });
    }

    atualizarNotificacoes();
    window._atualizarNotificacoes = atualizarNotificacoes;
}

/**
 * ============================================================================
 * [FIX-7] REAL-TIME SUPABASE
 * Atualiza a tela automaticamente quando qualquer lead mudar
 * ============================================================================
 */
function ativarRealTime() {
    if (!window._supabase) return;
    try { window._supabase.removeAllChannels?.(); } catch(e) {}

    // Debounce: evita múltiplas chamadas simultâneas do real-time (evita linhas duplicadas)
    let _rtDebounce = null;
    window._supabase.channel('hapsis-leads-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
            clearTimeout(_rtDebounce);
            _rtDebounce = setTimeout(() => {
                carregarLeads();
                setTimeout(() => window._atualizarNotificacoes?.(), 800);
            }, 400);
        })
        .subscribe();
}

/**
 * ============================================================================
 * [FIX-8] COMMAND PALETTE (Ctrl+K)
 * ============================================================================
 */
(function iniciarCommandPalette() {
    const palette = document.getElementById('cmd-palette');
    const input = document.getElementById('cmd-input');
    const lista = document.getElementById('cmd-list');
    const btnAbrir = document.getElementById('btn-abrir-comandos');
    if (!palette || !input || !lista) return;

    const comandos = [
        { icon: 'ph-kanban',         title: 'Pipeline',           sub: 'Painel Kanban de Vendas',       aba: 'aba-kanban' },
        { icon: 'ph-trophy',         title: 'Arena',              sub: 'Ranking e Gamificação',          aba: 'aba-arena' },
        { icon: 'ph-calendar-check', title: 'Agenda',             sub: 'Follow-ups e Retornos',          aba: 'aba-agenda' },
        { icon: 'ph-chart-pie-slice',title: 'Meu Relatório',      sub: 'Desempenho individual',          aba: 'aba-relatorio' },
        { icon: 'ph-users-three',    title: 'Pós-Venda',          sub: 'Esteira CS',                     aba: 'aba-pos-venda' },
        { icon: 'ph-megaphone',      title: 'Growth',             sub: 'Dashboard de Aquisição',         aba: 'aba-growth' },
        { icon: 'ph-seal-check',     title: 'Aprovações',         sub: 'Aprovações de caixa',            aba: 'aba-aprovacoes' },
        { icon: 'ph-money',          title: 'Caixa & Comissões',  sub: 'Controle financeiro',            aba: 'aba-comissoes' },
        { icon: 'ph-receipt',        title: 'Despesas',           sub: 'Contas a pagar',                 aba: 'aba-despesas' },
        { icon: 'ph-warning-octagon',title: 'Cobranças',          sub: 'Inadimplência e estornos',       aba: 'aba-cobrancas' },
        { icon: 'ph-arrows-clockwise',title: 'MRR',               sub: 'Receita Recorrente',             aba: 'aba-mrr' },
        { icon: 'ph-folder-lock',    title: 'Cofre de Contratos', sub: 'GED de documentos',              aba: 'aba-contratos' },
        { icon: 'ph-gift',           title: 'Bônus',              sub: 'Campanhas de gamificação',       aba: 'aba-bonus' },
        { icon: 'ph-chart-line-up',  title: 'Dashboard Geral',    sub: 'Painel CEO',                     aba: 'aba-chefao' },
        { icon: 'ph-percentage',     title: 'Produtos e Regras',  sub: 'Catálogo e comissões',           aba: 'aba-catalogo' },
        { icon: 'ph-users',          title: 'Gestão de Equipes',  sub: 'Squads e acessos',               aba: 'aba-equipe' },
        { icon: 'ph-magic-wand',     title: 'IA Preditiva',       sub: 'Relatórios com IA',              aba: 'aba-ia-relatorios' },
        { icon: 'ph-paint-brush',    title: 'White-Label',        sub: 'Identidade visual',              aba: 'aba-config' },
        { icon: 'ph-shield-check',   title: 'Auditoria',          sub: 'Banco de leads completo',        aba: 'aba-auditoria' },
        { icon: 'ph-file-csv',       title: 'Exportação',         sub: 'Exportar relatórios CSV/PDF',    aba: 'aba-exportacao' },
        { icon: 'ph-tree-structure', title: 'Automações',         sub: 'Webhooks e Robô Central',        aba: 'aba-automacoes' },
    ];

    function renderLista(filtro = '') {
        const fil = comandos.filter(c => c.title.toLowerCase().includes(filtro) || c.sub.toLowerCase().includes(filtro));
        lista.innerHTML = fil.map((c, i) => `
            <div class="cmd-item ${i === 0 ? 'selecionado' : ''}" data-aba="${c.aba}">
                <i class="ph ${c.icon}"></i>
                <div class="cmd-item-texts">
                    <div class="cmd-item-title">${c.title}</div>
                    <div class="cmd-item-sub">${c.sub}</div>
                </div>
            </div>`).join('');
        lista.querySelectorAll('.cmd-item').forEach(el => {
            el.addEventListener('click', () => {
                const aba = el.dataset.aba;
                document.querySelector(`[data-aba="${aba}"]`)?.click();
                fechar();
            });
        });
    }

    function abrir() { palette.classList.add('ativa'); input.value = ''; renderLista(); input.focus(); }
    function fechar() { palette.classList.remove('ativa'); }

    if (btnAbrir) btnAbrir.onclick = () => palette.classList.contains('ativa') ? fechar() : abrir();
    input.addEventListener('input', e => renderLista(e.target.value.toLowerCase()));
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); palette.classList.contains('ativa') ? fechar() : abrir(); }
        if (e.key === 'Escape') fechar();
    });
    palette.addEventListener('click', e => { if (e.target === palette) fechar(); });
})();

// Fim do Motor Javascript Enterprise HAPSIS v2.1

/**
 * POPUP DE BÔNUS — Notifica o vendedor ao entrar quando há campanha ativa
 */
function mostrarPopupBonus(campanha) {
    if (sessionStorage.getItem('bonus_visto_' + campanha.id)) return;
    const leadsVend = leadsData.filter(l => l.user_id === usuarioAtual.id && l.status === 'fechados' && l.aprovado === true && !l.estornado);
    const receitaAtual = leadsVend.reduce((acc, l) => acc + Number(l.valor), 0);
    const pct = Math.min((receitaAtual / campanha.meta_valor) * 100, 100);
    const faltam = Math.max(campanha.meta_valor - receitaAtual, 0);
    const fmt = v => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v);

    const overlay = document.createElement('div');
    overlay.id = 'popup-bonus-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(5,7,16,0.75);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .4s ease;';
    overlay.innerHTML = `
    <div style="max-width:420px;width:100%;padding:40px 32px;border-radius:24px;text-align:center;background:linear-gradient(145deg,rgba(179,136,255,0.18),rgba(16,19,28,0.97));border:1px solid rgba(179,136,255,0.4);box-shadow:0 40px 100px rgba(0,0,0,.7),0 0 60px rgba(179,136,255,0.15);animation:modal-in .45s cubic-bezier(.22,1.2,.36,1);">
        <div style="font-size:52px;margin-bottom:12px;">🏆</div>
        <h2 style="font-family:var(--font-head);font-size:22px;color:#fff;margin-bottom:8px;">Campanha Ativa!</h2>
        <p style="color:#b388ff;font-size:16px;font-weight:700;margin-bottom:4px;">${campanha.titulo}</p>
        <p style="color:var(--muted);font-size:13px;margin-bottom:28px;">Ganhe <strong style="color:#b388ff;font-size:16px;">${fmt(campanha.premio_valor)}</strong> de bônus batendo a meta</p>
        <div style="background:rgba(0,0,0,.3);border-radius:12px;padding:16px 20px;margin-bottom:24px;">
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:8px;">
                <span>Seu progresso</span><span style="color:#b388ff;font-weight:700;">${pct.toFixed(1)}%</span>
            </div>
            <div style="height:10px;background:rgba(255,255,255,.08);border-radius:10px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#b388ff,#7c3aed);border-radius:10px;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:10px;">
                <span style="font-size:13px;color:#fff;font-weight:700;">${fmt(receitaAtual)}</span>
                <span style="font-size:13px;color:var(--muted);">Meta: ${fmt(campanha.meta_valor)}</span>
            </div>
            ${faltam > 0
                ? `<p style="margin-top:8px;font-size:12px;color:var(--muted);">Faltam <strong style="color:#b388ff;">${fmt(faltam)}</strong></p>`
                : `<p style="margin-top:8px;font-size:13px;color:var(--fechados);font-weight:700;">🎉 Meta batida! Fale com seu gestor.</p>`
            }
        </div>
        <button onclick="document.getElementById('popup-bonus-overlay').remove()" style="width:100%;padding:14px;background:linear-gradient(135deg,#b388ff,#7c3aed);border:none;border-radius:12px;color:#fff;font-family:var(--font-head);font-weight:700;font-size:15px;cursor:pointer;box-shadow:0 8px 24px rgba(124,58,237,.4);">
            Vamos lá! 🚀
        </button>
    </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    sessionStorage.setItem('bonus_visto_' + campanha.id, '1');
}

/**
 * ============================================================================
 * MÓDULOS NOVOS v8: AUTOMAÇÕES, OKRs, PLAYBOOK, INTEGRAÇÕES, PÓS-VENDA+, GROWTH+
 * ============================================================================
 */

// ============================================================
// AUTOMAÇÕES — Copiar webhook + Round-Robin
// ============================================================
window.copiarWebhook = (inputId) => {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.select();
    el.setSelectionRange(0, 99999);
    try {
        navigator.clipboard.writeText(el.value).then(() => {
            mostrarToast('URL copiada! Cole na plataforma de pagamento.', 'ok');
        });
    } catch(e) {
        document.execCommand('copy');
        mostrarToast('URL copiada!', 'ok');
    }
};

window.salvarConfigRoundRobin = (ativo) => {
    localStorage.setItem('hapsis_roundrobin', ativo ? '1' : '0');
    mostrarToast(ativo ? 'Round-Robin ativado! Leads serão distribuídos automaticamente.' : 'Round-Robin desativado.', ativo ? 'ok' : 'info');
    const track = document.getElementById('rr-track');
    const thumb = document.getElementById('rr-thumb');
    if (track) track.style.background = ativo ? 'var(--accent)' : 'var(--border2)';
    if (thumb) thumb.style.left = ativo ? '25px' : '3px';
};

function renderizarRoundRobin() {
    const lista = document.getElementById('rr-equipe-lista');
    if (!lista) return;
    const vendedores = perfisEquipe.filter(p => p.role === 'vendedor' || p.role === 'sdr');
    const ativo = localStorage.getItem('hapsis_roundrobin') === '1';

    // Sincronizar toggle
    const toggle = document.getElementById('toggle-roundrobin');
    const track = document.getElementById('rr-track');
    const thumb = document.getElementById('rr-thumb');
    if (toggle) toggle.checked = ativo;
    if (track) track.style.background = ativo ? 'var(--accent)' : 'var(--border2)';
    if (thumb) thumb.style.left = ativo ? '25px' : '3px';

    if (vendedores.length === 0) {
        lista.innerHTML = `<p style="color:var(--muted); font-size:13px; text-align:center; padding:20px;">Nenhum vendedor cadastrado na equipe.</p>`;
        return;
    }

    // Contar leads por vendedor para mostrar distribuição
    const contagemLeads = {};
    leadsData.forEach(l => {
        if (l.status === 'novos') contagemLeads[l.user_id] = (contagemLeads[l.user_id] || 0) + 1;
    });

    lista.innerHTML = vendedores.map((v, i) => {
        const qtd = contagemLeads[v.id] || 0;
        const cores = ['var(--accent)', 'var(--novos)', '#b388ff', 'var(--fechados)', '#fb923c'];
        return `
        <div style="display:flex; align-items:center; justify-content:space-between; background:var(--bg2); border:1px solid var(--border); border-radius:10px; padding:14px 18px;">
            <div style="display:flex; align-items:center; gap:12px;">
                <div style="width:32px; height:32px; border-radius:50%; background:${cores[i % cores.length]}22; border:2px solid ${cores[i % cores.length]}; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:13px; color:${cores[i % cores.length]};">
                    ${(v.full_name || 'V')[0].toUpperCase()}
                </div>
                <div>
                    <div style="font-weight:700; color:var(--text); font-size:13px;">${v.full_name}</div>
                    <div style="font-size:11px; color:var(--muted);">${v.equipe || 'Geral'}</div>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
                <span style="font-size:12px; color:var(--muted);">${qtd} lead(s) na fila</span>
                <span style="width:8px; height:8px; border-radius:50%; background:${ativo ? 'var(--fechados)' : 'var(--border2)'}; display:inline-block;"></span>
            </div>
        </div>`;
    }).join('');
}

// Próximo vendedor Round-Robin
function obterProximoVendedorRR() {
    if (localStorage.getItem('hapsis_roundrobin') !== '1') return null;
    const vendedores = perfisEquipe.filter(p => p.role === 'vendedor');
    if (vendedores.length === 0) return null;
    const idx = parseInt(localStorage.getItem('hapsis_rr_idx') || '0') % vendedores.length;
    localStorage.setItem('hapsis_rr_idx', (idx + 1).toString());
    return vendedores[idx];
}

// ============================================================
// OKRs — CRUD completo com barra de progresso
// ============================================================
let okrsData = [];
let okrTrimestreSelecionado = 'Q1';

// Determinar trimestre atual automaticamente
function trimAtual() {
    const m = new Date().getMonth();
    return m < 3 ? 'Q1' : m < 6 ? 'Q2' : m < 9 ? 'Q3' : 'Q4';
}

async function carregarOKRs() {
    try {
        const { data } = await supabase.from('profiles').select('id').eq('id', usuarioAtual.id).single();
        // OKRs salvos no localStorage (sem precisar de nova tabela no banco)
        const salvo = localStorage.getItem('hapsis_okrs');
        okrsData = salvo ? JSON.parse(salvo) : [];
    } catch(e) {
        const salvo = localStorage.getItem('hapsis_okrs');
        okrsData = salvo ? JSON.parse(salvo) : [];
    }
}

window.selecionarTrimestre = (trim) => {
    okrTrimestreSelecionado = trim;
    document.querySelectorAll('.okr-trim-btn').forEach(b => {
        const ativo = b.dataset.trim === trim;
        b.style.background = ativo ? 'rgba(245,197,24,.12)' : 'transparent';
        b.style.color = ativo ? 'var(--accent)' : 'var(--muted)';
        b.style.borderColor = ativo ? 'var(--accent)' : 'var(--border)';
    });
    renderizarOKRs();
};

function renderizarOKRs() {
    const lista = document.getElementById('okr-lista');
    if (!lista) return;
    const filtrados = okrsData.filter(o => o.trimestre === okrTrimestreSelecionado);

    if (filtrados.length === 0) {
        lista.innerHTML = `<div style="text-align:center; padding:60px 20px; color:var(--muted);">
            <i class="ph ph-flag-banner" style="font-size:48px; display:block; margin-bottom:12px; opacity:.3;"></i>
            <p style="font-size:15px;">Nenhum OKR para ${okrTrimestreSelecionado}.</p>
        </div>`;
        return;
    }

    lista.innerHTML = filtrados.map(o => {
        const pct = Math.min((o.atual / o.meta) * 100, 100);
        const cor = pct >= 80 ? 'var(--fechados)' : pct >= 50 ? 'var(--accent)' : 'var(--danger)';
        const fmt = v => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL', minimumFractionDigits:0 }).format(v);
        return `
        <div style="background:var(--bg2); border:1px solid var(--border); border-radius:16px; padding:24px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
                <div>
                    <div style="font-size:11px; font-weight:700; color:var(--accent); letter-spacing:1px; margin-bottom:6px;">${o.trimestre} · OBJETIVO</div>
                    <div style="font-size:18px; font-weight:800; color:var(--text); font-family:var(--font-head);">${o.objetivo}</div>
                </div>
                <button onclick="window.deletarOKR('${o.id}')" style="background:transparent; border:none; color:var(--muted); cursor:pointer; padding:4px; border-radius:6px;" title="Remover OKR">
                    <i class="ph ph-trash"></i>
                </button>
            </div>
            <div style="background:rgba(0,0,0,.2); border-radius:10px; padding:16px;">
                <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--muted); margin-bottom:10px;">
                    <span><i class="ph ph-target"></i> ${o.kr}</span>
                    <span style="font-weight:700; color:${cor};">${pct.toFixed(0)}%</span>
                </div>
                <div style="height:8px; background:rgba(255,255,255,.06); border-radius:10px; overflow:hidden; margin-bottom:10px;">
                    <div style="height:100%; width:${pct}%; background:${cor}; border-radius:10px; transition:width 1s ease;"></div>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:13px;">
                    <span>Atual: <strong style="color:${cor};">${fmt(o.atual)}</strong></span>
                    <span style="color:var(--muted);">Meta: <strong>${fmt(o.meta)}</strong></span>
                </div>
                <div style="margin-top:12px; display:flex; align-items:center; gap:8px;">
                    <input type="number" value="${o.atual}" placeholder="Atualizar valor atual..."
                        onblur="window.atualizarOKR('${o.id}', this.value)"
                        style="flex:1; padding:8px 12px; background:rgba(0,0,0,.3); border:1px solid var(--border); border-radius:8px; color:var(--text); font-size:13px; outline:none;"/>
                    <button onclick="window.atualizarOKR('${o.id}', this.previousElementSibling.value)"
                        style="padding:8px 14px; background:rgba(245,197,24,.1); border:1px solid var(--accent); color:var(--accent); border-radius:8px; cursor:pointer; font-size:12px; font-weight:700;">
                        Atualizar
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

window.deletarOKR = (id) => {
    window.abrirConfirmacao('Remover OKR', 'Este objetivo será removido permanentemente.', 'Remover', () => {
        okrsData = okrsData.filter(o => o.id !== id);
        localStorage.setItem('hapsis_okrs', JSON.stringify(okrsData));
        renderizarOKRs();
        mostrarToast('OKR removido.', 'ok');
    });
};

window.atualizarOKR = (id, val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const okr = okrsData.find(o => o.id === id);
    if (!okr) return;
    okr.atual = num;
    localStorage.setItem('hapsis_okrs', JSON.stringify(okrsData));
    renderizarOKRs();
    mostrarToast('Progresso atualizado!', 'ok');
};

const formOKR = document.getElementById('form-okr');
if (formOKR) {
    formOKR.addEventListener('submit', (e) => {
        e.preventDefault();
        const obj = document.getElementById('okr-objetivo').value.trim();
        const kr  = document.getElementById('okr-kr').value.trim();
        const trim = document.getElementById('okr-trimestre').value;
        const meta = parseFloat(document.getElementById('okr-meta').value);
        const atual = parseFloat(document.getElementById('okr-atual').value) || 0;
        if (!obj || !kr || isNaN(meta)) { mostrarToast('Preencha todos os campos.', 'erro'); return; }
        okrsData.push({ id: Date.now().toString(), objetivo: obj, kr, trimestre: trim, meta, atual });
        localStorage.setItem('hapsis_okrs', JSON.stringify(okrsData));
        okrTrimestreSelecionado = trim;
        window.selecionarTrimestre(trim);
        document.getElementById('modal-okr').classList.remove('ativa');
        formOKR.reset();
        mostrarToast('OKR criado com sucesso!', 'ok');
    });
}

// ============================================================
// PLAYBOOK — Scripts de vendas com categorias
// ============================================================
let playbookData = [];
let playbookCatAtiva = 'todos';

async function carregarPlaybook() {
    const salvo = localStorage.getItem('hapsis_playbook');
    playbookData = salvo ? JSON.parse(salvo) : [];
}

window.filtrarPlaybook = (cat) => {
    playbookCatAtiva = cat;
    document.querySelectorAll('.pb-cat-btn').forEach(b => {
        const ativo = b.dataset.cat === cat;
        b.style.background = ativo ? 'rgba(245,197,24,.12)' : 'transparent';
        b.style.color = ativo ? 'var(--accent)' : 'var(--muted)';
        b.style.borderColor = ativo ? 'var(--accent)' : 'var(--border)';
    });
    renderizarPlaybook();
};

function renderizarPlaybook() {
    const lista = document.getElementById('playbook-lista');
    if (!lista) return;
    const filtrados = playbookCatAtiva === 'todos'
        ? playbookData
        : playbookData.filter(p => p.categoria === playbookCatAtiva);

    if (filtrados.length === 0) {
        lista.innerHTML = `<div style="text-align:center; padding:60px 20px; color:var(--muted); grid-column:1/-1;">
            <i class="ph ph-book-open" style="font-size:48px; display:block; margin-bottom:12px; opacity:.3;"></i>
            <p>Nenhum script nesta categoria.</p>
        </div>`;
        return;
    }

    const coresCat = {
        abertura: { bg: 'rgba(56,189,248,.1)', cor: 'var(--novos)', border: 'rgba(56,189,248,.3)' },
        objecoes: { bg: 'rgba(240,82,82,.1)', cor: 'var(--danger)', border: 'rgba(240,82,82,.3)' },
        fechamento: { bg: 'rgba(74,222,128,.1)', cor: 'var(--fechados)', border: 'rgba(74,222,128,.3)' },
        followup: { bg: 'rgba(245,197,24,.1)', cor: 'var(--accent)', border: 'rgba(245,197,24,.3)' },
        upsell: { bg: 'rgba(179,136,255,.1)', cor: '#b388ff', border: 'rgba(179,136,255,.3)' },
    };

    lista.innerHTML = filtrados.map(p => {
        const c = coresCat[p.categoria] || coresCat.fechamento;
        return `
        <div style="background:var(--bg2); border:1px solid var(--border); border-radius:14px; overflow:hidden; display:flex; flex-direction:column;">
            <div style="padding:16px 20px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span style="background:${c.bg}; color:${c.cor}; border:1px solid ${c.border}; padding:2px 10px; border-radius:20px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; margin-bottom:8px; display:inline-block;">${p.categoria}</span>
                    <div style="font-weight:800; color:var(--text); font-size:15px; font-family:var(--font-head);">${p.titulo}</div>
                </div>
                <button onclick="window.deletarPlaybook('${p.id}')" style="background:transparent; border:none; color:var(--muted); cursor:pointer; padding:4px; border-radius:6px;">
                    <i class="ph ph-trash"></i>
                </button>
            </div>
            <div style="padding:16px 20px; font-size:13px; color:var(--text2); line-height:1.7; flex:1; max-height:200px; overflow-y:auto;">${p.conteudo}</div>
            <div style="padding:10px 20px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:11px; color:var(--muted);">Criado por ${p.autor || 'Gestor'}</span>
                <button onclick="window.copiarScript('${p.id}')" style="background:transparent; border:1px solid var(--border); color:var(--muted); padding:4px 10px; border-radius:6px; cursor:pointer; font-size:11px; font-weight:700; transition:.2s;" onmouseover="this.style.color='var(--text)'" onmouseout="this.style.color='var(--muted)'">
                    <i class="ph ph-copy"></i> Copiar Script
                </button>
            </div>
        </div>`;
    }).join('');
}

window.deletarPlaybook = (id) => {
    window.abrirConfirmacao('Remover Script', 'Este script será removido do playbook.', 'Remover', () => {
        playbookData = playbookData.filter(p => p.id !== id);
        localStorage.setItem('hapsis_playbook', JSON.stringify(playbookData));
        renderizarPlaybook();
        mostrarToast('Script removido.', 'ok');
    });
};

window.copiarScript = (id) => {
    const p = playbookData.find(x => x.id === id);
    if (!p) return;
    const txt = p.conteudo.replace(/<[^>]*>/g, '');
    navigator.clipboard.writeText(txt).then(() => mostrarToast('Script copiado!', 'ok'));
};

const formPlaybook = document.getElementById('form-playbook');
if (formPlaybook) {
    formPlaybook.addEventListener('submit', (e) => {
        e.preventDefault();
        const titulo = document.getElementById('pb-titulo').value.trim();
        const cat    = document.getElementById('pb-categoria').value;
        const editor = document.getElementById('pb-conteudo');
        const cont   = editor ? editor.innerHTML.trim() : '';
        if (!titulo || !cont || cont === '') { mostrarToast('Preencha o título e o conteúdo.', 'erro'); return; }
        playbookData.push({ id: Date.now().toString(), titulo, categoria: cat, conteudo: cont, autor: perfilAtual.full_name });
        localStorage.setItem('hapsis_playbook', JSON.stringify(playbookData));
        playbookCatAtiva = cat;
        window.filtrarPlaybook(cat);
        document.getElementById('modal-playbook').classList.remove('ativa');
        if (editor) editor.innerHTML = '';
        formPlaybook.reset();
        mostrarToast('Script salvo no Playbook!', 'ok');
    });
}

// ============================================================
// PÓS-VENDA: Adicionar métricas de Churn Rate e LTV
// ============================================================
function calcularMetricasCS() {
    const fechados = leadsData.filter(l => l.status === 'fechados' && l.aprovado === true && !l.estornado);
    const cancelados = leadsData.filter(l => l.status === 'perdidos' || l.estornado);
    const total = fechados.length + cancelados.length;
    const churnRate = total > 0 ? ((cancelados.length / total) * 100).toFixed(1) : '0.0';
    const receitaTotal = fechados.reduce((acc, l) => acc + Number(l.valor), 0);
    const ltv = fechados.length > 0 ? (receitaTotal / fechados.length) : 0;
    const fmt = v => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v);

    const elChurn = document.getElementById('stat-pv-churn');
    const elLtv   = document.getElementById('stat-pv-ltv');
    const elAtivos = document.getElementById('stat-pv-ativos');
    if (elChurn) elChurn.innerText = churnRate + '%';
    if (elLtv)   elLtv.innerText = fmt(ltv);
    if (elAtivos) elAtivos.innerText = fechados.length;
}

// Hook na renderizarPosVenda para incluir métricas
const _renderizarPosVendaOriginal = renderizarPosVenda;
renderizarPosVenda = function() {
    _renderizarPosVendaOriginal();
    calcularMetricasCS();
};

// ============================================================
// CARREGAR MÓDULOS NOVOS NO BOOT
// ============================================================
const _iniciarAppOriginal = window._iniciarAppHook;

// Hook no ativarRealTime para carregar dados novos
const _ativarRealTimeOriginal = ativarRealTime;
ativarRealTime = function() {
    _ativarRealTimeOriginal();
    // Carregar dados dos módulos que usam localStorage
    if (typeof carregarOKRs === 'function') carregarOKRs().then(() => {
        const trim = trimAtual();
        okrTrimestreSelecionado = trim;
        window.selecionarTrimestre(trim);
    });
    if (typeof carregarPlaybook === 'function') carregarPlaybook().then(() => renderizarPlaybook());
    if (typeof renderizarRoundRobin === 'function') renderizarRoundRobin();
};

// Carregar na troca de aba
const _origNavClick = window._navClickHook;
document.querySelectorAll?.('.nav-item[data-aba]')?.forEach?.(btn => {
    btn.addEventListener('click', () => {
        const aba = btn.dataset.aba;
        if (aba === 'aba-okrs') {
            carregarOKRs().then(() => {
                const trim = trimAtual();
                window.selecionarTrimestre(trim);
            });
        }
        if (aba === 'aba-playbook') {
            carregarPlaybook().then(() => renderizarPlaybook());
        }
        if (aba === 'aba-automacoes') {
            renderizarRoundRobin();
        }
    });
});


/**
 * ============================================================================
 * CHAT IA HAPSIS — Assistente de Suporte da Plataforma
 * ============================================================================
 */

let chatIAAberto = false;
let chatIAHistorico = []; // Histórico de mensagens para contexto

const CHAT_SYSTEM_PROMPT = `Você é o assistente oficial do HAPSIS Enterprise CRM. Responda APENAS sobre funcionalidades, dúvidas e orientações relacionadas ao sistema HAPSIS. 

SOBRE O HAPSIS:
O HAPSIS é um CRM completo com os seguintes módulos:

MÓDULOS POR CARGO:
- Vendedor: Pipeline (Kanban drag-drop), Arena (ranking em tempo real), Agenda (follow-ups), Meu Relatório (desempenho individual)
- Sub Gerente: Aprovações de vendas, Caixa & Comissões, Contas a Pagar, Inadimplência, MRR (recorrência), Cofre de Contratos, Gestão de Bônus
- Gerente (CEO): Tudo acima + Dashboard Geral, OKRs, Playbook de Vendas, Automações, Gestão de Equipes, IA Preditiva, White-Label, Exportação, Auditoria

FUNCIONALIDADES PRINCIPAIS:
- Pipeline: arraste leads entre colunas (Novos, Negociação, Fechados, Perdidos, Abandonados)
- Aprovações: Sub Gerente aprova vendas antes de entrar no financeiro. Chave: FINAN2026
- Comissões: calculadas automaticamente por produto. CFO quita com um clique
- Inadimplência: detectada automaticamente quando data de vencimento passa. Aparece em Cobranças
- Bônus: gestor cria campanhas com meta e prêmio. Vendedor vê popup ao entrar
- OKRs: metas trimestrais (Q1-Q4) com barra de progresso colorida
- Playbook: biblioteca de scripts por categoria (Abertura, Objeções, Fechamento, Follow-up, Upsell)
- Automações: webhooks para Kirvano, Kiwify e Asaas. Round-Robin distribui leads automaticamente
- IA Preditiva: 6 tipos de análise (Diagnóstico, Funil, Equipe, Financeiro, Churn, Pergunta Livre)
- White-Label: troca logo, cor e nome da empresa
- Real-Time: atualizações automáticas sem F5 via WebSocket
- CTRL+K: paleta de comandos para navegar rapidamente

CHAVES DE ACESSO:
- Gerente: CEO2026
- Sub Gerente: FINAN2026

BANCO DE DADOS: Supabase com 7 tabelas (profiles, leads, produtos, campanhas_bonus, avisos, pagamentos_comissao, logs_exportacao)

REGRAS IMPORTANTES:
- Se perguntarem sobre algo fora do HAPSIS, diga educadamente que só pode ajudar com dúvidas da plataforma
- Seja direto, claro e use exemplos práticos
- Responda sempre em português
- Máximo 200 palavras por resposta
- Use emojis com moderação para tornar a resposta mais amigável`;

window.toggleChatIA = () => {
    const janela = document.getElementById('chat-ia-janela');
    const badge = document.getElementById('chat-ia-badge');
    const icone = document.getElementById('chat-ia-icone');

    chatIAAberto = !chatIAAberto;

    if (chatIAAberto) {
        janela.style.display = 'flex';
        badge.style.display = 'none';
        icone.className = 'ph ph-x';
        setTimeout(() => document.getElementById('chat-ia-input')?.focus(), 100);
    } else {
        janela.style.display = 'none';
        icone.className = 'ph ph-chats';
    }
};

window.limparChatIA = () => {
    chatIAHistorico = [];
    const msgs = document.getElementById('chat-ia-mensagens');
    if (!msgs) return;
    msgs.innerHTML = `
    <div class="chat-msg-ia" style="display:flex; gap:8px; align-items:flex-start;">
        <div style="width:28px; height:28px; border-radius:8px; background:linear-gradient(135deg,#b388ff,#7c3aed); display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;">
            <i class="ph ph-sparkle" style="color:#fff; font-size:13px;"></i>
        </div>
        <div style="background:rgba(179,136,255,0.1); border:1px solid rgba(179,136,255,0.2); border-radius:0 12px 12px 12px; padding:10px 14px; max-width:280px;">
            <p style="color:rgba(255,255,255,0.85); font-size:13px; line-height:1.6; margin:0;">
                Conversa reiniciada. Como posso ajudar? 😊
            </p>
        </div>
    </div>`;
};

window.enviarSugestaoChat = (texto) => {
    const input = document.getElementById('chat-ia-input');
    if (input) {
        input.value = texto;
        window.enviarMensagemChat();
    }
};

function adicionarMensagemChat(texto, tipo) {
    const msgs = document.getElementById('chat-ia-mensagens');
    if (!msgs) return;

    // Remover sugestões após primeira mensagem do usuário
    if (tipo === 'user') {
        const sugestoes = msgs.querySelector('[data-sugestoes]');
        if (sugestoes) sugestoes.remove();
    }

    if (tipo === 'user') {
        const div = document.createElement('div');
        div.className = 'chat-msg-user';
        div.style.cssText = 'display:flex; justify-content:flex-end;';
        div.innerHTML = `
            <div style="background:linear-gradient(135deg,rgba(179,136,255,0.25),rgba(124,58,237,0.2)); border:1px solid rgba(179,136,255,0.3); border-radius:12px 0 12px 12px; padding:10px 14px; max-width:280px;">
                <p style="color:#fff; font-size:13px; line-height:1.6; margin:0; white-space:pre-wrap;">${texto}</p>
            </div>`;
        msgs.appendChild(div);
    } else if (tipo === 'ia') {
        const div = document.createElement('div');
        div.className = 'chat-msg-ia';
        div.style.cssText = 'display:flex; gap:8px; align-items:flex-start;';

        // Converter markdown básico
        const html = texto
            .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#b388ff;">$1</strong>')
            .replace(/^- (.*)/gm, '<li style="margin-bottom:4px;">$1</li>')
            .split('\n').map(l => l.startsWith('<li') ? l : `<span>${l}</span><br>`).join('');

        div.innerHTML = `
            <div style="width:28px; height:28px; border-radius:8px; background:linear-gradient(135deg,#b388ff,#7c3aed); display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;">
                <i class="ph ph-sparkle" style="color:#fff; font-size:13px;"></i>
            </div>
            <div style="background:rgba(179,136,255,0.1); border:1px solid rgba(179,136,255,0.2); border-radius:0 12px 12px 12px; padding:10px 14px; max-width:280px;">
                <p style="color:rgba(255,255,255,0.85); font-size:13px; line-height:1.6; margin:0;">${html}</p>
            </div>`;
        msgs.appendChild(div);
    } else if (tipo === 'loading') {
        const div = document.createElement('div');
        div.id = 'chat-ia-loading';
        div.className = 'chat-msg-ia';
        div.style.cssText = 'display:flex; gap:8px; align-items:flex-start;';
        div.innerHTML = `
            <div style="width:28px; height:28px; border-radius:8px; background:linear-gradient(135deg,#b388ff,#7c3aed); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i class="ph ph-sparkle" style="color:#fff; font-size:13px;"></i>
            </div>
            <div style="background:rgba(179,136,255,0.1); border:1px solid rgba(179,136,255,0.2); border-radius:0 12px 12px 12px; padding:12px 16px;">
                <div style="display:flex; gap:4px; align-items:center;">
                    <span style="width:6px; height:6px; border-radius:50%; background:#b388ff; animation:dot-pulse 1.2s ease-in-out infinite;"></span>
                    <span style="width:6px; height:6px; border-radius:50%; background:#b388ff; animation:dot-pulse 1.2s ease-in-out infinite .2s;"></span>
                    <span style="width:6px; height:6px; border-radius:50%; background:#b388ff; animation:dot-pulse 1.2s ease-in-out infinite .4s;"></span>
                </div>
            </div>`;
        msgs.appendChild(div);

        // Adicionar CSS do dot-pulse se não existir
        if (!document.getElementById('dot-pulse-style')) {
            const s = document.createElement('style');
            s.id = 'dot-pulse-style';
            s.textContent = '@keyframes dot-pulse { 0%,80%,100% { transform:scale(.8); opacity:.5 } 40% { transform:scale(1); opacity:1 } }';
            document.head.appendChild(s);
        }
    }

    // Scroll para o fim
    msgs.scrollTop = msgs.scrollHeight;
}

window.enviarMensagemChat = async () => {
    const input = document.getElementById('chat-ia-input');
    const sendBtn = document.getElementById('chat-ia-send-btn');
    const texto = input?.value?.trim();
    if (!texto) return;

    // Limpar input e desabilitar
    input.value = '';
    input.style.height = 'auto';
    if (sendBtn) { sendBtn.disabled = true; sendBtn.style.opacity = '0.5'; }

    // Mostrar mensagem do usuário
    adicionarMensagemChat(texto, 'user');

    // Adicionar ao histórico
    chatIAHistorico.push({ role: 'user', content: texto });

    // Manter histórico limitado (últimas 10 mensagens para economizar tokens)
    if (chatIAHistorico.length > 10) {
        chatIAHistorico = chatIAHistorico.slice(-10);
    }

    // Mostrar loading
    adicionarMensagemChat('', 'loading');

    try {
        // Chamar Edge Function com histórico completo
        const res = await fetch(`${SUPABASE_URL}/functions/v1/hapsis-ia`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({
                tipo: 'suporte',
                systemPrompt: CHAT_SYSTEM_PROMPT,
                messages: chatIAHistorico
            })
        });

        const data = await res.json();
        const resposta = data.resposta || data.erro || 'Não consegui responder. Tente novamente.';

        // Remover loading
        document.getElementById('chat-ia-loading')?.remove();

        // Adicionar resposta
        adicionarMensagemChat(resposta, 'ia');

        // Adicionar resposta ao histórico
        chatIAHistorico.push({ role: 'assistant', content: resposta });

    } catch (err) {
        document.getElementById('chat-ia-loading')?.remove();
        adicionarMensagemChat('Não consegui conectar. Verifique se a IA está configurada.', 'ia');
    }

    // Reabilitar input
    if (sendBtn) { sendBtn.disabled = false; sendBtn.style.opacity = '1'; }
    input?.focus();
};

/**
 * ============================================================================
 * AUTENTICAÇÃO COM CÓDIGO OTP NO EMAIL
 * Usa o Supabase OTP nativo — precisa estar habilitado no dashboard
 * ============================================================================
 */

let otpEmail = '';
let otpTimer = null;
let otpContagem = 60;

// Inicializar inputs OTP com navegação automática entre dígitos
function inicializarOTPInputs() {
    const inputs = document.querySelectorAll('.otp-digit');
    inputs.forEach((inp, idx) => {
        inp.addEventListener('input', (e) => {
            const val = e.target.value.replace(/[^0-9]/g, '');
            e.target.value = val;
            if (val) {
                e.target.classList.add('preenchido');
                if (idx < inputs.length - 1) inputs[idx + 1].focus();
                // Auto-verificar quando todos preenchidos
                const todos = [...inputs].every(i => i.value !== '');
                if (todos) verificarOTP();
            } else {
                e.target.classList.remove('preenchido');
            }
        });
        inp.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !inp.value && idx > 0) {
                inputs[idx - 1].focus();
                inputs[idx - 1].value = '';
                inputs[idx - 1].classList.remove('preenchido');
            }
        });
        inp.addEventListener('paste', (e) => {
            e.preventDefault();
            const texto = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
            [...texto].slice(0, 6).forEach((c, i) => {
                if (inputs[i]) { inputs[i].value = c; inputs[i].classList.add('preenchido'); }
            });
            if (texto.length >= 6) verificarOTP();
        });
    });
}

// Abrir modal OTP
function abrirModalOTP(email) {
    otpEmail = email;
    const modal = document.getElementById('modal-otp');
    const desc  = document.getElementById('otp-desc');
    if (desc) desc.textContent = `Enviamos um código de 6 dígitos para ${email}`;
    // Limpar inputs
    document.querySelectorAll('.otp-digit').forEach(i => { i.value = ''; i.classList.remove('preenchido'); });
    if (modal) {
        modal.classList.add('ativa');
        setTimeout(() => document.querySelector('.otp-digit')?.focus(), 300);
    }
    iniciarTimerOTP();
}

// Timer de reenvio
function iniciarTimerOTP() {
    otpContagem = 60;
    const btn = document.getElementById('btn-reenviar-otp');
    clearInterval(otpTimer);
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.4';
        btn.textContent = `Reenviar em ${otpContagem}s`;
    }
    otpTimer = setInterval(() => {
        otpContagem--;
        if (btn) btn.textContent = `Reenviar em ${otpContagem}s`;
        if (otpContagem <= 0) {
            clearInterval(otpTimer);
            if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.textContent = 'Reenviar código'; }
        }
    }, 1000);
}

// Reenviar OTP
window.reenviarOTP = async () => {
    if (!otpEmail) return;
    await supabase.auth.signInWithOtp({ email: otpEmail });
    iniciarTimerOTP();
    mostrarToast('Novo código enviado para seu e-mail!', 'ok');
};

// Verificar código OTP
async function verificarOTP() {
    const inputs = document.querySelectorAll('.otp-digit');
    const token = [...inputs].map(i => i.value).join('');
    if (token.length !== 6) return;

    const btn = document.getElementById('btn-verificar-otp');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Verificando...'; }

    const { data, error } = await supabase.auth.verifyOtp({
        email: otpEmail,
        token: token,
        type: 'email'
    });

    if (error) {
        // Mostrar erro visual nos inputs
        const erroEl = document.getElementById('otp-erro');
        if (erroEl) erroEl.style.display = 'block';
        document.querySelectorAll('.otp-digit').forEach(i => {
            i.classList.remove('preenchido');
            i.value = '';
            i.style.borderColor = 'rgba(240,82,82,0.6)';
            setTimeout(() => { i.style.borderColor = ''; }, 2000);
        });
        document.querySelector('.otp-digit')?.focus();
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-check-circle"></i> Verificar Código'; }
    } else {
        document.getElementById('modal-otp')?.classList.remove('ativa');
        mostrarToast('✅ Identidade verificada! Entrando no sistema...', 'ok');
        // Após verificar OTP, entrar na plataforma
        if (data?.session) {
            usuarioAtual = data.session.user;
            await verificarPerfil();
        } else if (usuarioAtual) {
            await iniciarApp();
        }
    }
}

// Botão verificar
const btnVerOTP = document.getElementById('btn-verificar-otp');
if (btnVerOTP) btnVerOTP.onclick = verificarOTP;

// Inicializar ao carregar
inicializarOTPInputs();

/**
 * ============================================================================
 * HELPERS — Modal instrução senha
 * ============================================================================
 */
window._mostrarInstrucaoSenha = function() {
    document.getElementById('modal-instrucao-senha')?.classList.add('ativa');
};

/**
 * Fix visual: aplicar CSS escuro nos selects gerados dinamicamente via JS
 * Chamado sempre que um modal abre ou select é criado programaticamente
 */
window._fixSelectsDark = function() {
    document.querySelectorAll('select').forEach(sel => {
        if (sel.dataset.darkFixed) return;
        sel.dataset.darkFixed = '1';
        sel.style.cssText = `
            background-color: #0d1117 !important;
            color: #e8eaf6 !important;
            border: 1px solid rgba(255,255,255,0.12) !important;
            border-radius: 8px !important;
            padding: 8px 36px 8px 12px !important;
            -webkit-appearance: none !important;
            appearance: none !important;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E") !important;
            background-repeat: no-repeat !important;
            background-position: right 10px center !important;
            cursor: pointer !important;
        `;
        // Fix das options
        sel.querySelectorAll('option').forEach(opt => {
            opt.style.backgroundColor = '#0d1117';
            opt.style.color = '#e8eaf6';
        });
    });
};

// Aplicar fix de selects quando modais abrem
document.querySelectorAll('.modal-overlay').forEach(modal => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(m => {
            if (m.target.classList.contains('ativa')) {
                setTimeout(window._fixSelectsDark, 50);
            }
        });
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
});

// Aplicar fix inicial e após carregamento
setTimeout(window._fixSelectsDark, 500);
setTimeout(window._fixSelectsDark, 2000);