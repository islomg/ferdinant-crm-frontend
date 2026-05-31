// ===================== AUTH GUARD =====================

const AUTH_KEY = 'crm_auth_token';
const AUTH_EXPIRY_KEY = 'crm_auth_expiry';
const AUTH_REMEMBER_KEY = 'crm_auth_remember';
const USERS_KEY = 'crm_users';
const CURRENT_USER_KEY = 'crm_current_user';
const SESSION_HOURS = 12;

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}

function getUsers() {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : {};
}

function saveUser(username, password) {
    const users = getUsers();
    users[username.toLowerCase()] = simpleHash(password);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function checkLogin(username, password) {
    const users = getUsers();
    const key = username.toLowerCase();
    return users[key] && users[key] === simpleHash(password);
}

function getCurrentUser() {
    return localStorage.getItem(CURRENT_USER_KEY) || sessionStorage.getItem(CURRENT_USER_KEY) || '';
}

function isSessionValid() {
    const token = localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY);
    const expiry = localStorage.getItem(AUTH_EXPIRY_KEY) || sessionStorage.getItem(AUTH_EXPIRY_KEY);
    if (!token || !expiry) return false;
    return new Date().getTime() < parseInt(expiry);
}

function createSession(remember, username) {
    const token = Math.random().toString(36).substring(2);
    const expiry = new Date().getTime() + (SESSION_HOURS * 60 * 60 * 1000);
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(AUTH_KEY, token);
    storage.setItem(AUTH_EXPIRY_KEY, expiry.toString());
    storage.setItem(CURRENT_USER_KEY, username.toLowerCase());
    if (remember) localStorage.setItem(AUTH_REMEMBER_KEY, 'true');
}

function logout() {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_EXPIRY_KEY);
    localStorage.removeItem(AUTH_REMEMBER_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(AUTH_EXPIRY_KEY);
    sessionStorage.removeItem(CURRENT_USER_KEY);
    location.reload();
}

