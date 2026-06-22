import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as crypto from 'crypto';
import { Company, User, Invite, Attendance, Transaction, SubscriptionPlan, AttendanceStatus } from './src/types';
import { db, hashPassword, generateToken } from './src/db';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Middleware to mock delay if wanted or handle CORS/logging
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Pricing setup (Harga dihitung di backend)
const PLAN_PRICES: Record<string, { name: string, plan: SubscriptionPlan, limit: number, amount: number, cycle: 'monthly' | 'yearly' }> = {
  'starter_monthly': { name: 'Starter Bulanan', plan: 'starter', limit: 50, amount: 299000, cycle: 'monthly' },
  'starter_yearly': { name: 'Starter Tahunan', plan: 'starter', limit: 50, amount: 2870400, cycle: 'yearly' }, // (299k * 12 * 0.8)
  'pro_monthly': { name: 'Pro Bulanan', plan: 'pro', limit: 300, amount: 799000, cycle: 'monthly' },
  'pro_yearly': { name: 'Pro Tahunan', plan: 'pro', limit: 300, amount: 7670400, cycle: 'yearly' }, // (799k * 12 * 0.8)
};

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-default-key-123456';

// Helper to calculate distance in meters using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

// Helper to authenticate user from token header
function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token otentikasi tidak ditemukan.' });
  }

  // Token is user ID for simple stateless robust session
  const user = db.getUser(token);
  if (!user) {
    return res.status(401).json({ error: 'Sesi kedaluwarsa atau tidak valid.' });
  }

  (req as any).user = user;
  next();
}

// 1. REGISTRASI ADMIN & LOGIN
app.post('/api/auth/register', (req, res) => {
  const { nama, email, nomor_hp, nama_perusahaan, password } = req.body;

  if (!nama || !email || !nomor_hp || !nama_perusahaan || !password) {
    return res.status(400).json({ error: 'Mohon lengkapi semua kolom pendaftaran.' });
  }

  // Check if email already registered
  const existingUser = db.getUserByEmail(email);
  if (existingUser) {
    return res.status(400).json({ error: 'Email ini sudah terdaftar.' });
  }

  // Create Company (Tenant)
  const companyId = 'comp_' + generateToken().substring(0, 8);
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 14); // 14 days free trial default

  const newCompany: Company = {
    id: companyId,
    name: nama_perusahaan,
    address: 'Belum diatur',
    logo_url: '',
    lat: -6.2088, // Default Jakarta
    long: 106.8456,
    radius_meter: 151, // Default meter
    jam_masuk: '08:00',
    jam_keluar: '17:00',
    toleransi_menit: 15,
    subscription_plan: 'trial',
    subscription_status: 'trialing',
    trial_ends_at: trialEnds.toISOString(),
  };

  // Create Admin User
  const userId = 'usr_' + generateToken().substring(0, 8);
  const newAdmin: User = {
    id: userId,
    company_id: companyId,
    role: 'admin',
    nama,
    email,
    nomor_hp,
    password_hash: hashPassword(password),
    jabatan: 'HR / Owner',
    departemen: 'Manajemen',
    foto_wajah_url: '',
    status: 'active',
  };

  db.saveCompany(newCompany);
  db.saveUser(newAdmin);

  res.json({
    message: 'Registrasi berhasil! Akun uji coba 14 hari telah aktif.',
    token: userId,
    user: {
      id: newAdmin.id,
      nama: newAdmin.nama,
      email: newAdmin.email,
      role: newAdmin.role,
      company_id: newAdmin.company_id,
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Mohon lengkapi email dan password.' });
  }

  const user = db.getUserByEmail(email);
  if (!user || user.password_hash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Email atau password salah.' });
  }

  res.json({
    message: 'Login berhasil.',
    token: user.id,
    user: {
      id: user.id,
      nama: user.nama,
      email: user.email,
      role: user.role,
      company_id: user.company_id,
    }
  });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = (req as any).user as User;
  const company = db.getCompany(user.company_id);

  res.json({
    user: {
      id: user.id,
      nama: user.nama,
      email: user.email,
      nomor_hp: user.nomor_hp,
      role: user.role,
      jabatan: user.jabatan,
      departemen: user.departemen,
      foto_wajah_url: user.foto_wajah_url,
      company_id: user.company_id,
      status: user.status,
    },
    company
  });
});

// 2. SETUP PERUSAHAAN & LOKASI
app.post('/api/company/setup', authenticate, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Akses ditolak. Hanya untuk administrator.' });
  }

  const { name, address, logo_url, lat, long, radius_meter, jam_masuk, jam_keluar, toleransi_menit } = req.body;

  const company = db.getCompany(user.company_id);
  if (!company) {
    return res.status(404).json({ error: 'Data perusahaan tidak ditemukan.' });
  }

  // Bind values with fallback validation
  if (name) company.name = name;
  if (address !== undefined) company.address = address;
  if (logo_url !== undefined) company.logo_url = logo_url;
  if (lat !== undefined) company.lat = parseFloat(lat);
  if (long !== undefined) company.long = parseFloat(long);
  if (radius_meter !== undefined) company.radius_meter = parseInt(radius_meter);
  if (jam_masuk) company.jam_masuk = jam_masuk;
  if (jam_keluar) company.jam_keluar = jam_keluar;
  if (toleransi_menit !== undefined) company.toleransi_menit = parseInt(toleransi_menit);

  db.saveCompany(company);

  res.json({
    message: 'Konfigurasi profil & lokasi kantor berhasil diperbarui.',
    company
  });
});

