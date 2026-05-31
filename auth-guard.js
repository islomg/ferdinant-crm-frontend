// ===================== AUTH GUARD =====================
// Foydalanuvchilar ma'lumotlari (localStorage'da saqlanadi)
// Parol oddiy hash bilan saqlanadi

const AUTH_KEY = 'crm_auth_token';
const AUTH_EXPIRY_KEY = 'crm_auth_expiry';
const AUTH_REMEMBER_KEY = 'crm_auth_remember';
const USERS_KEY = 'crm_users';
const SESSION_HOURS = 12; // 12 soat

// Oddiy hash funksiyasi
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}

// Foydalanuvchilarni olish
function getUsers() {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : {};
}

// Foydalanuvchi saqlash
function saveUser(username, password) {
    const users = getUsers();
    users[username.toLowerCase()] = simpleHash(password);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// Login tekshirish
function checkLogin(username, password) {
    const users = getUsers();
    const key = username.toLowerCase();
    return users[key] && users[key] === simpleHash(password);
}

// Session tekshirish
function isSessionValid() {
    const token = localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY);
    const expiry = localStorage.getItem(AUTH_EXPIRY_KEY) || sessionStorage.getItem(AUTH_EXPIRY_KEY);
    if (!token || !expiry) return false;
    return new Date().getTime() < parseInt(expiry);
}

// Session yaratish
function createSession(remember) {
    const token = Math.random().toString(36).substring(2);
    const expiry = new Date().getTime() + (SESSION_HOURS * 60 * 60 * 1000);
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(AUTH_KEY, token);
    storage.setItem(AUTH_EXPIRY_KEY, expiry.toString());
    if (remember) {
        localStorage.setItem(AUTH_REMEMBER_KEY, 'true');
    }
}

// Chiqish
function logout() {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_EXPIRY_KEY);
    localStorage.removeItem(AUTH_REMEMBER_KEY);
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(AUTH_EXPIRY_KEY);
    location.reload();
}

// Login sahifasini ko'rsatish
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
                    width:100%;
                    background:#3b82f6;
                    color:#fff;
                    border:none;
                    border-radius:10px;
                    padding:12px;
                    font-size:14px;
                    font-weight:600;
                    cursor:pointer;
                    transition:all .18s;
                    font-family:'Geist',-apple-system,sans-serif;
                    margin-top:4px;
                }
                #auth-btn:hover { background:#2563eb; transform:translateY(-1px); }
                #auth-btn:active { transform:scale(.98); }
                #auth-toggle {
                    background:none;border:none;color:#3b82f6;
                    cursor:pointer;font-size:13px;font-family:'Geist',-apple-system,sans-serif;
                    text-decoration:underline;padding:0;
                }
                #auth-toggle:hover { color:#60a5fa; }
                .auth-label {
                    display:block;font-size:11px;font-weight:600;
                    color:#64748b;text-transform:uppercase;
                    letter-spacing:.05em;margin-bottom:6px;
                }
                .auth-error {
                    background:rgba(239,68,68,0.1);
                    border:1px solid rgba(239,68,68,0.25);
                    border-radius:8px;padding:10px 14px;
                    font-size:13px;color:#f87171;
                    display:none;margin-bottom:12px;
                }
                .remember-row {
                    display:flex;align-items:center;gap:8px;
                    margin-bottom:16px;cursor:pointer;
                }
                .remember-row input[type=checkbox] {
                    width:16px!important;height:16px;padding:0;
                    cursor:pointer;accent-color:#3b82f6;
                }
                .remember-row span { font-size:13px;color:#94a3b8; }
            </style>

            <!-- Logo -->
            <div style="text-align:center;margin-bottom:28px">
                <div style="font-size:22px;font-weight:700;color:#f1f5f9">
                    Ferdinant<span style="color:#3b82f6">Edu</span>CRM
                </div>
                <div style="font-size:13px;color:#475569;margin-top:4px" id="auth-subtitle">
                    ${hasUsers ? 'Hisobingizga kiring' : 'Yangi hisob yarating'}
                </div>
            </div>

            <!-- Error -->
            <div class="auth-error" id="auth-error"></div>

            <!-- Form -->
            <div style="display:flex;flex-direction:column;gap:14px">
                <div>
                    <label class="auth-label">Login</label>
                    <input type="text" id="auth-username" placeholder="Foydalanuvchi nomi" autocomplete="username">
                </div>
                <div style="position:relative">
                    <label class="auth-label">Parol</label>
                    <input type="password" id="auth-password" placeholder="Parol" autocomplete="current-password">
                    <span onclick="toggleAuthPass()" style="
                        position:absolute;right:12px;bottom:11px;
                        cursor:pointer;color:#475569;font-size:14px;
                    ">👁</span>
                </div>
                ${hasUsers ? `
                <div>
                    <label class="auth-label" id="confirm-label" style="display:none">Parolni tasdiqlang</label>
                    <input type="password" id="auth-confirm" placeholder="Parolni tasdiqlang" autocomplete="new-password" style="display:none">
                </div>` : `
                <div>
                    <label class="auth-label">Parolni tasdiqlang</label>
                    <input type="password" id="auth-confirm" placeholder="Parolni tasdiqlang" autocomplete="new-password">
                </div>`}

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

    // Enter tugmasi
    overlay.addEventListener('keydown', e => {
        if (e.key === 'Enter') handleAuth();
    });

    // Agar foydalanuvchilar yo'q bo'lsa — ro'yxatdan o'tish rejimi
    if (!hasUsers) {
        window._authMode = 'register';
    } else {
        window._authMode = 'login';
    }
}