// ===================== LOGIN SAHIFASI =====================
function showLoginPage() {
    const users = getUsers();
    const hasUsers = Object.keys(users).length > 0;
    document.documentElement.style.overflow = 'hidden';

    const overlay = document.createElement('div');
    overlay.id = 'auth-overlay';
    overlay.style.cssText = `
        position:fixed;inset:0;z-index:99999;
        background:#06080f;
        display:flex;align-items:center;justify-content:center;
        font-family:'Geist',-apple-system,sans-serif;
    `;

    overlay.innerHTML = `
        <div style="
            background:rgba(17,24,39,0.95);
            border:1px solid rgba(255,255,255,0.08);
            border-radius:24px;
            padding:36px;
            width:92%;
            max-width:400px;
            box-shadow:0 25px 60px rgba(0,0,0,0.6);
            animation:authIn .25s ease;
        ">
            <style>
                @keyframes authIn {
                    from{opacity:0;transform:scale(.95) translateY(10px)}
                    to{opacity:1;transform:none}
                }
                #auth-overlay input {
                    width:100%;
                    background:rgba(0,0,0,0.3);
                    border:1px solid rgba(255,255,255,0.1);
                    border-radius:10px;
                    color:#f1f5f9;
                    padding:11px 14px;
                    font-size:14px;
                    outline:none;
                    transition:border-color .2s,box-shadow .2s;
                    font-family:'Geist',-apple-system,sans-serif;
                    box-sizing:border-box;
                }
                #auth-overlay input:focus {
                    border-color:#3b82f6;
                    box-shadow:0 0 0 3px rgba(59,130,246,0.15);
                }
                #auth-overlay input::placeholder { color:#475569; }
                #auth-btn {
                    width:100%;background:#3b82f6;color:#fff;border:none;
                    border-radius:10px;padding:12px;font-size:14px;font-weight:600;
                    cursor:pointer;transition:all .18s;
                    font-family:'Geist',-apple-system,sans-serif;margin-top:4px;
                }
                #auth-btn:hover { background:#2563eb; transform:translateY(-1px); }
                #auth-btn:active { transform:scale(.98); }
                #auth-toggle {
                    background:none;border:none;color:#3b82f6;cursor:pointer;
                    font-size:13px;font-family:'Geist',-apple-system,sans-serif;
                    text-decoration:underline;padding:0;
                }
                #auth-toggle:hover { color:#60a5fa; }
                .auth-label {
                    display:block;font-size:11px;font-weight:600;color:#64748b;
                    text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;
                }
                .auth-error {
                    background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);
                    border-radius:8px;padding:10px 14px;font-size:13px;color:#f87171;
                    display:none;margin-bottom:12px;
                }
                .remember-row {
                    display:flex;align-items:center;gap:8px;margin-bottom:16px;cursor:pointer;
                }
                .remember-row input[type=checkbox] {
                    width:16px!important;height:16px;padding:0;
                    cursor:pointer;accent-color:#3b82f6;
                }
                .remember-row span { font-size:13px;color:#94a3b8; }
            </style>

            <div style="text-align:center;margin-bottom:28px">
                <div style="font-size:22px;font-weight:700;color:#f1f5f9">
                    Ferdinant<span style="color:#3b82f6">Edu</span>CRM
                </div>
                <div style="font-size:13px;color:#475569;margin-top:4px" id="auth-subtitle">
                    ${hasUsers ? 'Hisobingizga kiring' : 'Yangi hisob yarating'}
                </div>
            </div>

            <div class="auth-error" id="auth-error"></div>

            <div style="display:flex;flex-direction:column;gap:14px">
                <div>
                    <label class="auth-label">Login</label>
                    <input type="text" id="auth-username" placeholder="Foydalanuvchi nomi" autocomplete="username">
                </div>
                <div style="position:relative">
                    <label class="auth-label">Parol</label>
                    <input type="password" id="auth-password" placeholder="Parol" autocomplete="current-password">
                    <span onclick="toggleAuthPass()" style="position:absolute;right:12px;bottom:11px;cursor:pointer;color:#475569;font-size:14px;">👁</span>
                </div>
                <div>
                    <label class="auth-label" id="confirm-label" style="display:${hasUsers ? 'none' : 'block'}">Parolni tasdiqlang</label>
                    <input type="password" id="auth-confirm" placeholder="Parolni tasdiqlang" autocomplete="new-password" style="display:${hasUsers ? 'none' : 'block'}">
                </div>

                <label class="remember-row">
                    <input type="checkbox" id="auth-remember" checked>
                    <span>Eslab qolish (${SESSION_HOURS} soat)</span>
                </label>

                <button id="auth-btn" onclick="handleAuth()">
                    ${hasUsers ? '🔐 Kirish' : '✅ Hisob yaratish'}
                </button>

                <div style="text-align:center;margin-top:4px">
                    ${hasUsers ? `
                    <span style="font-size:13px;color:#475569">Yangi hisob? </span>
                    <button id="auth-toggle" onclick="toggleAuthMode()">Ro'yxatdan o'tish</button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    overlay.addEventListener('keydown', e => { if (e.key === 'Enter') handleAuth(); });
    window._authMode = hasUsers ? 'login' : 'register';
}

function toggleAuthPass() {
    const inp = document.getElementById('auth-password');
    inp.type = inp.type === 'password' ? 'text' : 'password';
}

function toggleAuthMode() {
    const isLogin = window._authMode === 'login';
    window._authMode = isLogin ? 'register' : 'login';
    document.getElementById('auth-subtitle').textContent = isLogin ? 'Yangi hisob yarating' : 'Hisobingizga kiring';
    document.getElementById('auth-btn').textContent = isLogin ? '✅ Hisob yaratish' : '🔐 Kirish';
    const toggle = document.getElementById('auth-toggle');
    if (toggle) toggle.textContent = isLogin ? 'Kirish' : "Ro'yxatdan o'tish";
    const confirmInput = document.getElementById('auth-confirm');
    const confirmLabel = document.getElementById('confirm-label');
    if (confirmInput) confirmInput.style.display = isLogin ? 'block' : 'none';
    if (confirmLabel) confirmLabel.style.display = isLogin ? 'block' : 'none';
    document.getElementById('auth-error').style.display = 'none';
}