// 3. MIDTRANS BILLING MANAGEMENT
// Endpoint untuk menginisiasi transaksi (Snap API Sandbox)
app.post('/api/billing/pay', authenticate, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Hanya admin yang bisa mengubah billing.' });
  }

  const { plan_id } = req.body;
  const planInfo = PLAN_PRICES[plan_id];

  if (!planInfo) {
    return res.status(400).json({ error: 'Paket yang dipilih tidak valid.' });
  }

  const orderId = 'HADIR-' + Date.now() + '-' + user.company_id.substring(5);
  const amount = planInfo.amount;

  // Save Pending Transaction Record
  const newTransaction: Transaction = {
    id: 'tx_' + generateToken().substring(0, 8),
    company_id: user.company_id,
    order_id: orderId,
    plan_id,
    billing_cycle: planInfo.cycle,
    amount,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  db.saveTransaction(newTransaction);

  // We return both a snap token simulation link or live sandbox token if user wishes
  // For standard preview sandbox simulation, we'll return simulated credentials
  // coupled with some unique order info for an instantly runnable client-side modal.
  const snapToken = 'snap-token-' + generateToken().substring(0, 16);

  res.json({
    message: 'Order berhasil di-generate di server.',
    order_id: orderId,
    amount,
    plan_name: planInfo.name,
    snap_token: snapToken,
  });
});

// WEBHOOK MIDTRANS REAL (Verifikasi Signature SHA512)
app.post('/api/billing/webhook', (req, res) => {
  const { order_id, status_code, gross_amount, transaction_status, signature_key, fraud_status } = req.body;

  if (!order_id || !status_code || !gross_amount || !signature_key) {
    return res.status(400).json({ error: 'Format payload webhook tidak valid.' });
  }

  // Hitung signature lokal untuk verifikasi (SHA512 dari order_id + status_code + gross_amount + server_key)
  const content = order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY;
  const computedSignature = crypto.createHash('sha512').update(content).digest('hex');

  if (signature_key !== computedSignature) {
    console.warn(`[Midtrans Webhook] Signature mismatch. Input: ${signature_key}, Expected: ${computedSignature}`);
    return res.status(403).json({ error: 'Verifikasi tanda tangan (signature_key) gagal.' });
  }

  // Signature valid! Update status
  const tx = db.getTransactions().find(t => t.order_id === order_id);
  if (!tx) {
    return res.status(404).json({ error: 'Transaksi tidak teridentifikasi.' });
  }

  let finalStatus: 'pending' | 'paid' | 'failed' = 'pending';
  const isPaid = (transaction_status === 'settlement' || (transaction_status === 'capture' && fraud_status === 'accept'));
  const isFailed = (transaction_status === 'deny' || transaction_status === 'cancel' || transaction_status === 'expire');

  if (isPaid) {
    finalStatus = 'paid';
    tx.status = 'paid';
    db.saveTransaction(tx);

    // Aktifkan paket ke tenant
    const company = db.getCompany(tx.company_id);
    if (company) {
      const planInfo = PLAN_PRICES[tx.plan_id];
      if (planInfo) {
        company.subscription_plan = planInfo.plan;
        company.subscription_status = 'active';
        db.saveCompany(company);
      }
    }
  } else if (isFailed) {
    finalStatus = 'failed';
    tx.status = 'failed';
    db.saveTransaction(tx);
  }

  res.json({ status: 'ok', message: `Webhook diproses. Status transaksi: ${finalStatus}` });
});

