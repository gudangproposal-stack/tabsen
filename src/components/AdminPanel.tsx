import React, { useState, useEffect } from 'react';
import MidtransSimModal from './MidtransSimModal';
import { 
  Users, Landmark, Settings, DollarSign, Calendar, UploadCloud, AlertCircle, 
  MapPin, Clock, Search, LogOut, CheckCircle, FileSpreadsheet, PlusCircle, 
  RefreshCw, Copy, Mail, Sparkles, ExternalLink, ShieldCheck, Eye, Compass
} from 'lucide-react';

interface AdminPanelProps {
  token: string;
  onLogout: () => void;
}

export default function AdminPanel({ token, onLogout }: AdminPanelProps) {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'billing' | 'setup' | 'logs'>('dashboard');
  
  // Loaded states
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any | null>(null);
  const [me, setMe] = useState<any | null>(null);
  const [metrics, setMetrics] = useState<any>({ total: 0, hadir: 0, terlambat: 0, luar_lokasi: 0, belum_absen: 0 });
  
  // Tables
  const [todayRecords, setTodayRecords] = useState<any[]>([]);
  const [inviteLogs, setInviteLogs] = useState<any[]>([]);
  const [globalLogs, setGlobalLogs] = useState<any[]>([]);
  const [allEmployeesList, setAllEmployeesList] = useState<any[]>([]);

  // Filtering states
  const [filterDepartemen, setFilterDepartemen] = useState('');
  const [logStartDate, setLogStartDate] = useState('');
  const [logEndDate, setLogEndDate] = useState('');
  const [logEmployeeId, setLogEmployeeId] = useState('');
  const [logDepartemen, setLogDepartemen] = useState('');

  // Form states: Configure Company Map & Coordinates
  const [cfgName, setCfgName] = useState('');
  const [cfgAddress, setCfgAddress] = useState('');
  const [cfgLat, setCfgLat] = useState(-6.2088);
  const [cfgLong, setCfgLong] = useState(106.8456);
  const [cfgRadius, setCfgRadius] = useState(150);
  const [cfgJamMasuk, setCfgJamMasuk] = useState('08:00');
  const [cfgJamKeluar, setCfgJamKeluar] = useState('17:00');
  const [cfgToleransi, setCfgToleransi] = useState(15);
  const [cfgLogo, setCfgLogo] = useState('');
  const [cfgStatusMsg, setCfgStatusMsg] = useState('');

  // Form states: Manual Invite Employee
  const [invNama, setInvNama] = useState('');
  const [invEmail, setInvEmail] = useState('');
  const [invHp, setInvHp] = useState('');
  const [invJabatan, setInvJabatan] = useState('');
  const [invDepartemen, setInvDepartemen] = useState('');

  // CSV Invite states
  const [csvRawText, setCsvRawText] = useState('');
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);
  const [csvValidationError, setCsvValidationError] = useState('');

  // Billing & Payment States
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [activeMidtransTrx, setActiveMidtransTrx] = useState<any | null>(null);

  // General feedback
  const [lightboxSelfie, setLightboxSelfie] = useState<string | null>(null);

  // Fetch all panel details
  const fetchAllData = async () => {
    try {
      // 1. Core Profile
      const resMe = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataMe = await resMe.json();
      setMe(dataMe.user);
      setCompany(dataMe.company);

      // Map configure presets
      if (dataMe.company) {
        setCfgName(dataMe.company.name || '');
        setCfgAddress(dataMe.company.address || '');
        setCfgLat(dataMe.company.lat || -6.2088);
        setCfgLong(dataMe.company.long || 106.8456);
        setCfgRadius(dataMe.company.radius_meter || 150);
        setCfgJamMasuk(dataMe.company.jam_masuk || '08:00');
        setCfgJamKeluar(dataMe.company.jam_keluar || '17:00');
        setCfgToleransi(dataMe.company.toleransi_menit || 15);
        setCfgLogo(dataMe.company.logo_url || '');
      }

      // 2. Metrics & Today presence table
      const resSum = await fetch('/api/dashboard/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataSum = await resSum.json();
      setMetrics(dataSum.metrics);
      setTodayRecords(dataSum.records || []);

      // 3. Invites Record
      const resInvLog = await fetch('/api/employees/invites', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataInvLog = await resInvLog.json();
      setInviteLogs(dataInvLog.invites || []);

      // 4. Employees List (all active)
      const resEmpList = await fetch('/api/employees/list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataEmpList = await resEmpList.json();
      setAllEmployeesList(dataEmpList.employees || []);

      // 5. Global Logs (loaded on request, but we load default initial ones)
      const resLogs = await fetch('/api/dashboard/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataLogs = await resLogs.json();
      setGlobalLogs(dataLogs.logs || []);

    } catch (err) {
      console.error('Error fetching admin dashboard modules', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [token]);

  // Handle saving geofencing coordinates & operational parameters
  const handleSaveCompanyConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setCfgStatusMsg('');
    try {
      const response = await fetch('/api/company/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: cfgName,
          address: cfgAddress,
          lat: cfgLat,
          long: cfgLong,
          radius_meter: cfgRadius,
          jam_masuk: cfgJamMasuk,
          jam_keluar: cfgJamKeluar,
          toleransi_menit: cfgToleransi,
          logo_url: cfgLogo
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal menyimpan pengaturan.');
      }

      setCompany(data.company);
      setCfgStatusMsg('Konfigurasi perusahaan dan Geofencing GPS berhasil disimpan!');
      setTimeout(() => setCfgStatusMsg(''), 3500);
    } catch (err: any) {
      alert(err.message || 'Gangguan Server.');
    }
  };

  // Preset quick coordinates coordinate map pin simulator helper
  const handleQuickCoordinate = (officeName: 'jakarta' | 'bandung' | 'surabaya' | 'custom_bali') => {
    if (officeName === 'jakarta') {
      setCfgLat(-6.2088);
      setCfgLong(106.8456);
      setCfgAddress('Menara Astra, Jl. Jend. Sudirman Kav 5, Jakarta Pusat');
    } else if (officeName === 'bandung') {
      setCfgLat(-6.9175);
      setCfgLong(107.6191);
      setCfgAddress('Gedung Sate, Jl. Diponegoro No.22, Bandung');
    } else if (officeName === 'surabaya') {
      setCfgLat(-7.2575);
      setCfgLong(112.7521);
      setCfgAddress('WTC Surabaya, Jl. Pemuda No.27, Surabaya');
    } else if (officeName === 'custom_bali') {
      // Perfect fallback Bali test coordinate
      setCfgLat(-8.4095);
      setCfgLong(115.1889);
      setCfgAddress('Santhi Korporat, Jl. Sunset Road No.8, Kuta, Bali');
    }
  };

  // Single manual employee invite dispatch
  const handleManualInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invNama || !invEmail) {
      alert('Nama dan Email wajib diisi.');
      return;
    }

    try {
      const response = await fetch('/api/employees/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          invites: [{
            nama: invNama,
            email: invEmail,
            nomor_hp: invHp,
            jabatan: invJabatan,
            departemen: invDepartemen
          }]
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengundang karyawan.');
      }

      alert('Karyawan berhasil diundang! Silakan copy Tautan Token Aktivasi di tabel jika ingin mengirim langsung.');
      
      // Reset fields
      setInvNama('');
      setInvEmail('');
      setInvHp('');
      setInvJabatan('');
      setInvDepartemen('');

      fetchAllData();
    } catch (err: any) {
      alert(err.message || 'Terjadi gangguan sistem.');
    }
  };

  // CSV upload robust parsing & preview
  const handleCsvFilePicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvValidationError('');
    setCsvPreviewRows([]);
    
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvRawText(text);

      // Split rows
      const rows = text.split('\n').map(r => r.trim()).filter(Boolean);
      if (rows.length <= 1) {
        setCsvValidationError('File CSV kosong atau hanya berisi kolom tajuk/header.');
        return;
      }

      // Read header row
      const headers = rows[0].toLowerCase().split(',').map(h => h.trim());
      
      // Parse data rows
      const parsed: any[] = [];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const seenEmails = new Set<string>();

      for (let i = 1; i < rows.length; i++) {
        const columns = rows[i].split(',').map(c => c.trim());
        
        // We expect: nama, email, nomor_hp, jabatan, departemen
        const nama = columns[0] || '';
        const email = columns[1] || '';
        const nomor_hp = columns[2] || '';
        const jabatan = columns[3] || 'Staf';
        const departemen = columns[4] || 'Umum';

        let warning = '';
        if (!nama || !email) {
          warning = 'Nama & Email wajib isi.';
        } else if (!emailRegex.test(email)) {
          warning = 'Format email tidak valid.';
        } else if (seenEmails.has(email.toLowerCase())) {
          warning = 'Email duplikat di file.';
        }

        seenEmails.add(email.toLowerCase());

        parsed.push({
          nama,
          email,
          nomor_hp,
          jabatan,
          departemen,
          warning
        });
      }

      setCsvPreviewRows(parsed);
    };
    reader.readAsText(file);
  };

  const handleSendCsvInvites = async () => {
    const validInvites = csvPreviewRows.filter(r => !r.warning);
    if (validInvites.length === 0) {
      alert('Tidak ada karyawan valid yang bisa diundang. Periksa warning di baris tabel preview.');
      return;
    }

    try {
      const response = await fetch('/api/employees/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ invites: validInvites }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengirim undangan CSV.');
      }

      alert(`Sukses mengirim ${validInvites.length} undangan bulk karyawan!`);
      setCsvPreviewRows([]);
      setCsvRawText('');
      
      fetchAllData();
    } catch (err: any) {
      alert(err.message || 'Mengirim undangan bulk terganggu.');
    }
  };

  // Fetch logs with filters
  const handleQueryLogs = async () => {
    try {
      let url = `/api/dashboard/history?token=1`;
      if (logStartDate) url += `&start_date=${logStartDate}`;
      if (logEndDate) url += `&end_date=${logEndDate}`;
      if (logEmployeeId) url += `&employee_id=${logEmployeeId}`;
      if (logDepartemen) url += `&departemen=${logDepartemen}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setGlobalLogs(data.logs || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Immediate filtering on filter input today's dashboard departemen
  const filteredTodayRecords = todayRecords.filter(rec => {
    if (!filterDepartemen) return true;
    return rec.departemen?.toLowerCase().includes(filterDepartemen.toLowerCase());
  });

  // Export filtered logs database records to CSV spreadsheet download
  const handleExportCSV = () => {
    if (globalLogs.length === 0) {
      alert('Tidak ada data rincian riwayat absensi untuk diexport.');
      return;
    }

    // Prepare CSV header rows
    const headers = ['Nama Karyawan', 'Jabatan', 'Departemen', 'Tanggal', 'Jam Masuk', 'Jam Keluar', 'Status', 'Lokasi Masuk (Lat;Long)', 'Lokasi Keluar (Lat;Long)'];
    const csvContent = [
      headers.join(','),
      ...globalLogs.map(log => [
        `"${log.nama || 'Karyawan'}"`,
        `"${log.jabatan || 'Staf'}"`,
        `"${log.departemen || 'Umum'}"`,
        `"${log.tanggal}"`,
        `"${log.jam_clock_in || '-'}"`,
        `"${log.jam_clock_out || '-'}"`,
        `"${log.status || 'absen'}"`,
        `"${log.lat_in || '-'};${log.long_in || '-'}"`,
        `"${log.lat_out || '-'};${log.long_out || '-'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Hadir_Absensi_Report_Export_${new Date().toLocaleDateString('en-CA')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Package & Billing processing Snap
  const handleInitiateSubscription = async (plan_id: string) => {
    try {
      const response = await fetch('/api/billing/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan_id }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }

      // Display the Midtrans Sandbox Checkout Dialog Simulation
      setActiveMidtransTrx({
        order_id: data.order_id,
        amount: data.amount,
        plan_name: data.plan_name,
      });

    } catch (err: any) {
      alert(err.message || 'Sistem penagihan billing sedang sibuk.');
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-slate-800">
        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-500">Membuka Dasbor Admin Hadir.id...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans text-slate-800">
      
      {/* Visual Lightbox Modal for selfie verification review */}
      {lightboxSelfie && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setLightboxSelfie(null)}
        >
          <div className="bg-slate-900 border border-slate-800 max-w-sm w-full rounded-2xl overflow-hidden p-3 flex flex-col" onClick={e => e.stopPropagation()}>
            <img src={lightboxSelfie} alt="Preview Verification Selfie" className="w-full h-80 object-cover rounded-xl" />
            <div className="flex justify-between items-center mt-3 text-white">
              <span className="text-[10px] text-gray-400 font-mono">Verifikasi Referensi Visual Utama</span>
              <button 
                onClick={() => setLightboxSelfie(null)}
                className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold py-1.5 px-3 rounded-lg"
              >
                Tutup Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Midtrans Simulation Modal */}
      {activeMidtransTrx && (
        <MidtransSimModal
          orderId={activeMidtransTrx.order_id}
          amount={activeMidtransTrx.amount}
          planName={activeMidtransTrx.plan_name}
          onPaymentSuccess={() => {
            alert('Pembayaran BERHASIL! Paket subscription Anda otomatis diakomodir oleh sistem.');
            setActiveMidtransTrx(null);
            fetchAllData(); // Refresh company tier status
          }}
          onClose={() => setActiveMidtransTrx(null)}
        />
      )}

      {/* Corporate Admin Navigation Header navbar */}
      <header className="bg-slate-900 text-white shrink-0 shadow-lg px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Logo and Tenant Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-white shadow-md shadow-indigo-900/30">
            <Users size={22} />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight leading-none flex items-center gap-1.5">
              Hadir<span className="text-indigo-400">.id</span> Admin
            </h1>
            <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-wider font-semibold font-mono">
              Tenant: {company?.name} &bull; Paket: <span className="text-yellow-400">{company?.subscription_plan}</span>
            </p>
          </div>
        </div>

        {/* Global Navigation links */}
        <nav className="flex flex-wrap gap-1 bg-slate-800 rounded-xl p-1 text-xs font-bold text-gray-200">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'hover:text-white hover:bg-slate-700'}`}
          >
            Dashboard Real-Time
          </button>
          <button 
            onClick={() => setActiveTab('employees')} 
            className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'employees' ? 'bg-indigo-600 text-white' : 'hover:text-white hover:bg-slate-700'}`}
          >
            Kelola Karyawan & Invite
          </button>
          <button 
            onClick={() => setActiveTab('setup')} 
            className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'setup' ? 'bg-indigo-600 text-white' : 'hover:text-white hover:bg-slate-700'}`}
          >
            Geofencing & GPS Kerja
          </button>
          <button 
            onClick={() => setActiveTab('logs')} 
            className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'logs' ? 'bg-indigo-600 text-white' : 'hover:text-white hover:bg-slate-700'}`}
          >
            Ekspor Riwayat Logs
          </button>
          <button 
            onClick={() => setActiveTab('billing')} 
            className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'billing' ? 'bg-indigo-600 text-white' : 'hover:text-white hover:bg-slate-700'}`}
          >
            Pilih Paket & Billing
          </button>
        </nav>

        {/* Logout session */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:block text-right">
            <p className="text-xs font-bold leading-none">{me?.nama}</p>
            <p className="text-[10px] text-gray-405 mt-1 text-slate-400">{me?.jabatan}</p>
          </div>
          <button 
            onClick={onLogout}
            className="p-2 border border-slate-700 rounded-xl hover:bg-slate-800 transition"
            title="Log Out Admin"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main admin dashboard display panel layout */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Active subscription status alert banner */}
        {company?.subscription_status === 'trialing' && (
          <div className="bg-yellow-50 border border-yellow-250 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs">
            <div className="flex gap-2 text-yellow-800 text-xs font-sans">
              <AlertCircle size={18} className="shrink-0 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-bold">Akun Perusahaan Berada di Masa Free Trial (14 Hari)</p>
                <p className="text-xs text-yellow-700 mt-0.5">
                  Berakhir pada {new Date(company.trial_ends_at).toLocaleDateString('id-ID', { dateStyle: 'long' })}. Pilih paket pro di menu billing agar absensi dapat digunakan massal.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('billing')}
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold text-xs py-1.5 px-3 rounded-lg shadow-sm"
            >
              Ubah ke Berbayar &rarr;
            </button>
          </div>
        )}

        {/* 1. DASHBOARD OVERVIEW TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            {/* KPI metrics cards row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white p-5 border border-gray-200 rounded-2xl shadow-xs">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Total Tim Aktif</p>
                <p className="text-3xl font-extrabold text-blue-950 mt-1">{metrics.total}</p>
                <p className="text-[10px] text-gray-400 mt-2 font-mono">karyawan terdaftar</p>
              </div>
              <div className="bg-emerald-50/40 p-5 border border-emerald-200/50 rounded-2xl shadow-xs">
                <p className="text-[10px] text-emerald-800 uppercase tracking-wider font-bold">Hadir Tepat Waktu</p>
                <p className="text-3xl font-extrabold text-emerald-600 mt-1">{metrics.hadir}</p>
                <p className="text-[10px] text-emerald-500 mt-2 font-semibold">Tepat sesuai jadwal</p>
              </div>
              <div className="bg-amber-50/40 p-5 border border-amber-200/60 rounded-2xl shadow-xs">
                <p className="text-[10px] text-amber-800 uppercase tracking-wider font-bold">Karyawan Terlambat</p>
                <p className="text-3xl font-extrabold text-amber-600 mt-1">{metrics.terlambat}</p>
                <p className="text-[10px] text-amber-500 mt-2 font-semibold">Melebihi toleransi</p>
              </div>
              <div className="bg-rose-50/40 p-5 border border-rose-250/50 rounded-2xl shadow-xs">
                <p className="text-[10px] text-rose-800 uppercase tracking-wider font-bold">Luar Lokasi (GPS)</p>
                <p className="text-3xl font-extrabold text-rose-600 mt-1">{metrics.luar_lokasi}</p>
                <p className="text-[10px] text-rose-500 mt-2 font-semibold font-mono">Verifikasi di luar radius</p>
              </div>
              <div className="col-span-2 lg:col-span-1 bg-slate-100 p-5 border border-slate-200 rounded-2xl shadow-xs">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Belum Absen Hari Ini</p>
                <p className="text-3xl font-extrabold text-slate-600 mt-1">{metrics.belum_absen}</p>
                <p className="text-[10px] text-slate-400 mt-2 font-semibold">Tidak ada log terekam</p>
              </div>
            </div>

            {/* Today's log filter and table */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-5 border-b border-gray-150 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="font-extrabold text-base text-gray-900 leading-tight">Kehadiran Karyawan Hari Ini</h3>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Calendar size={13} className="text-indigo-600" />
                    Menyajikan data laporan clock-in real-time untuk hari ini: <span className="font-mono font-bold">{new Date().toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
                    <input
                      type="text"
                      placeholder="Cari Departemen..."
                      value={filterDepartemen}
                      onChange={(e) => setFilterDepartemen(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 text-xs rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                  <button 
                    onClick={fetchAllData}
                    className="p-2 border border-gray-200 rounded-xl hover:bg-gray-100 transition shrink-0" 
                    title="Segarkan Log"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {/* Today Presence Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/75 border-b border-gray-200 font-bold text-gray-600">
                    <tr>
                      <th className="p-4">Nama Lengkap</th>
                      <th className="p-4">Jabatan</th>
                      <th className="p-4">Departemen</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Clock In</th>
                      <th className="p-4">Selfie In</th>
                      <th className="p-4">Clock Out</th>
                      <th className="p-4">Selfie Out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {filteredTodayRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-10 text-center text-gray-400 font-sans">
                          Tidak ditemukan absensi terekam yang sesuai filter hari ini.
                        </td>
                      </tr>
                    ) : (
                      filteredTodayRecords.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50/40">
                          <td className="p-4 font-semibold text-gray-900">{r.nama}</td>
                          <td className="p-4 text-gray-600">{r.jabatan}</td>
                          <td className="p-4 text-slate-500 font-mono text-[11px]">{r.departemen}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              r.status === 'hadir' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' :
                              r.status === 'terlambat' ? 'bg-amber-100 border border-amber-300 text-amber-800' :
                              r.status === 'luar_lokasi' ? 'bg-rose-50 border border-rose-200 text-rose-700' :
                              'bg-gray-100 text-gray-500 border border-transparent'
                            }`}>
                              {r.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-4 font-semibold font-mono text-gray-900">{r.jam_clock_in || '-'}</td>
                          <td className="p-4">
                            {r.selfie_in_url ? (
                              <button 
                                onClick={() => setLightboxSelfie(r.selfie_in_url)}
                                className="flex items-center gap-1 text-indigo-600 hover:underline hover:text-indigo-800 font-semibold text-[11px]"
                              >
                                <Eye size={12} /> Lihat Selfie
                              </button>
                            ) : '-'}
                          </td>
                          <td className="p-4 font-semibold font-mono text-gray-900">{r.jam_clock_out || '-'}</td>
                          <td className="p-4">
                            {r.selfie_out_url ? (
                              <button 
                                onClick={() => setLightboxSelfie(r.selfie_out_url)}
                                className="flex items-center gap-1 text-indigo-600 hover:underline hover:text-indigo-800 font-semibold text-[11px]"
                              >
                                <Eye size={12} /> Lihat Selfie
                              </button>
                            ) : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. EMPLOYEE & INVITES TAB */}
        {activeTab === 'employees' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            {/* Forms Panel (CSV or Manual) */}
            <div className="space-y-6 lg:col-span-1 flex flex-col">
              
              {/* CSV Upload form */}
              <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-xs">
                <h3 className="font-black text-sm text-gray-900 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                  <UploadCloud size={16} className="text-indigo-600" />
                  Metode 1: Bulk Invite via CSV
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                  Undang puluhan karyawan sekaligus. Kolom wajib pada baris CSV: <span className="font-mono text-[10px] bg-slate-100 p-0.5 rounded text-indigo-700">nama, email, nomor_hp, jabatan, departemen</span>.
                </p>

                <div className="space-y-3">
                  <label className="border-2 border-dashed border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-50/10 transition text-center">
                    <input 
                      type="file" 
                      accept=".csv"
                      onChange={handleCsvFilePicker} 
                      className="hidden" 
                    />
                    <FileSpreadsheet className="text-gray-400 mb-2 stroke-[1.5]" size={32} />
                    <span className="text-xs font-semibold text-gray-700">Klik untuk unggah file CSV Anda</span>
                    <span className="text-[9px] text-gray-400 mt-1">Gunakan template standard Microsoft Excel dll</span>
                  </label>

                  {/* CSV Quick template preview mock builder download */}
                  <button
                    onClick={() => {
                      const csvContent = "nama,email,nomor_hp,jabatan,departemen\nAngga Dwiputra,angga@hadir.id,08122334455,Direktur Utama,Eksekutif\nSiti Rahma,siti@hadir.id,,HR Specialist,HRD\nBambang Sulistyo,bambang@hadir.id,0812999888,IT Developer,Teknologi";
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.setAttribute('href', url);
                      link.setAttribute('download', 'hadir_id_employee_template.csv');
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="text-xs text-indigo-600 hover:underline block w-full text-center font-semibold"
                  >
                    Download Template CSV Setup &larr;
                  </button>

                  {/* CSV Preview Section */}
                  {csvPreviewRows.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100 space-y-3">
                      <p className="text-[11px] font-bold text-gray-700 flex justify-between">
                        <span>Preview Undangan CSV:</span>
                        <span className="text-indigo-600 font-mono">{csvPreviewRows.length} Karyawan</span>
                      </p>

                      <div className="max-h-48 overflow-y-auto border border-gray-150 rounded-xl divide-y divide-gray-100 text-[10px]">
                        {csvPreviewRows.map((row, idx) => (
                          <div key={idx} className="p-2 bg-slate-50 flex flex-col">
                            <span className="font-semibold text-gray-800">{row.nama}</span>
                            <span className="text-gray-500 font-mono">{row.email}</span>
                            {row.warning && (
                              <span className="text-red-500 font-bold text-[9px] mt-0.5">{row.warning}</span>
                            )}
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={handleSendCsvInvites}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-2 px-3 rounded-xl transition shadow-md shadow-indigo-100"
                      >
                        Konfirmasi & Kirim Link Massal
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Manual input invite form */}
              <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-xs mt-6">
                <h3 className="font-black text-sm text-gray-900 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                  <PlusCircle size={16} className="text-indigo-600" />
                  Metode 2: Input Manual
                </h3>
                <p className="text-[11px] text-gray-500 mb-4">Undang satu karyawan secara manual dengan form isian terpadu.</p>

                <form onSubmit={handleManualInvite} className="space-y-3">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Nama Lengkap Karyawan</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Contoh: Ridwan Kamil"
                      value={invNama}
                      onChange={(e) => setInvNama(e.target.value)}
                      className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Email Kantor / Pribadi</label>
                    <input 
                      type="email" 
                      required
                      placeholder="contoh@hadir.id"
                      value={invEmail}
                      onChange={(e) => setInvEmail(e.target.value)}
                      className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Nomor Handphone (Guna WA)</label>
                    <input 
                      type="tel" 
                      placeholder="08XXXXXXXXXX"
                      value={invHp}
                      onChange={(e) => setInvHp(e.target.value)}
                      className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Jabatan</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Sales"
                        value={invJabatan}
                        onChange={(e) => setInvJabatan(e.target.value)}
                        className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Departemen</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Finance"
                        value={invDepartemen}
                        onChange={(e) => setInvDepartemen(e.target.value)}
                        className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-3 rounded-xl transition mt-3 flex items-center justify-center gap-1.5"
                  >
                    Kirim Undangan Aktivasi
                  </button>
                </form>
              </div>

            </div>

            {/* List Tracking Status Tables Panel */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Active invites in progress logs */}
              <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs">
                <div className="p-5 border-b border-gray-150 flex justify-between items-center bg-gray-50/50">
                  <div>
                    <h3 className="font-extrabold text-sm text-gray-900 text-slate-800 flex items-center gap-1.5">
                      <Mail size={16} className="text-indigo-650" />
                      Status Monitoring Undangan Karyawan
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Pantau flow aktivasi akun yang dikirim oleh HR (Terkirim &rarr; Dibuka &rarr; Selesai Daftar).</p>
                  </div>
                  <span className="text-[10px] font-mono select-none bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-extrabold">
                    MULTI-TENANT SECURE
                  </span>
                </div>

                <div className="overflow-x-auto text-[11px]">
                  <table className="w-full text-left">
                    <thead className="bg-gray-100/50 text-slate-500 border-b border-gray-200 font-bold">
                      <tr>
                        <th className="p-3">Nama</th>
                        <th className="p-3">Email Kantor</th>
                        <th className="p-3">Jabatan/Divisi</th>
                        <th className="p-3">Status Undang</th>
                        <th className="p-3 text-right">Tautan Aktivasi (Copy Fallback)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {inviteLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-10 text-center text-gray-400">
                            Belum ada riwayat undangan yang dikirim oleh perusahaan.
                          </td>
                        </tr>
                      ) : (
                        inviteLogs.map((log, index) => (
                          <tr key={index} className="hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-gray-900">{log.nama}</td>
                            <td className="p-3 font-mono text-gray-600">{log.email}</td>
                            <td className="p-3 text-slate-500">{log.jabatan} &bull; {log.departemen}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                                log.status === 'completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                log.status === 'opened' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                'bg-slate-100 border-slate-205 text-slate-650'
                              }`}>
                                {log.status === 'completed' ? 'Selesai Daftar' : (log.status === 'opened' ? 'Dibuka' : 'Terkirim')}
                              </span>
                            </td>
                            <td className="p-3 text-right font-medium">
                              <div className="inline-flex items-center gap-1">
                                <span className="font-mono text-[9px] bg-slate-100 px-1.5 py-1 rounded text-indigo-650 select-all shrink-0 max-w-28 truncate">
                                  {log.token}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const activationUrl = `${window.location.origin}/activate/${log.token}`;
                                    navigator.clipboard.writeText(activationUrl);
                                    alert('Tautan Aktivasi Karyawan disalin ke clipboard! Bagikan tautan ini ke karyawan melalui email/WhatsApp.');
                                  }}
                                  className="text-[10px] bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded font-bold transition flex items-center gap-1.5"
                                  title="Copy Link Activator"
                                >
                                  <Copy size={11} /> Copy Tautan
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Entire active team directory roster */}
              <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs">
                <div className="p-5 border-b border-gray-150">
                  <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                    <Users size={16} className="text-slate-800" />
                    Daftar Direktori Karyawan Aktif
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">Berikut daftar seluruh data karyawan yang berhasil melakukan aktivasi mandiri akun.</p>
                </div>
                <div className="overflow-x-auto text-[11px]">
                  <table className="w-full text-left">
                    <thead className="bg-gray-100/50 text-slate-505 border-b border-gray-200 font-bold">
                      <tr>
                        <th className="p-3">Foto Referensi</th>
                        <th className="p-3">Nama Lengkap</th>
                        <th className="p-3">Jabatan</th>
                        <th className="p-3">Departemen</th>
                        <th className="p-3">Nomor Handphone (WhatsApp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-slate-700">
                      {allEmployeesList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-gray-400 font-medium">
                            Belum ada karyawan yang berstatus aktif saat ini.
                          </td>
                        </tr>
                      ) : (
                        allEmployeesList.map((emp, index) => (
                          <tr key={index} className="hover:bg-slate-50/50">
                            <td className="p-3">
                              <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 bg-gray-50">
                                {emp.foto_wajah_url ? (
                                  <img src={emp.foto_wajah_url} alt="Face profile" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[9px] font-sans text-gray-400 bg-gray-100">No Photo</div>
                                )}
                              </div>
                            </td>
                            <td className="p-3 font-semibold text-slate-900">{emp.nama}</td>
                            <td className="p-3">{emp.jabatan || '-'}</td>
                            <td className="p-3 font-mono text-[10px] text-slate-500">{emp.departemen || '-'}</td>
                            <td className="p-3 font-medium text-slate-700">{emp.nomor_hp || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 3. GEOFENCING CONFIGURATION TAB */}
        {activeTab === 'setup' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            {/* Coordinates and Setup GPS parameters parameters form */}
            <div className="lg:col-span-1 bg-white border border-gray-200 rounded-3xl p-6 shadow-xs h-fit space-y-4">
              <div>
                <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider flex items-center gap-1">
                  <MapPin size={16} className="text-indigo-650" />
                  Konfigurasi GPS & Jadwal
                </h3>
                <p className="text-xs text-gray-500 mt-1">Sesuaikan letak geolokasi dan jam kerja absen perusahaan Anda.</p>
              </div>

              {cfgStatusMsg && (
                <p className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium text-center animate-pulse">
                  {cfgStatusMsg}
                </p>
              )}

              <form onSubmit={handleSaveCompanyConfig} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wide font-bold">Nama Perusahaan (Tenant)</label>
                  <input 
                    type="text" 
                    required 
                    value={cfgName}
                    onChange={(e) => setCfgName(e.target.value)}
                    className="w-full mt-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wide font-bold">Alamat Kantor Rujukan</label>
                  <textarea
                    rows={2}
                    value={cfgAddress}
                    onChange={(e) => setCfgAddress(e.target.value)}
                    placeholder="Contoh: Jl. Sudirman No 21, Kepulauan Riau"
                    className="w-full mt-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase font-bold">Latitude Rujukan</label>
                    <input 
                      type="number" 
                      step="any"
                      required
                      value={cfgLat}
                      onChange={(e) => setCfgLat(parseFloat(e.target.value))}
                      className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase font-bold">Longitude Rujukan</label>
                    <input 
                      type="number" 
                      step="any"
                      required
                      value={cfgLong}
                      onChange={(e) => setCfgLong(parseFloat(e.target.value))}
                      className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white font-mono"
                    />
                  </div>
                </div>

                {/* Radius controller scale */}
                <div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-500 uppercase font-bold">Radius Geofencing</span>
                    <span className="font-mono text-indigo-700 font-extrabold">{cfgRadius} Meter</span>
                  </div>
                  <input 
                    type="range" 
                    min="50" 
                    max="500" 
                    step="50"
                    value={cfgRadius}
                    onChange={(e) => setCfgRadius(parseInt(e.target.value))}
                    className="w-full mt-2 outline-none accent-indigo-650 cursor-pointer"
                  />
                  <span className="text-[9px] text-gray-400 font-sans block mt-1">Default yang disarankan: 150m - 200m</span>
                </div>

                {/* Clock timings variables */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100">
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase font-bold">Jam Masuk (IN)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 08:30"
                      required
                      value={cfgJamMasuk}
                      onChange={(e) => setCfgJamMasuk(e.target.value)}
                      className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase font-bold">Jam Pulang (OUT)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 17:30"
                      required
                      value={cfgJamKeluar}
                      onChange={(e) => setCfgJamKeluar(e.target.value)}
                      className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white font-mono text-center"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-500 uppercase font-bold">Toleransi Batas Menit</span>
                    <span className="font-mono text-amber-600 font-bold">{cfgToleransi} Menit</span>
                  </div>
                  <input 
                    type="number" 
                    required 
                    value={cfgToleransi}
                    onChange={(e) => setCfgToleransi(parseInt(e.target.value))}
                    className="w-full mt-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white font-mono text-center"
                  />
                  <span className="text-[9px] text-gray-400 block mt-1 leading-normal">
                    Karyawan login melebihi (Jam Masuk + Toleransi) otomatis ditandai bernilai status "Terlambat".
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-md shadow-indigo-100"
                >
                  Simpan Konfigurasi Operasional
                </button>
              </form>
            </div>

            {/* Simulated map container block */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div>
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1">
                  <Compass size={16} className="text-indigo-650" />
                  Simulator Titik Peta Geofencing
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Gunakan titik cepat di bawah ini untuk mengatensi letak koordinat kantor demo Anda di Indonesia.</p>
              </div>

              {/* Quick coordinates list buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleQuickCoordinate('jakarta')}
                  className="p-3 border border-gray-200 hover:border-indigo-400 rounded-2xl text-xs text-slate-800 bg-slate-50 transition font-bold"
                >
                  📍 Jakarta Pusat (Menara Astra)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCoordinate('bandung')}
                  className="p-3 border border-gray-200 hover:border-indigo-400 rounded-2xl text-xs text-slate-800 bg-slate-50 transition font-bold"
                >
                  📍 Bandung (Gedung Sate)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCoordinate('surabaya')}
                  className="p-3 border border-gray-200 hover:border-indigo-400 rounded-2xl text-xs text-slate-800 bg-slate-50 transition font-bold"
                >
                  📍 Surabaya (WTC Pemuda)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCoordinate('custom_bali')}
                  className="p-3 border border-gray-200 hover:border-indigo-400 rounded-2xl text-xs text-slate-800 bg-slate-50 transition font-bold"
                >
                  📍 Sunset Road Kuta Bali
                </button>
              </div>

              {/* Schematic Map Representation Canvas Mockup */}
              <div className="border border-dashed border-gray-200 rounded-2xl bg-slate-100 p-8 flex flex-col items-center justify-center min-h-[340px] text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#ccc_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />
                
                {/* Simulated Geofencing Range Visual */}
                <div className="w-56 h-56 rounded-full bg-blue-100/40 border-2 border-blue-500/70 flex items-center justify-center animate-pulse z-10 relative">
                  <div className="w-4 h-4 rounded-full bg-rose-600 border-2 border-white flex relative" title="Pusat Kantor Lat, Long">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  </div>
                  <div className="absolute text-[10px] text-indigo-900 font-bold bg-white/90 border border-indigo-200 px-2 py-0.5 rounded shadow-sm -mt-24">
                    Geofence Kantor ({cfgRadius}m)
                  </div>
                </div>

                <div className="mt-4 z-10 space-y-1">
                  <p className="text-xs font-bold text-gray-800">Visualisasi Peta Geospasial Aktif</p>
                  <p className="text-[10px] text-gray-500 max-w-sm leading-relaxed">
                    Karyawan yang melakukan clock-in akan dibandingkan jarak geografisnya secara real-time ke pusat koordinat <span className="font-semibold text-indigo-700">[{cfgLat}, {cfgLong}]</span> dengan formula matematis Haversine.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. BILLING & MIDTRANS SIMULATOR TAB */}
        {activeTab === 'billing' && (
          <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            <div className="text-center space-y-2">
              <h3 className="font-extrabold text-2xl text-gray-900">Pilih Paket Berlangganan Korporat</h3>
              <p className="text-xs text-slate-505 max-w-lg mx-auto">
                Hadir.id siap mendampingi operasional digital perusahaan Anda. Sedia paket starter murah hingga kapasitas pro multi-ratus karyawan.
              </p>

              {/* Billing Cycle controller */}
              <div className="inline-flex bg-slate-200 rounded-xl p-1 text-xs font-bold mt-4">
                <button
                  type="button"
                  onClick={() => setSelectedCycle('monthly')}
                  className={`px-4 py-1.5 rounded-lg transition ${selectedCycle === 'monthly' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  Bayar Bulanan
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCycle('yearly')}
                  className={`px-4 py-1.5 rounded-lg transition flex items-center gap-1.5 ${selectedCycle === 'yearly' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  Bayar Tahunan <span className="bg-yellow-500 text-slate-900 text-[9px] px-1.5 py-0.5 rounded-sm">Diskon 20%</span>
                </button>
              </div>
            </div>

            {/* Pricing Bento Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              
              {/* Starter Plan card */}
              <div className="bg-white border-2 border-gray-100 rounded-[30px] p-6 shadow-xs relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">SaaS Starter Tier</span>
                  <h4 className="text-lg font-extrabold text-gray-900">Hadiri Starter</h4>
                  <p className="text-xs text-gray-500 font-medium">Cocok ditujukan bagi startup, divisi regional rintisan, atau UMKM kecil.</p>
                  
                  <div className="pt-2">
                    <span className="text-3xl font-black text-gray-950">
                      {selectedCycle === 'monthly' ? formatRupiah(299000) : formatRupiah(2870400)}
                    </span>
                    <span className="text-xs text-gray-500"> / {selectedCycle === 'monthly' ? 'Bulan' : 'Tahun'}</span>
                  </div>

                  <hr className="border-gray-100" />

                  <ul className="space-y-2 text-xs">
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-indigo-600" />
                      <span>Kapasitas tim maks. <strong className="text-slate-900 font-bold">50 Karyawan</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-indigo-600" />
                      <span>Simpan selfie & geolokasi GPS real-time</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-indigo-600" />
                      <span>Download reports format spreadsheet CSV</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-6">
                  <button
                    onClick={() => handleInitiateSubscription(selectedCycle === 'monthly' ? 'starter_monthly' : 'starter_yearly')}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition text-center block"
                  >
                    Mulai Berlangganan Starter
                  </button>
                </div>
              </div>

              {/* Pro Plan card */}
              <div className="bg-white border-2 border-indigo-500 rounded-[30px] p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[9px] uppercase font-bold py-1 px-4 rounded-bl-xl tracking-wider">
                  Sangat Direkomendasikan
                </div>

                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles size={11} /> High Capacity Tier
                  </span>
                  <h4 className="text-lg font-extrabold text-indigo-900">Hadiri Pro</h4>
                  <p className="text-xs text-gray-500 font-medium">Bagi perusahaan menengah, korporat agensi, pabrik regional rujukan.</p>
                  
                  <div className="pt-2">
                    <span className="text-3xl font-black text-indigo-950">
                      {selectedCycle === 'monthly' ? formatRupiah(799000) : formatRupiah(7670400)}
                    </span>
                    <span className="text-xs text-indigo-400"> / {selectedCycle === 'monthly' ? 'Bulan' : 'Tahun'}</span>
                  </div>

                  <hr className="border-gray-100" />

                  <ul className="space-y-2 text-xs">
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-indigo-600" />
                      <span>Kapasitas tim besar hingga <strong className="text-indigo-700 font-bold">300 Karyawan</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-indigo-600" />
                      <span>Prioritas server & storage selfie wajah tinggi</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-indigo-600" />
                      <span>Layanan bantuan prioritas eksklusif WA/Email</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-6">
                  <button
                    onClick={() => handleInitiateSubscription(selectedCycle === 'monthly' ? 'pro_monthly' : 'pro_yearly')}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition text-center block shadow-md shadow-indigo-150"
                  >
                    Beli Paket Pro
                  </button>
                </div>
              </div>

            </div>

            {/* Simulated Midtrans Secure Trust Badge */}
            <div className="bg-slate-100 border border-slate-200/50 p-4 rounded-2xl text-center space-y-1.5 flex flex-col items-center">
              <ShieldCheck size={28} className="text-indigo-600" />
              <p className="text-xs font-bold text-slate-850 font-sans">Payment Gateway Sandbox Diaktifkan</p>
              <p className="text-[10px] text-gray-500 max-w-md leading-relaxed">
                Platform Hadir.id terintegrasi secara modular dengan sistem sandbox Midtrans Snap. Anda dapat mencoba mensimulasikan order dengan sukses/fail di portal uji coba.
              </p>
            </div>
          </div>
        )}

        {/* 5. HISTORY EXPORT CSV LOGS TAB */}
        {activeTab === 'logs' && (
          <div className="bg-white border border-gray-200 p-5 rounded-3xl shadow-xs space-y-6 animate-fade-in">
            <div>
              <h3 className="font-extrabold text-base text-gray-900 leading-tight">Laporan & Ekspor CSV Riwayat Absensi</h3>
              <p className="text-xs text-gray-500 mt-1">Saring seluruh tumpukan data log kehadiran absensi karyawan korporat per departemen atau range tanggal spesifik.</p>
            </div>

            {/* Filter Controllers board */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-gray-50/75 p-4 rounded-2xl border border-gray-150 text-xs font-bold">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Mulai Tanggal</label>
                <input 
                  type="date"
                  value={logStartDate}
                  onChange={(e) => setLogStartDate(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Sampai Tanggal</label>
                <input 
                  type="date"
                  value={logEndDate}
                  onChange={(e) => setLogEndDate(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Filter Departemen</label>
                <input 
                  type="text"
                  placeholder="e.g. IT"
                  value={logDepartemen}
                  onChange={(e) => setLogDepartemen(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 font-mono text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-sans">Karyawan Spesifik</label>
                <select
                  value={logEmployeeId}
                  onChange={(e) => setLogEmployeeId(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs focus:outline-none"
                >
                  <option value="">-- Semua Karyawan --</option>
                  {allEmployeesList.map((emp, i) => (
                    <option key={i} value={emp.id}>{emp.nama}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleQueryLogs}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-center shadow-xs text-xs"
                >
                  Terapkan Filter
                </button>
              </div>
            </div>

            {/* Results actions row */}
            <div className="flex justify-between items-center bg-gray-50 px-4 py-3 border border-gray-150 rounded-xl">
              <span className="text-xs text-slate-500">
                Teridentifikasi sebanyak <strong className="text-indigo-650 font-bold">{globalLogs.length} Log Data</strong> Riwayat absensi.
              </span>
              <button
                type="button"
                onClick={handleExportCSV}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3.5 rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-emerald-100"
              >
                <FileSpreadsheet size={14} /> Ekspor Ke CSV Excel
              </button>
            </div>

            {/* Display Logs Table */}
            <div className="overflow-x-auto text-xs border border-gray-150 rounded-2xl">
              <table className="w-full text-left">
                <thead className="bg-[#FAF9F6] border-b border-gray-200 text-slate-500 font-bold">
                  <tr>
                    <th className="p-3">Karyawan</th>
                    <th className="p-3">Posisi/Departemen</th>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3 font-mono">Clock In</th>
                    <th className="p-3 font-mono">Clock Out</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Lokasi (GPS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-slate-705">
                  {globalLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">
                        Tidak ada riwayat absensi yang ditemukan untuk parameter ini.
                      </td>
                    </tr>
                  ) : (
                    globalLogs.map((log, index) => (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-gray-900">{log.nama}</td>
                        <td className="p-3 text-gray-600">{log.jabatan} &bull; <span className="font-mono text-[10px] text-gray-400">{log.departemen}</span></td>
                        <td className="p-3 font-mono">{log.tanggal}</td>
                        <td className="p-3 font-mono">{log.jam_clock_in || '-'}</td>
                        <td className="p-3 font-mono">{log.jam_clock_out || '-'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.status === 'hadir' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            log.status === 'terlambat' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            log.status === 'luar_lokasi' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            'bg-gray-100 text-gray-400'
                          }`}>
                            {log.status ? log.status.replace('_', ' ') : 'absen'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[10px] text-slate-500">
                          {log.lat_in ? (
                            <span>{log.lat_in.toFixed(4)},{log.long_in?.toFixed(4)}</span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </main>

    </div>
  );
}