function showAuthError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg;
    el.style.display = 'block';
}

function handleAuth() {
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;
    const remember = document.getElementById('auth-remember').checked;

    if (!username || !password) { showAuthError('Login va parolni kiriting!'); return; }

    if (window._authMode === 'register') {
        const confirm = document.getElementById('auth-confirm').value;
        if (password !== confirm) { showAuthError('Parollar mos kelmadi!'); return; }
        if (password.length < 4) { showAuthError("Parol kamida 4 ta belgi bo'lishi kerak!"); return; }
        const users = getUsers();
        if (users[username.toLowerCase()]) { showAuthError('Bu login allaqachon band!'); return; }
        saveUser(username, password);
        createSession(remember, username);
        document.getElementById('auth-overlay').remove();
        document.documentElement.style.overflow = '';
    } else {
        if (!checkLogin(username, password)) { showAuthError("Login yoki parol noto'g'ri!"); return; }
        createSession(remember, username);
        document.getElementById('auth-overlay').remove();
        document.documentElement.style.overflow = '';
    }
}

// ===================== TOPBAR TUGMALARI =====================
function addTopbarButtons() {
    const actions = document.querySelector('.topbar-actions');
    if (!actions || document.getElementById('profile-btn')) return;

    const currentUser = getCurrentUser();

    // Profile tugmasi
    const profileBtn = document.createElement('button');
    profileBtn.id = 'profile-btn';
    profileBtn.title = 'Profil';
    profileBtn.style.cssText = `
        background:rgba(59,130,246,0.1);
        border:1px solid rgba(59,130,246,0.2);
        color:#3b82f6;border-radius:8px;
        padding:6px 12px;font-size:12px;font-weight:600;
        cursor:pointer;font-family:'Geist',-apple-system,sans-serif;
        transition:.18s;display:flex;align-items:center;gap:6px;
    `;
    profileBtn.innerHTML = `👤 ${currentUser || 'Profil'}`;
    profileBtn.onmouseover = () => { profileBtn.style.background = '#3b82f6'; profileBtn.style.color = '#fff'; };
    profileBtn.onmouseout = () => { profileBtn.style.background = 'rgba(59,130,246,0.1)'; profileBtn.style.color = '#3b82f6'; };
    profileBtn.onclick = showProfileModal;

    // Logout tugmasi
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logout-btn';
    logoutBtn.title = 'Chiqish';
    logoutBtn.style.cssText = `
        background:rgba(239,68,68,0.1);
        border:1px solid rgba(239,68,68,0.2);
        color:#ef4444;border-radius:8px;
        padding:6px 12px;font-size:12px;font-weight:600;
        cursor:pointer;font-family:'Geist',-apple-system,sans-serif;
        transition:.18s;
    `;
    logoutBtn.innerHTML = '🚪 Chiqish';
    logoutBtn.onmouseover = () => { logoutBtn.style.background = '#ef4444'; logoutBtn.style.color = '#fff'; };
    logoutBtn.onmouseout = () => { logoutBtn.style.background = 'rgba(239,68,68,0.1)'; logoutBtn.style.color = '#ef4444'; };
    logoutBtn.onclick = () => { if (confirm('Tizimdan chiqasizmi?')) logout(); };

    actions.appendChild(profileBtn);
    actions.appendChild(logoutBtn);
}

