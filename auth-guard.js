// ===================== AUTH GUARD =====================

const AUTH_KEY = 'crm_auth_token';
const AUTH_EXPIRY_KEY = 'crm_auth_expiry';
const AUTH_REMEMBER_KEY = 'crm_auth_remember';
const USERS_KEY = 'crm_users';
const CURRENT_USER_KEY = 'crm_current_user';
const PROFILE_KEY = 'crm_profile';
const SAVED_CREDS_KEY = 'crm_saved_creds';
const TRUSTED_DEVICES_KEY = 'crm_trusted_devices';
const SESSION_HOURS = 12;

// ===================== TELEGRAM CONFIG =====================
const TG_BOT_TOKEN = '7931384445:AAEipt-qUn0iKVSwc3yxDP-vK3s_doWhFeU';
const TG_CHAT_IDS = ['5536917208', '5538148203'];

// ===================== UTIL =====================
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}

// Qurilma identifikatori (browser fingerprint, sodda versiya)
function getDeviceId() {
    let id = localStorage.getItem('crm_device_id');
    if (!id) {
        id = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('crm_device_id', id);
    }
    return id;
}

// Ishonchli qurilmalar ro'yxati: { username: [deviceId, ...] }
function getTrustedDevices() {
    const raw = localStorage.getItem(TRUSTED_DEVICES_KEY);
    return raw ? JSON.parse(raw) : {};
}

function isDeviceTrusted(username) {
    const devices = getTrustedDevices();
    const list = devices[username.toLowerCase()] || [];
    return list.includes(getDeviceId());
}

function trustCurrentDevice(username) {
    const devices = getTrustedDevices();
    const key = username.toLowerCase();
    if (!devices[key]) devices[key] = [];
    if (!devices[key].includes(getDeviceId())) {
        devices[key].push(getDeviceId());
    }
    localStorage.setItem(TRUSTED_DEVICES_KEY, JSON.stringify(devices));
}

// ===================== FOYDALANUVCHILAR =====================
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

function getSavedCreds() {
    const raw = localStorage.getItem(SAVED_CREDS_KEY);
    return raw ? JSON.parse(raw) : null;
}

function saveCreds(username, password) {
    localStorage.setItem(SAVED_CREDS_KEY, JSON.stringify({ username, password }));
}

function clearCreds() {
    localStorage.removeItem(SAVED_CREDS_KEY);
}

// ===================== SESSIYA =====================
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

// ===================== TELEGRAM OTP =====================
let _otpCode = null;
let _otpExpiry = null;
let _otpResendTimer = null;

function generateOtp() {
    return String(Math.floor(1000 + Math.random() * 9000));
}

