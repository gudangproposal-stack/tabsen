// HADIR.ID CORE CLIENT CONTROLLER
// Handles multi-tenant routing, state management, and visual components

const state = {
  authToken: localStorage.getItem('hadir_auth_token') || null,
  currentUser: null,
  company: null,
  activationToken: null,

  // Employee PWA UI state
  activePwaTab: 'clock', // clock, history, profile
  clockingType: null, // 'in' or 'out'
  selfieBase64: null,
  gpsCoords: null,
  gpsSimulationMode: 'office', // 'office', 'outside', 'real'
  gpsLoading: false,
  gpsError: null,
  employeeHistoryLogs: [],
  todayAttendanceRecord: null,

  // Admin Dashboard state
  activeAdminTab: 'dashboard', // dashboard, employees, billing, setup, logs
  adminMetrics: { total: 0, hadir: 0, terlambat: 0, luar_lokasi: 0, belum_absen: 0 },
  todayRecordsTable: [],
  allEmployeesList: [],
  inviteHistoryLogs: [],
  globalHistoryLogs: [],
  csvPreviewRows: [],
  selectedCycle: 'monthly',
  activeMidtransTrx: null,

  // General Loading UI
  loadingSession: true
};

// UI Elements & Icons representation
const ICONS = {
  shield: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`,
  mapPin: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
  clock: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  users: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`,
  logout: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>`,
  check: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`,
  calendar: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
  user: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>`,
  upload: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>`
};

// INITIALIZATION LOGIC
window.addEventListener('DOMContentLoaded', () => {
  parseDeepLink();
  verifySession();
  setupGlobalUiListeners();
});

function parseDeepLink() {
  const path = window.location.pathname;
  if (path.includes('/activate/')) {
    const parts = path.split('/activate/');
    if (parts[1]) {
      state.activationToken = parts[1];
    }
  }
}

function setupGlobalUiListeners() {
  const lightbox = document.getElementById('lightbox');
  const closeBtn = document.getElementById('lightbox-close-btn');
  if (closeBtn && lightbox) {
    closeBtn.addEventListener('click', () => lightbox.classList.add('hidden'));
    lightbox.addEventListener('click', () => lightbox.classList.add('hidden'));
  }
}

function hideInitialSessionLoader() {
  const loader = document.getElementById('session-loader');
  if (loader) {
    loader.classList.add('opacity-0');
    setTimeout(() => loader.remove(), 300);
  }
}

async function verifySession() {
  if (!state.authToken) {
    state.loadingSession = false;
    hideInitialSessionLoader();
    renderApp();
    return;
  }

  try {
    const response = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${state.authToken}` }
    });
    const data = await response.json();
    if (response.ok) {
      state.currentUser = data.user;
      state.company = data.company;
      if (state.currentUser.role === 'admin') {
        await refreshAdminDashboardData();
      } else {
        await refreshEmployeeStatusAndLogs();
      }
    } else {
      handleClientLogout();
    }
  } catch (err) {
    console.warn('Session verification connection error', err);
    handleClientLogout();
  } finally {
    state.loadingSession = false;
    hideInitialSessionLoader();
    renderApp();
  }
}

function handleClientLoginSuccess(tokenValue, userValue) {
  localStorage.setItem('hadir_auth_token', tokenValue);
  state.authToken = tokenValue;
  state.currentUser = userValue;
  state.loadingSession = true;

  // Show dynamic loading
  const container = document.getElementById('app');
  container.innerHTML = `
    <div class="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
      <div class="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
      <p class="text-xs text-slate-400">Menyinkronkan sesi perusahaan...</p>
    </div>
  `;

  setTimeout(() => {
    verifySession();
  }, 1000);
}

function handleClientLogout() {
  localStorage.removeItem('hadir_auth_token');
  state.authToken = null;
  state.currentUser = null;
  state.company = null;
  state.activeMidtransTrx = null;
  renderApp();
}

// RESTORING SYSTEM DB HELPERS
async function resetDefaultSystemData() {
  if (!confirm('Apakah Anda yakin ingin meriset basis data demo Hadir.id kembali ke setelan default?')) return;
  try {
    const res = await fetch('/api/system/reset', { method: 'POST' });
    const data = await res.json();
    alert(data.message || 'Berhasil meriset system!');
    handleClientLogout();
  } catch (e) {
    alert('Gangguan koneksi reset.');
  }
}

// -------------------------------------------------------------
// SERVICE MODULE: FETCHERS
// -------------------------------------------------------------

async function refreshAdminDashboardData() {
  try {
    const headers = { 'Authorization': `Bearer ${state.authToken}` };
    
    // 1. Get Summarymetrics
    const resSum = await fetch('/api/dashboard/summary', { headers });
    const dataSum = await resSum.json();
    state.adminMetrics = dataSum.metrics;
    state.todayRecordsTable = dataSum.records || [];

    // 2. Get active invites
    const resInv = await fetch('/api/employees/invites', { headers });
    const dataInv = await resInv.json();
    state.inviteHistoryLogs = dataInv.invites || [];

    // 3. Get all active employees list
    const resEmp = await fetch('/api/employees/list', { headers });
    const dataEmp = await resEmp.json();
    state.allEmployeesList = dataEmp.employees || [];

    // 4. Get global history checkins default
    const resLogs = await fetch('/api/dashboard/history', { headers });
    const dataLogs = await resLogs.json();
    state.globalHistoryLogs = dataLogs.logs || [];

  } catch (e) {
    console.error('Failure fetching admin logs', e);
  }
}

async function queryAdminGlobalLogsWithFilters() {
  try {
    const headers = { 'Authorization': `Bearer ${state.authToken}` };
    let url = `/api/dashboard/history?token=1`;
    if (state.logStartDate) url += `&start_date=${state.logStartDate}`;
    if (state.logEndDate) url += `&end_date=${state.logEndDate}`;
    if (state.logEmployeeId) url += `&employee_id=${state.logEmployeeId}`;
    if (state.logDepartemen) url += `&departemen=${state.logDepartemen}`;

    const res = await fetch(url, { headers });
    const data = await res.json();
    state.globalHistoryLogs = data.logs || [];
  } catch (err) {
    console.error(err);
  }
}

async function refreshEmployeeStatusAndLogs() {
  try {
    const headers = { 'Authorization': `Bearer ${state.authToken}` };

    const resMe = await fetch('/api/auth/me', { headers });
    const dataMe = await resMe.json();
    state.currentUser = dataMe.user;
    state.company = dataMe.company;

    const resStatus = await fetch('/api/attendance/status', { headers });
    const dataStatus = await resStatus.json();
    state.todayAttendanceRecord = dataStatus.record;

    const resHist = await fetch('/api/attendance/self-history', { headers });
    const dataHist = await resHist.json();
    state.employeeHistoryLogs = dataHist.history || [];
  } catch (e) {
    console.error('Employee sync error', e);
  }
}

// -------------------------------------------------------------
// COORDINATE & GPS HANDLERS
// -------------------------------------------------------------
function acquireEmployeeLocation(onSuccessCallback) {
  if (state.gpsSimulationMode === 'office' && state.company) {
    state.gpsCoords = { lat: state.company.lat, long: state.company.long };
    state.gpsError = null;
    state.gpsLoading = false;
    if (onSuccessCallback) onSuccessCallback();
    return;
  }
  if (state.gpsSimulationMode === 'outside' && state.company) {
    state.gpsCoords = { lat: state.company.lat + 0.024, long: state.company.long + 0.024 };
    state.gpsError = null;
    state.gpsLoading = false;
    if (onSuccessCallback) onSuccessCallback();
    return;
  }

  state.gpsLoading = true;
  state.gpsError = null;
  state.gpsCoords = null;

  if (!navigator.geolocation) {
    state.gpsError = 'Browser Anda tidak mendukung Geolocation.';
    state.gpsLoading = false;
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.gpsCoords = { lat: pos.coords.latitude, long: pos.coords.longitude };
      state.gpsLoading = false;
      state.gpsError = null;
      if (onSuccessCallback) onSuccessCallback();
    },
    (err) => {
      console.warn(err);
      state.gpsError = 'Gagal melacak lokasi fisik asli. Harap gunakan simulator di atas.';
      state.gpsLoading = false;
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// Helper to construct a clean fallback base64 photo if no camera starts or user uploads
function generateMockSelfieFace() {
  const letters = state.currentUser ? state.currentUser.nama.substring(0, 2).toUpperCase() : 'ME';
  const colors = ['4f46e5', '059669', 'd97706', 'dc2626', '2563eb'];
  const rColor = colors[Math.floor(Math.random() * colors.length)];
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%23${rColor}"/><text x="50%" y="55%" font-family="sans-serif" font-size="28" fill="white" font-weight="bold" text-anchor="middle">${letters}</text></svg>`;
}

// -------------------------------------------------------------
// CENTRAL ROUTER & PORTALS RENDERER
// -------------------------------------------------------------
function renderApp() {
  const container = document.getElementById('app');
  container.innerHTML = '';

  // 1. Activation Invitation Onboarding Route
  if (state.activationToken) {
    renderActivationLandingView(container);
    return;
  }

  // 2. Unauthenticated Login/Register Forms
  if (!state.authToken || !state.currentUser) {
    renderAuthFormsView(container);
    return;
  }

  // 3. Admin view
  if (state.currentUser.role === 'admin') {
    renderAdminPanelView(container);
    return;
  }

  // 4. Employee view
  renderEmployeePwaView(container);
}

// -------------------------------------------------------------
// VIEW 1: AUTHENTICATION (LOGIN & REGISTRATION)
// -------------------------------------------------------------
let isRegisterMode = false;

function renderAuthFormsView(container) {
  const div = document.createElement('div');
  div.className = 'min-h-screen bg-slate-950 flex flex-col items-center justify-center py-12 px-4 animate-fade-in';
  
  div.innerHTML = `
    <div class="w-full max-w-md">
      
      <!-- Brand Launcher -->
      <div class="flex flex-col items-center mb-8">
        <div class="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/40 relative">
          <span class="text-white font-extrabold text-2xl font-display">H</span>
          <div class="absolute -bottom-1.5 -right-1.5 bg-yellow-500 text-slate-900 text-[10px] px-1 font-extrabold rounded-md">PRO</div>
        </div>
        <h1 class="text-3xl font-extrabold tracking-tight mt-3 text-white">Hadir<span class="text-indigo-400">.id</span></h1>
        <p class="text-xs text-slate-400 mt-1.5 text-center px-4">
          Aplikasi Absensi Multi-Tenant GPS + Selfie untuk Perusahaan Korporat Indonesia
        </p>
      </div>

      <!-- Main Panel Box -->
      <div class="bg-slate-900 rounded-3xl shadow-2xl p-8 border border-slate-800">
        
        <!-- Toggle Tabs -->
        <div class="grid grid-cols-2 bg-slate-850 rounded-xl p-1 mb-6">
          <button id="tab-login" class="py-2 text-xs font-bold rounded-lg transition ${!isRegisterMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}">
            Masuk Akun
          </button>
          <button id="tab-register" class="py-2 text-xs font-bold rounded-lg transition ${isRegisterMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}">
            Daftar Admin Baru
          </button>
        </div>

        <div id="auth-error" class="hidden p-3 bg-red-950/50 border border-red-800 text-red-300 text-xs rounded-xl mb-4 text-center"></div>

        ${!isRegisterMode ? `
          <!-- LOGIN PORT -->
          <form id="login-form" class="space-y-4">
            <div>
              <label class="block text-[11px] font-semibold uppercase text-slate-400 tracking-wide mb-1.5">Email Kantor / Karyawan</label>
              <input type="email" id="login-email" required placeholder="nama@perusahaan.com" class="w-full bg-slate-850 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition text-white" />
            </div>
            <div>
              <label class="block text-[11px] font-semibold uppercase text-slate-400 tracking-wide mb-1.5">Kata Sandi</label>
              <input type="password" id="login-password" required placeholder="••••••••" class="w-full bg-slate-850 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition text-white" />
            </div>

            <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-2.5 mt-2 rounded-xl transition shadow-md shadow-indigo-900/30">
              Masuk Aplikasi
            </button>
          </form>
        ` : `
          <!-- ADMIN REGISTER PORT -->
          <form id="register-form" class="space-y-3.5">
            <div>
              <label class="block text-[11px] font-semibold uppercase text-slate-400 tracking-wide">Nama Lengkap Admin / HR</label>
              <input type="text" id="reg-name" required placeholder="Budi Gunawan" class="w-full mt-1 bg-slate-850 border border-slate-700 rounded-xl px-3.5 py-1.5 text-sm focus:outline-none focus:border-indigo-500 text-white" />
            </div>
            <div>
              <label class="block text-[11px] font-semibold uppercase text-slate-400 tracking-wide">Email HR / Perusahaan</label>
              <input type="email" id="reg-email" required placeholder="hrd@perusahaan.com" class="w-full mt-1 bg-slate-850 border border-slate-700 rounded-xl px-3.5 py-1.5 text-sm focus:outline-none focus:border-indigo-500 text-white" />
            </div>
            <div>
              <label class="block text-[11px] font-semibold uppercase text-slate-400 tracking-wide">Nomor Handphone (Owner)</label>
              <input type="tel" id="reg-phone" required placeholder="0812XXXXXXXX" class="w-full mt-1 bg-slate-850 border border-slate-700 rounded-xl px-3.5 py-1.5 text-sm focus:outline-none focus:border-indigo-500 text-white" />
            </div>
            <div>
              <label class="block text-[11px] font-semibold uppercase text-slate-400 tracking-wide">Nama Perusahaan / Kantor</label>
              <input type="text" id="reg-company" required placeholder="PT Sinar Jasa Abadi" class="w-full mt-1 bg-slate-850 border border-slate-700 rounded-xl px-3.5 py-1.5 text-sm focus:outline-none focus:border-indigo-500 text-white" />
            </div>
            <div>
              <label class="block text-[11px] font-semibold uppercase text-slate-400 tracking-wide">Atur Kata Sandi Baru</label>
              <input type="password" id="reg-password" required placeholder="Min. 6 Karakter" class="w-full mt-1 bg-slate-850 border border-slate-700 rounded-xl px-3.5 py-1.5 text-sm focus:outline-none focus:border-indigo-500 text-white" />
            </div>
            <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-2.5 mt-4 rounded-xl transition shadow-md shadow-indigo-900/30">
              Daftar & Mulai Trial 14 Hari
            </button>
          </form>
        `}
      </div>

      <!-- Employee Activation Simulator Input -->
      <div class="bg-slate-900/50 border border-dashed border-indigo-950 rounded-2xl p-5 mt-6">
        <p class="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
          Simulator Aktivasi Karyawan
        </p>
        <p class="text-[10px] text-slate-400 mt-1 leading-relaxed">
          Jika Anda diundang oleh Admin dan memiliki Token Undangan, tempel token/tautan di bawah untuk mengaktifkan akun.
        </p>
        <div class="mt-3 flex gap-2">
          <input type="text" id="sim-invite-token" placeholder="Contoh: inv_demo123" class="flex-1 bg-slate-850 border border-slate-700 text-xs rounded-xl px-3 py-1.5 focus:outline-none text-white" value="inv_demo123" />
          <button id="sim-activate-btn" class="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold text-xs py-1.5 px-3 rounded-xl transition">
            Aktifkan &rarr;
          </button>
        </div>
      </div>

      <!-- Quick Seed Login Accounts (EXCELLENT DEMO COMPONENT) -->
      <div class="bg-slate-900 rounded-2xl p-4 mt-4 border border-slate-800">
        <p class="text-xs text-slate-400 font-bold mb-2">Akun Demo Instan (Siap Pakai):</p>
        <div class="grid grid-cols-2 gap-2 text-center">
          <button id="quick-login-admin" class="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] py-1.5 px-2 rounded-xl transition font-mono">
            Admin: admin@hadir.id (password: admin123)
          </button>
          <button id="quick-login-emp" class="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] py-1.5 px-2 rounded-xl transition font-mono">
            Karyawan: karyawan@hadir.id (password: karyawan123)
          </button>
        </div>
      </div>

      <!-- Clean footer badges -->
      <div class="mt-8 flex justify-center items-center gap-4 text-slate-500 text-[10px]">
        <span>Multi-Tenant Sandbox</span>
        <span>&bull;</span>
        <span>GPS Geofenced</span>
        <span>&bull;</span>
        <span>SHAH-256 Secured</span>
      </div>

    </div>
  `;

  container.appendChild(div);

  // Setup local triggers
  document.getElementById('tab-login')?.addEventListener('click', () => {
    isRegisterMode = false;
    renderAuthFormsView(container);
  });
  document.getElementById('tab-register')?.addEventListener('click', () => {
    isRegisterMode = true;
    renderAuthFormsView(container);
  });

  // Handle Quick loggers
  document.getElementById('quick-login-admin')?.addEventListener('click', () => {
    document.getElementById('login-email').value = 'admin@hadir.id';
    document.getElementById('login-password').value = 'admin123';
  });
  document.getElementById('quick-login-emp')?.addEventListener('click', () => {
    document.getElementById('login-email').value = 'karyawan@hadir.id';
    document.getElementById('login-password').value = 'karyawan123';
  });

  // Simulator activation triggers
  document.getElementById('sim-activate-btn')?.addEventListener('click', () => {
    const tokenInput = document.getElementById('sim-invite-token').value.trim();
    if (!tokenInput) {
      alert('Masukkan Token Invite dahulu.');
      return;
    }
    state.activationToken = tokenInput;
    renderApp();
  });

  // Bind Form Dispatches
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const errorDiv = document.getElementById('auth-error');
      errorDiv.classList.add('hidden');

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
          handleClientLoginSuccess(data.token, data.user);
        } else {
          errorDiv.innerText = data.error || 'Login gagal';
          errorDiv.classList.remove('hidden');
        }
      } catch (err) {
        errorDiv.innerText = 'Koneksi ke server terganggu';
        errorDiv.classList.remove('hidden');
      }
    });
  }

  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nama = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const nomor_hp = document.getElementById('reg-phone').value.trim();
      const nama_perusahaan = document.getElementById('reg-company').value.trim();
      const password = document.getElementById('reg-password').value;
      const errorDiv = document.getElementById('auth-error');
      errorDiv.classList.add('hidden');

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nama, email, nomor_hp, nama_perusahaan, password })
        });
        const data = await response.json();
        if (response.ok) {
          handleClientLoginSuccess(data.token, data.user);
        } else {
          errorDiv.innerText = data.error || 'Pendaftaran gagal';
          errorDiv.classList.remove('hidden');
        }
      } catch (err) {
        errorDiv.innerText = 'Koneksi ke server pendaftaran terputus';
        errorDiv.classList.remove('hidden');
      }
    });
  }
}

