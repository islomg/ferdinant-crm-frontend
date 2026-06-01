// ===================== AUTH GUARD — BACKEND VERSION =====================
const API_BASE = 'https://web-production-1275f.up.railway.app/api';
const AUTH_TOKEN_KEY = 'crm_auth_token';
const DEVICE_ID_KEY = 'crm_device_id';
const CURRENT_USER_KEY = 'crm_current_user_data';

// ===================== DEVICE ID =====================
function getDeviceId() {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        id = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
}

// ===================== TOKEN =====================
function getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY) || '';
}
function setToken(token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
}
function clearToken() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
}
function isSessionValid() {
    return !!getToken();
}

// ===================== CURRENT USER =====================
function getCurrentUserData() {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
}
function setCurrentUserData(data) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data));
}
function getCurrentUser() {
    const data = getCurrentUserData();
    return data ? data.username : '';
}
function getProfile() {
    const data = getCurrentUserData();
    if (!data) return {};
    return {
        name: data.name || '',
        phone: data.phone || '',
        address: data.address || '',
        avatar: data.avatar || ''
    };
}

// ===================== API CALL =====================
async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${endpoint}`, opts);
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
}

// ===================== LOGOUT =====================
async function logout() {
    try { await apiCall('/auth/logout/', 'POST'); } catch (e) {}
    clearToken();
    location.reload();
}

// ===================== TELEGRAM OTP =====================
const TG_BOT_TOKEN = '7931384445:AAEipt-qUn0iKVSwc3yxDP-vK3s_doWhFeU';
const TG_CHAT_IDS = ['5536917208', '5538148203'];
let _otpCode = null;
let _otpExpiry = null;

async function sendTelegramOtp(username) {
    _otpCode = String(Math.floor(1000 + Math.random() * 9000));
    _otpExpiry = Date.now() + 5 * 60 * 1000;
    const text = `🔐 *FerdinantEduCRM — Tasdiqlash kodi*\n\nFoydalanuvchi: \`${username}\`\nKod: *${_otpCode}*\n\n⏱ Kod 5 daqiqa ichida amal qiladi.`;
    let ok = false;
    for (const chatId of TG_CHAT_IDS) {
        try {
            const res = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
            });
            const d = await res.json();
            if (d.ok) ok = true;
        } catch (e) {}
    }
    return ok;
}

function verifyOtp(input) {
    if (!_otpCode || !_otpExpiry) return 'nocode';
    if (Date.now() > _otpExpiry) return 'expired';
    if (input.trim() === _otpCode) return 'ok';
    return 'wrong';
}

// ===================== LOGIN SAHIFASI =====================
function showLoginPage() {
    document.documentElement.style.overflow = 'hidden';
    // Maxsus endpoint orqali foydalanuvchilar borligini tekshirish
    checkHasUsers().then(hasUsers => {
        renderLoginPage(hasUsers);
    });
}

async function checkHasUsers() {
    try {
        const res = await fetch(`${API_BASE}/auth/check-users/`);
        if (!res.ok) return false;
        const data = await res.json();
        return data.has_users === true;
    } catch (e) {
        // Tarmoq xatosi — birinchi foydalanuvchi sifatida davom etish
        return false;
    }
}