function toggleAuthPass() {
    const inp = document.getElementById('auth-password');
    inp.type = inp.type === 'password' ? 'text' : 'password';
}

function toggleAuthMode() {
    const isLogin = window._authMode === 'login';
    window._authMode = isLogin ? 'register' : 'login';

    const subtitle = document.getElementById('auth-subtitle');
    const btn = document.getElementById('auth-btn');
    const toggle = document.getElementById('auth-toggle');
    const confirmInput = document.getElementById('auth-confirm');
    const confirmLabel = document.getElementById('confirm-label');

    if (window._authMode === 'register') {
        subtitle.textContent = 'Yangi hisob yarating';
        btn.textContent = '✅ Hisob yaratish';
        if (toggle) toggle.textContent = 'Kirish';
        if (confirmInput) { confirmInput.style.display = 'block'; }
        if (confirmLabel) { confirmLabel.style.display = 'block'; }
    } else {
        subtitle.textContent = 'Hisobingizga kiring';
        btn.textContent = '🔐 Kirish';
        if (toggle) toggle.textContent = "Ro'yxatdan o'tish";
        if (confirmInput) { confirmInput.style.display = 'none'; }
        if (confirmLabel) { confirmLabel.style.display = 'none'; }
    }

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

    if (!username || !password) {
        showAuthError('Login va parolni kiriting!');
        return;
    }

    if (window._authMode === 'register') {
        const confirm = document.getElementById('auth-confirm').value;
        if (password !== confirm) {
            showAuthError('Parollar mos kelmadi!');
            return;
        }
        if (password.length < 4) {
            showAuthError('Parol kamida 4 ta belgi bo\'lishi kerak!');
            return;
        }
        const users = getUsers();
        if (users[username.toLowerCase()]) {
            showAuthError('Bu login allaqachon band!');
            return;
        }
        saveUser(username, password);
        createSession(remember);
        document.getElementById('auth-overlay').remove();
        document.documentElement.style.overflow = '';
    } else {
        if (!checkLogin(username, password)) {
            showAuthError('Login yoki parol noto\'g\'ri!');
            return;
        }
        createSession(remember);
        document.getElementById('auth-overlay').remove();
        document.documentElement.style.overflow = '';
    }
}

// Logout tugmasini topbarga qo'shish
function addLogoutButton() {
    const actions = document.querySelector('.topbar-actions');
    if (actions && !document.getElementById('logout-btn')) {
        const btn = document.createElement('button');
        btn.id = 'logout-btn';
        btn.title = 'Chiqish';
        btn.style.cssText = `
            background:rgba(239,68,68,0.1);
            border:1px solid rgba(239,68,68,0.2);
            color:#ef4444;
            border-radius:8px;
            padding:6px 12px;
            font-size:12px;
            cursor:pointer;
            font-family:'Geist',-apple-system,sans-serif;
            transition:.18s;
        `;
        btn.innerHTML = '🚪 Chiqish';
        btn.onmouseover = () => { btn.style.background = '#ef4444'; btn.style.color = '#fff'; };
        btn.onmouseout = () => { btn.style.background = 'rgba(239,68,68,0.1)'; btn.style.color = '#ef4444'; };
        btn.onclick = () => { if (confirm('Tizimdan chiqasizmi?')) logout(); };
        actions.appendChild(btn);
    }
}

// ===================== ASOSIY TEKSHIRISH =====================
(function() {
    if (!isSessionValid()) {
        document.addEventListener('DOMContentLoaded', () => {
            showLoginPage();
        });
        // Agar DOM allaqachon yuklangan bo'lsa
        if (document.readyState !== 'loading') {
            showLoginPage();
        }
    } else {
        // Session valid — logout tugmasini qo'shish
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(addLogoutButton, 500);
        });
        if (document.readyState !== 'loading') {
            setTimeout(addLogoutButton, 500);
        }
    }
})();