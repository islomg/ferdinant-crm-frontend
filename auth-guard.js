// ===================== AUTH GUARD =====================

const AUTH_KEY = 'crm_auth_token';
const AUTH_EXPIRY_KEY = 'crm_auth_expiry';
const AUTH_REMEMBER_KEY = 'crm_auth_remember';
const USERS_KEY = 'crm_users';
const CURRENT_USER_KEY = 'crm_current_user';
const PROFILE_KEY = 'crm_profile';
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

function getProfile() {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : {};
}

function saveProfile(data) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
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
            border-radius:24px;padding:36px;
            width:92%;max-width:400px;
            box-shadow:0 25px 60px rgba(0,0,0,0.6);
            animation:authIn .25s ease;
        ">
            <style>
                @keyframes authIn {
                    from{opacity:0;transform:scale(.95) translateY(10px)}
                    to{opacity:1;transform:none}
                }
                #auth-overlay input {
                    width:100%;background:rgba(0,0,0,0.3);
                    border:1px solid rgba(255,255,255,0.1);
                    border-radius:10px;color:#f1f5f9;
                    padding:11px 14px;font-size:14px;outline:none;
                    transition:border-color .2s,box-shadow .2s;
                    font-family:'Geist',-apple-system,sans-serif;
                    box-sizing:border-box;
                }
                #auth-overlay input:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,0.15); }
                #auth-overlay input::placeholder { color:#475569; }
                #auth-btn {
                    width:100%;background:#3b82f6;color:#fff;border:none;
                    border-radius:10px;padding:12px;font-size:14px;font-weight:600;
                    cursor:pointer;transition:all .18s;
                    font-family:'Geist',-apple-system,sans-serif;margin-top:4px;
                }
                #auth-btn:hover { background:#2563eb; transform:translateY(-1px); }
                #auth-toggle { background:none;border:none;color:#3b82f6;cursor:pointer;font-size:13px;font-family:'Geist',-apple-system,sans-serif;text-decoration:underline;padding:0; }
                .auth-label { display:block;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px; }
                .auth-error { background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:8px;padding:10px 14px;font-size:13px;color:#f87171;display:none;margin-bottom:12px; }
                .remember-row { display:flex;align-items:center;gap:8px;margin-bottom:16px;cursor:pointer; }
                .remember-row input[type=checkbox] { width:16px!important;height:16px;padding:0;cursor:pointer;accent-color:#3b82f6; }
                .remember-row span { font-size:13px;color:#94a3b8; }
            </style>

            <div style="text-align:center;margin-bottom:28px">
                <div style="font-size:22px;font-weight:700;color:#f1f5f9">Ferdinant<span style="color:#3b82f6">Edu</span>CRM</div>
                <div style="font-size:13px;color:#475569;margin-top:4px" id="auth-subtitle">${hasUsers ? 'Hisobingizga kiring' : 'Yangi hisob yarating'}</div>
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
                <button id="auth-btn" onclick="handleAuth()">${hasUsers ? '🔐 Kirish' : '✅ Hisob yaratish'}</button>
                <div style="text-align:center;margin-top:4px">
                    ${hasUsers ? `<span style="font-size:13px;color:#475569">Yangi hisob? </span><button id="auth-toggle" onclick="toggleAuthMode()">Ro'yxatdan o'tish</button>` : ''}
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
    const ci = document.getElementById('auth-confirm');
    const cl = document.getElementById('confirm-label');
    if (ci) ci.style.display = isLogin ? 'block' : 'none';
    if (cl) cl.style.display = isLogin ? 'block' : 'none';
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

// ===================== TOPBAR AVATAR =====================
function getAvatarHtml(size = 32, fontSize = 14) {
    const profile = getProfile();
    const currentUser = getCurrentUser();
    const initials = (profile.name || currentUser || 'U')[0].toUpperCase();
    if (profile.avatar) {
        return `<img src="${profile.avatar}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;">`;
    }
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#6366f1);display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;font-weight:700;color:#fff;flex-shrink:0;">${initials}</div>`;
}

function addTopbarButtons() {
    const actions = document.querySelector('.topbar-actions');
    if (!actions || document.getElementById('topbar-avatar-btn')) return;

    const profile = getProfile();
    const currentUser = getCurrentUser();

    // Avatar dropdown tugmasi
    const avatarWrap = document.createElement('div');
    avatarWrap.id = 'topbar-avatar-btn';
    avatarWrap.style.cssText = 'position:relative;cursor:pointer;';
    avatarWrap.innerHTML = `
        <div id="topbar-avatar-inner" style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:5px 10px 5px 6px;transition:.18s;"
            onmouseover="this.style.background='rgba(255,255,255,0.08)'"
            onmouseout="this.style.background='rgba(255,255,255,0.04)'">
            ${getAvatarHtml(28, 13)}
            <span style="font-size:13px;font-weight:600;color:#f1f5f9;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${profile.name || currentUser}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="color:#64748b"><path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
    `;
    avatarWrap.onclick = (e) => { e.stopPropagation(); toggleAvatarDropdown(); };
    actions.appendChild(avatarWrap);

    // Dropdown menu
    const dropdown = document.createElement('div');
    dropdown.id = 'avatar-dropdown';
    dropdown.style.cssText = `
        display:none;position:absolute;right:0;top:calc(100% + 8px);
        background:#0d1117;border:1px solid rgba(255,255,255,0.1);
        border-radius:14px;padding:6px;min-width:200px;
        box-shadow:0 12px 40px rgba(0,0,0,0.6);z-index:9999;
        font-family:'Geist',-apple-system,sans-serif;
        animation:authIn .15s ease;
    `;
    dropdown.innerHTML = `
        <style>
            @keyframes authIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:none} }
            .dd-profile-item {
                display:flex;align-items:center;gap:10px;padding:9px 12px;
                border-radius:9px;cursor:pointer;font-size:13px;color:#94a3b8;
                transition:.15s;border:none;background:none;width:100%;text-align:left;
                font-family:'Geist',-apple-system,sans-serif;
            }
            .dd-profile-item:hover { background:rgba(255,255,255,0.06);color:#f1f5f9; }
            .dd-profile-item.red:hover { background:rgba(239,68,68,0.1);color:#ef4444; }
        </style>
        <div style="padding:10px 12px 8px;border-bottom:1px solid rgba(255,255,255,0.06);margin-bottom:4px">
            <div style="font-size:13px;font-weight:600;color:#f1f5f9">${profile.name || currentUser}</div>
            <div style="font-size:11px;color:#475569;margin-top:1px">@${currentUser}</div>
        </div>
        <button class="dd-profile-item" onclick="closeAvatarDropdown();navigateToProfile()">
            <span style="font-size:15px">👤</span> Profil
        </button>
        <button class="dd-profile-item" onclick="closeAvatarDropdown();navigateToProfile()">
            <span style="font-size:15px">⚙️</span> Sozlamalar
        </button>
        <div style="border-top:1px solid rgba(255,255,255,0.06);margin:4px 0"></div>
        <button class="dd-profile-item red" onclick="closeAvatarDropdown();if(confirm('Tizimdan chiqasizmi?'))logout()">
            <span style="font-size:15px">🚪</span> Chiqish
        </button>
    `;
    avatarWrap.appendChild(dropdown);

    document.addEventListener('click', closeAvatarDropdown);
}

function toggleAvatarDropdown() {
    const dd = document.getElementById('avatar-dropdown');
    if (!dd) return;
    dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

function closeAvatarDropdown() {
    const dd = document.getElementById('avatar-dropdown');
    if (dd) dd.style.display = 'none';
}

function navigateToProfile() {
    // index.html dagi navigation bilan integratsiya
    if (typeof currentPage !== 'undefined') {
        currentPage = 'profile';
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const profileNav = document.querySelector('.nav-item[data-page="profile"]');
        if (profileNav) profileNav.classList.add('active');
        document.getElementById('topbar-title').textContent = 'Profil';
        if (typeof render === 'function') render();
    }
}

// ===================== PROFIL SAHIFASI =====================
function renderProfilePage() {
    const profile = getProfile();
    const currentUser = getCurrentUser();

    document.getElementById('content').innerHTML = `
        <style>
            .profile-page { max-width:600px;margin:0 auto; }
            .profile-section {
                background:var(--card);border:1px solid var(--border);
                border-radius:var(--radius-lg);padding:24px;margin-bottom:16px;
            }
            .profile-section-title {
                font-size:13px;font-weight:600;color:var(--text2);
                text-transform:uppercase;letter-spacing:.06em;
                margin-bottom:16px;display:flex;align-items:center;gap:8px;
            }
            .profile-section-title::before {
                content:'';width:3px;height:14px;background:var(--accent);
                border-radius:2px;display:inline-block;
            }
            .profile-input-wrap { margin-bottom:14px; }
            .profile-input-wrap label {
                display:block;font-size:11px;font-weight:600;color:var(--text2);
                text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;
            }
            .profile-input-wrap input, .profile-input-wrap select {
                width:100%;background:rgba(0,0,0,0.3);
                border:1px solid var(--border2);border-radius:8px;
                color:var(--text1);padding:10px 14px;font-size:13px;outline:none;
                transition:.18s;font-family:var(--font);box-sizing:border-box;
            }
            .profile-input-wrap input:focus, .profile-input-wrap select:focus {
                border-color:var(--accent);box-shadow:0 0 0 3px rgba(59,130,246,0.12);
            }
            .profile-grid { display:grid;grid-template-columns:1fr 1fr;gap:14px; }
            @media(max-width:480px){ .profile-grid { grid-template-columns:1fr; } }
            .pm-error { background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:8px;padding:10px 14px;font-size:13px;color:#f87171;display:none;margin-bottom:12px; }
            .pm-success { background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);border-radius:8px;padding:10px 14px;font-size:13px;color:#34d399;display:none;margin-bottom:12px; }
        </style>

        <div class="profile-page">
            <!-- Avatar va ism -->
            <div class="profile-section">
                <div class="profile-section-title">Shaxsiy ma'lumotlar</div>
                <div style="display:flex;align-items:center;gap:20px;margin-bottom:20px">
                    <div style="position:relative;cursor:pointer;" onclick="document.getElementById('avatar-upload').click()">
                        <div id="profile-avatar-preview" style="width:72px;height:72px;border-radius:16px;background:linear-gradient(135deg,#3b82f6,#6366f1);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:#fff;overflow:hidden;">
                            ${profile.avatar ? `<img src="${profile.avatar}" style="width:100%;height:100%;object-fit:cover;">` : (profile.name || currentUser || 'U')[0].toUpperCase()}
                        </div>
                        <div style="position:absolute;bottom:-4px;right:-4px;width:22px;height:22px;background:var(--accent);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;">📷</div>
                        <input type="file" id="avatar-upload" accept="image/*" style="display:none" onchange="handleAvatarUpload(event)">
                    </div>
                    <div>
                        <div style="font-size:16px;font-weight:700;color:var(--text1)">${profile.name || currentUser}</div>
                        <div style="font-size:13px;color:var(--text2)">@${currentUser} · Administrator</div>
                        <div style="font-size:11px;color:var(--text3);margin-top:2px">Rasmga bosing — o'zgartirish</div>
                    </div>
                </div>

                <div class="profile-grid">
                    <div class="profile-input-wrap">
                        <label>Ism familiya</label>
                        <input type="text" id="pf-name" value="${profile.name || ''}" placeholder="To'liq ism">
                    </div>
                    <div class="profile-input-wrap">
                        <label>Telefon</label>
                        <input type="text" id="pf-phone" value="${profile.phone || ''}" placeholder="+998 90 000 00 00">
                    </div>
                </div>
                <div class="profile-input-wrap">
                    <label>Manzil</label>
                    <input type="text" id="pf-address" value="${profile.address || ''}" placeholder="Shahar, tuman">
                </div>

                <button onclick="saveProfileData()" style="
                    width:100%;background:var(--accent);color:#fff;border:none;
                    border-radius:10px;padding:11px;font-size:14px;font-weight:600;
                    cursor:pointer;transition:.18s;font-family:var(--font);margin-top:4px;
                " onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='var(--accent)'">
                    💾 Saqlash
                </button>
                <div class="pm-success" id="pf-success" style="margin-top:10px;margin-bottom:0"></div>
            </div>

            <!-- Parol o'zgartirish -->
            <div class="profile-section">
                <div class="profile-section-title">Parol o'zgartirish</div>
                <div class="pm-error" id="pf-error"></div>
                <div class="pm-success" id="pf-pass-success"></div>
                <div class="profile-input-wrap">
                    <label>Joriy parol</label>
                    <input type="password" id="pf-old-pass" placeholder="Joriy parolni kiriting">
                </div>
                <div class="profile-grid">
                    <div class="profile-input-wrap">
                        <label>Yangi parol</label>
                        <input type="password" id="pf-new-pass" placeholder="Kamida 4 belgi">
                    </div>
                    <div class="profile-input-wrap">
                        <label>Tasdiqlang</label>
                        <input type="password" id="pf-confirm-pass" placeholder="Qaytaring">
                    </div>
                </div>
                <button onclick="changePasswordFromPage()" style="
                    width:100%;background:rgba(59,130,246,0.1);color:var(--accent);
                    border:1px solid rgba(59,130,246,0.25);border-radius:10px;padding:11px;
                    font-size:14px;font-weight:600;cursor:pointer;transition:.18s;font-family:var(--font);
                " onmouseover="this.style.background='var(--accent)';this.style.color='#fff'"
                  onmouseout="this.style.background='rgba(59,130,246,0.1)';this.style.color='var(--accent)'">
                    🔑 Parolni o'zgartirish
                </button>
            </div>

            <!-- Foydalanuvchilar -->
            <div class="profile-section">
                <div class="profile-section-title">Foydalanuvchilar</div>
                <div id="pf-users-list"></div>
                <button onclick="toggleAddUserForm()" style="
                    width:100%;background:rgba(16,185,129,0.1);color:#10b981;
                    border:1px solid rgba(16,185,129,0.25);border-radius:10px;padding:10px;
                    font-size:13px;font-weight:600;cursor:pointer;transition:.18s;font-family:var(--font);margin-top:8px;
                " onmouseover="this.style.background='#10b981';this.style.color='#fff'"
                  onmouseout="this.style.background='rgba(16,185,129,0.1)';this.style.color='#10b981'">
                    ➕ Yangi foydalanuvchi
                </button>
                <div id="pf-add-user-form" style="display:none;margin-top:14px;background:rgba(0,0,0,0.2);border-radius:10px;padding:14px">
                    <div class="profile-grid">
                        <div class="profile-input-wrap" style="margin-bottom:0">
                            <label>Login</label>
                            <input type="text" id="pf-new-login" placeholder="Foydalanuvchi nomi">
                        </div>
                        <div class="profile-input-wrap" style="margin-bottom:0">
                            <label>Parol</label>
                            <input type="password" id="pf-new-pass2" placeholder="Parol">
                        </div>
                    </div>
                    <div style="margin-top:10px">
                        <div class="profile-input-wrap" style="margin-bottom:10px">
                            <label>Parolni tasdiqlang</label>
                            <input type="password" id="pf-new-confirm2" placeholder="Qaytaring">
                        </div>
                        <div style="display:flex;gap:8px">
                            <button onclick="toggleAddUserForm()" style="flex:1;background:rgba(255,255,255,0.04);color:#94a3b8;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font);">Bekor</button>
                            <button onclick="addNewUserFromPage()" style="flex:1;background:var(--accent);color:#fff;border:none;border-radius:8px;padding:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font);">✅ Qo'shish</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Chiqish -->
            <div class="profile-section" style="border-color:rgba(239,68,68,0.15)">
                <div class="profile-section-title" style="color:#ef4444">Tizimdan chiqish</div>
                <p style="font-size:13px;color:var(--text2);margin-bottom:14px">Tizimdan chiqsangiz, qayta kirishda login va parol so'raladi.</p>
                <button onclick="if(confirm('Tizimdan chiqasizmi?'))logout()" style="
                    background:rgba(239,68,68,0.1);color:#ef4444;
                    border:1px solid rgba(239,68,68,0.25);border-radius:10px;padding:10px 24px;
                    font-size:13px;font-weight:600;cursor:pointer;transition:.18s;font-family:var(--font);
                " onmouseover="this.style.background='#ef4444';this.style.color='#fff'"
                  onmouseout="this.style.background='rgba(239,68,68,0.1)';this.style.color='#ef4444'">
                    🚪 Chiqish
                </button>
            </div>
        </div>
    `;

    renderUsersListPage();
}

function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const profile = getProfile();
        profile.avatar = e.target.result;
        saveProfile(profile);
        // Preview yangilash
        const preview = document.getElementById('profile-avatar-preview');
        if (preview) preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
        // Topbar avatar yangilash
        updateTopbarAvatar();
    };
    reader.readAsDataURL(file);
}

function updateTopbarAvatar() {
    const inner = document.getElementById('topbar-avatar-inner');
    if (!inner) return;
    const profile = getProfile();
    const currentUser = getCurrentUser();
    inner.innerHTML = `
        ${getAvatarHtml(28, 13)}
        <span style="font-size:13px;font-weight:600;color:#f1f5f9;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${profile.name || currentUser}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="color:#64748b"><path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
    `;
}

function saveProfileData() {
    const profile = getProfile();
    profile.name = document.getElementById('pf-name').value.trim();
    profile.phone = document.getElementById('pf-phone').value.trim();
    profile.address = document.getElementById('pf-address').value.trim();
    saveProfile(profile);
    updateTopbarAvatar();
    const suc = document.getElementById('pf-success');
    if (suc) { suc.textContent = "✅ Ma'lumotlar saqlandi!"; suc.style.display = 'block'; setTimeout(() => suc.style.display = 'none', 3000); }
}

function changePasswordFromPage() {
    const oldPass = document.getElementById('pf-old-pass').value;
    const newPass = document.getElementById('pf-new-pass').value;
    const confirmPass = document.getElementById('pf-confirm-pass').value;
    const currentUser = getCurrentUser();
    const errEl = document.getElementById('pf-error');
    const sucEl = document.getElementById('pf-pass-success');
    errEl.style.display = 'none'; sucEl.style.display = 'none';

    if (!checkLogin(currentUser, oldPass)) { errEl.textContent = "Joriy parol noto'g'ri!"; errEl.style.display = 'block'; return; }
    if (newPass.length < 4) { errEl.textContent = "Yangi parol kamida 4 ta belgi bo'lishi kerak!"; errEl.style.display = 'block'; return; }
    if (newPass !== confirmPass) { errEl.textContent = "Yangi parollar mos kelmadi!"; errEl.style.display = 'block'; return; }

    saveUser(currentUser, newPass);
    sucEl.textContent = '✅ Parol muvaffaqiyatli o\'zgartirildi!';
    sucEl.style.display = 'block';
    document.getElementById('pf-old-pass').value = '';
    document.getElementById('pf-new-pass').value = '';
    document.getElementById('pf-confirm-pass').value = '';
}

function renderUsersListPage() {
    const users = getUsers();
    const currentUser = getCurrentUser();
    const el = document.getElementById('pf-users-list');
    if (!el) return;
    const userKeys = Object.keys(users);
    el.innerHTML = userKeys.map(u => `
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <div style="width:32px;height:32px;border-radius:8px;background:${u === currentUser ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)'};color:${u === currentUser ? '#3b82f6' : '#64748b'};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">${u[0].toUpperCase()}</div>
            <div style="flex:1;font-size:13px;color:#f1f5f9">${u} ${u === currentUser ? '<span style="font-size:11px;color:#3b82f6">(siz)</span>' : ''}</div>
            ${u !== currentUser ? `<button onclick="deleteUserFromPage('${u}')" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#ef4444;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;font-family:var(--font);transition:.15s;" onmouseover="this.style.background='#ef4444';this.style.color='#fff'" onmouseout="this.style.background='rgba(239,68,68,0.1)';this.style.color='#ef4444'">🗑</button>` : ''}
        </div>
    `).join('') || '<div style="color:#475569;font-size:13px;padding:8px">Foydalanuvchilar yo\'q</div>';
}

function toggleAddUserForm() {
    const form = document.getElementById('pf-add-user-form');
    if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

function addNewUserFromPage() {
    const username = document.getElementById('pf-new-login').value.trim();
    const password = document.getElementById('pf-new-pass2').value;
    const confirm = document.getElementById('pf-new-confirm2').value;
    if (!username || !password) { alert('Login va parolni kiriting!'); return; }
    if (password.length < 4) { alert("Parol kamida 4 ta belgi bo'lishi kerak!"); return; }
    if (password !== confirm) { alert('Parollar mos kelmadi!'); return; }
    const users = getUsers();
    if (users[username.toLowerCase()]) { alert('Bu login allaqachon band!'); return; }
    saveUser(username, password);
    document.getElementById('pf-new-login').value = '';
    document.getElementById('pf-new-pass2').value = '';
    document.getElementById('pf-new-confirm2').value = '';
    toggleAddUserForm();
    renderUsersListPage();
}

function deleteUserFromPage(username) {
    if (!confirm(`"${username}" foydalanuvchisini o'chirasizmi?`)) return;
    const users = getUsers();
    delete users[username.toLowerCase()];
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    renderUsersListPage();
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