// -------------------------------------------------------------
// VIEW 2: ACTIVATION LANDING ONBOARDING INTERFACE
// -------------------------------------------------------------
let activationDetailData = null;

async function renderActivationLandingView(container) {
  const div = document.createElement('div');
  div.className = 'min-h-screen bg-slate-900 py-10 px-4 flex flex-col items-center justify-center text-white animate-fade-in';

  container.appendChild(div);

  if (!activationDetailData) {
    div.innerHTML = `
      <div class="text-center py-8">
        <div class="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-xs text-slate-300">Menghubungkan ke institusi rujukan Anda...</p>
      </div>
    `;

    try {
      const response = await fetch(`/api/activation/detail/${state.activationToken}`);
      const data = await response.json();
      if (response.ok) {
        activationDetailData = data;
      } else {
        div.innerHTML = `
          <div class="bg-slate-800 max-w-md w-full p-8 border border-slate-750 text-center rounded-3xl">
            <span class="text-3xl">⚠️</span>
            <h2 class="text-lg font-bold mt-2">Undangan Tidak Valid</h2>
            <p class="text-xs text-slate-400 mt-2">${data.error || 'Token expired atau sudah diaktifkan.'}</p>
            <button id="back-activator" class="mt-6 w-full bg-slate-700 py-2.5 rounded-xl text-xs font-bold transition">Kembali ke Halaman Utama</button>
          </div>
        `;
        document.getElementById('back-activator')?.addEventListener('click', () => {
          state.activationToken = null;
          renderApp();
        });
        return;
      }
    } catch (e) {
      div.innerHTML = `<p class="text-red-400">Kesalahan menghubungi server.</p>`;
      return;
    }
  }

  // Loaded invite detail setup form
  div.innerHTML = `
    <div class="bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-750">
      
      <!-- Blue badge header -->
      <div class="bg-indigo-600 p-6 text-center relative">
        <p class="text-[10px] uppercase tracking-wider text-indigo-200 font-semibold">Tautan Integrasi Karyawan</p>
        <h1 class="text-xl font-bold mt-1 text-white">${activationDetailData.company_name}</h1>
        <p class="text-xs text-indigo-150">Aktivasi akun karyawan baru di Hadir.id</p>
      </div>

      <form id="activation-form" class="p-6 space-y-4">
        <div class="bg-slate-700/50 p-4 rounded-xl border border-slate-700 text-xs space-y-1">
          <p class="font-bold text-indigo-300 tracking-wide">ID UTAMA:</p>
          <div class="grid grid-cols-2 gap-2 mt-1">
            <div>
              <p class="text-slate-400 text-[10px]">Nama Karyawan</p>
              <p class="font-bold text-white text-xs">${activationDetailData.nama}</p>
            </div>
            <div>
              <p class="text-slate-400 text-[10px]">Departemen / Jabatan</p>
              <p class="font-bold text-white text-xs">${activationDetailData.departemen} - ${activationDetailData.jabatan}</p>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Daftarkan Nomor Handphone HP (WhatsApp)</label>
          <input type="tel" id="act-phone" required placeholder="Contoh: 0812345678" class="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-xs focus:outline-indigo-500 text-white" value="${activationDetailData.nomor_hp || ''}" />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Set Kata Sandi Baru Anda</label>
          <input type="password" id="act-password" required placeholder="Min 6 Karakter" class="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-xs focus:outline-indigo-500 text-white" />
        </div>

        <!-- CAMERA INTERFACE SIM -->
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center">
          <p class="text-[11px] font-semibold text-slate-400 mb-2">Ambil Foto Wajah Referensi Anda (Wajib)</p>
          <div class="w-32 h-32 rounded-full border-4 border-indigo-500 overflow-hidden bg-slate-800 flex items-center justify-center relative">
            <span id="act-photo-preview" class="text-xs text-slate-500 font-bold select-none text-center">Foto Karyawan</span>
            <img id="act-photo-img" src="" class="hidden w-full h-full object-cover" />
          </div>
          <div class="w-full flex gap-2 mt-4 text-center justify-center">
            <button type="button" id="act-btn-mock" class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[10px] py-1.5 px-3 rounded-lg transition">Mulai Kamera (Simulasi)</button>
            <label class="bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-[10px] py-1.5 px-3 rounded-lg cursor-pointer transition">
              Atau Cari File Foto
              <input type="file" id="act-file-picker" accept="image/*" class="hidden" />
            </label>
          </div>
        </div>

        <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl transition">
          Selesaikan Aktivasi & Masuk Akun
        </button>

        <button type="button" id="act-btn-cancel" class="w-full bg-transparent hover:underline text-slate-400 text-xs">Abaikan Undangan</button>
      </form>
    </div>
  `;

  let localSelfieBase64 = null;

  document.getElementById('act-btn-mock')?.addEventListener('click', () => {
    // Inject mock face base64
    localSelfieBase64 = generateMockSelfieFace();
    const previewText = document.getElementById('act-photo-preview');
    const previewImg = document.getElementById('act-photo-img');
    if (previewText && previewImg) {
      previewText.classList.add('hidden');
      previewImg.src = localSelfieBase64;
      previewImg.classList.remove('hidden');
    }
  });

  document.getElementById('act-file-picker')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        localSelfieBase64 = reader.result;
        const previewText = document.getElementById('act-photo-preview');
        const previewImg = document.getElementById('act-photo-img');
        if (previewText && previewImg) {
          previewText.classList.add('hidden');
          previewImg.src = localSelfieBase64;
          previewImg.classList.remove('hidden');
        }
      };
      reader.readAsDataURL(file);
    }
  });

  document.getElementById('act-btn-cancel')?.addEventListener('click', () => {
    state.activationToken = null;
    activationDetailData = null;
    renderApp();
  });

  const actForm = document.getElementById('activation-form');
  actForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('act-password').value;
    const phone = document.getElementById('act-phone').value.trim();

    if (!localSelfieBase64) {
      alert('Foto selfie wajib disediakan sebagai referensi Admin.');
      return;
    }
    if (password.length < 6) {
      alert('Password minimal 6 karakter keamanan.');
      return;
    }

    try {
      const res = await fetch('/api/activation/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: state.activationToken,
          password: password,
          nomor_hp: phone,
          foto_wajah_base64: localSelfieBase64
        })
      });

      const resData = await res.json();
      if (res.ok) {
        alert('Aktivasi sukses! Terbuka otomatis.');
        state.activationToken = null;
        activationDetailData = null;
        handleClientLoginSuccess(resData.token, resData.user);
      } else {
        alert(resData.error || 'Aktivasi gagal.');
      }
    } catch (err) {
      alert('Gagal mengirim aktivasi.');
    }
  });
}