function renderLoginPage(hasUsers) {
    const existing = document.getElementById('auth-overlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'auth-overlay';
    overlay.style.cssText = `position:fixed;inset:0;z-index:99999;background:#06080f;display:flex;align-items:center;justify-content:center;font-family:'Geist',-apple-system,sans-serif;`;
    overlay.innerHTML = `
        <div id="auth-card" style="background:rgba(17,24,39,0.95);border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:36px;width:92%;max-width:400px;box-shadow:0 25px 60px rgba(0,0,0,0.6);animation:authIn .25s ease;">
            <style>
                @keyframes authIn { from{opacity:0;transform:scale(.95) translateY(10px)} to{opacity:1;transform:none} }
                #auth-overlay input[type=text], #auth-overlay input[type=password], #auth-overlay input[type=number] {
                    width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#f1f5f9;padding:11px 40px 11px 14px;font-size:14px;outline:none;transition:border-color .2s,box-shadow .2s;font-family:'Geist',-apple-system,sans-serif;box-sizing:border-box;
                }
                #auth-overlay input:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,0.15); }
                #auth-overlay input::placeholder { color:#475569; }
                #auth-btn { width:100%;background:#3b82f6;color:#fff;border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:600;cursor:pointer;transition:all .18s;font-family:'Geist',-apple-system,sans-serif;margin-top:4px;display:flex;align-items:center;justify-content:center;gap:8px; }
                #auth-btn:hover { background:#2563eb; transform:translateY(-1px); }
                #auth-btn:disabled { background:#1e3a5f;cursor:not-allowed;transform:none;opacity:.7; }
                .auth-toggle-btn { background:none;border:none;color:#3b82f6;cursor:pointer;font-size:13px;font-family:'Geist',-apple-system,sans-serif;text-decoration:underline;padding:0; }
                .auth-label { display:block;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px; }
                .auth-error { background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:8px;padding:10px 14px;font-size:13px;color:#f87171;display:none;margin-bottom:12px;align-items:center;gap:8px; }
                .auth-info { background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:8px;padding:10px 14px;font-size:13px;color:#93c5fd;display:none;margin-bottom:12px;align-items:center;gap:8px; }
                #otp-input { text-align:center;font-size:28px !important;font-weight:700 !important;letter-spacing:12px;padding:14px !important; }
                .otp-timer { font-size:12px;color:#475569;text-align:center;margin-top:6px; }
                .otp-timer span { color:#3b82f6;font-weight:600; }
            </style>
            <div style="text-align:center;margin-bottom:28px">
                <div style="font-size:22px;font-weight:700;color:#f1f5f9">Ferdinant<span style="color:#3b82f6">Edu</span>CRM</div>
                <div style="font-size:13px;color:#475569;margin-top:4px" id="auth-subtitle">${hasUsers ? 'Hisobingizga kiring' : 'Yangi hisob yarating'}</div>
            </div>
            <div class="auth-error" id="auth-error"><i class="fas fa-exclamation-circle"></i><span id="auth-error-text"></span></div>
            <div class="auth-info" id="auth-info"><i class="fas fa-info-circle"></i><span id="auth-info-text"></span></div>
            <!-- LOGIN/REGISTER FORMASI -->
            <div id="auth-manual-form" style="display:flex;flex-direction:column;gap:14px">
                <div>
                    <label class="auth-label">Login</label>
                    <div style="position:relative">
                        <input type="text" id="auth-username" placeholder="Foydalanuvchi nomi" autocomplete="username">
                        <i class="fas fa-user" style="position:absolute;right:13px;top:50%;transform:translateY(-50%);color:#475569;font-size:13px;pointer-events:none"></i>
                    </div>
                </div>
                <div>
                    <label class="auth-label">Parol</label>
                    <div style="position:relative">
                        <input type="password" id="auth-password" placeholder="Parol" autocomplete="current-password">
                        <i class="fas fa-eye" id="auth-eye-icon" onclick="toggleAuthPass()" style="position:absolute;right:13px;top:50%;transform:translateY(-50%);color:#475569;font-size:13px;cursor:pointer"></i>
                    </div>
                </div>
                <div id="auth-confirm-wrap" style="display:${hasUsers ? 'none' : 'block'}">
                    <label class="auth-label">Parolni tasdiqlang</label>
                    <div style="position:relative">
                        <input type="password" id="auth-confirm" placeholder="Parolni tasdiqlang" autocomplete="new-password">
                        <i class="fas fa-lock" style="position:absolute;right:13px;top:50%;transform:translateY(-50%);color:#475569;font-size:13px;pointer-events:none"></i>
                    </div>
                </div>
                <button id="auth-btn" onclick="handleAuth()">
                    <i class="fas fa-lock" id="auth-btn-icon"></i>
                    <span id="auth-btn-text">${hasUsers ? 'Kirish' : 'Hisob yaratish'}</span>
                </button>
                <div style="text-align:center;margin-top:4px">
                    ${hasUsers
                        ? `<span style="font-size:13px;color:#475569">Yangi hisob? </span><button class="auth-toggle-btn" onclick="toggleAuthMode()">Ro'yxatdan o'tish</button>`
                        : `<span style="font-size:13px;color:#475569">Hisob bor? </span><button class="auth-toggle-btn" onclick="toggleAuthMode()">Kirish</button>`
                    }
                </div>
            </div>
            <!-- OTP FORMASI -->
            <div id="auth-otp-form" style="display:none;flex-direction:column;gap:16px">
                <div style="text-align:center;margin-bottom:4px">
                    <div style="width:56px;height:56px;border-radius:16px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.25);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
                        <i class="fab fa-telegram" style="font-size:26px;color:#3b82f6"></i>
                    </div>
                    <div style="font-size:14px;color:#94a3b8;line-height:1.5">
                        Telegramga <span style="color:#f1f5f9;font-weight:600">4 xonali kod</span> yuborildi.<br>Kodni kiriting:
                    </div>
                </div>
                <div>
                    <label class="auth-label" style="text-align:center">Tasdiqlash kodi</label>
                    <input type="number" id="otp-input" placeholder="0000" oninput="if(this.value.length>4)this.value=this.value.slice(0,4)">
                    <div class="otp-timer">Kod <span id="otp-countdown">5:00</span> da eskiradi</div>
                </div>
                <button onclick="handleOtpVerify()" style="width:100%;background:#3b82f6;color:#fff;border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Geist',-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;gap:8px;">
                    <i class="fas fa-check-circle"></i> Tasdiqlash
                </button>
                <div style="text-align:center">
                    <button id="otp-resend-btn" onclick="handleOtpResend()" disabled style="background:none;border:none;color:#475569;font-size:12px;cursor:pointer;font-family:'Geist',-apple-system,sans-serif;text-decoration:underline;padding:0;">
                        Kodni qayta yuborish (<span id="resend-countdown">30</span>s)
                    </button>
                </div>
                <div style="text-align:center">
                    <button onclick="cancelOtp()" style="background:none;border:none;color:#475569;font-size:12px;cursor:pointer;font-family:'Geist',-apple-system,sans-serif;text-decoration:underline;padding:0;">
                        <i class="fas fa-arrow-left"></i> Orqaga
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('keydown', e => {
        const otpForm = document.getElementById('auth-otp-form');
        if (e.key === 'Enter') {
            if (otpForm && otpForm.style.display !== 'none') handleOtpVerify();
            else handleAuth();
        }
    });
    window._authMode = hasUsers ? 'login' : 'register';
}

// ===================== OTP HISOBLAGICH =====================
let _otpCountdownInterval = null;
let _resendCountdownInterval = null;
let _pendingUsername = null;
let _pendingToken = null;

function startOtpCountdown() {
    let seconds = 5 * 60;
    clearInterval(_otpCountdownInterval);
    _otpCountdownInterval = setInterval(() => {
        seconds--;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        const el = document.getElementById('otp-countdown');
        if (el) el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
        if (seconds <= 0) { clearInterval(_otpCountdownInterval); showAuthError('Kod vaqti tugadi. Qayta yuboring.'); }
    }, 1000);
}

function startResendCountdown(seconds = 30) {
    const btn = document.getElementById('otp-resend-btn');
    const countEl = document.getElementById('resend-countdown');
    if (btn) btn.disabled = true;
    let s = seconds;
    clearInterval(_resendCountdownInterval);
    _resendCountdownInterval = setInterval(() => {
        s--;
        if (countEl) countEl.textContent = s;
        if (s <= 0) {
            clearInterval(_resendCountdownInterval);
            if (btn) { btn.disabled = false; btn.innerHTML = 'Kodni qayta yuborish'; }
        }
    }, 1000);
}

async function showOtpStep(username, token) {
    _pendingUsername = username;
    _pendingToken = token;
    const manualForm = document.getElementById('auth-manual-form');
    const otpForm = document.getElementById('auth-otp-form');
    if (manualForm) manualForm.style.display = 'none';
    if (otpForm) otpForm.style.display = 'flex';
    document.getElementById('auth-subtitle').textContent = 'Telegram tasdiqlash';
    document.getElementById('auth-error').style.display = 'none';
    showAuthInfo('Telegram botga kod yuborilmoqda...');
    const ok = await sendTelegramOtp(username);
    document.getElementById('auth-info').style.display = 'none';
    if (ok) {
        startOtpCountdown();
        startResendCountdown(30);
        setTimeout(() => { const inp = document.getElementById('otp-input'); if (inp) inp.focus(); }, 100);
    } else {
        showAuthError('Telegram botga ulanishda xato! Administratorga murojaat qiling.');
    }
}

async function handleOtpVerify() {
    const input = document.getElementById('otp-input');
    if (!input) return;
    const val = input.value.trim();
    if (val.length !== 4) { showAuthError('4 xonali kodni kiriting!'); return; }
    const result = verifyOtp(val);
    if (result === 'ok') {
        clearInterval(_otpCountdownInterval);
        clearInterval(_resendCountdownInterval);
        _otpCode = null;

        // Tokenni vaqtincha saqlash — trust-device chaqirish uchun kerak
        setToken(_pendingToken);

        // Qurilmani ishonchli qilish — keyingi kirishda OTP so'ralmasin
        await apiCall('/auth/trust-device/', 'POST', { device_id: getDeviceId() });

        // Foydalanuvchi ma'lumotlarini olish
        const meRes = await apiCall('/auth/me/');
        if (meRes.ok) setCurrentUserData(meRes.data);

        // Muvaffaqiyat animatsiyasi
        const card = document.getElementById('auth-card');
        if (card) {
            card.innerHTML = `
                <div style="text-align:center;padding:20px 0">
                    <div style="width:64px;height:64px;border-radius:50%;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                        <i class="fas fa-check" style="font-size:28px;color:#10b981"></i>
                    </div>
                    <div style="font-size:16px;font-weight:700;color:#f1f5f9;margin-bottom:6px">Xush kelibsiz!</div>
                    <div style="font-size:13px;color:#475569">Tizimga kirilmoqda...</div>
                </div>
            `;
        }
        setTimeout(() => {
            const overlay = document.getElementById('auth-overlay');
            if (overlay) overlay.remove();
            document.documentElement.style.overflow = '';
            addTopbarButtons();
        }, 900);
    } else if (result === 'expired') {
        showAuthError('Kod vaqti tugadi! Qayta yuboring.');
    } else {
        showAuthError("Kod noto'g'ri! Qayta urinib ko'ring.");
        input.value = '';
        input.focus();
    }
}

async function handleOtpResend() {
    showAuthInfo('Yangi kod yuborilmoqda...');
    const ok = await sendTelegramOtp(_pendingUsername);
    document.getElementById('auth-info').style.display = 'none';
    if (ok) {
        startOtpCountdown();
        startResendCountdown(30);
        const inp = document.getElementById('otp-input');
        if (inp) inp.value = '';
    } else {
        showAuthError("Yuborishda xato!");
    }
}

function cancelOtp() {
    clearInterval(_otpCountdownInterval);
    clearInterval(_resendCountdownInterval);
    // Vaqtinchalik tokenni tozalash — OTP tasdiqlanmadi
    clearToken();
    _otpCode = null; _pendingUsername = null; _pendingToken = null; _otpExpiry = null;
    const otpForm = document.getElementById('auth-otp-form');
    const manualForm = document.getElementById('auth-manual-form');
    if (otpForm) otpForm.style.display = 'none';
    if (manualForm) manualForm.style.display = 'flex';
    document.getElementById('auth-subtitle').textContent = window._authMode === 'login' ? 'Hisobingizga kiring' : 'Yangi hisob yarating';
    document.getElementById('auth-error').style.display = 'none';
}

// ===================== AUTH HANDLE =====================
async function handleAuth() {
    const username = document.getElementById('auth-username')?.value.trim();
    const password = document.getElementById('auth-password')?.value;
    if (!username || !password) { showAuthError('Login va parolni kiriting!'); return; }
    const btn = document.getElementById('auth-btn');
    if (btn) btn.disabled = true;

    if (window._authMode === 'register') {
        const confirm = document.getElementById('auth-confirm')?.value;
        if (password !== confirm) { showAuthError('Parollar mos kelmadi!'); if (btn) btn.disabled = false; return; }
        if (password.length < 4) { showAuthError("Parol kamida 4 ta belgi bo'lishi kerak!"); if (btn) btn.disabled = false; return; }
        showAuthInfo("Ro'yxatdan o'tilmoqda...");
        const res = await apiCall('/auth/register/', 'POST', {
            username, password, device_id: getDeviceId()
        });
        document.getElementById('auth-info').style.display = 'none';
        if (!res.ok) {
            showAuthError(res.data.error || "Xatolik yuz berdi!");
            if (btn) btn.disabled = false;
            return;
        }
        // Ro'yxatdan o'tish — OTP tasdiqlanadi, keyin is_trusted=True bo'ladi
        await showOtpStep(username, res.data.token);
    } else {
        showAuthInfo("Kirilmoqda...");
        const res = await apiCall('/auth/login/', 'POST', {
            username, password, device_id: getDeviceId()
        });
        document.getElementById('auth-info').style.display = 'none';
        if (!res.ok) {
            showAuthError(res.data.error || "Login yoki parol noto'g'ri!");
            if (btn) btn.disabled = false;
            return;
        }
        if (res.data.is_trusted) {
            // Ishonchli qurilma — OTP kerak emas, to'g'ridan-to'g'ri kirish
            setToken(res.data.token);
            setCurrentUserData(res.data.user);
            const overlay = document.getElementById('auth-overlay');
            if (overlay) overlay.remove();
            document.documentElement.style.overflow = '';
            setTimeout(addTopbarButtons, 300);
        } else {
            // Yangi qurilma — OTP tasdiqlanishi kerak
            await showOtpStep(username, res.data.token);
        }
    }
    if (btn) btn.disabled = false;
}

function toggleAuthPass() {
    const inp = document.getElementById('auth-password');
    const icon = document.getElementById('auth-eye-icon');
    if (!inp) return;
    if (inp.type === 'password') {
        inp.type = 'text';
        if (icon) { icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
    } else {
        inp.type = 'password';
        if (icon) { icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
    }
}

function toggleAuthMode() {
    const isLogin = window._authMode === 'login';
    window._authMode = isLogin ? 'register' : 'login';
    document.getElementById('auth-subtitle').textContent = isLogin ? 'Yangi hisob yarating' : 'Hisobingizga kiring';
    document.getElementById('auth-btn-text').textContent = isLogin ? 'Hisob yaratish' : 'Kirish';
    const icon = document.getElementById('auth-btn-icon');
    if (icon) icon.className = isLogin ? 'fas fa-user-plus' : 'fas fa-lock';
    const wrap = document.getElementById('auth-confirm-wrap');
    if (wrap) wrap.style.display = isLogin ? 'block' : 'none';
    document.getElementById('auth-error').style.display = 'none';
}

function showAuthError(msg) {
    const el = document.getElementById('auth-error');
    const txt = document.getElementById('auth-error-text');
    if (txt) txt.textContent = msg;
    if (el) el.style.display = 'flex';
    const info = document.getElementById('auth-info');
    if (info) info.style.display = 'none';
}

function showAuthInfo(msg) {
    const el = document.getElementById('auth-info');
    const txt = document.getElementById('auth-info-text');
    if (txt) txt.textContent = msg;
    if (el) el.style.display = 'flex';
    const err = document.getElementById('auth-error');
    if (err) err.style.display = 'none';
}

// ===================== TOPBAR AVATAR =====================
function getAvatarHtml(size = 32, fontSize = 14) {
    const profile = getProfile();
    const currentUser = getCurrentUser();
    const initial = (profile.name || currentUser || 'U')[0].toUpperCase();
    if (profile.avatar) {
        return `<img src="${profile.avatar}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0;">`;
    }
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#6366f1);display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;font-weight:700;color:#fff;flex-shrink:0;">${initial}</div>`;
}

function addTopbarButtons() {
    const old = document.getElementById('topbar-avatar-btn');
    if (old) old.remove();
    const actions = document.querySelector('.topbar-actions');
    if (!actions) return;
    const profile = getProfile();
    const currentUser = getCurrentUser();
    const avatarWrap = document.createElement('div');
    avatarWrap.id = 'topbar-avatar-btn';
    avatarWrap.style.cssText = 'position:relative;cursor:pointer;flex-shrink:0;';
    avatarWrap.innerHTML = `
        <style>
            #topbar-avatar-inner { display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:5px 8px 5px 6px;transition:.18s; }
            #topbar-avatar-inner:hover { background:rgba(255,255,255,0.08); }
            .topbar-username { font-size:13px;font-weight:600;color:#f1f5f9;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
            @media(max-width:768px) { .topbar-username,.topbar-chevron { display:none !important; } #topbar-avatar-inner { padding:4px;border:none;background:transparent !important; } }
            .dd-profile-item { display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:9px;cursor:pointer;font-size:13px;color:#94a3b8;transition:.15s;border:none;background:none;width:100%;text-align:left;font-family:'Geist',-apple-system,sans-serif; }
            .dd-profile-item:hover { background:rgba(255,255,255,0.06);color:#f1f5f9; }
            .dd-profile-item.red:hover { background:rgba(239,68,68,0.1);color:#ef4444; }
            .dd-profile-item i { width:16px;text-align:center;font-size:14px; }
        </style>
        <div id="topbar-avatar-inner">
            ${getAvatarHtml(30, 14)}
            <span class="topbar-username">${profile.name || currentUser}</span>
            <i class="fas fa-chevron-down topbar-chevron" style="color:#64748b;font-size:10px"></i>
        </div>
        <div id="avatar-dropdown" style="display:none;position:absolute;right:0;top:calc(100% + 8px);background:#0d1117;border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:6px;min-width:200px;box-shadow:0 12px 40px rgba(0,0,0,0.6);z-index:9999;font-family:'Geist',-apple-system,sans-serif;">
            <div style="padding:10px 12px 8px;border-bottom:1px solid rgba(255,255,255,0.06);margin-bottom:4px">
                <div style="font-size:13px;font-weight:600;color:#f1f5f9">${profile.name || currentUser}</div>
                <div style="font-size:11px;color:#475569;margin-top:1px">@${currentUser}</div>
            </div>
            <button class="dd-profile-item" onclick="closeAvatarDropdown();navigateToProfile()"><i class="fas fa-user-circle"></i> Profil</button>
            <button class="dd-profile-item" onclick="closeAvatarDropdown();navigateToProfile()"><i class="fas fa-cog"></i> Sozlamalar</button>
            <div style="border-top:1px solid rgba(255,255,255,0.06);margin:4px 0"></div>
            <button class="dd-profile-item red" onclick="closeAvatarDropdown();if(confirm('Tizimdan chiqasizmi?'))logout()"><i class="fas fa-sign-out-alt"></i> Chiqish</button>
        </div>
    `;
    avatarWrap.querySelector('#topbar-avatar-inner').onclick = (e) => { e.stopPropagation(); toggleAvatarDropdown(); };
    actions.appendChild(avatarWrap);
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
            .profile-section { background:var(--card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;margin-bottom:16px; }
            .profile-section-title { font-size:13px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:16px;display:flex;align-items:center;gap:8px; }
            .profile-section-title::before { content:'';width:3px;height:14px;background:var(--accent);border-radius:2px;display:inline-block; }
            .pf-wrap { margin-bottom:14px; }
            .pf-wrap label { display:block;font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px; }
            .pf-wrap input { width:100%;background:rgba(0,0,0,0.3);border:1px solid var(--border2);border-radius:8px;color:var(--text1);padding:10px 14px;font-size:13px;outline:none;transition:.18s;font-family:var(--font);box-sizing:border-box; }
            .pf-wrap input:focus { border-color:var(--accent);box-shadow:0 0 0 3px rgba(59,130,246,0.12); }
            .pf-grid { display:grid;grid-template-columns:1fr 1fr;gap:14px; }
            @media(max-width:480px){ .pf-grid { grid-template-columns:1fr; } }
            .pf-error { background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:8px;padding:10px 14px;font-size:13px;color:#f87171;display:none;margin-bottom:12px;align-items:center;gap:8px; }
            .pf-success { background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);border-radius:8px;padding:10px 14px;font-size:13px;color:#34d399;display:none;margin-bottom:12px;align-items:center;gap:8px; }
            .pf-btn { border:none;border-radius:10px;padding:11px;font-size:14px;font-weight:600;cursor:pointer;transition:.18s;font-family:var(--font);display:flex;align-items:center;justify-content:center;gap:8px;width:100%; }
        </style>
        <div class="profile-page">
            <div class="profile-section">
                <div class="profile-section-title">Shaxsiy ma'lumotlar</div>
                <div style="display:flex;align-items:center;gap:20px;margin-bottom:20px">
                    <div style="position:relative;">
                        <div id="profile-avatar-preview" onclick="document.getElementById('avatar-upload').click()" style="width:72px;height:72px;border-radius:16px;background:linear-gradient(135deg,#3b82f6,#6366f1);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:#fff;overflow:hidden;cursor:pointer;">
                            ${profile.avatar ? `<img src="${profile.avatar}" style="width:100%;height:100%;object-fit:cover;">` : (profile.name || currentUser || 'U')[0].toUpperCase()}
                        </div>
                        <div onclick="document.getElementById('avatar-upload').click()" style="position:absolute;bottom:-4px;right:-4px;width:22px;height:22px;background:var(--accent);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;">
                            <i class="fas fa-camera" style="font-size:10px;color:#fff"></i>
                        </div>
                        <input type="file" id="avatar-upload" accept="image/*" style="display:none" onchange="handleAvatarUpload(event)">
                    </div>
                    <div>
                        <div style="font-size:16px;font-weight:700;color:var(--text1)">${profile.name || currentUser}</div>
                        <div style="font-size:13px;color:var(--text2)">@${currentUser} · Administrator</div>
                        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
                            <button onclick="document.getElementById('avatar-upload').click()" style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.2);color:#3b82f6;border-radius:7px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font);display:flex;align-items:center;gap:5px;" onmouseover="this.style.background='#3b82f6';this.style.color='#fff'" onmouseout="this.style.background='rgba(59,130,246,0.1)';this.style.color='#3b82f6'">
                                <i class="fas fa-camera"></i> O'zgartirish
                            </button>
                            ${profile.avatar ? `<button onclick="deleteAvatar()" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#ef4444;border-radius:7px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font);display:flex;align-items:center;gap:5px;" onmouseover="this.style.background='#ef4444';this.style.color='#fff'" onmouseout="this.style.background='rgba(239,68,68,0.1)';this.style.color='#ef4444'"><i class="fas fa-trash"></i> O'chirish</button>` : ''}
                        </div>
                    </div>
                </div>
                <div class="pf-grid">
                    <div class="pf-wrap"><label><i class="fas fa-user" style="margin-right:4px"></i>Ism familiya</label><input type="text" id="pf-name" value="${profile.name || ''}" placeholder="To'liq ism"></div>
                    <div class="pf-wrap"><label><i class="fas fa-phone" style="margin-right:4px"></i>Telefon</label><input type="text" id="pf-phone" value="${profile.phone || ''}" placeholder="+998 90 000 00 00"></div>
                </div>
                <div class="pf-wrap"><label><i class="fas fa-map-marker-alt" style="margin-right:4px"></i>Manzil</label><input type="text" id="pf-address" value="${profile.address || ''}" placeholder="Shahar, tuman"></div>
                <div class="pf-success" id="pf-success" style="margin-bottom:12px"><i class="fas fa-check-circle"></i><span></span></div>
                <button class="pf-btn" onclick="saveProfileData()" style="background:var(--accent);color:#fff;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='var(--accent)'">
                    <i class="fas fa-save"></i> Saqlash
                </button>
            </div>
            <div class="profile-section">
                <div class="profile-section-title">Parol o'zgartirish</div>
                <div class="pf-error" id="pf-error"><i class="fas fa-exclamation-circle"></i><span></span></div>
                <div class="pf-success" id="pf-pass-success"><i class="fas fa-check-circle"></i><span></span></div>
                <div class="pf-wrap"><label><i class="fas fa-lock" style="margin-right:4px"></i>Joriy parol</label><input type="password" id="pf-old-pass" placeholder="Joriy parolni kiriting"></div>
                <div class="pf-grid">
                    <div class="pf-wrap"><label><i class="fas fa-key" style="margin-right:4px"></i>Yangi parol</label><input type="password" id="pf-new-pass" placeholder="Kamida 4 belgi"></div>
                    <div class="pf-wrap"><label><i class="fas fa-check" style="margin-right:4px"></i>Tasdiqlang</label><input type="password" id="pf-confirm-pass" placeholder="Qaytaring"></div>
                </div>
                <button class="pf-btn" onclick="changePasswordFromPage()" style="background:rgba(59,130,246,0.1);color:var(--accent);border:1px solid rgba(59,130,246,0.25);" onmouseover="this.style.background='var(--accent)';this.style.color='#fff'" onmouseout="this.style.background='rgba(59,130,246,0.1)';this.style.color='var(--accent)'">
                    <i class="fas fa-key"></i> Parolni o'zgartirish
                </button>
            </div>
            <div class="profile-section">
                <div class="profile-section-title">Foydalanuvchilar</div>
                <div id="pf-users-list"><div style="color:#475569;font-size:13px;padding:8px">Yuklanmoqda...</div></div>
                <button class="pf-btn" onclick="toggleAddUserForm()" style="background:rgba(16,185,129,0.1);color:#10b981;border:1px solid rgba(16,185,129,0.25);margin-top:8px;" onmouseover="this.style.background='#10b981';this.style.color='#fff'" onmouseout="this.style.background='rgba(16,185,129,0.1)';this.style.color='#10b981'">
                    <i class="fas fa-user-plus"></i> Yangi foydalanuvchi
                </button>
                <div id="pf-add-user-form" style="display:none;margin-top:14px;background:rgba(0,0,0,0.2);border-radius:10px;padding:14px">
                    <div class="pf-grid">
                        <div class="pf-wrap" style="margin-bottom:0"><label>Login</label><input type="text" id="pf-new-login" placeholder="Foydalanuvchi nomi"></div>
                        <div class="pf-wrap" style="margin-bottom:0"><label>Parol</label><input type="password" id="pf-new-pass2" placeholder="Parol"></div>
                    </div>
                    <div style="margin-top:10px">
                        <div class="pf-wrap" style="margin-bottom:10px"><label>Tasdiqlang</label><input type="password" id="pf-new-confirm2" placeholder="Qaytaring"></div>
                        <div style="display:flex;gap:8px">
                            <button onclick="toggleAddUserForm()" style="flex:1;background:rgba(255,255,255,0.04);color:#94a3b8;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font);display:flex;align-items:center;justify-content:center;gap:6px;"><i class="fas fa-times"></i> Bekor</button>
                            <button onclick="addNewUserFromPage()" style="flex:1;background:var(--accent);color:#fff;border:none;border-radius:8px;padding:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font);display:flex;align-items:center;justify-content:center;gap:6px;"><i class="fas fa-check"></i> Qo'shish</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="profile-section" style="border-color:rgba(239,68,68,0.15)">
                <div class="profile-section-title" style="color:#ef4444">Tizimdan chiqish</div>
                <p style="font-size:13px;color:var(--text2);margin-bottom:14px">Tizimdan chiqsangiz, qayta kirishda login va parol so'raladi.</p>
                <button class="pf-btn" onclick="if(confirm('Tizimdan chiqasizmi?'))logout()" style="background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.25);width:auto;padding:10px 24px;" onmouseover="this.style.background='#ef4444';this.style.color='#fff'" onmouseout="this.style.background='rgba(239,68,68,0.1)';this.style.color='#ef4444'">
                    <i class="fas fa-sign-out-alt"></i> Chiqish
                </button>
            </div>
        </div>
    `;
    loadUsersListPage();
}

async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        const res = await apiCall('/auth/profile/', 'PUT', { avatar: e.target.result });
        if (res.ok) {
            setCurrentUserData(res.data);
            const preview = document.getElementById('profile-avatar-preview');
            if (preview) preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
            updateTopbarAvatar();
        }
    };
    reader.readAsDataURL(file);
}

async function deleteAvatar() {
    if (!confirm("Profil rasmini o'chirasizmi?")) return;
    const res = await apiCall('/auth/profile/', 'PUT', { avatar: '' });
    if (res.ok) {
        setCurrentUserData(res.data);
        const currentUser = getCurrentUser();
        const preview = document.getElementById('profile-avatar-preview');
        if (preview) preview.innerHTML = (res.data.name || currentUser || 'U')[0].toUpperCase();
        updateTopbarAvatar();
    }
}

function updateTopbarAvatar() {
    const inner = document.getElementById('topbar-avatar-inner');
    if (!inner) return;
    const profile = getProfile();
    const currentUser = getCurrentUser();
    inner.innerHTML = `
        ${getAvatarHtml(30, 14)}
        <span class="topbar-username">${profile.name || currentUser}</span>
        <i class="fas fa-chevron-down topbar-chevron" style="color:#64748b;font-size:10px"></i>
    `;
}

async function saveProfileData() {
    const name = document.getElementById('pf-name').value.trim();
    const phone = document.getElementById('pf-phone').value.trim();
    const address = document.getElementById('pf-address').value.trim();
    const res = await apiCall('/auth/profile/', 'PUT', { name, phone, address });
    const suc = document.getElementById('pf-success');
    if (res.ok) {
        setCurrentUserData(res.data);
        updateTopbarAvatar();
        if (suc) { suc.querySelector('span').textContent = "Ma'lumotlar saqlandi!"; suc.style.display = 'flex'; setTimeout(() => suc.style.display = 'none', 3000); }
    }
}

async function changePasswordFromPage() {
    const oldPass = document.getElementById('pf-old-pass').value;
    const newPass = document.getElementById('pf-new-pass').value;
    const confirmPass = document.getElementById('pf-confirm-pass').value;
    const errEl = document.getElementById('pf-error');
    const sucEl = document.getElementById('pf-pass-success');
    errEl.style.display = 'none'; sucEl.style.display = 'none';
    if (newPass.length < 4) { errEl.querySelector('span').textContent = "Yangi parol kamida 4 ta belgi bo'lishi kerak!"; errEl.style.display = 'flex'; return; }
    if (newPass !== confirmPass) { errEl.querySelector('span').textContent = "Yangi parollar mos kelmadi!"; errEl.style.display = 'flex'; return; }
    const res = await apiCall('/auth/change-password/', 'POST', { old_password: oldPass, new_password: newPass });
    if (res.ok) {
        sucEl.querySelector('span').textContent = "Parol muvaffaqiyatli o'zgartirildi!";
        sucEl.style.display = 'flex';
        document.getElementById('pf-old-pass').value = '';
        document.getElementById('pf-new-pass').value = '';
        document.getElementById('pf-confirm-pass').value = '';
    } else {
        errEl.querySelector('span').textContent = res.data.error || "Xatolik yuz berdi!";
        errEl.style.display = 'flex';
    }
}

async function loadUsersListPage() {
    const res = await apiCall('/auth/users/');
    const el = document.getElementById('pf-users-list');
    if (!el) return;
    if (!res.ok) { el.innerHTML = '<div style="color:#475569;font-size:13px;padding:8px">Yuklab bo\'lmadi</div>'; return; }
    const currentUser = getCurrentUser();
    const users = res.data;
    el.innerHTML = users.map(u => `
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <div style="width:32px;height:32px;border-radius:8px;background:${u.username === currentUser ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)'};color:${u.username === currentUser ? '#3b82f6' : '#64748b'};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">${u.username[0].toUpperCase()}</div>
            <div style="flex:1;font-size:13px;color:#f1f5f9">${u.name || u.username} ${u.username === currentUser ? '<span style="font-size:11px;color:#3b82f6">(siz)</span>' : `<span style="font-size:11px;color:#475569">@${u.username}</span>`}</div>
            ${u.username !== currentUser ? `<button onclick="deleteUserFromPage(${u.id})" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#ef4444;border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;font-family:var(--font);transition:.15s;display:flex;align-items:center;gap:4px;" onmouseover="this.style.background='#ef4444';this.style.color='#fff'" onmouseout="this.style.background='rgba(239,68,68,0.1)';this.style.color='#ef4444'"><i class="fas fa-trash"></i></button>` : ''}
        </div>
    `).join('') || '<div style="color:#475569;font-size:13px;padding:8px">Foydalanuvchilar yo\'q</div>';
}

function toggleAddUserForm() {
    const form = document.getElementById('pf-add-user-form');
    if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function addNewUserFromPage() {
    const username = document.getElementById('pf-new-login').value.trim();
    const password = document.getElementById('pf-new-pass2').value;
    const confirm = document.getElementById('pf-new-confirm2').value;
    if (!username || !password) { alert('Login va parolni kiriting!'); return; }
    if (password.length < 4) { alert("Parol kamida 4 ta belgi bo'lishi kerak!"); return; }
    if (password !== confirm) { alert('Parollar mos kelmadi!'); return; }
    const res = await apiCall('/auth/add-user/', 'POST', { username, password });
    if (res.ok) {
        document.getElementById('pf-new-login').value = '';
        document.getElementById('pf-new-pass2').value = '';
        document.getElementById('pf-new-confirm2').value = '';
        toggleAddUserForm();
        loadUsersListPage();
    } else {
        alert(res.data.error || 'Xatolik yuz berdi!');
    }
}

async function deleteUserFromPage(userId) {
    if (!confirm("Bu foydalanuvchini o'chirasizmi?")) return;
    const res = await apiCall(`/auth/users/${userId}/`, 'DELETE');
    if (res.ok) loadUsersListPage();
    else alert(res.data.error || 'Xatolik yuz berdi!');
}

// ===================== ASOSIY TEKSHIRISH =====================
(function () {
    if (!isSessionValid()) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', showLoginPage);
        } else {
            showLoginPage();
        }
    } else {
        // Token bor — serverda tekshirish
        const init = async () => {
            const res = await apiCall('/auth/me/');
            if (res.ok) {
                setCurrentUserData(res.data);
                addTopbarButtons();
            } else {
                // Token eskirgan yoki noto'g'ri — qayta login
                clearToken();
                showLoginPage();
            }
        };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(init, 300));
        } else {
            setTimeout(init, 300);
        }
    }
})();