// SIMULATION Webhook Endpoint: Memungkinkan pengetesan Midtrans sandbox end-to-end tanpa server luar
app.post('/api/simulate/webhook-pay', (req, res) => {
  const { order_id, action } = req.body;

  const tx = db.getTransactions().find(t => t.order_id === order_id);
  if (!tx) {
    return res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
  }

  const gross_amount = parseFloat(req.body.amount || tx.amount).toFixed(2);
  const status_code = action === 'success' ? '200' : '400';
  const transaction_status = action === 'success' ? 'settlement' : 'deny';

  // Calculate signature
  const rawData = order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY;
  const signature_key = crypto.createHash('sha512').update(rawData).digest('hex');

  // Trigger internal webhook call safely to test webhook functionality
  const payload = {
    order_id,
    status_code,
    gross_amount,
    transaction_status,
    signature_key,
    fraud_status: 'accept'
  };

  // Mock-call webhook handler logic
  tx.status = action === 'success' ? 'paid' : 'failed';
  db.saveTransaction(tx);

  if (action === 'success') {
    const company = db.getCompany(tx.company_id);
    if (company) {
      const planInfo = PLAN_PRICES[tx.plan_id];
      if (planInfo) {
        company.subscription_plan = planInfo.plan;
        company.subscription_status = 'active';
        db.saveCompany(company);
      }
    }
  }

  res.json({
    message: 'Simulasi webhook pembayaran berhasil dikirim & diproses secara internal!',
    payload,
    transaction: tx
  });
});


// 4. INVITE KARYAWAN
app.post('/api/employees/invite', authenticate, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Hanya administrator yang dapat mengundang karyawan.' });
  }

  const company = db.getCompany(user.company_id);
  if (!company) {
    return res.status(404).json({ error: 'Perusahaan tidak ditemukan.' });
  }

  // Get current team size counts to enforce plan limits
  const currentTeam = db.getUsers().filter(u => u.company_id === user.company_id && u.role === 'karyawan');
  const maxLimit = company.subscription_plan === 'pro' ? 300 : (company.subscription_plan === 'starter' ? 50 : 15); // Trial is limit 15

  const { invites } = req.body; // Array of { nama, email, nomor_hp, jabatan, departemen }
  if (!invites || !Array.isArray(invites) || invites.length === 0) {
    return res.status(400).json({ error: 'Mohon masukkan setidaknya satu data karyawan untuk diundang.' });
  }

  if (currentTeam.length + invites.length > maxLimit) {
    return res.status(400).json({ error: `Batas kuota karyawan untuk paket saat ini (${maxLimit}) terlampaui. Upgrade paket Anda.` });
  }

  const results: any[] = [];
  const allUsers = db.getUsers();

  for (const emp of invites) {
    const { nama, email, nomor_hp, jabatan, departemen } = emp;

    if (!nama || !email) {
      continue;
    }

    // Check if email already exists
    const existing = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      results.push({ email, success: false, reason: 'Email ini sudah terdaftar ke sistem.' });
      continue;
    }

    // Create Karyawan User with dynamic id and 'invited' status
    const empId = 'usr_' + generateToken().substring(0, 8);
    const newEmp: User = {
      id: empId,
      company_id: user.company_id,
      role: 'karyawan',
      nama,
      email,
      nomor_hp: nomor_hp || '',
      password_hash: '', // Set by employee in landing activation
      jabatan: jabatan || 'Staf',
      departemen: departemen || 'Umum',
      foto_wajah_url: '',
      status: 'invited',
    };

    // Create Invite Unique Token
    const inviteToken = 'inv_' + generateToken();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7); // Expired 7 days

    const newInvite: Invite = {
      id: 'inv_' + generateToken().substring(0, 8),
      company_id: user.company_id,
      user_id: empId,
      token: inviteToken,
      expired_at: expiry.toISOString(),
      status: 'sent',
    };

    db.saveUser(newEmp);
    db.saveInvite(newInvite);

    results.push({
      email,
      invite_token: inviteToken,
      success: true,
      invite_url: `/activate/${inviteToken}` // absolute link for fallback share copy
    });
  }

  res.json({
    message: 'Proses undangan karyawan selesai diproses.',
    results
  });
});