// -------------------------------------------------------------
// VIEW 3: EMPLOYEE COCKPIT PHONE CONTAINER (PWA)
// -------------------------------------------------------------
function renderEmployeePwaView(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'min-h-screen bg-slate-950 p-4 md:py-8 flex items-center justify-center animate-fade-in';
  container.appendChild(wrapper);

  wrapper.innerHTML = `
    <!-- SMARTPHONE DEVICE MOCKUP BORDER -->
    <div class="w-full max-w-sm bg-slate-900 rounded-[40px] shadow-2xl border-8 border-slate-800 overflow-hidden relative flex flex-col h-[740px] text-white">
      
      <!-- Smartphone camera pill mockup bezel -->
      <div class="absolute top-2 left-1/2 -translateX-1/2 w-28 h-5 bg-slate-800 rounded-full z-20 flex items-center justify-center">
        <div class="w-2 h-2 rounded-full bg-slate-900 mr-2"></div>
        <div class="w-10 h-1 bg-slate-900 rounded"></div>
      </div>

      <!-- Header Smartphone PWA -->
      <div class="bg-indigo-600 px-5 pt-8 pb-5 shrink-0 border-b border-indigo-500 relative">
        <div class="flex justify-between items-center">
          <span class="text-[9px] font-mono bg-indigo-500 text-indigo-150 font-bold px-2 py-0.5 rounded">
            HADIR.ID MOBILE PWA
          </span>
          <button id="pwa-logout-btn" class="p-1 hover:bg-white/10 rounded text-indigo-100 hover:text-white transition" title="Logout Sesi">
            ${ICONS.logout}
          </button>
        </div>
        <h2 class="text-base font-bold mt-2 flex items-center gap-1 leading-tight text-white truncate">
          ${state.company ? state.company.name : 'Sedang Memuat Kantor...'}
        </h2>
        <p class="text-[11px] text-indigo-100 capitalize font-medium">${state.currentUser.nama} (${state.currentUser.jabatan || 'Staf'})</p>
      </div>

      <!-- PWA Dynamis Content Body -->
      <div id="pwa-body" class="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
        <!-- SPA sub-tab inside Employee PWA will inject here -->
      </div>

      <!-- SMARTPHONE STICKY FOOTER TABS -->
      <div class="bg-slate-850 border-t border-slate-800 h-16 shrink-0 flex justify-around items-center px-4 z-10">
        <button id="pwa-tab-clock" class="flex flex-col items-center gap-1 transition ${state.activePwaTab === 'clock' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-300'}">
          ${ICONS.clock}
          <span class="text-[10px]">Absen</span>
        </button>

        <button id="pwa-tab-history" class="flex flex-col items-center gap-1 transition ${state.activePwaTab === 'history' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-300'}">
          ${ICONS.calendar}
          <span class="text-[10px]">Riwayat</span>
        </button>

        <button id="pwa-tab-profile" class="flex flex-col items-center gap-1 transition ${state.activePwaTab === 'profile' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-300'}">
          ${ICONS.user}
          <span class="text-[10px]">Profil</span>
        </button>
      </div>

    </div>
  `;

  // Bind tabs navigation
  document.getElementById('pwa-logout-btn')?.addEventListener('click', handleClientLogout);
  
  document.getElementById('pwa-tab-clock')?.addEventListener('click', () => {
    state.activePwaTab = 'clock';
    state.clockingType = null;
    renderEmployeePwaView(container);
  });
  document.getElementById('pwa-tab-history')?.addEventListener('click', () => {
    state.activePwaTab = 'history';
    state.clockingType = null;
    renderEmployeePwaView(container);
  });
  document.getElementById('pwa-tab-profile')?.addEventListener('click', () => {
    state.activePwaTab = 'profile';
    state.clockingType = null;
    renderEmployeePwaView(container);
  });

  // Inject content inside Smartphone body
  const pwaBody = document.getElementById('pwa-body');
  
  if (state.clockingType) {
    renderPwaClockingActionModule(pwaBody);
  } else if (state.activePwaTab === 'clock') {
    renderPwaDashboard(pwaBody);
  } else if (state.activePwaTab === 'history') {
    renderPwaLogs(pwaBody);
  } else {
    renderPwaProfile(pwaBody);
  }
}

// Sub-Module: Home clock tab Dashboard
function renderPwaDashboard(parent) {
  const recIn = state.todayAttendanceRecord?.jam_clock_in || '--:--:--';
  const recOut = state.todayAttendanceRecord?.jam_clock_out || '--:--:--';
  const recStatus = state.todayAttendanceRecord?.status || 'Belum Absen';

  parent.innerHTML = `
    <!-- Selfie avatar photo summary -->
    <div class="bg-slate-850 p-4 border border-slate-800 rounded-3xl flex items-center gap-4 relative overflow-hidden">
      <div class="w-14 h-14 rounded-full border-2 border-indigo-400 overflow-hidden shrink-0 bg-slate-700 flex items-center justify-center">
        ${state.currentUser.foto_wajah_url ? 
          `<img src="${state.currentUser.foto_wajah_url}" alt="My Face Reference" class="w-full h-full object-cover pointer-events-none" />` : 
          `<span class="text-[10px] text-slate-400">No Face</span>`
        }
      </div>
      <div>
        <p class="text-xs text-slate-400">Selamat Bekerja,</p>
        <h3 class="font-extrabold text-white text-sm tracking-tight leading-tight">${state.currentUser.nama}</h3>
        <span class="text-[10px] font-mono text-indigo-400 bg-indigo-950/60 font-semibold px-2 py-0.5 rounded inline-block mt-1">
          ${state.currentUser.departemen || 'Staf'}
        </span>
      </div>
    </div>

    <!-- Clock summary info -->
    <div class="bg-slate-850 border border-slate-800 p-4 rounded-3xl text-center space-y-3">
      <p class="text-[10px] text-indigo-200 uppercase tracking-widest font-extrabold">Hari Ini</p>
      
      <div class="grid grid-cols-2 gap-2 text-center">
        <div class="bg-slate-800/40 p-2.5 border border-slate-750 rounded-xl">
          <p class="text-[9px] text-slate-400">MASUK (IN)</p>
          <p class="text-sm font-bold text-emerald-400 mt-1">${recIn}</p>
        </div>
        <div class="bg-slate-800/40 p-2.5 border border-slate-750 rounded-xl">
          <p class="text-[9px] text-slate-400">PULANG (OUT)</p>
          <p class="text-sm font-bold text-amber-500 mt-1">${recOut}</p>
        </div>
      </div>

      ${state.todayAttendanceRecord ? `
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-950/80 border border-indigo-900 text-indigo-200">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Status: <span class="uppercase">${recStatus.replace('_', ' ')}</span>
        </div>
      ` : ''}
    </div>

    <!-- Giant Clocking Controller triggers -->
    <div class="space-y-3 pt-2">
      ${!state.todayAttendanceRecord?.jam_clock_in ? `
        <button id="pwa-clockin-btn" class="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] py-8 rounded-[30px] flex flex-col items-center justify-center transition shadow-lg text-white border border-indigo-500">
          <span class="font-extrabold text-sm uppercase tracking-wide">Lapor Absensi Masuk</span>
          <span class="font-black text-xl mt-1">CLOCK IN</span>
        </button>
      ` : !state.todayAttendanceRecord?.jam_clock_out ? `
        <button id="pwa-clockout-btn" class="w-full bg-amber-600 hover:bg-amber-700 active:scale-[0.98] py-8 rounded-[30px] flex flex-col items-center justify-center transition shadow-lg text-white border border-amber-500">
          <span class="font-extrabold text-sm uppercase tracking-wide">Lapor Absensi Pulang</span>
          <span class="font-black text-xl mt-1">CLOCK OUT</span>
        </button>
      ` : `
        <div class="bg-emerald-950/20 border border-emerald-900/60 p-5 rounded-[30px] text-center flex flex-col items-center">
          <span class="text-2xl">✅</span>
          <p class="font-bold text-xs mt-2 text-emerald-400">Absensi Hari Ini Selesai</p>
          <p class="text-[10px] text-slate-400 mt-1">Pencatatan check-in dan checkout tersimpan rapi!</p>
        </div>
      `}
    </div>

    <!-- Schedule summary details border -->
    <div class="bg-slate-850 p-3.5 border border-slate-800 rounded-2xl text-[10px] text-slate-400 space-y-2">
      <div class="flex justify-between">
        <span>Lokasi Kantor Rujukan:</span>
        <span class="text-slate-100 font-semibold font-mono">${state.company ? state.company.lat.toFixed(4) : '-0'}, ${state.company ? state.company.long.toFixed(4) : '0'}</span>
      </div>
      <div class="flex justify-between">
        <span>Jam Masuk Geofence:</span>
        <span class="text-slate-100 font-semibold">${state.company ? state.company.jam_masuk : '--:--'}</span>
      </div>
      <div class="flex justify-between">
        <span>Toleransi Keterlambatan:</span>
        <span class="text-indigo-400 font-bold">${state.company ? state.company.toleransi_menit : '15'} Menit</span>
      </div>
    </div>
  `;

  // Bind clicks
  document.getElementById('pwa-clockin-btn')?.addEventListener('click', () => {
    state.clockingType = 'in';
    state.selfieBase64 = null;
    state.gpsCoords = null;
    acquireEmployeeLocation(() => renderEmployeePwaView(document.getElementById('app')));
    renderEmployeePwaView(document.getElementById('app'));
  });

  document.getElementById('pwa-clockout-btn')?.addEventListener('click', () => {
    state.clockingType = 'out';
    state.selfieBase64 = null;
    state.gpsCoords = null;
    acquireEmployeeLocation(() => renderEmployeePwaView(document.getElementById('app')));
    renderEmployeePwaView(document.getElementById('app'));
  });
}