// ===================== PROFIL MODALI =====================
function showProfileModal() {
    if (document.getElementById('profile-modal-overlay')) return;

    const currentUser = getCurrentUser();
    const users = getUsers();

    const overlay = document.createElement('div');
    overlay.id = 'profile-modal-overlay';
    overlay.style.cssText = `
        position:fixed;inset:0;z-index:99998;
        background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);
        display:flex;align-items:center;justify-content:center;
        font-family:'Geist',-apple-system,sans-serif;
    `;

    overlay.innerHTML = `
        <div style="
            background:#0d1117;
            border:1px solid rgba(255,255,255,0.1);
            border-radius:20px;padding:28px;
            width:92%;max-width:420px;
            box-shadow:0 25px 60px rgba(0,0,0,0.6);
            animation:authIn .22s ease;
        ">
            <style>
                @keyframes authIn {
                    from{opacity:0;transform:scale(.95) translateY(8px)}
                    to{opacity:1;transform:none}
                }
                .pm-input {
                    width:100%;background:rgba(0,0,0,0.3);
                    border:1px solid rgba(255,255,255,0.1);
                    border-radius:10px;color:#f1f5f9;
                    padding:11px 14px;font-size:14px;outline:none;
                    transition:border-color .2s,box-shadow .2s;
                    font-family:'Geist',-apple-system,sans-serif;
                    box-sizing:border-box;
                }
                .pm-input:focus {
                    border-color:#3b82f6;
                    box-shadow:0 0 0 3px rgba(59,130,246,0.15);
                }
                .pm-input::placeholder { color:#475569; }
                .pm-label {
                    display:block;font-size:11px;font-weight:600;color:#64748b;
                    text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;
                }
                .pm-btn {
                    padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;
                    cursor:pointer;transition:all .18s;border:1px solid transparent;
                    font-family:'Geist',-apple-system,sans-serif;
                }
                .pm-success {
                    background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);
                    border-radius:8px;padding:10px 14px;font-size:13px;color:#34d399;
                    display:none;margin-bottom:12px;
                }
                .pm-error {
                    background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);
                    border-radius:8px;padding:10px 14px;font-size:13px;color:#f87171;
                    display:none;margin-bottom:12px;
                }
                .pm-tab {
                    padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;
                    cursor:pointer;transition:.18s;border:1px solid transparent;
                    font-family:'Geist',-apple-system,sans-serif;background:transparent;
                    color:#64748b;
                }
                .pm-tab.active {
                    background:rgba(59,130,246,0.12);color:#3b82f6;
                    border-color:rgba(59,130,246,0.2);
                }
            </style>

            <!-- Header -->
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
                <div style="font-size:17px;font-weight:700;color:#f1f5f9">
                    👤 Profil sozlamalari
                </div>
                <button onclick="closeProfileModal()" style="
                    background:none;border:none;color:#475569;
                    font-size:20px;cursor:pointer;padding:4px;
                    transition:color .15s;
                " onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#475569'">✕</button>
            </div>

            <!-- Foydalanuvchi info -->
            <div style="
                background:rgba(59,130,246,0.08);
                border:1px solid rgba(59,130,246,0.15);
                border-radius:12px;padding:14px 16px;
                margin-bottom:20px;
                display:flex;align-items:center;gap:12px;
            ">
                <div style="
                    width:40px;height:40px;border-radius:10px;
                    background:rgba(59,130,246,0.2);color:#3b82f6;
                    display:flex;align-items:center;justify-content:center;
                    font-size:18px;font-weight:700;
                ">${(currentUser[0] || 'U').toUpperCase()}</div>
                <div>
                    <div style="font-weight:600;color:#f1f5f9">${currentUser}</div>
                    <div style="font-size:12px;color:#475569">Administrator</div>
                </div>
            </div>

            <!-- Tablar -->
            <div style="display:flex;gap:6px;margin-bottom:20px;background:rgba(0,0,0,0.2);border-radius:10px;padding:4px">
                <button class="pm-tab active" id="pm-tab-pass" onclick="switchPmTab('pass')">🔑 Parol o'zgartirish</button>
                <button class="pm-tab" id="pm-tab-users" onclick="switchPmTab('users')">👥 Foydalanuvchilar</button>
            </div>

            <!-- Parol o'zgartirish tab -->
            <div id="pm-panel-pass">
                <div class="pm-error" id="pm-error"></div>
                <div class="pm-success" id="pm-success"></div>
                <div style="display:flex;flex-direction:column;gap:14px">
                    <div>
                        <label class="pm-label">Joriy parol</label>
                        <input class="pm-input" type="password" id="pm-old-pass" placeholder="Joriy parolni kiriting">
                    </div>
                    <div>
                        <label class="pm-label">Yangi parol</label>
                        <input class="pm-input" type="password" id="pm-new-pass" placeholder="Yangi parol (kamida 4 belgi)">
                    </div>
                    <div>
                        <label class="pm-label">Yangi parolni tasdiqlang</label>
                        <input class="pm-input" type="password" id="pm-confirm-pass" placeholder="Yangi parolni qaytaring">
                    </div>
                    <div style="display:flex;gap:8px;margin-top:4px">
                        <button class="pm-btn" onclick="closeProfileModal()" style="
                            background:rgba(255,255,255,0.04);color:#94a3b8;
                            border-color:rgba(255,255,255,0.1);flex:1;
                        ">Bekor</button>
                        <button class="pm-btn" onclick="changePassword()" style="
                            background:#3b82f6;color:#fff;flex:1;
                        " onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                            💾 Saqlash
                        </button>
                    </div>
                </div>
            </div>

            <!-- Foydalanuvchilar tab -->
            <div id="pm-panel-users" style="display:none">
                <div id="pm-users-list"></div>
                <button class="pm-btn" onclick="showAddUserForm()" style="
                    width:100%;margin-top:12px;
                    background:rgba(16,185,129,0.1);color:#10b981;
                    border-color:rgba(16,185,129,0.25);
                " onmouseover="this.style.background='#10b981';this.style.color='#fff'"
                  onmouseout="this.style.background='rgba(16,185,129,0.1)';this.style.color='#10b981'">
                    ➕ Yangi foydalanuvchi qo'shish
                </button>
                <div id="pm-add-user-form" style="display:none;margin-top:14px;display:none">
                    <div style="display:flex;flex-direction:column;gap:10px">
                        <input class="pm-input" type="text" id="pm-new-username" placeholder="Login">
                        <input class="pm-input" type="password" id="pm-new-userpass" placeholder="Parol">
                        <input class="pm-input" type="password" id="pm-new-userconfirm" placeholder="Parolni tasdiqlang">
                        <div style="display:flex;gap:8px">
                            <button class="pm-btn" onclick="document.getElementById('pm-add-user-form').style.display='none'" style="
                                background:rgba(255,255,255,0.04);color:#94a3b8;
                                border-color:rgba(255,255,255,0.1);flex:1;
                            ">Bekor</button>
                            <button class="pm-btn" onclick="addNewUser()" style="
                                background:#3b82f6;color:#fff;flex:1;
                            " onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                                ✅ Qo'shish
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    overlay.addEventListener('click', e => { if (e.target === overlay) closeProfileModal(); });
    document.body.appendChild(overlay);
    renderUsersList();
}

function closeProfileModal() {
    const el = document.getElementById('profile-modal-overlay');
    if (el) el.remove();
}

function switchPmTab(tab) {
    document.getElementById('pm-panel-pass').style.display = tab === 'pass' ? 'block' : 'none';
    document.getElementById('pm-panel-users').style.display = tab === 'users' ? 'block' : 'none';
    document.getElementById('pm-tab-pass').className = 'pm-tab' + (tab === 'pass' ? ' active' : '');
    document.getElementById('pm-tab-users').className = 'pm-tab' + (tab === 'users' ? ' active' : '');
}

function changePassword() {
    const oldPass = document.getElementById('pm-old-pass').value;
    const newPass = document.getElementById('pm-new-pass').value;
    const confirmPass = document.getElementById('pm-confirm-pass').value;
    const currentUser = getCurrentUser();
    const errEl = document.getElementById('pm-error');
    const sucEl = document.getElementById('pm-success');
    errEl.style.display = 'none';
    sucEl.style.display = 'none';

    if (!checkLogin(currentUser, oldPass)) {
        errEl.textContent = 'Joriy parol noto\'g\'ri!';
        errEl.style.display = 'block';
        return;
    }
    if (newPass.length < 4) {
        errEl.textContent = 'Yangi parol kamida 4 ta belgi bo\'lishi kerak!';
        errEl.style.display = 'block';
        return;
    }
    if (newPass !== confirmPass) {
        errEl.textContent = 'Yangi parollar mos kelmadi!';
        errEl.style.display = 'block';
        return;
    }

    saveUser(currentUser, newPass);
    sucEl.textContent = '✅ Parol muvaffaqiyatli o\'zgartirildi!';
    sucEl.style.display = 'block';
    document.getElementById('pm-old-pass').value = '';
    document.getElementById('pm-new-pass').value = '';
    document.getElementById('pm-confirm-pass').value = '';
}

function renderUsersList() {
    const users = getUsers();
    const currentUser = getCurrentUser();
    const el = document.getElementById('pm-users-list');
    if (!el) return;

    const userKeys = Object.keys(users);
    el.innerHTML = userKeys.map(u => `
        <div style="
            background:rgba(255,255,255,0.03);
            border:1px solid rgba(255,255,255,0.07);
            border-radius:10px;padding:10px 14px;
            display:flex;align-items:center;gap:10px;
            margin-bottom:8px;
        ">
            <div style="
                width:32px;height:32px;border-radius:8px;
                background:${u === currentUser ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)'};
                color:${u === currentUser ? '#3b82f6' : '#64748b'};
                display:flex;align-items:center;justify-content:center;
                font-weight:700;font-size:13px;flex-shrink:0;
            ">${u[0].toUpperCase()}</div>
            <div style="flex:1;font-size:13px;color:#f1f5f9">${u} ${u === currentUser ? '<span style="font-size:11px;color:#3b82f6">(siz)</span>' : ''}</div>
            ${u !== currentUser ? `
            <button onclick="deleteUser('${u}')" style="
                background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);
                color:#ef4444;border-radius:6px;padding:4px 10px;
                font-size:12px;cursor:pointer;font-family:'Geist',-apple-system,sans-serif;
                transition:.15s;
            " onmouseover="this.style.background='#ef4444';this.style.color='#fff'"
              onmouseout="this.style.background='rgba(239,68,68,0.1)';this.style.color='#ef4444'">
                🗑
            </button>` : ''}
        </div>
    `).join('') || '<div style="color:#475569;font-size:13px;text-align:center;padding:16px">Foydalanuvchilar yo\'q</div>';
}

function showAddUserForm() {
    const form = document.getElementById('pm-add-user-form');
    if (form) form.style.display = 'block';
}

function addNewUser() {
    const username = document.getElementById('pm-new-username').value.trim();
    const password = document.getElementById('pm-new-userpass').value;
    const confirm = document.getElementById('pm-new-userconfirm').value;

    if (!username || !password) { alert('Login va parolni kiriting!'); return; }
    if (password.length < 4) { alert("Parol kamida 4 ta belgi bo'lishi kerak!"); return; }
    if (password !== confirm) { alert('Parollar mos kelmadi!'); return; }

    const users = getUsers();
    if (users[username.toLowerCase()]) { alert('Bu login allaqachon band!'); return; }

    saveUser(username, password);
    document.getElementById('pm-new-username').value = '';
    document.getElementById('pm-new-userpass').value = '';
    document.getElementById('pm-new-userconfirm').value = '';
    document.getElementById('pm-add-user-form').style.display = 'none';
    renderUsersList();
}

function deleteUser(username) {
    if (!confirm(`"${username}" foydalanuvchisini o'chirasizmi?`)) return;
    const users = getUsers();
    delete users[username.toLowerCase()];
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    renderUsersList();
}

// ===================== ASOSIY TEKSHIRISH =====================
(function() {
    if (!isSessionValid()) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', showLoginPage);
        } else {
            showLoginPage();
        }
    } else {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(addTopbarButtons, 500));
        } else {
            setTimeout(addTopbarButtons, 500);
        }
    }
})();