// Ambil riwayat invite untuk dipantau Admin
app.get('/api/employees/invites', authenticate, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Akses ditolak.' });
  }

  const invites = db.getInvites().filter(i => i.company_id === user.company_id);
  const users = db.getUsers().filter(u => u.company_id === user.company_id);

  const tracking = invites.map(inv => {
    const invitedUser = users.find(u => u.id === inv.user_id);
    return {
      invite_id: inv.id,
      nama: invitedUser?.nama || 'Unknown',
      email: invitedUser?.email || '',
      jabatan: invitedUser?.jabatan || '',
      departemen: invitedUser?.departemen || '',
      token: inv.token,
      expired_at: inv.expired_at,
      status: inv.status, // sent, opened, completed
    };
  });

  res.json({ invites: tracking });
});

// Ambil riwayat list seluruh karyawan
app.get('/api/employees/list', authenticate, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Akses ditolak.' });
  }

  const employees = db.getUsers().filter(u => u.company_id === user.company_id && u.role === 'karyawan');
  res.json({ employees });
});


// 5. DETAIL UNDANGAN & AKTIVASI KARYAWAN
app.get('/api/activation/detail/:token', (req, res) => {
  const { token } = req.params;
  const invite = db.getInviteByToken(token);

  if (!invite) {
    return res.status(404).json({ error: 'Link undangan tidak valid atau tidak usah dipakai lagi.' });
  }

  const isExpired = new Date(invite.expired_at).getTime() < Date.now();
  if (isExpired) {
    return res.status(400).json({ error: 'Masa berlaku undangan ini telah habis (expired 7 hari).' });
  }

  const invitedUser = db.getUser(invite.user_id);
  const company = db.getCompany(invite.company_id);

  if (!invitedUser || !company) {
    return res.status(404).json({ error: 'Instansi atau profil karyawan tidak ditemukan.' });
  }

  // Mark invite as "opened"
  if (invite.status === 'sent') {
    invite.status = 'opened';
    db.saveInvite(invite);
  }

  res.json({
    email: invitedUser.email,
    nama: invitedUser.nama,
    jabatan: invitedUser.jabatan,
    departemen: invitedUser.departemen,
    company_name: company.name
  });
});

app.post('/api/activation/complete', (req, res) => {
  const { token, password, nomor_hp, foto_wajah_base64 } = req.body;

  if (!token || !password || !foto_wajah_base64) {
    return res.status(400).json({ error: 'Mohon isi semua data yang diwajibkan termasuk foto wajah.' });
  }

  const invite = db.getInviteByToken(token);
  if (!invite || invite.status === 'completed') {
    return res.status(400).json({ error: 'Undangan tidak valid atau sudah selesai diaktivasi.' });
  }

  const invitedUser = db.getUser(invite.user_id);
  if (!invitedUser) {
    return res.status(404).json({ error: 'Karyawan tidak ditemukan.' });
  }

  // Update profile
  invitedUser.password_hash = hashPassword(password);
  if (nomor_hp) invitedUser.nomor_hp = nomor_hp;
  invitedUser.foto_wajah_url = foto_wajah_base64; // base64 payload save
  invitedUser.status = 'active';

  // Mark invite complete
  invite.status = 'completed';

  db.saveUser(invitedUser);
  db.saveInvite(invite);

  res.json({
    message: 'Akun Anda berhasil diaktivasi! Silakan login untuk memulai clock-in pertama Anda.',
    token: invitedUser.id,
    user: {
      id: invitedUser.id,
      nama: invitedUser.nama,
      email: invitedUser.email,
      role: invitedUser.role
    }
  });
});