// Sub-Module: Clocking with GPS and Selfie
function renderPwaClockingActionModule(parent) {
  parent.innerHTML = `
    <div class="bg-slate-850 p-4 rounded-3xl border border-indigo-950/40 space-y-4">
      <div class="flex justify-between items-center bg-slate-800/50 p-2 rounded-lg">
        <h3 class="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
          Clock-in Mode: ${state.clockingType.toUpperCase()}
        </h3>
        <button id="act-clock-cancel" class="text-xs font-bold text-slate-400 hover:text-white underline">Batal</button>
      </div>

      <!-- GPS Tracking Box -->
      <div class="bg-slate-800 p-3 rounded-2xl border border-slate-700 space-y-2">
        <div class="flex justify-between items-center">
          <span class="text-[10px] text-slate-400 font-semibold uppercase">Koordinat GPS</span>
          <button id="pwa-gps-refresh-btn" class="text-[9px] bg-indigo-600 px-2 py-0.5 rounded hover:bg-indigo-700 transition font-bold uppercase">Update</button>
        </div>

        <div class="bg-slate-850 p-2 rounded-xl text-[11px] font-mono">
          ${state.gpsLoading ? `<span class="text-slate-400 animate-pulse">Melacak koordinat satelit...</span>` : 
            state.gpsCoords ? `<p class="text-emerald-400">Lat: ${state.gpsCoords.lat.toFixed(6)}</p><p class="text-emerald-400">Long: ${state.gpsCoords.long.toFixed(6)}</p>` :
            `<span class="text-yellow-400 font-sans">${state.gpsError || 'Gagal melacak lokasi.'}</span>`
          }
        </div>

        <!-- GPS Simulator switches -->
        <div class="pt-2 border-t border-slate-700 space-y-1">
          <label class="text-[9px] text-slate-400 block font-semibold uppercase">Uji Coba Presensi (Mock):</label>
          <div class="grid grid-cols-3 gap-1">
            <button id="gps-mock-inside" class="text-[9px] py-1 font-bold rounded ${state.gpsSimulationMode === 'office' ? 'bg-emerald-600 text-white' : 'bg-slate-750 text-slate-200'}">Dalam Kantor</button>
            <button id="gps-mock-outside" class="text-[9px] py-1 font-bold rounded ${state.gpsSimulationMode === 'outside' ? 'bg-amber-600 text-white' : 'bg-slate-750 text-slate-200'}">Luar Kantor</button>
            <button id="gps-mock-real" class="text-[10px] py-0.5 font-bold rounded ${state.gpsSimulationMode === 'real' ? 'bg-indigo-600 text-white' : 'bg-slate-750 text-slate-200'}">GPS Asli</button>
          </div>
        </div>
      </div>

      <!-- SELFIE MODULE -->
      <div class="bg-slate-800 p-3 rounded-2xl border border-slate-700 space-y-3 text-center">
        <span class="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">Foto Selfie Wajah Anda</span>
        
        <div class="w-32 h-32 rounded-full overflow-hidden mx-auto border-2 border-slate-600 bg-slate-900 flex items-center justify-center">
          ${state.selfieBase64 ? 
            `<img src="${state.selfieBase64}" class="w-full h-full object-cover pointer-events-none" />` :
            `<span class="text-xs text-slate-500 font-bold">Kamera Mati</span>`
          }
        </div>

        <div class="flex gap-1.5 justify-center">
          <button type="button" id="pwa-photo-mock" class="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] px-2.5 py-1 rounded font-semibold transition">Gunakan Kamera (Mock)</button>
          <label class="bg-slate-700 hover:bg-slate-650 text-slate-200 text-[10px] px-2.5 py-1 rounded cursor-pointer transition font-semibold">
            Upload File
            <input type="file" id="pwa-photo-file" accept="image/*" class="hidden" />
          </label>
        </div>
      </div>

      <button id="pwa-clock-submit" class="w-full bg-indigo-600 hover:bg-indigo-700 py-3.5 rounded-2xl transition font-black text-xs text-indigo-100 uppercase tracking-wider shadow-md hover:text-white">
        Kirim Presensi Absen
      </button>

    </div>
  `;

  // Bind clicks
  document.getElementById('act-clock-cancel')?.addEventListener('click', () => {
    state.clockingType = null;
    renderEmployeePwaView(document.getElementById('app'));
  });

  document.getElementById('pwa-gps-refresh-btn')?.addEventListener('click', () => {
    acquireEmployeeLocation(() => renderEmployeePwaView(document.getElementById('app')));
    renderEmployeePwaView(document.getElementById('app'));
  });

  document.getElementById('gps-mock-inside')?.addEventListener('click', () => {
    state.gpsSimulationMode = 'office';
    acquireEmployeeLocation(() => renderEmployeePwaView(document.getElementById('app')));
    renderEmployeePwaView(document.getElementById('app'));
  });
  document.getElementById('gps-mock-outside')?.addEventListener('click', () => {
    state.gpsSimulationMode = 'outside';
    acquireEmployeeLocation(() => renderEmployeePwaView(document.getElementById('app')));
    renderEmployeePwaView(document.getElementById('app'));
  });
  document.getElementById('gps-mock-real')?.addEventListener('click', () => {
    state.gpsSimulationMode = 'real';
    acquireEmployeeLocation(() => renderEmployeePwaView(document.getElementById('app')));
    renderEmployeePwaView(document.getElementById('app'));
  });

  document.getElementById('pwa-photo-mock')?.addEventListener('click', () => {
    state.selfieBase64 = generateMockSelfieFace();
    renderEmployeePwaView(document.getElementById('app'));
  });

  document.getElementById('pwa-photo-file')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const r = new FileReader();
      r.onloadend = () => {
        state.selfieBase64 = r.result;
        renderEmployeePwaView(document.getElementById('app'));
      };
      r.readAsDataURL(file);
    }
  });

  document.getElementById('pwa-clock-submit')?.addEventListener('click', async () => {
    if (!state.selfieBase64) {
      alert('Foto selfie wajib disediakan.');
      return;
    }
    if (!state.gpsCoords) {
      alert('Lokasi GPS tidak terlacak.');
      return;
    }

    try {
      const response = await fetch('/api/attendance/clock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.authToken}`
        },
        body: JSON.stringify({
          type: state.clockingType,
          lat: state.gpsCoords.lat,
          long: state.gpsCoords.long,
          selfie_base64: state.selfieBase64
        })
      });

      const resData = await response.json();
      if (response.ok) {
        alert(resData.message || 'Sukses!');
        state.clockingType = null;
        state.selfieBase64 = null;
        await refreshEmployeeStatusAndLogs();
      } else {
        alert(resData.error || 'Gagal menyimpan absensi Anda.');
      }
    } catch (e) {
      alert('Sambungan internet absensi bermasalah.');
    } finally {
      renderEmployeePwaView(document.getElementById('app'));
    }
  });
}

// Sub-Module: Logs History list
function renderPwaLogs(parent) {
  parent.innerHTML = `
    <div class="flex justify-between items-center">
      <h3 class="text-xs font-bold uppercase text-slate-400">Log Kehadiran Anda</h3>
      <span class="text-[10px] font-mono text-indigo-400 font-bold">${state.employeeHistoryLogs.length} Sesi</span>
    </div>

    <div class="space-y-2.5">
      ${state.employeeHistoryLogs.length === 0 ? `
        <p class="text-xs text-slate-500 py-12 text-center">Belum ada catatan terekam.</p>
      ` : state.employeeHistoryLogs.map((log) => `
        <div class="bg-slate-850 border border-slate-800 p-3.5 rounded-2xl space-y-2 text-slate-300">
          <div class="flex justify-between items-center text-xs">
            <span class="font-bold text-slate-100 font-mono">${log.tanggal}</span>
            <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
              log.status === 'hadir' ? 'bg-emerald-950/80 text-emerald-400' :
              log.status === 'terlambat' ? 'bg-amber-950/80 text-amber-500' :
              'bg-red-950/80 text-red-500'
            }">${log.status.replace('_', ' ')}</span>
          </div>

          <div class="grid grid-cols-2 gap-2 text-[10px] font-mono pt-2 border-t border-slate-800">
            <div>
              <p class="text-gray-400 text-[9px]">CLOCK IN</p>
              <p class="font-bold text-white mt-0.5">${log.jam_clock_in || '--:--'}</p>
              ${log.selfie_in_url ? `<img src="${log.selfie_in_url}" class="mt-1 w-10 h-10 object-cover rounded-lg border border-slate-700 pointer-events-auto cursor-pointer flex" onclick="openGlobalLightboxPortalRef('${encodeURIComponent(log.selfie_in_url)}')" />` : ''}
            </div>
            <div>
              <p class="text-gray-400 text-[9px]">CLOCK OUT</p>
              <p class="font-bold text-white mt-0.5">${log.jam_clock_out || '--:--'}</p>
              ${log.selfie_out_url ? `<img src="${log.selfie_out_url}" class="mt-1 w-10 h-10 object-cover rounded-lg border border-slate-700 pointer-events-auto cursor-pointer flex" onclick="openGlobalLightboxPortalRef('${encodeURIComponent(log.selfie_out_url)}')" />` : ''}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Sub-Module: Profile updates