async function sendTelegramOtp(username) {
    _otpCode = generateOtp();
    _otpExpiry = Date.now() + 5 * 60 * 1000; // 5 daqiqa

    const text = `🔐 *FerdinantEduCRM — Tasdiqlash kodi*\n\n` +
        `Foydalanuvchi: \`${username}\`\n` +
        `Kod: *${_otpCode}*\n\n` +
        `⏱ Kod 5 daqiqa ichida amal qiladi.\n` +
        `_Agar siz kirmoqchi bo'lmasangiz, e'tibor bermang._`;

    let allOk = false;
    for (const chatId of TG_CHAT_IDS) {
        try {
            const res = await fetch(
                `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text,
                        parse_mode: 'Markdown'
                    })
                }
            );
            const data = await res.json();
            if (data.ok) allOk = true;
        } catch (e) {
            console.warn('Telegram xato:', e);
        }
    }
    return allOk;
}

function verifyOtp(input) {
    if (!_otpCode || !_otpExpiry) return 'nocode';
    if (Date.now() > _otpExpiry) return 'expired';
    if (input.trim() === _otpCode) return 'ok';
    return 'wrong';
}

// ===================== LOGIN SAHIFASI =====================
function showLoginPage() {
    const users = getUsers();
    const hasUsers = Object.keys(users).length > 0;
    const savedCreds = getSavedCreds();

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
        <div id="auth-card" style="
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
                #auth-overlay input[type=text],
                #auth-overlay input[type=password],
                #auth-overlay input[type=number] {
                    width:100%;background:rgba(0,0,0,0.3);
                    border:1px solid rgba(255,255,255,0.1);
                    border-radius:10px;color:#f1f5f9;
                    padding:11px 40px 11px 14px;font-size:14px;outline:none;
                    transition:border-color .2s,box-shadow .2s;
                    font-family:'Geist',-apple-system,sans-serif;
                    box-sizing:border-box;
                }
                #auth-overlay input[type=text]:focus,
                #auth-overlay input[type=password]:focus,
                #auth-overlay input[type=number]:focus {
                    border-color:#3b82f6;
                    box-shadow:0 0 0 3px rgba(59,130,246,0.15);
                }
                #auth-overlay input::placeholder { color:#475569; }
                #auth-btn {
                    width:100%;background:#3b82f6;color:#fff;border:none;
                    border-radius:10px;padding:12px;font-size:14px;font-weight:600;
                    cursor:pointer;transition:all .18s;
                    font-family:'Geist',-apple-system,sans-serif;margin-top:4px;
                    display:flex;align-items:center;justify-content:center;gap:8px;
                }
                #auth-btn:hover { background:#2563eb; transform:translateY(-1px); }
                #auth-btn:disabled { background:#1e3a5f; cursor:not-allowed; transform:none; opacity:.7; }
                #auth-toggle { background:none;border:none;color:#3b82f6;cursor:pointer;font-size:13px;font-family:'Geist',-apple-system,sans-serif;text-decoration:underline;padding:0; }
                .auth-label { display:block;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px; }
                .auth-error { background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:8px;padding:10px 14px;font-size:13px;color:#f87171;display:none;margin-bottom:12px;align-items:center;gap:8px; }
                .auth-info { background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:8px;padding:10px 14px;font-size:13px;color:#93c5fd;display:none;margin-bottom:12px;align-items:center;gap:8px; }
                .remember-row { display:flex;align-items:center;gap:8px;margin-bottom:4px;cursor:pointer; }
                .remember-row input[type=checkbox] { width:16px!important;height:16px;padding:0;cursor:pointer;accent-color:#3b82f6; }
                .remember-row span { font-size:13px;color:#94a3b8; }
                .saved-creds-btn {
                    width:100%;background:rgba(255,255,255,0.04);
                    border:1px solid rgba(255,255,255,0.08);
                    border-radius:10px;padding:10px 14px;
                    display:flex;align-items:center;gap:12px;
                    cursor:pointer;transition:.18s;margin-bottom:12px;
                    font-family:'Geist',-apple-system,sans-serif;
                }
                .saved-creds-btn:hover { background:rgba(255,255,255,0.08);border-color:rgba(59,130,246,0.3); }

                /* OTP input uslubi */
                #otp-input {
                    text-align:center;
                    font-size:28px !important;
                    font-weight:700 !important;
                    letter-spacing:12px;
                    padding:14px 14px !important;
                }
                .otp-timer { font-size:12px;color:#475569;text-align:center;margin-top:6px; }
                .otp-timer span { color:#3b82f6;font-weight:600; }
            </style>

            <!-- LOGO -->
            <div style="text-align:center;margin-bottom:28px">
                <div style="font-size:22px;font-weight:700;color:#f1f5f9">Ferdinant<span style="color:#3b82f6">Edu</span>CRM</div>
                <div style="font-size:13px;color:#475569;margin-top:4px" id="auth-subtitle">${hasUsers ? 'Hisobingizga kiring' : 'Yangi hisob yarating'}</div>
            </div>

            <!-- XATO / INFO -->
            <div class="auth-error" id="auth-error">
                <i class="fas fa-exclamation-circle"></i>
                <span id="auth-error-text"></span>
            </div>
            <div class="auth-info" id="auth-info">
                <i class="fas fa-info-circle"></i>
                <span id="auth-info-text"></span>
            </div>

            <!-- SAQLANGAN HISOB -->
            ${savedCreds && hasUsers ? `
            <div class="saved-creds-btn" onclick="useSavedCreds()" id="saved-creds-block">
                <div style="width:36px;height:36px;border-radius:9px;background:linear-gradient(135deg,#3b82f6,#6366f1);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;flex-shrink:0;">
                    ${savedCreds.username[0].toUpperCase()}
                </div>
                <div style="flex:1;text-align:left">
                    <div style="font-size:13px;font-weight:600;color:#f1f5f9">${savedCreds.username}</div>
                    <div style="font-size:11px;color:#475569">Saqlangan hisob · Ishonchli qurilma</div>
                </div>
                <i class="fas fa-chevron-right" style="color:#475569;font-size:12px"></i>
            </div>
            <div style="text-align:center;margin-bottom:14px">
                <button onclick="showManualLogin()" style="background:none;border:none;color:#475569;font-size:12px;cursor:pointer;font-family:'Geist',-apple-system,sans-serif;text-decoration:underline;">
                    Boshqa hisob bilan kiring
                </button>
            </div>
            ` : ''}

            <!-- LOGIN FORMASI -->
            <div id="auth-manual-form" style="display:${savedCreds && hasUsers ? 'none' : 'flex'};flex-direction:column;gap:14px">
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

                <div style="display:flex;justify-content:space-between;align-items:center">
                    <label class="remember-row" style="margin-bottom:0">
                        <input type="checkbox" id="auth-remember" checked>
                        <span>Eslab qolish</span>
                    </label>
                </div>

                <button id="auth-btn" onclick="handleAuth()">
                    <i class="fas fa-lock" id="auth-btn-icon"></i>
                    <span id="auth-btn-text">${hasUsers ? 'Kirish' : 'Hisob yaratish'}</span>
                </button>

                <div style="text-align:center;margin-top:4px">
                    ${hasUsers ? `<span style="font-size:13px;color:#475569">Yangi hisob? </span><button id="auth-toggle" onclick="toggleAuthMode()">Ro'yxatdan o'tish</button>` : ''}
                </div>
            </div>

            <!-- OTP FORMASI (yashirin) -->
            <div id="auth-otp-form" style="display:none;flex-direction:column;gap:16px">
                <div style="text-align:center;margin-bottom:4px">
                    <div style="width:56px;height:56px;border-radius:16px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.25);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
                        <i class="fab fa-telegram" style="font-size:26px;color:#3b82f6"></i>
                    </div>
                    <div style="font-size:14px;color:#94a3b8;line-height:1.5">
                        Telegramga <span style="color:#f1f5f9;font-weight:600">4 xonali kod</span> yuborildi.<br>
                        Kodni kiriting:
                    </div>
                </div>

                <div>
                    <label class="auth-label" style="text-align:center">Tasdiqlash kodi</label>
                    <input type="number" id="otp-input" placeholder="0000" maxlength="4"
                        oninput="if(this.value.length>4)this.value=this.value.slice(0,4)">
                    <div class="otp-timer" id="otp-timer-text">Kod <span id="otp-countdown">5:00</span> da eskiradi</div>
                </div>

                <button id="otp-verify-btn" onclick="handleOtpVerify()">
                    <i class="fas fa-check-circle"></i>
                    <span>Tasdiqlash</span>
                </button>

                <div style="text-align:center">
                    <button id="otp-resend-btn" onclick="handleOtpResend()" disabled
                        style="background:none;border:none;color:#475569;font-size:12px;cursor:pointer;font-family:'Geist',-apple-system,sans-serif;text-decoration:underline;padding:0;">
                        Kodni qayta yuborish (<span id="resend-countdown">30</span>s)
                    </button>
                </div>
                <div style="text-align:center">
                    <button onclick="cancelOtp()" style="background:none;border:none;color:#475569;font-size:12px;cursor:pointer;font-family:'Geist',-apple-system,sans-serif;text-decoration:underline;padding:0;">
                        ← Orqaga
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    overlay.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            const otpForm = document.getElementById('auth-otp-form');
            if (otpForm && otpForm.style.display !== 'none') {
                handleOtpVerify();
            } else {
                handleAuth();
            }
        }
    });
    window._authMode = hasUsers ? 'login' : 'register';
}

// ===================== OTP VAQT HISOBLAGICHI =====================
let _otpCountdownInterval = null;
let _resendCountdownInterval = null;
let _pendingUsername = null;
let _pendingRemember = false;

function startOtpCountdown() {
    let seconds = 5 * 60;
    clearInterval(_otpCountdownInterval);
    _otpCountdownInterval = setInterval(() => {
        seconds--;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        const el = document.getElementById('otp-countdown');
        if (el) el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
        if (seconds <= 0) {
            clearInterval(_otpCountdownInterval);
            showAuthError('Kod vaqti tugadi. Qayta yuboring.');
        }
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
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Kodni qayta yuborish';
            }
        }
    }, 1000);
}

// ===================== OTP AMALLAR =====================
async function showOtpStep(username, remember) {
    _pendingUsername = username;
    _pendingRemember = remember;

    // Formalarni almashtirish
    const manualForm = document.getElementById('auth-manual-form');
    const otpForm = document.getElementById('auth-otp-form');
    const savedBlock = document.getElementById('saved-creds-block');
    const savedAlt = savedBlock && savedBlock.nextElementSibling;

    if (manualForm) manualForm.style.display = 'none';
    if (savedBlock) savedBlock.style.display = 'none';
    if (savedAlt) savedAlt.style.display = 'none';
    if (otpForm) otpForm.style.display = 'flex';

    // OTP btn uslubi
    const verifyBtn = document.getElementById('otp-verify-btn');
    if (verifyBtn) {
        verifyBtn.style.cssText = `width:100%;background:#3b82f6;color:#fff;border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:600;cursor:pointer;transition:all .18s;font-family:'Geist',-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;gap:8px;`;
    }

    document.getElementById('auth-subtitle').textContent = 'Telegram tasdiqlash';
    document.getElementById('auth-error').style.display = 'none';

    // OTP yuborish
    const btn = document.getElementById('auth-btn');
    showAuthInfo('Telegram botga kod yuborilmoqda...');

    const ok = await sendTelegramOtp(username);
    if (ok) {
        document.getElementById('auth-info').style.display = 'none';
        startOtpCountdown();
        startResendCountdown(30);
        setTimeout(() => {
            const inp = document.getElementById('otp-input');
            if (inp) inp.focus();
        }, 100);
    } else {
        showAuthError('Telegram botga ulanishda xato! Internet aloqasini tekshiring.');
    }
}

function handleOtpVerify() {
    const input = document.getElementById('otp-input');
    if (!input) return;
    const val = input.value.trim();
    if (val.length !== 4) { showAuthError('4 xonali kodni kiriting!'); return; }

    const result = verifyOtp(val);
    if (result === 'ok') {
        clearInterval(_otpCountdownInterval);
        clearInterval(_resendCountdownInterval);
        _otpCode = null;

        trustCurrentDevice(_pendingUsername);
        if (_pendingRemember) saveCreds(_pendingUsername, document.getElementById('auth-password')?.value || getSavedCreds()?.password || '');
        createSession(_pendingRemember, _pendingUsername);

        // Muvaffaqiyat animatsiyasi
        const card = document.getElementById('auth-card');
        if (card) {
            card.innerHTML = `
                <div style="text-align:center;padding:20px 0">
                    <div style="width:64px;height:64px;border-radius:50%;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;animation:authIn .3s ease">
                        <i class="fas fa-check" style="font-size:28px;color:#10b981"></i>
                    </div>
                    <div style="font-size:16px;font-weight:700;color:#f1f5f9;margin-bottom:6px">Xush kelibsiz!</div>
                    <div style="font-size:13px;color:#475569">Tizimga kirilmoqda...</div>
                </div>
            `;
        }
        setTimeout(() => {
            document.getElementById('auth-overlay').remove();
            document.documentElement.style.overflow = '';
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
        document.getElementById('otp-input').value = '';
    } else {
        showAuthError('Yuborishda xato! Qayta urinib ko\'ring.');
    }
}

function cancelOtp() {
    clearInterval(_otpCountdownInterval);
    clearInterval(_resendCountdownInterval);
    _otpCode = null;
    _pendingUsername = null;
    _otpExpiry = null;

    const otpForm = document.getElementById('auth-otp-form');
    const manualForm = document.getElementById('auth-manual-form');
    if (otpForm) otpForm.style.display = 'none';
    if (manualForm) manualForm.style.display = 'flex';
    document.getElementById('auth-subtitle').textContent = window._authMode === 'login' ? 'Hisobingizga kiring' : 'Yangi hisob yarating';
    document.getElementById('auth-error').style.display = 'none';
}

// ===================== SAQLANGAN HISOB =====================
async function useSavedCreds() {
    const creds = getSavedCreds();
    if (!creds) return;

    if (!checkLogin(creds.username, creds.password)) {
        clearCreds();
        showManualLogin();
        showAuthError("Saqlangan parol eskirgan. Qayta kiring.");
        return;
    }

    // Ishonchli qurilmami?
    if (isDeviceTrusted(creds.username)) {
        createSession(true, creds.username);
        document.getElementById('auth-overlay').remove();
        document.documentElement.style.overflow = '';
    } else {
        // Yangi qurilma — OTP kerak
        await showOtpStep(creds.username, true);
    }
}

function showManualLogin() {
    const savedBlock = document.getElementById('saved-creds-block');
    if (savedBlock) savedBlock.style.display = 'none';
    const altBtn = savedBlock && savedBlock.nextElementSibling;
    if (altBtn) altBtn.style.display = 'none';
    const form = document.getElementById('auth-manual-form');
    if (form) form.style.display = 'flex';
}

// ===================== AUTH HANDLE =====================
async function handleAuth() {
    const usernameEl = document.getElementById('auth-username');
    const passwordEl = document.getElementById('auth-password');
    if (!usernameEl || !passwordEl) return;
    const username = usernameEl.value.trim();
    const password = passwordEl.value;
    const remember = document.getElementById('auth-remember').checked;

    if (!username || !password) { showAuthError('Login va parolni kiriting!'); return; }

    if (window._authMode === 'register') {
        const confirm = document.getElementById('auth-confirm').value;
        if (password !== confirm) { showAuthError('Parollar mos kelmadi!'); return; }
        if (password.length < 4) { showAuthError("Parol kamida 4 ta belgi bo'lishi kerak!"); return; }
        const users = getUsers();
        if (users[username.toLowerCase()]) { showAuthError('Bu login allaqachon band!'); return; }

        // Ro'yxatdan o'tish uchun ham OTP kerak
        saveUser(username, password);
        const btn = document.getElementById('auth-btn');
        if (btn) btn.disabled = true;
        await showOtpStep(username, remember);
        if (btn) btn.disabled = false;

    } else {
        // Login
        if (!checkLogin(username, password)) { showAuthError("Login yoki parol noto'g'ri!"); return; }

        // Ishonchli qurilma — to'g'ridan-to'g'ri kirish
        if (isDeviceTrusted(username)) {
            if (remember) saveCreds(username, password); else clearCreds();
            createSession(remember, username);
            document.getElementById('auth-overlay').remove();
            document.documentElement.style.overflow = '';
            return;
        }

        // Yangi qurilma — OTP
        const btn = document.getElementById('auth-btn');
        if (btn) btn.disabled = true;
        await showOtpStep(username, remember);
        if (btn) btn.disabled = false;
    }
}

// ===================== YORDAMCHI FUNKSIYALAR =====================
function toggleAuthPass() {
    const inp = document.getElementById('auth-password');
    const icon = document.getElementById('auth-eye-icon');
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
    if (icon) { icon.className = isLogin ? 'fas fa-user-plus' : 'fas fa-lock'; }
    const toggle = document.getElementById('auth-toggle');
    if (toggle) toggle.textContent = isLogin ? 'Kirish' : "Ro'yxatdan o'tish";
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
    const actions = document.querySelector('.topbar-actions');
    if (!actions || document.getElementById('topbar-avatar-btn')) return;

    const profile = getProfile();
    const currentUser = getCurrentUser();

    const avatarWrap = document.createElement('div');
    avatarWrap.id = 'topbar-avatar-btn';
    avatarWrap.style.cssText = 'position:relative;cursor:pointer;';
    avatarWrap.innerHTML = `
        <div id="topbar-avatar-inner" style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:5px 10px 5px 6px;transition:.18s;"
            onmouseover="this.style.background='rgba(255,255,255,0.08)'"
            onmouseout="this.style.background='rgba(255,255,255,0.04)'">
            ${getAvatarHtml(28, 13)}
            <span style="font-size:13px;font-weight:600;color:#f1f5f9;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${profile.name || currentUser}</span>
            <i class="fas fa-chevron-down" style="color:#64748b;font-size:10px"></i>
        </div>
        <div id="avatar-dropdown" style="
            display:none;position:absolute;right:0;top:calc(100% + 8px);
            background:#0d1117;border:1px solid rgba(255,255,255,0.1);
            border-radius:14px;padding:6px;min-width:200px;
            box-shadow:0 12px 40px rgba(0,0,0,0.6);z-index:9999;
            font-family:'Geist',-apple-system,sans-serif;
        ">
            <style>
                .dd-profile-item {
                    display:flex;align-items:center;gap:10px;padding:9px 12px;
                    border-radius:9px;cursor:pointer;font-size:13px;color:#94a3b8;
                    transition:.15s;border:none;background:none;width:100%;text-align:left;
                    font-family:'Geist',-apple-system,sans-serif;
                }
                .dd-profile-item:hover { background:rgba(255,255,255,0.06);color:#f1f5f9; }
                .dd-profile-item.red:hover { background:rgba(239,68,68,0.1);color:#ef4444; }
                .dd-profile-item i { width:16px;text-align:center;font-size:14px; }
            </style>
            <div style="padding:10px 12px 8px;border-bottom:1px solid rgba(255,255,255,0.06);margin-bottom:4px">
                <div style="font-size:13px;font-weight:600;color:#f1f5f9">${profile.name || currentUser}</div>
                <div style="font-size:11px;color:#475569;margin-top:1px">@${currentUser}</div>
            </div>
            <button class="dd-profile-item" onclick="closeAvatarDropdown();navigateToProfile()">
                <i class="fas fa-user-circle"></i> Profil
            </button>
            <button class="dd-profile-item" onclick="closeAvatarDropdown();navigateToProfile()">
                <i class="fas fa-cog"></i> Sozlamalar
            </button>
            <div style="border-top:1px solid rgba(255,255,255,0.06);margin:4px 0"></div>
            <button class="dd-profile-item red" onclick="closeAvatarDropdown();if(confirm('Tizimdan chiqasizmi?'))logout()">
                <i class="fas fa-sign-out-alt"></i> Chiqish
            </button>
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
            .profile-input-wrap { margin-bottom:14px; }
            .profile-input-wrap label { display:block;font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px; }
            .profile-input-wrap input, .profile-input-wrap select { width:100%;background:rgba(0,0,0,0.3);border:1px solid var(--border2);border-radius:8px;color:var(--text1);padding:10px 14px;font-size:13px;outline:none;transition:.18s;font-family:var(--font);box-sizing:border-box; }
            .profile-input-wrap input:focus, .profile-input-wrap select:focus { border-color:var(--accent);box-shadow:0 0 0 3px rgba(59,130,246,0.12); }
            .profile-grid { display:grid;grid-template-columns:1fr 1fr;gap:14px; }
            @media(max-width:480px){ .profile-grid { grid-template-columns:1fr; } }
            .pm-error { background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:8px;padding:10px 14px;font-size:13px;color:#f87171;display:none;margin-bottom:12px;align-items:center;gap:8px; }
            .pm-success { background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);border-radius:8px;padding:10px 14px;font-size:13px;color:#34d399;display:none;margin-bottom:12px;align-items:center;gap:8px; }
            .pf-btn { width:100%;border:none;border-radius:10px;padding:11px;font-size:14px;font-weight:600;cursor:pointer;transition:.18s;font-family:var(--font);display:flex;align-items:center;justify-content:center;gap:8px; }
        </style>

        <div class="profile-page">
            <div class="profile-section">
                <div class="profile-section-title">Shaxsiy ma'lumotlar</div>
                <div style="display:flex;align-items:center;gap:20px;margin-bottom:20px">
                    <div style="position:relative;cursor:pointer;" onclick="document.getElementById('avatar-upload').click()">
                        <div id="profile-avatar-preview" style="width:72px;height:72px;border-radius:16px;background:linear-gradient(135deg,#3b82f6,#6366f1);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:#fff;overflow:hidden;">
                            ${profile.avatar ? `<img src="${profile.avatar}" style="width:100%;height:100%;object-fit:cover;">` : (profile.name || currentUser || 'U')[0].toUpperCase()}
                        </div>
                        <div style="position:absolute;bottom:-4px;right:-4px;width:22px;height:22px;background:var(--accent);border-radius:50%;display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-camera" style="font-size:10px;color:#fff"></i>
                        </div>
                        <input type="file" id="avatar-upload" accept="image/*" style="display:none" onchange="handleAvatarUpload(event)">
                    </div>
                    <div>
                        <div style="font-size:16px;font-weight:700;color:var(--text1)">${profile.name || currentUser}</div>
                        <div style="font-size:13px;color:var(--text2)">@${currentUser} · Administrator</div>
                        <div style="font-size:11px;color:var(--text3);margin-top:2px">
                            <i class="fas fa-camera" style="margin-right:4px"></i>Rasmga bosing — o'zgartirish
                        </div>
                    </div>
                </div>

                <div class="profile-grid">
                    <div class="profile-input-wrap">
                        <label><i class="fas fa-user" style="margin-right:4px"></i>Ism familiya</label>
                        <input type="text" id="pf-name" value="${profile.name || ''}" placeholder="To'liq ism">
                    </div>
                    <div class="profile-input-wrap">
                        <label><i class="fas fa-phone" style="margin-right:4px"></i>Telefon</label>
                        <input type="text" id="pf-phone" value="${profile.phone || ''}" placeholder="+998 90 000 00 00">
                    </div>
                </div>
                <div class="profile-input-wrap">
                    <label><i class="fas fa-map-marker-alt" style="margin-right:4px"></i>Manzil</label>
                    <input type="text" id="pf-address" value="${profile.address || ''}" placeholder="Shahar, tuman">
                </div>

                <div class="pm-success" id="pf-success" style="margin-bottom:12px">
                    <i class="fas fa-check-circle"></i><span></span>
                </div>
                <button class="pf-btn" onclick="saveProfileData()" style="background:var(--accent);color:#fff;"
                    onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='var(--accent)'">
                    <i class="fas fa-save"></i> Saqlash
                </button>
            </div>

            <div class="profile-section">
                <div class="profile-section-title">Parol o'zgartirish</div>
                <div class="pm-error" id="pf-error"><i class="fas fa-exclamation-circle"></i><span></span></div>
                <div class="pm-success" id="pf-pass-success"><i class="fas fa-check-circle"></i><span></span></div>
                <div class="profile-input-wrap">
                    <label><i class="fas fa-lock" style="margin-right:4px"></i>Joriy parol</label>
                    <input type="password" id="pf-old-pass" placeholder="Joriy parolni kiriting">
                </div>
                <div class="profile-grid">
                    <div class="profile-input-wrap">
                        <label><i class="fas fa-key" style="margin-right:4px"></i>Yangi parol</label>
                        <input type="password" id="pf-new-pass" placeholder="Kamida 4 belgi">
                    </div>
                    <div class="profile-input-wrap">
                        <label><i class="fas fa-check" style="margin-right:4px"></i>Tasdiqlang</label>
                        <input type="password" id="pf-confirm-pass" placeholder="Qaytaring">
                    </div>
                </div>
                <button class="pf-btn" onclick="changePasswordFromPage()"
                    style="background:rgba(59,130,246,0.1);color:var(--accent);border:1px solid rgba(59,130,246,0.25);"
                    onmouseover="this.style.background='var(--accent)';this.style.color='#fff'"
                    onmouseout="this.style.background='rgba(59,130,246,0.1)';this.style.color='var(--accent)'">
                    <i class="fas fa-key"></i> Parolni o'zgartirish
                </button>
            </div>

            <!-- Ishonchli qurilmalar -->
            <div class="profile-section">
                <div class="profile-section-title"><i class="fas fa-shield-alt" style="margin-right:4px;color:var(--accent)"></i>Xavfsizlik</div>
                <div style="font-size:13px;color:var(--text2);margin-bottom:14px">
                    Joriy qurilma ishonchli sifatida saqlangan. Shu qurilmadan kirganda Telegram kodi so'ralmaydi.
                </div>
                <button class="pf-btn" onclick="removeTrustedDevice()" 
                    style="background:rgba(245,158,11,0.1);color:#f59e0b;border:1px solid rgba(245,158,11,0.25);width:auto;padding:10px 24px;"
                    onmouseover="this.style.background='#f59e0b';this.style.color='#fff'"
                    onmouseout="this.style.background='rgba(245,158,11,0.1)';this.style.color='#f59e0b'">
                    <i class="fas fa-shield-alt"></i> Qurilma ishonchini olib tashlash
                </button>
            </div>

            <div class="profile-section">
                <div class="profile-section-title">Foydalanuvchilar</div>
                <div id="pf-users-list"></div>
                <button class="pf-btn" onclick="toggleAddUserForm()"
                    style="background:rgba(16,185,129,0.1);color:#10b981;border:1px solid rgba(16,185,129,0.25);margin-top:8px;"
                    onmouseover="this.style.background='#10b981';this.style.color='#fff'"
                    onmouseout="this.style.background='rgba(16,185,129,0.1)';this.style.color='#10b981'">
                    <i class="fas fa-user-plus"></i> Yangi foydalanuvchi
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
                            <label>Tasdiqlang</label>
                            <input type="password" id="pf-new-confirm2" placeholder="Qaytaring">
                        </div>
                        <div style="display:flex;gap:8px">
                            <button onclick="toggleAddUserForm()" style="flex:1;background:rgba(255,255,255,0.04);color:#94a3b8;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font);display:flex;align-items:center;justify-content:center;gap:6px;">
                                <i class="fas fa-times"></i> Bekor
                            </button>
                            <button onclick="addNewUserFromPage()" style="flex:1;background:var(--accent);color:#fff;border:none;border-radius:8px;padding:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font);display:flex;align-items:center;justify-content:center;gap:6px;">
                                <i class="fas fa-check"></i> Qo'shish
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="profile-section" style="border-color:rgba(239,68,68,0.15)">
                <div class="profile-section-title" style="color:#ef4444">Tizimdan chiqish</div>
                <p style="font-size:13px;color:var(--text2);margin-bottom:14px">Tizimdan chiqsangiz, qayta kirishda login va parol so'raladi.</p>
                <button class="pf-btn" onclick="if(confirm('Tizimdan chiqasizmi?'))logout()"
                    style="background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.25);width:auto;padding:10px 24px;"
                    onmouseover="this.style.background='#ef4444';this.style.color='#fff'"
                    onmouseout="this.style.background='rgba(239,68,68,0.1)';this.style.color='#ef4444'">
                    <i class="fas fa-sign-out-alt"></i> Chiqish
                </button>
            </div>
        </div>
    `;

    renderUsersListPage();
}

function removeTrustedDevice() {
    if (!confirm("Bu qurilmaning ishonchliligini olib tashlaysizmi?\nKeyingi kirishda Telegram kodi talab qilinadi.")) return;
    const currentUser = getCurrentUser();
    const devices = getTrustedDevices();
    const key = currentUser.toLowerCase();
    if (devices[key]) {
        devices[key] = devices[key].filter(id => id !== getDeviceId());
        localStorage.setItem(TRUSTED_DEVICES_KEY, JSON.stringify(devices));
    }
    alert("Qurilma ishonchi olib tashlandi. Keyingi kirishda Telegram kodi talab qilinadi.");
}

function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const profile = getProfile();
        profile.avatar = e.target.result;
        saveProfile(profile);
        const preview = document.getElementById('profile-avatar-preview');
        if (preview) preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
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
        <i class="fas fa-chevron-down" style="color:#64748b;font-size:10px"></i>
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
    if (suc) {
        suc.querySelector('span').textContent = "Ma'lumotlar saqlandi!";
        suc.style.display = 'flex';
        setTimeout(() => suc.style.display = 'none', 3000);
    }
}

function changePasswordFromPage() {
    const oldPass = document.getElementById('pf-old-pass').value;
    const newPass = document.getElementById('pf-new-pass').value;
    const confirmPass = document.getElementById('pf-confirm-pass').value;
    const currentUser = getCurrentUser();
    const errEl = document.getElementById('pf-error');
    const sucEl = document.getElementById('pf-pass-success');
    errEl.style.display = 'none'; sucEl.style.display = 'none';

    if (!checkLogin(currentUser, oldPass)) {
        errEl.querySelector('span').textContent = "Joriy parol noto'g'ri!";
        errEl.style.display = 'flex'; return;
    }
    if (newPass.length < 4) {
        errEl.querySelector('span').textContent = "Yangi parol kamida 4 ta belgi bo'lishi kerak!";
        errEl.style.display = 'flex'; return;
    }
    if (newPass !== confirmPass) {
        errEl.querySelector('span').textContent = "Yangi parollar mos kelmadi!";
        errEl.style.display = 'flex'; return;
    }

    saveUser(currentUser, newPass);
    const creds = getSavedCreds();
    if (creds && creds.username === currentUser) saveCreds(currentUser, newPass);

    sucEl.querySelector('span').textContent = "Parol muvaffaqiyatli o'zgartirildi!";
    sucEl.style.display = 'flex';
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
            ${u !== currentUser ? `
            <button onclick="deleteUserFromPage('${u}')" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#ef4444;border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;font-family:var(--font);transition:.15s;display:flex;align-items:center;gap:4px;"
                onmouseover="this.style.background='#ef4444';this.style.color='#fff'"
                onmouseout="this.style.background='rgba(239,68,68,0.1)';this.style.color='#ef4444'">
                <i class="fas fa-trash"></i>
            </button>` : ''}
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