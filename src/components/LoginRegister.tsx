import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Landmark, Key, Phone, Mail, ArrowRight, CornerDownRight } from 'lucide-react';

interface LoginRegisterProps {
  onLoginSuccess: (token: string, user: any) => void;
  onNavigateToInvite: (token: string) => void;
}

export default function LoginRegister({ onLoginSuccess, onNavigateToInvite }: LoginRegisterProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorStr, setErrorStr] = useState('');

  // Login variables
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register variables
  const [regNama, setRegNama] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regHp, setRegHp] = useState('');
  const [regCompany, setRegCompany] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Manual Invite Token Activator Input (to test employee onboarding easily)
  const [activationToken, setActivationToken] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;

    setLoading(true);
    setErrorStr('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Autentikasi gagal.');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setErrorStr(err.message || 'Koneksi gagal.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNama || !regEmail || !regHp || !regCompany || !regPassword) {
      setErrorStr('Lengkapi seluruh bidang registrasi.');
      return;
    }

    setLoading(true);
    setErrorStr('');
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: regNama,
          email: regEmail,
          nomor_hp: regHp,
          nama_perusahaan: regCompany,
          password: regPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registrasi gagal.');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setErrorStr(err.message || 'Pendaftaran gagal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center py-12 px-4 text-white">
      <div className="w-full max-w-md">
        
        {/* App Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/40 relative">
            <UserCheck className="text-white" size={28} />
            <div className="absolute -bottom-1.5 -right-1.5 bg-yellow-500 text-slate-900 text-[10px] px-1 font-extrabold rounded-md">MVP</div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3 text-white">Hadir<span className="text-indigo-400">.id</span></h1>
          <p className="text-xs text-slate-400 mt-1.5 text-center px-4">
            Aplikasi Absensi Multi-Tenant GPS + Selfie untuk Perusahaan Korporat Indonesia
          </p>
        </div>

        {/* Form Box */}
        <div className="bg-slate-900 rounded-3xl shadow-xl p-8 border border-slate-800">
          
          {/* Header Toggle */}
          <div className="grid grid-cols-2 bg-slate-800 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setIsRegister(false); setErrorStr(''); }}
              className={`py-2 text-xs font-bold rounded-lg transition ${!isRegister ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Masuk Akun
            </button>
            <button
              onClick={() => { setIsRegister(true); setErrorStr(''); }}
              className={`py-2 text-xs font-bold rounded-lg transition ${isRegister ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Daftar Admin Baru
            </button>
          </div>

          {errorStr && (
            <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 text-xs rounded-xl mb-4 text-center animate-pulse">
              {errorStr}
            </div>
          )}

          {!isRegister ? (
            // LOGIN FORM
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 tracking-wide mb-1.5">Email Kantor / Karyawan</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-slate-500" size={16} />
                  <input
                    type="email"
                    required
                    placeholder="nama@perusahaan.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-slate-850 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 tracking-wide mb-1.5">Kata Sandi</label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 text-slate-500" size={16} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-850 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-2.5 mt-2 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-900/30"
              >
                {loading ? 'Sedang Otentikasi...' : 'Masuk Aplikasi'}
                {!loading && <ArrowRight size={15} />}
              </button>
            </form>
          ) : (
            // REGISTER FORM
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 tracking-wide">Nama Lengkap Admin / HR</label>
                <input
                  type="text"
                  required
                  placeholder="Budi Gunawan"
                  value={regNama}
                  onChange={(e) => setRegNama(e.target.value)}
                  className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3.5 py-1.5 mt-1 text-sm focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 tracking-wide">Email HR / Perusahaan</label>
                <input
                  type="email"
                  required
                  placeholder="hrd@perusahaan.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3.5 py-1.5 mt-1 text-sm focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 tracking-wide">Nomor Handphone (Owner)</label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-2 text-slate-500" size={14} />
                  <input
                    type="tel"
                    required
                    placeholder="0812XXXXXXXX"
                    value={regHp}
                    onChange={(e) => setRegHp(e.target.value)}
                    className="w-full bg-slate-850 border border-slate-700 rounded-xl pl-8 pr-3.5 py-1.5 text-sm focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 tracking-wide">Nama Institusi / Perusahaan</label>
                <div className="relative mt-1">
                  <Landmark className="absolute left-3 top-2 text-slate-500" size={14} />
                  <input
                    type="text"
                    required
                    placeholder="PT Sinar Jasa Abadi"
                    value={regCompany}
                    onChange={(e) => setRegCompany(e.target.value)}
                    className="w-full bg-slate-850 border border-slate-700 rounded-xl pl-8 pr-3.5 py-1.5 text-sm focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 tracking-wide">Atur Kata Sandi Baru</label>
                <input
                  type="password"
                  required
                  placeholder="Min. 6 Karakter Keamanan"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3.5 py-1.5 mt-1 text-sm focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-2.5 mt-4 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-900/30"
              >
                {loading ? 'Menyiapkan Portal Tenant...' : 'Daftar & Mulai Trial 14 Hari'}
                {!loading && <ArrowRight size={15} />}
              </button>
            </form>
          )}
        </div>

        {/* Demo Invite Link Activation Simulator Panel */}
        <div className="bg-slate-900/70 border border-dashed border-indigo-950 rounded-2xl p-5 mt-6 justify-center">
          <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
            <CornerDownRight size={12} className="text-yellow-400 animate-bounce" />
            Simulator Aktivasi Karyawan Hadir.id
          </p>
          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
            Jika Anda diundang oleh Admin dan memiliki Token Undangan, tempel token/tautan Anda di bawah untuk mengaktifkan akun.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="Contoh: inv_xxxxxxxxxxxx"
              value={activationToken}
              onChange={(e) => setActivationToken(e.target.value)}
              className="flex-1 bg-slate-850 border border-slate-700 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 transition text-white"
            />
            <button
              onClick={() => {
                if (!activationToken) {
                  alert('Mohon tempel token invite, contoh: inv_abc123');
                  return;
                }
                const cleanedToken = activationToken.includes('/activate/') 
                  ? activationToken.substring(activationToken.lastIndexOf('/') + 1) 
                  : activationToken;
                onNavigateToInvite(cleanedToken);
              }}
              className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold text-xs py-1.5 px-3 rounded-xl transition shrink-0"
            >
              Aktifkan &rarr;
            </button>
          </div>
        </div>

        {/* Security badges */}
        <div className="mt-8 flex justify-center items-center gap-4 text-slate-500 text-[10px]">
          <div className="flex items-center gap-1">
            <ShieldCheck size={12} className="text-indigo-600" />
            <span>Multi-Tenant Isolate</span>
          </div>
          <span>&bull;</span>
          <span>SHA-256 Hashing</span>
          <span>&bull;</span>
          <span>GPS Geofenced</span>
        </div>

      </div>
    </div>
  );
}