function renderPwaProfile(parent) {
  parent.innerHTML = `
    <div class="text-center pb-4 border-b border-slate-800">
      <div class="w-20 h-20 rounded-full border-4 border-indigo-500 overflow-hidden mx-auto bg-slate-800 flex items-center justify-center">
        ${state.currentUser.foto_wajah_url ? 
          `<img src="${state.currentUser.foto_wajah_url}" class="w-full h-full object-cover" />` : 
          `<span class="text-xs text-slate-500 font-bold">No Face</span>`
        }
      </div>
      <h3 class="font-extrabold text-white text-base mt-2 leading-tight">${state.currentUser.nama}</h3>
      <p class="text-[11px] text-slate-400 mt-1">${state.currentUser.email}</p>
    </div>

    <form id="pwa-settings-form" class="space-y-4 pt-1">
      <div>
        <label class="block text-[9px] text-slate-400 uppercase font-bold">Nomor WhatsApp HP</label>
        <input type="tel" id="pwa-upd-phone" placeholder="WhatsApp Number" class="w-full mt-1 bg-slate-850 border border-slate-750 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-indigo-500 text-white" value="${state.currentUser.nomor_hp || ''}" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <span class="block text-[9px] text-slate-400 uppercase font-bold">Jabatan Kerja</span>
          <span class="block text-xs font-bold text-slate-300 mt-1 bg-slate-850 px-3 py-2 rounded-xl text-center border border-slate-750 font-mono">${state.currentUser.jabatan || 'Staf'}</span>
        </div>
        <div>
          <span class="block text-[9px] text-slate-400 uppercase font-bold">Departemen</span>
          <span class="block text-xs font-bold text-slate-300 mt-1 bg-slate-850 px-3 py-2 rounded-xl text-center border border-slate-750 font-mono">${state.currentUser.departemen || 'Umum'}</span>
        </div>
      </div>

      <button type="submit" class="w-full bg-slate-800 hover:bg-slate-750 py-2.5 rounded-xl text-xs font-bold transition">Perbarui Profile WhatsApp</button>
    </form>
  `;

  document.getElementById('pwa-settings-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nomor_hp = document.getElementById('pwa-upd-phone').value.trim();
    try {
      const response = await fetch('/api/company/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.authToken}`
        },
        body: JSON.stringify({
          // Mock saving employee variables
        })
      });
      // Directly simulate saving in state
      state.currentUser.nomor_hp = nomor_hp;
      alert('Selesai memperbarui WhatsApp Anda!');
      renderEmployeePwaView(document.getElementById('app'));
    } catch (e) {
      alert('Gagal.');
    }
  });
}

// -------------------------------------------------------------
// VIEW 4: ADMIN DASHBOARD (MULTI MODULE MANAGEMENTS)
// -------------------------------------------------------------
function renderAdminPanelView(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 animate-fade-in';
  container.appendChild(wrapper);

  wrapper.innerHTML = `
    <!-- MAIN NAVIGATION TOPBAR -->
    <header class="bg-indigo-950 text-white shadow-md">
      <div class="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg">H</div>
          <div>
            <h1 class="text-lg font-black tracking-tight leading-none flex items-center gap-1.5 font-display">
              Hadir.id <span class="text-[10px] uppercase font-mono bg-indigo-800 text-indigo-300 px-2 py-0.5 rounded-md">Admin</span>
            </h1>
            <p class="text-[10px] text-gray-400 mt-1 uppercase font-semibold font-mono tracking-wide">${state.company ? state.company.name : 'Loading Company...'}</p>
          </div>
        </div>

        <!-- Dashboard tab bar triggers -->
        <nav class="flex flex-wrap gap-1 leading-none text-xs">
          <button id="nav-btn-dash" class="px-3.5 py-2 font-bold rounded-lg transition ${state.activeAdminTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-indigo-900/40'}">Dashboard</button>
          <button id="nav-btn-emp" class="px-3.5 py-2 font-bold rounded-lg transition ${state.activeAdminTab === 'employees' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-indigo-900/40'}">Karyawan</button>
          <button id="nav-btn-setup" class="px-3.5 py-2 font-bold rounded-lg transition ${state.activeAdminTab === 'setup' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-indigo-900/40'}">Gedung & GPS</button>
          <button id="nav-btn-bill" class="px-3.5 py-2 font-bold rounded-lg transition ${state.activeAdminTab === 'billing' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-indigo-900/40'}">Midtrans Billing</button>
          <button id="nav-btn-logs" class="px-3.5 py-2 font-bold rounded-lg transition ${state.activeAdminTab === 'logs' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-indigo-900/40'}">Laporan Riwayat</button>
        </nav>

        <div class="flex items-center gap-2">
          <button id="opt-reset" class="bg-indigo-900 hover:bg-indigo-800 text-yellow-300 font-bold text-[10px] py-1.5 px-3 rounded-lg transition" title="Riset database sistem demo">Riset Demo DB</button>
          <button id="opt-logout" class="bg-indigo-800 hover:bg-indigo-700 text-white shrink-0 p-2 rounded-lg transition">
            ${ICONS.logout}
          </button>
        </div>
      </div>
    </header>

    <!-- CONTENT DISPLAY GROUND -->
    <main class="max-w-7xl mx-auto p-4 md:py-8 flex-1 w-full space-y-6">
      
      <!-- Company metadata subscription banner status check -->
      ${state.company ? `
        <div class="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-3.5 rounded-2xl flex flex-wrap justify-between items-center gap-3 border border-indigo-950/50">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <p class="text-xs font-semibold">Tipe Langganan Tenant Kantor: 
              <span class="uppercase font-extrabold text-yellow-400 tracking-wider text-[11px] font-mono select-all bg-indigo-900/40 px-2.5 py-0.5 rounded-md inline-flex">
                ${state.company.subscription_plan} - ${state.company.subscription_status}
              </span>
            </p>
          </div>
          <p class="text-[10px] text-indigo-300 font-mono tracking-tight font-medium uppercase">
            Isolasi Enskripsi: comp_${state.company.id.substring(0, 10)}
          </p>
        </div>
      ` : ''}

      <!-- Dynamic administrative active panels modules -->
      <div id="admin-module">
        <!-- Sub components will load -->
      </div>

    </main>
  `;

  // Bind actions
  document.getElementById('opt-logout')?.addEventListener('click', handleClientLogout);
  document.getElementById('opt-reset')?.addEventListener('click', resetDefaultSystemData);

  const bindTabBtn = (id, tabName) => {
    document.getElementById(id)?.addEventListener('click', async () => {
      state.activeAdminTab = tabName;
      state.loadingSession = true;
      await refreshAdminDashboardData();
      state.loadingSession = false;
      renderAdminPanelView(container);
    });
  };

  bindTabBtn('nav-btn-dash', 'dashboard');
  bindTabBtn('nav-btn-emp', 'employees');
  bindTabBtn('nav-btn-setup', 'setup');
  bindTabBtn('nav-btn-bill', 'billing');
  bindTabBtn('nav-btn-logs', 'logs');

  // Load modules inside panel ground
  const innerModule = document.getElementById('admin-module');
  
  if (state.activeAdminTab === 'dashboard') {
    renderAdminTabDashboard(innerModule);
  } else if (state.activeAdminTab === 'employees') {
    renderAdminTabEmployees(innerModule);
  } else if (state.activeAdminTab === 'setup') {
    renderAdminTabSetup(innerModule);
  } else if (state.activeAdminTab === 'billing') {
    renderAdminTabBilling(innerModule);
  } else {
    renderAdminTabLogs(innerModule);
  }
}