// 6. PROCESS ATTENDANCE (CLOCK IN / OUT)
app.get('/api/attendance/status', authenticate, (req, res) => {
  const user = (req as any).user as User;
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local

  const company = db.getCompany(user.company_id);
  const attendances = db.getAttendances();

  const todayRecord = attendances.find(a => a.user_id === user.id && a.tanggal === todayStr);

  res.json({
    record: todayRecord || null,
    company: {
      id: company?.id,
      name: company?.name,
      lat: company?.lat,
      long: company?.long,
      radius_meter: company?.radius_meter,
      jam_masuk: company?.jam_masuk,
      jam_keluar: company?.jam_keluar,
    },
    today: todayStr
  });
});

app.post('/api/attendance/clock', authenticate, (req, res) => {
  const user = (req as any).user as User;
  const { type, lat, long, selfie_base64 } = req.body as { type: 'in' | 'out', lat: number, long: number, selfie_base64: string };

  if (!selfie_base64 || lat === undefined || long === undefined) {
    return res.status(400).json({ error: 'Koordinat lokasi (GPS) dan Foto selfie wajib disertakan.' });
  }

  const company = db.getCompany(user.company_id);
  if (!company) {
    return res.status(404).json({ error: 'Perusahaan tidak ditemukan.' });
  }

  // Geofence Validation
  const distance = calculateDistance(lat, long, company.lat, company.long);
  const insideGeofence = distance <= company.radius_meter;

  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0]; // "HH:MM:SS"
  const dateStr = now.toLocaleDateString('en-CA'); // "YYYY-MM-DD"

  // Fetch or create attendance record
  const attendances = db.getAttendances();
  let record = attendances.find(a => a.user_id === user.id && a.tanggal === dateStr);

  if (!record) {
    record = {
      id: 'att_' + generateToken().substring(0, 8),
      user_id: user.id,
      company_id: user.company_id,
      tanggal: dateStr,
      jam_clock_in: null,
      jam_clock_out: null,
      lat_in: null,
      long_in: null,
      lat_out: null,
      long_out: null,
      status: null,
      selfie_in_url: null,
      selfie_out_url: null,
    };
  }

  if (type === 'in') {
    if (record.jam_clock_in) {
      return res.status(400).json({ error: 'Anda sudah melakukan Clock In hari ini.' });
    }

    record.jam_clock_in = timeStr;
    record.lat_in = lat;
    record.long_in = long;
    record.selfie_in_url = selfie_base64;
    record.notified_outside_in = !insideGeofence;

    // Calculate Late status (terlambat) or Present (hadir)
    // Compare jam_masuk & Toleransi menit
    let attendanceStatus: AttendanceStatus = 'hadir';

    if (!insideGeofence) {
      attendanceStatus = 'luar_lokasi';
    } else {
      const [entryHour, entryMin] = company.jam_masuk.split(':').map(Number);
      const entryMinutesTotal = entryHour * 60 + entryMin + company.toleransi_menit;

      const [currentHour, currentMin] = timeStr.split(':').map(Number);
      const currentMinutesTotal = currentHour * 60 + currentMin;

      if (currentMinutesTotal > entryMinutesTotal) {
        attendanceStatus = 'terlambat';
      }
    }

    record.status = attendanceStatus;

  } else {
    // Clock-out
    if (!record.jam_clock_in) {
      return res.status(400).json({ error: 'Mulai dengan melakukan Clock In terlebih dahulu sebelum Clock Out.' });
    }
    if (record.jam_clock_out) {
      return res.status(400).json({ error: 'Anda sudah melakukan Clock Out hari ini.' });
    }

    record.jam_clock_out = timeStr;
    record.lat_out = lat;
    record.long_out = long;
    record.selfie_out_url = selfie_base64;
    record.notified_outside_out = !insideGeofence;
  }

  db.saveAttendance(record);

  res.json({
    message: `Presensi absensi clock-${type} berhasil disimpan!`,
    record,
    distance_from_office_meters: Math.round(distance),
    inside_geofence: insideGeofence
  });
});

// Riwayat kehadiran pribadi karyawan (untuk PWA)
app.get('/api/attendance/self-history', authenticate, (req, res) => {
  const user = (req as any).user as User;
  const list = db.getAttendances()
    .filter(a => a.user_id === user.id)
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  res.json({ history: list });
});