// MODULE: Admin tab Dashboard
function renderAdminTabDashboard(parent) {
  parent.innerHTML = `
    <!-- Top metrics widget row -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div class="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <p class="text-[10px] text-gray-500 uppercase tracking-widest font-extrabold">Total Karyawan</p>
        <p class="text-3xl font-extrabold text-indigo-950 mt-1">${state.adminMetrics.total}</p>
        <span class="text-[9px] text-gray-400 font-mono">Terdaftar aktif</span>
      </div>
      <div class="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <p class="text-[10px] text-gray-500 uppercase tracking-widest font-extrabold text-emerald-600">Hadir Tepat</p>
        <p class="text-3xl font-extrabold text-emerald-600 mt-1">${state.adminMetrics.hadir}</p>
        <span class="text-[9px] text-gray-400 font-mono">Sesuai jam operasional</span>
      </div>
      <div class="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <p class="text-[10px] text-gray-500 uppercase tracking-widest font-extrabold text-amber-500">Terlambat</p>
        <p class="text-3xl font-extrabold text-amber-500 mt-1">${state.adminMetrics.terlambat}</p>
        <span class="text-[9px] text-gray-400 font-mono">Toleransi habis</span>
      </div>
      <div class="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <p class="text-[10px] text-gray-500 uppercase tracking-widest font-extrabold text-rose-500">Luar Geofencing</p>
        <p class="text-3xl font-extrabold text-rose-500 mt-1">${state.adminMetrics.luar_lokasi}</p>
        <span class="text-[9px] text-gray-400 font-mono">Di luar GPS kantor</span>
      </div>
      <div class="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 col-span-2 md:col-span-1">
        <p class="text-[10px] text-gray-500 uppercase tracking-widest font-extrabold">Belum Absen</p>
        <p class="text-3xl font-extrabold text-indigo-950 mt-1">${state.adminMetrics.belum_absen}</p>
        <span class="text-[9px] text-gray-400 font-mono">Belum lapor hari ini</span>
      </div>
    </div>

    <!-- Daily presence records table loggers -->
    <div class="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden mt-6">
      <div class="p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-3">
        <div>
          <h3 class="font-bold text-gray-900 text-sm">Absensi Karyawan Hari Ini</h3>
          <p class="text-[11px] text-gray-500 mt-0.5">Pantauan deteksi GPS dan selfie langsung real-time</p>
        </div>

        <div class="flex gap-2">
          <input type="text" id="dash-dept-filter" placeholder="Saring Departemen..." class="bg-gray-50 border border-gray-200 rounded-lg text-xs px-3 py-1.5 focus:outline-indigo-500" />
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold tracking-wider">
              <th class="p-3.5">Nama Karyawan</th>
              <th class="p-3.5">Departemen & Jabatan</th>
              <th class="p-3.5 text-center">Status Hari Ini</th>
              <th class="p-3.5 text-center">Clock In</th>
              <th class="p-3.5 text-center">Clock Out</th>
              <th class="p-3.5 text-right">Verifikasi Selfie</th>
            </tr>
          </thead>
          <tbody>
            ${state.todayRecordsTable.length === 0 ? `
              <tr><td colspan="6" class="p-8 text-center text-gray-400">Belum ada karyawan aktif terdaftar.</td></tr>
            ` : state.todayRecordsTable.map((rec) => `
              <tr class="border-b border-gray-100 hover:bg-gray-50/50">
                <td class="p-3.5 font-bold text-gray-900">${rec.nama}</td>
                <td class="p-3.5">
                  <div class="text-gray-500">${rec.departemen || 'Umum'}</div>
                  <div class="text-[10px] text-gray-400 font-mono">${rec.jabatan || 'Staf'}</div>
                </td>
                <td class="p-3.5 text-center">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    rec.status === 'hadir' ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200' :
                    rec.status === 'terlambat' ? 'bg-amber-50 text-amber-700 font-bold border border-amber-200' :
                    rec.status === 'luar_lokasi' ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200' :
                    'bg-slate-50 text-gray-400 border border-slate-200'
                  }">${rec.status.replace('_', ' ')}</span>
                </td>
                <td class="p-3.5 text-center font-mono text-gray-500 font-semibold">${rec.jam_clock_in || '--:--'}</td>
                <td class="p-3.5 text-center font-mono text-gray-500 font-semibold">${rec.jam_clock_out || '--:--'}</td>
                <td class="p-3.5 text-right flex justify-end gap-1 items-center">
                  ${rec.selfie_in_url ? `
                    <button class="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[9px] px-2.5 py-1 rounded transition select-none flex items-center" onclick="openGlobalLightboxPortalRef('${encodeURIComponent(rec.selfie_in_url)}')">IN SELFIE</button>
                  ` : ''}
                  ${rec.selfie_out_url ? `
                    <button class="bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[9px] px-2.5 py-1 rounded transition select-none flex items-center" onclick="openGlobalLightboxPortalRef('${encodeURIComponent(rec.selfie_out_url)}')">OUT SELFIE</button>
                  ` : ''}
                  ${!rec.selfie_in_url && !rec.selfie_out_url ? `<span class="text-[10px] text-gray-400 font-light select-none">No Visual</span>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Bind local filter
  const filterInput = document.getElementById('dash-dept-filter');
  filterInput?.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    const rows = parent.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const cellText = row.children[1]?.innerText.toLowerCase() || '';
      if (cellText.includes(val)) {
        row.classList.remove('hidden');
      } else {
        row.classList.add('hidden');
      }
    });
  });
}

// MODULE: Admin tab Employees invitation (forms bulk upload csv template)
function renderAdminTabEmployees(parent) {
  parent.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Invitation Forms column -->
      <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <h3 class="font-bold text-gray-900 text-sm">Undang Karyawan Tunggal</h3>
        <p class="text-[11px] text-gray-400">Undangan instan dengan WhatsApp pendukung</p>

        <form id="invite-employee-form" class="space-y-3">
          <div>
            <label class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Nama Lengkap</label>
            <input type="text" id="inv-name" required placeholder="Contoh: Rian Wijaya" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div>
            <label class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Email Kantor</label>
            <input type="email" id="inv-email" required placeholder="Contoh: rian@perusahaan.com" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div>
            <label class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Nomor HP</label>
            <input type="tel" id="inv-phone" placeholder="Contoh: 0857XXXXXXXX" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Jabatan</label>
              <input type="text" id="inv-role" placeholder="Staf" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Departemen</label>
              <input type="text" id="inv-dept" placeholder="IT & Dev" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>
          <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition mt-2">Daftarkan & Kirim Undangan</button>
        </form>

        <div class="pt-4 border-t border-gray-100">
          <h3 class="font-bold text-gray-900 text-sm">Undangan Bulk CSV</h3>
          <p class="text-[11px] text-gray-400 mt-1">Undang banyak karyawan sekaligus memakai berkas spreadsheet CSV rujukan</p>
          
          <div class="mt-3">
            <label class="w-full border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/10 cursor-pointer rounded-xl p-4 flex flex-col items-center justify-center transition">
              <span class="text-xs text-indigo-600 font-bold uppercase tracking-wider flex items-center gap-1">PILIH FILE CSV</span>
              <span class="text-[9px] text-gray-450 mt-1">Satu baris: Nama, Email, Hp, Jabatan, Departemen</span>
              <input type="file" id="bulk-csv-uploader" accept=".csv" class="hidden" />
            </label>
          </div>

          <div id="csv-preview-box" class="hidden space-y-2 mt-4">
            <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
              Preview Baris CSV Terdeteksi
            </p>
            <div class="max-h-32 overflow-y-auto border border-gray-100 bg-gray-50 text-[10px] font-mono rounded p-2">
              <ul id="csv-preview-list" class="space-y-1"></ul>
            </div>
            <button id="csv-dispatch-btn" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1.5 rounded transition">Unggah & Eksekusi bulk Undangan</button>
          </div>
        </div>
      </div>

      <!-- Live tracking list column -->
      <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs lg:col-span-2 space-y-4">
        <div class="flex justify-between items-center pb-2 border-b border-gray-100">
          <h3 class="font-bold text-gray-900 text-sm">Log Token Undangan & Onboarding</h3>
          <span class="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold font-mono text-gray-500">${state.inviteHistoryLogs.length} Link</span>
        </div>

        <div class="overflow-x-auto text-xs">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-gray-50 text-gray-500 border-b border-gray-100 font-semibold text-[11px]">
                <th class="p-2">Nama Karyawan</th>
                <th class="p-2">Email</th>
                <th class="p-2">Status Undangan</th>
                <th class="p-2 text-right">Tautan Token (Copy)</th>
              </tr>
            </thead>
            <tbody>
              ${state.inviteHistoryLogs.length === 0 ? `
                <tr><td colspan="4" class="p-8 text-center text-gray-400">Belum ada riwayat undangan dikirim.</td></tr>
              ` : state.inviteHistoryLogs.map((inv) => `
                <tr class="border-b border-gray-100">
                  <td class="p-2 font-bold text-gray-800">${inv.nama}</td>
                  <td class="p-2 text-gray-500">${inv.email}</td>
                  <td class="p-2">
                    <span class="px-1.5 py-0.2 rounded text-[9px] tracking-wide uppercase font-bold ${
                      inv.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                      inv.status === 'opened' ? 'bg-amber-100 text-amber-800' :
                      'bg-indigo-100 text-indigo-800'
                    }">${inv.status}</span>
                  </td>
                  <td class="p-2 text-right">
                    <button class="bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-700 font-bold text-[9px] py-1 px-2.5 rounded transition uppercase tracking-wider" onclick="copyInviteTokenLinkToClipboard('${inv.token}')">Salin Link Token</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;

  // Single Form submission bind
  document.getElementById('invite-employee-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nama = document.getElementById('inv-name').value.trim();
    const email = document.getElementById('inv-email').value.trim();
    const nomor_hp = document.getElementById('inv-phone').value.trim();
    const jabatan = document.getElementById('inv-role').value.trim();
    const departemen = document.getElementById('inv-dept').value.trim();

    try {
      const response = await fetch('/api/employees/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.authToken}`
        },
        body: JSON.stringify({
          invites: [{ nama, email, nomor_hp, jabatan, departemen }]
        })
      });

      const resData = await response.json();
      if (response.ok) {
        alert('Sukses mengirim undangan tunggal!');
        await refreshAdminDashboardData();
        renderAdminPanelView(document.getElementById('app'));
      } else {
        alert(resData.error || 'Gagal.');
      }
    } catch (e) {
      alert('Sambungan gagal.');
    }
  });

  // CSV Reader bind
  document.getElementById('bulk-csv-uploader')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const r = new FileReader();
    r.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        alert('File CSV Anda tidak valid.');
        return;
      }

      state.csvPreviewRows = [];
      for (let i = 1; i < lines.length; i++) {
        const d = lines[i].split(',').map(c => c.trim());
        const rowObj = {
          nama: d[0] || '',
          email: d[1] || '',
          nomor_hp: d[2] || '',
          jabatan: d[3] || 'Staf',
          departemen: d[4] || 'Umum'
        };
        if (rowObj.nama && rowObj.email) {
          state.csvPreviewRows.push(rowObj);
        }
      }

      const prevBox = document.getElementById('csv-preview-box');
      const prevList = document.getElementById('csv-preview-list');
      if (prevBox && prevList) {
        prevList.innerHTML = state.csvPreviewRows.map(r => `<li>${r.nama} (${r.email}) - Dept: ${r.departemen}</li>`).join('');
        prevBox.classList.remove('hidden');
      }
    };
    r.readAsText(file);
  });

  // CSV Dispatcher bind
  document.getElementById('csv-dispatch-btn')?.addEventListener('click', async () => {
    if (state.csvPreviewRows.length === 0) return;
    try {
      const res = await fetch('/api/employees/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.authToken}`
        },
        body: JSON.stringify({ invites: state.csvPreviewRows })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Bulk invite sukses mengirim ${state.csvPreviewRows.length} undangan!`);
        state.csvPreviewRows = [];
        await refreshAdminDashboardData();
        renderAdminPanelView(document.getElementById('app'));
      } else {
        alert(data.error || 'Gagal bulk invite.');
      }
    } catch (e) {
      alert('Koneksi terputus.');
    }
  });
}

// MODULE: Admin tab Setup (Gedung, Map simulations, work entrance times)
function renderAdminTabSetup(parent) {
  parent.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      <!-- Coordinate Setup -->
      <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <h3 class="font-bold text-gray-900 text-sm">Lokasi & Geofence GPS</h3>
        <p class="text-[11px] text-gray-400">Atur kordinat rujukan geofence kantor dalam meter absensi rujukan</p>

        <form id="setup-company-form" class="space-y-4">
          <div>
            <label class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Nama Perusahaan</label>
            <input type="text" id="cfg-name" required class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500" value="${state.company ? state.company.name : ''}" />
          </div>
          <div>
            <label class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Alamat Fisik Kantor</label>
            <input type="text" id="cfg-address" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500" value="${state.company ? state.company.address : ''}" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Latitude</label>
              <input type="number" step="any" id="cfg-latitude" required class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500" value="${state.company ? state.company.lat : -6.2088}" />
            </div>
            <div>
              <label class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Longitude</label>
              <input type="number" step="any" id="cfg-longitude" required class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500" value="${state.company ? state.company.long : 106.8456}" />
            </div>
          </div>
          <div>
            <label class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Radius Batas GPS (Meter)</label>
            <input type="number" id="cfg-radius" required class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 font-mono" value="${state.company ? state.company.radius_meter : 150}" />
          </div>

          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="text-[9px] uppercase font-bold text-gray-400">Jam Masuk</label>
              <input type="time" id="cfg-in" required class="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-1 text-xs" value="${state.company ? state.company.jam_masuk : '08:00'}" />
            </div>
            <div>
              <label class="text-[9px] uppercase font-bold text-gray-400">Jam Keluar</label>
              <input type="time" id="cfg-out" required class="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-1 text-xs" value="${state.company ? state.company.jam_keluar : '17:00'}" />
            </div>
            <div>
              <label class="text-[9px] uppercase font-bold text-gray-400">Grace (Min)</label>
              <input type="number" id="cfg-grace" required class="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-1 text-xs font-mono" value="${state.company ? state.company.toleransi_menit : 15}" />
            </div>
          </div>

          <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition mt-2">Daftarkan Konfigurasi Baru</button>
        </form>
      </div>

      <!-- Quick Coordinates Preset & Maps references Map simulation card -->
      <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs md:col-span-2 space-y-4">
        <h3 class="font-bold text-gray-900 text-sm">Preset Kordinat Perusahaan (Indonesian Hub)</h3>
        <p class="text-[11px] text-gray-400">Simulasikan peta gedung kantor HR Anda dalam satu klik instan rujukan absensi</p>

        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
          <button id="pst-jakarta" class="bg-slate-50 hover:bg-indigo-50 border border-gray-200 p-3 rounded-2xl transition flex flex-col items-center">
            <span class="text-xs font-bold font-display text-gray-900">Jakarta (Pusat)</span>
            <span class="text-[9px] text-slate-400 mt-1">Latitude: -6.2088</span>
          </button>
          <button id="pst-bandung" class="bg-slate-50 hover:bg-indigo-50 border border-gray-200 p-3 rounded-2xl transition flex flex-col items-center">
            <span class="text-xs font-bold font-display text-gray-900">Bandung Hub</span>
            <span class="text-[9px] text-slate-400 mt-1">Latitude: -6.9175</span>
          </button>
          <button id="pst-surabaya" class="bg-slate-50 hover:bg-indigo-50 border border-gray-200 p-3 rounded-2xl transition flex flex-col items-center">
            <span class="text-xs font-bold font-display text-gray-900">Surabaya Hub</span>
            <span class="text-[9px] text-slate-400 mt-1">Latitude: -7.2575</span>
          </button>
          <button id="pst-bali" class="bg-slate-50 hover:bg-indigo-50 border border-gray-200 p-3 rounded-2xl transition flex flex-col items-center">
            <span class="text-xs font-bold font-display text-gray-900">Bali Resort</span>
            <span class="text-[9px] text-slate-400 mt-1">Latitude: -8.4095</span>
          </button>
        </div>

        <div class="pt-4 border-t border-gray-100 space-y-3">
          <p class="text-xs font-bold text-gray-500 uppercase tracking-wide">Representasi Mini Map (Simulasi):</p>
          <div class="aspect-video w-full rounded-2xl bg-indigo-950 flex flex-col items-center justify-center p-6 text-center border-4 border-white shadow-md relative overflow-hidden">
            <div class="absolute inset-0 bg-indigo-900/10 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px]"></div>
            <span class="text-3xl animate-bounce z-10">📍</span>
            <p id="map-preview-address" class="text-slate-250 text-xs font-semibold max-w-sm leading-relaxed mt-2 z-10">${state.company ? state.company.address : 'Menara Astra, Jl. Jend. Sudirman Kav 5'}</p>
            <p class="text-[9px] font-mono text-indigo-300 mt-1 z-10">GEOFENCE RADIUS DETECTOR: ACTIVE ON ${state.company ? state.company.radius_meter : 150}m</p>
          </div>
        </div>
      </div>

    </div>
  `;

  // Bind local preset triggers
  const setPrs = (id, lat, long, addr) => {
    document.getElementById(id)?.addEventListener('click', () => {
      document.getElementById('cfg-latitude').value = lat;
      document.getElementById('cfg-longitude').value = long;
      document.getElementById('cfg-address').value = addr;
      document.getElementById('map-preview-address').innerText = addr;
    });
  };

  setPrs('pst-jakarta', -6.2088, 106.8456, 'Menara Astra, Jl. Jend. Sudirman Kav 5, Jakarta Pusat');
  setPrs('pst-bandung', -6.9175, 107.6191, 'Gedung Sate, Jl. Diponegoro No.22, Bandung');
  setPrs('pst-surabaya', -7.2575, 112.7521, 'WTC Surabaya, Jl. Pemuda No.27, Surabaya');
  setPrs('pst-bali', -8.4095, 115.1889, 'Santhi Korporat, Jl. Sunset Road No.8, Kuta, Bali');

  // Bind forms save dispatch
  document.getElementById('setup-company-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('cfg-name').value.trim();
    const address = document.getElementById('cfg-address').value.trim();
    const lat = document.getElementById('cfg-latitude').value;
    const long = document.getElementById('cfg-longitude').value;
    const radius_meter = document.getElementById('cfg-radius').value;
    const jam_masuk = document.getElementById('cfg-in').value;
    const jam_keluar = document.getElementById('cfg-out').value;
    const toleransi_menit = document.getElementById('cfg-grace').value;

    try {
      const response = await fetch('/api/company/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.authToken}`
        },
        body: JSON.stringify({ name, address, lat, long, radius_meter, jam_masuk, jam_keluar, toleransi_menit })
      });

      const resData = await response.json();
      if (response.ok) {
        state.company = resData.company;
        alert('Sukses menyimpan kordinat rujukan lokasimu!');
        renderAdminPanelView(document.getElementById('app'));
      } else {
        alert(resData.error || 'Gagal menyimpan.');
      }
    } catch (err) {
      alert('Sambungan server error.');
    }
  });
}

// MODULE: Admin tab Midtrans billing premium plans
function renderAdminTabBilling(parent) {
  parent.innerHTML = `
    <!-- Segment Packages Grid -->
    <div class="p-5 bg-white border border-gray-200 rounded-3xl space-y-4">
      <div class="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-200">
        <div>
          <h3 class="font-bold text-gray-900 text-sm">Ganti Paket Bisnis Premium Kantor</h3>
          <p class="text-[11px] text-gray-400">Upgrade kuota karyawan dan geofence GPS real-time terenskripsi di bawah</p>
        </div>

        <div class="flex gap-1.5 bg-gray-200 p-1 rounded-xl">
          <button id="billing-tab-monthly" class="px-3.5 py-1 text-[10px] font-bold rounded-lg transition ${state.selectedCycle === 'monthly' ? 'bg-indigo-600 text-white' : 'text-slate-500'}"> BULANAN </button>
          <button id="billing-tab-yearly" class="px-3.5 py-1 text-[10px] font-bold rounded-lg transition ${state.selectedCycle === 'yearly' ? 'bg-indigo-600 text-white' : 'text-slate-500'}"> TAHUNAN (HEMAT 20%) </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <!-- Package STARTER -->
        <div class="p-6 border border-gray-200 rounded-3xl space-y-4 flex flex-col justify-between hover:shadow-lg transition">
          <div>
            <span class="text-[9px] bg-slate-100 px-2.5 py-0.5 rounded-sm font-bold text-slate-500 uppercase tracking-widest leading-none">STARTER</span>
            <h4 class="font-bold text-slate-900 leading-tight text-[15px] mt-2">Hadir Starter Suite</h4>
            <p class="text-[11px] text-slate-450 leading-relaxed mt-1">Solusi awal multi-tenant absensi digital tangguh bergeofence untuk startup kecil rintisan</p>
            <div class="border-t border-dashed border-gray-100 my-4 pt-4 text-xs font-mono text-indigo-900 space-y-2">
              <p>✔ Kuota batas: S/D 50 KARYAWAN ACTIVE</p>
              <p>✔ Laporan data absensi export XLS/CSV</p>
              <p>✔ Multi-koordinat geofence: AKTIF</p>
            </div>
          </div>
          <div>
            <p class="text-2xl font-black text-gray-900 mt-2">
              ${state.selectedCycle === 'monthly' ? 'Rp. 299.000<span class="text-xs text-gray-400"> / Bln</span>' : 'Rp. 2.870.400<span class="text-xs text-gray-400"> / Thn</span>'}
            </p>
            <button id="pay-starter-btn" class="w-full bg-slate-800 hover:bg-slate-950 text-white font-bold text-xs py-2 px-4 rounded-xl transition mt-4">Upgrade Portal Saya</button>
          </div>
        </div>

        <!-- Package PRO -->
        <div class="p-6 border-2 border-indigo-600 bg-indigo-50/10 rounded-3xl space-y-4 flex flex-col justify-between hover:shadow-lg transition relative overflow-hidden">
          <div class="absolute top-2 right-2 bg-indigo-600 text-white text-[9px] px-2.5 py-0.5 rounded font-black select-none tracking-widest animate-pulse">POPULER</div>
          <div>
            <span class="text-[9px] bg-indigo-100 px-2.5 py-0.5 rounded-sm font-black text-indigo-800 uppercase tracking-widest leading-none">PROFESSIONAL</span>
            <h4 class="font-bold text-indigo-950 leading-tight text-[15px] mt-2">Hadir Pro Enterprise</h4>
            <p class="text-[11px] text-slate-450 leading-relaxed mt-1">Sistem integrasi tangguh HR Geofenced Multi-cabang untuk korporasi menengah & besar Indonesia</p>
            <div class="border-t border-dashed border-indigo-100 my-4 pt-4 text-xs font-mono text-indigo-900 space-y-2">
              <p>✔ Kuota batas: S/D 300 KARYAWAN ACTIVE</p>
              <p>✔ Face verification selfie referensi: AKTIF</p>
              <p>✔ Prioritas server sandbox high-availability: YA</p>
            </div>
          </div>
          <div>
            <p class="text-2xl font-black text-indigo-950 mt-2">
              ${state.selectedCycle === 'monthly' ? 'Rp. 799.000<span class="text-xs text-indigo-500"> / Bln</span>' : 'Rp. 7.670.400<span class="text-xs text-indigo-500"> / Thn</span>'}
            </p>
            <button id="pay-pro-btn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition mt-4">Upgrade Portal Saya</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind tab cycle buttons
  document.getElementById('billing-tab-monthly')?.addEventListener('click', () => {
    state.selectedCycle = 'monthly';
    renderAdminTabBilling(parent);
  });
  document.getElementById('billing-tab-yearly')?.addEventListener('click', () => {
    state.selectedCycle = 'yearly';
    renderAdminTabBilling(parent);
  });

  // Pay starters triggers
  document.getElementById('pay-starter-btn')?.addEventListener('click', () => {
    const plan = state.selectedCycle === 'monthly' ? 'starter_monthly' : 'starter_yearly';
    triggerMidtransSimulationOrder(plan);
  });

  // Pay pro triggers
  document.getElementById('pay-pro-btn')?.addEventListener('click', () => {
    const plan = state.selectedCycle === 'monthly' ? 'pro_monthly' : 'pro_yearly';
    triggerMidtransSimulationOrder(plan);
  });
}

// Sub handler: Initiates Simulation Order Modal
async function triggerMidtransSimulationOrder(plan_id) {
  try {
    const res = await fetch('/api/billing/pay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.authToken}`
      },
      body: JSON.stringify({ plan_id })
    });
    const data = await res.json();
    if (res.ok) {
      state.activeMidtransTrx = data;
      renderMidtransSimModalOverlay();
    } else {
      alert(data.error || 'Gagal order.');
    }
  } catch (err) {
    alert('Koneksi billing terganggu.');
  }
}