// 7. ADMIN DASHBOARD DATA & HISTORY FILTERING
app.get('/api/dashboard/summary', authenticate, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Akses ditolak.' });
  }

  const todayStr = new Date().toLocaleDateString('en-CA');
  const allUsers = db.getUsers().filter(u => u.company_id === user.company_id && u.role === 'karyawan');
  const attendances = db.getAttendances().filter(a => a.company_id === user.company_id && a.tanggal === todayStr);

  const totalEmployees = allUsers.length;
  
  let hadir = 0;
  let terlambat = 0;
  let luar_lokasi = 0;

  attendances.forEach(att => {
    if (att.status === 'hadir') hadir++;
    else if (att.status === 'terlambat') terlambat++;
    else if (att.status === 'luar_lokasi') luar_lokasi++;
  });

  const belum_absen = Math.max(0, totalEmployees - (hadir + terlambat + luar_lokasi));

  // Today employee records for table
  const records = allUsers.map(emp => {
    const att = attendances.find(a => a.user_id === emp.id);
    return {
      user_id: emp.id,
      nama: emp.nama,
      jabatan: emp.jabatan,
      departemen: emp.departemen,
      status: att ? att.status : 'absen',
      jam_clock_in: att ? att.jam_clock_in : null,
      jam_clock_out: att ? att.jam_clock_out : null,
      selfie_in_url: att ? att.selfie_in_url : null,
      selfie_out_url: att ? att.selfie_out_url : null,
      lat_in: att ? att.lat_in : null,
      long_in: att ? att.long_in : null,
      lat_out: att ? att.lat_out : null,
      long_out: att ? att.long_out : null,
    };
  });

  res.json({
    metrics: {
      total: totalEmployees,
      hadir,
      terlambat,
      luar_lokasi,
      belum_absen
    },
    records,
    today: todayStr
  });
});

// Admin global query of history across dates & employees with filters
app.get('/api/dashboard/history', authenticate, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Akses ditolak.' });
  }

  const { start_date, end_date, employee_id, departemen } = req.query as { start_date?: string, end_date?: string, employee_id?: string, departemen?: string };

  const allEmployees = db.getUsers().filter(u => u.company_id === user.company_id && u.role === 'karyawan');
  let attendances = db.getAttendances().filter(a => a.company_id === user.company_id);

  // Filter by date range
  if (start_date) {
    attendances = attendances.filter(a => a.tanggal >= start_date);
  }
  if (end_date) {
    attendances = attendances.filter(a => a.tanggal <= end_date);
  }

  // Map and hydrate user details onto attendance logs
  let logs = attendances.map(att => {
    const emp = allEmployees.find(u => u.id === att.user_id);
    return {
      id: att.id,
      user_id: att.user_id,
      nama: emp?.nama || 'Mantan Karyawan',
      jabatan: emp?.jabatan || '',
      departemen: emp?.departemen || '',
      tanggal: att.tanggal,
      jam_clock_in: att.jam_clock_in,
      jam_clock_out: att.jam_clock_out,
      lat_in: att.lat_in,
      long_in: att.long_in,
      lat_out: att.lat_out,
      long_out: att.long_out,
      status: att.status,
      selfie_in_url: att.selfie_in_url,
      selfie_out_url: att.selfie_out_url,
    };
  });

  // Filter by employee selection
  if (employee_id) {
    logs = logs.filter(l => l.user_id === employee_id);
  }

  // Filter by department selection
  if (departemen) {
    logs = logs.filter(l => l.departemen.toLowerCase() === departemen.toLowerCase());
  }

  // Sort by date desc, then clock_in desc
  logs.sort((a, b) => {
    const dateComp = b.tanggal.localeCompare(a.tanggal);
    if (dateComp !== 0) return dateComp;
    const timeA = a.jam_clock_in || '00:00:00';
    const timeB = b.jam_clock_in || '00:00:00';
    return timeB.localeCompare(timeA);
  });

  res.json({ logs });
});


// Reset system state route (strictly helper to easily switch demo profiles)
app.post('/api/system/reset', (req, res) => {
  db.resetAll();
  res.json({ message: 'Database reset to default successful!' });
});


// Serve React build static frontend folder or connect dev server environment
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // SPA Fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Hadir.id Server] multi-tenant corporate platform bound at port ${PORT}`);
  });
}

startServer();