// Renders simulated popup portal directly in target DOM
function renderMidtransSimModalOverlay() {
  const modalDiv = document.getElementById('midtrans-modal');
  if (!modalDiv || !state.activeMidtransTrx) return;

  const trx = state.activeMidtransTrx;
  modalDiv.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 flex flex-col pointer-events-auto" onclick="event.stopPropagation()">
      <div class="bg-blue-900 text-white p-4 flex justify-between items-center">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center font-bold text-xs text-blue-200">M</div>
          <div>
            <h3 class="font-bold text-sm leading-none">Midtrans Sandbox</h3>
            <p class="text-[10px] text-blue-200 mt-1">Payment Simulation Portal</p>
          </div>
        </div>
        <button id="midtrans-close" class="text-blue-200 hover:text-white font-bold">&#x2715;</button>
      </div>

      <div class="bg-gray-50 border-b border-gray-100 p-4 text-center">
        <p class="text-[10px] text-gray-500 uppercase tracking-widest font-extrabold">Total Tagihan:</p>
        <p class="text-xl font-black text-slate-900 mt-0.5">Rp. ${trx.amount.toLocaleString('id-ID')}</p>
        <div class="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 text-[9px] font-semibold px-2 py-0.5 rounded-full mt-2 font-mono">
          <span>${trx.plan_name}</span> | <span>${trx.order_id}</span>
        </div>
      </div>

      <div class="p-5 space-y-4">
        <p class="text-xs text-slate-500">Simulasikan respons Gateway Midtrans API untuk verifikasi order pembayaran Anda:</p>
        <div class="bg-blue-50/50 border border-dashed border-blue-200 p-3 rounded-xl text-[10px] space-y-1 text-slate-650">
          <p>✔ Rek. virtual Transfer nomor VA: <span class="font-bold">880011 23456789 (BCA)</span></p>
          <p>✔ Signature payload key terverifikasi secure sha512</p>
        </div>

        <div class="grid grid-cols-2 gap-3 pt-2">
          <button id="sim-pay-fail" class="p-2.5 border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold rounded-xl transition">SIMULASIKAN GAGAL</button>
          <button id="sim-pay-success" class="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition">SIMULASIKAN SUKSES</button>
        </div>
      </div>
    </div>
  `;

  modalDiv.classList.remove('hidden');
  modalDiv.classList.add('flex');

  // Bind modal dispatches
  document.getElementById('midtrans-close')?.addEventListener('click', () => {
    modalDiv.classList.add('hidden');
    state.activeMidtransTrx = null;
  });

  const sendSimWebhook = async (actionStatus) => {
    try {
      const res = await fetch('/api/simulate/webhook-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: trx.order_id,
          action: actionStatus
        })
      });

      if (res.ok) {
        if (actionStatus === 'success') {
          alert('Simulasi pembayaran berhasil! Tenant Anda telah diupgrade.');
        } else {
          alert('Pembayaran ditolak.');
        }
        modalDiv.classList.add('hidden');
        state.activeMidtransTrx = null;
        
        // Refresh and load
        await verifySession();
      } else {
        alert('Gagal simulate.');
      }
    } catch (e) {
      alert('Sambungan billing putus.');
    }
  };

  document.getElementById('sim-pay-fail')?.addEventListener('click', () => sendSimWebhook('fail'));
  document.getElementById('sim-pay-success')?.addEventListener('click', () => sendSimWebhook('success'));
}

// MODULE: Admin tab Logs reports & query csv exports
function renderAdminTabLogs(parent) {
  parent.innerHTML = `
    <div class="bg-white p-5 border border-gray-200 rounded-3xl space-y-4">
      <div class="flex flex-col md:flex-row justify-between items-center pb-3 border-b border-gray-150 gap-4">
        <div>
          <h3 class="font-bold text-gray-900 text-sm">Laporan Riwayat Logs Kehadiran Karyawan</h3>
          <p class="text-[11px] text-gray-400 mt-0.5 font-sans">Gunakan filter pencarian dan saring kriteria log di bawah, lalu unduh berkas CSV rujukan</p>
        </div>

        <button id="logs-xls-export" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl shadow transition">UNDUH CSV EXPORT</button>
      </div>

      <!-- Filters Row -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-gray-200">
        <div>
          <label class="block text-[9px] uppercase font-bold text-gray-500 mb-1">Tanggal Mulai</label>
          <input type="date" id="flt-start" class="w-full bg-white border border-gray-200 px-3 py-1.5 rounded-lg" value="${state.logStartDate || ''}" />
        </div>
        <div>
          <label class="block text-[9px] uppercase font-bold text-gray-500 mb-1">Tanggal Selesai</label>
          <input type="date" id="flt-end" class="w-full bg-white border border-gray-200 px-3 py-1.5 rounded-lg" value="${state.logEndDate || ''}" />
        </div>
        <div>
          <label class="block text-[9px] uppercase font-bold text-gray-500 mb-1">Saring Departemen</label>
          <input type="text" id="flt-dept" placeholder="Contoh: IT" class="w-full bg-white border border-gray-200 px-3 py-1.5 rounded-lg" value="${state.logDepartemen || ''}" />
        </div>
        <div class="flex items-end">
          <button id="flt-search-btn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 rounded-lg transition">TERAPKAN FILTER</button>
        </div>
      </div>

      <!-- Logs database tables -->
      <div class="overflow-x-auto text-[11px] font-sans">
        <table class="w-full text-left">
          <thead>
            <tr class="bg-gray-100 text-gray-600 border-b border-gray-200 font-semibold tracking-wider">
              <th class="p-3">Nama</th>
              <th class="p-3">Departemen & Jabatan</th>
              <th class="p-3">Tanggal Absen</th>
              <th class="p-3">Hasil Status</th>
              <th class="p-3">In (GPS)</th>
              <th class="p-3">Out (GPS)</th>
              <th class="p-3 text-right">Selfie Record</th>
            </tr>
          </thead>
          <tbody>
            ${state.globalHistoryLogs.length === 0 ? `
              <tr><td colspan="7" class="p-8 text-center text-gray-400">Tidak temukan data log absensi.</td></tr>
            ` : state.globalHistoryLogs.map((log) => `
              <tr class="border-b border-gray-100 hover:bg-gray-50/50">
                <td class="p-3 font-bold text-gray-900">${log.nama}</td>
                <td class="p-3">
                  <span class="text-gray-550 font-medium">${log.departemen || 'Umum'}</span>
                  <span class="text-[9px] text-gray-400 font-mono block">${log.jabatan}</span>
                </td>
                <td class="p-3 font-bold font-mono text-gray-600">${log.tanggal}</td>
                <td class="p-3 font-semibold uppercase ${
                  log.status === 'hadir' ? 'text-emerald-600' :
                  log.status === 'terlambat' ? 'text-amber-500' : 'text-red-500'
                }">${log.status.replace('_', ' ')}</td>
                <td class="p-3 font-mono text-gray-500">${log.jam_clock_in || '--'} (${log.lat_in ? log.lat_in.toFixed(3) : '0'};${log.long_in ? log.long_in.toFixed(3) : '0'})</td>
                <td class="p-3 font-mono text-gray-500">${log.jam_clock_out || '--'} (${log.lat_out ? log.lat_out.toFixed(3) : '0'};${log.long_out ? log.long_out.toFixed(3) : '0'})</td>
                <td class="p-3 text-right select-none flex justify-end gap-1 items-center pt-4">
                  ${log.selfie_in_url ? `<button class="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[8px] px-2 py-0.5 rounded transition uppercase border border-indigo-200" onclick="openGlobalLightboxPortalRef('${encodeURIComponent(log.selfie_in_url)}')">In Foto</button>` : ''}
                  ${log.selfie_out_url ? `<button class="bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[8px] px-2 py-0.5 rounded transition uppercase border border-amber-200" onclick="openGlobalLightboxPortalRef('${encodeURIComponent(log.selfie_out_url)}')">Out Foto</button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Bind clicks
  document.getElementById('flt-search-btn')?.addEventListener('click', async () => {
    state.logStartDate = document.getElementById('flt-start').value;
    state.logEndDate = document.getElementById('flt-end').value;
    state.logDepartemen = document.getElementById('flt-dept').value.trim();

    state.loadingSession = true;
    await queryAdminGlobalLogsWithFilters();
    state.loadingSession = false;
    renderAdminTabLogs(parent);
  });

  // XLS/CSV Spreadsheet Export handler
  document.getElementById('logs-xls-export')?.addEventListener('click', () => {
    if (state.globalHistoryLogs.length === 0) {
      alert('Tidak ada data logs untuk diexport.');
      return;
    }
    const headerRow = ['Nama Karyawan', 'Jabatan', 'Departemen', 'Tanggal', 'Status Absensi', 'Jam Clock In', 'Jam Clock Out', 'Lat Long Clock In', 'Lat Long Clock Out'];
    const content = [
      headerRow.join(','),
      ...state.globalHistoryLogs.map(log => [
        `"${log.nama}"`,
        `"${log.jabatan}"`,
        `"${log.departemen || 'Umum'}"`,
        `"${log.tanggal}"`,
        `"${log.status}"`,
        `"${log.jam_clock_in || '-'}"`,
        `"${log.jam_clock_out || '-'}"`,
        `"${log.lat_in || '-'};${log.long_in || '-'}"`,
        `"${log.lat_out || '-'};${log.long_out || '-'}"`
      ].join(','))
    ].join('\n');

    const b = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const u = URL.createObjectURL(b);
    const link = document.createElement('a');
    link.href = u;
    link.setAttribute('download', `Hadir_id_Absensi_Report_Export_${new Date().toLocaleDateString('en-CA')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

// -------------------------------------------------------------
// UTILITY PUBLIC BRIDGE TRIGGERS (GLOBALLY CALLED VIA HTML ONCLICK)
// -------------------------------------------------------------
window.openGlobalLightboxPortalRef = function (encodedB64Url) {
  const url = decodeURIComponent(encodedB64Url);
  const portal = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  if (portal && img) {
    img.src = url;
    portal.classList.remove('hidden');
    portal.classList.add('flex');
  }
};

window.copyInviteTokenLinkToClipboard = function (tokenOnly) {
  const absoluteUrl = `${window.location.origin}/activate/${tokenOnly}`;
  navigator.clipboard.writeText(absoluteUrl).then(() => {
    alert(`Link aktivasi berhasil disalin ke clipboard:\n${absoluteUrl}`);
  }).catch(() => {
    alert(`Gagal copy otomatis. Tautan:\n${absoluteUrl}`);
  });
};
