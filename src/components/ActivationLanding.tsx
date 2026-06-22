import React, { useState, useEffect } from 'react';
import CameraCapture from './CameraCapture';
import { UserCheck, ShieldCheck, Landmark, CheckCircle2, ArrowRight, Phone, Key, HelpCircle } from 'lucide-react';

interface ActivationLandingProps {
  token: string;
  onSuccess: (token: string, responseUser: any) => void;
  onGotoLogin: () => void;
}

export default function ActivationLanding({ token, onSuccess, onGotoLogin }: ActivationLandingProps) {
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [activationData, setActivationData] = useState<any | null>(null);
  
  // Fields to capture
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [selfieBase64, setSelfieBase64] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    async function fetchDetail() {
      try {
        const response = await fetch(`/api/activation/detail/${token}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Gagal memuat link aktivasi.');
        }
        setActivationData(data);
        setPhone(data.nomor_hp || '');
      } catch (err: any) {
        setErrorText(err.message || 'Tautan aktivasi tidak valid atau telah kedaluwarsa.');
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      alert('Mohon isi kata sandi keamanan Anda.');
      return;
    }
    if (password.length < 6) {
      alert('Kata sandi harus minimal 6 karakter demi keamanan akun.');
      return;
    }
    if (!selfieBase64) {
      alert('Mohon daftarkan foto wajah/selfie sebagai referensi verifikasi absensi.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/activation/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          nomor_hp: phone,
          foto_wajah_base64: selfieBase64,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Aktivasi gagal.');
      }

      setSavedSuccess(true);
      setTimeout(() => {
        // Log in user on success
        onSuccess(data.token, data.user);
      }, 2500);

    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mb-4" />
        <p className="text-sm text-gray-500 font-medium">Memverifikasi tautan undangan Hadir.id...</p>
      </div>
    );
  }

  if (errorText) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8 border border-red-100 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-2xl mb-4">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-gray-900 leading-tight">Undangan Tidak Valid</h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            {errorText}
          </p>
          <button
            onClick={onGotoLogin}
            className="mt-6 w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm py-2.5 px-4 rounded-xl transition"
          >
            Kembali ke Halaman Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-10 px-4 flex flex-col items-center justify-center text-white">
      <div className="bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-700">
        
        {/* Company Header */}
        <div className="bg-indigo-600 p-6 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-6 -mt-6" />
          <p className="text-[10px] uppercase tracking-wider text-indigo-200 font-semibold mb-1">Undangan Bergabung</p>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
            <Landmark size={20} className="text-indigo-200" />
            {activationData?.company_name}
          </h1>
          <p className="text-xs text-indigo-100 mt-1">Sistem Absensi Online Terintegrasi Hadir.id</p>
        </div>

        {/* Content Wizard */}
        <div className="p-6">
          {savedSuccess ? (
            <div className="text-center py-8 animate-fade-in flex flex-col items-center">
              <CheckCircle2 size={58} className="text-emerald-500 mb-4 animate-bounce" />
              <h2 className="text-lg font-bold text-white">Aktivasi Selesai!</h2>
              <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
                Akun karyawan Anda telah berhasil dikonfigurasi. Mengarahkan Anda ke Halaman Dasbor Presensi Mobile Anda...
              </p>
              <div className="w-8 h-1 bg-indigo-500 mt-6 rounded animate-pulse" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="bg-slate-700/50 p-4 rounded-2xl border border-slate-700 space-y-1.5">
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Identifikasi Karyawan</p>
                <div>
                  <p className="text-xs text-slate-300">Nama Lengkap</p>
                  <p className="text-sm font-semibold">{activationData?.nama}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-700">
                  <div>
                    <p className="text-[10px] text-slate-400">Departemen</p>
                    <p className="text-xs font-semibold">{activationData?.departemen}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Jabatan</p>
                    <p className="text-xs font-semibold">{activationData?.jabatan}</p>
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1">
                  <Key size={12} className="text-indigo-400" />
                  Atur Kata Sandi Login Baru
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min. 6 Karakter Keamanan"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* Phone number */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1">
                  <Phone size={12} className="text-indigo-400" />
                  Nomor HP Aktif (WhatsApp)
                </label>
                <input
                  type="tel"
                  placeholder="Contoh: 0812345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* Selfie camera profile catcher */}
              <div className="text-slate-900">
                <CameraCapture
                  label="Ambil Foto Selfie Wajah Anda (Wajib)"
                  onCapture={(img) => setSelfieBase64(img)}
                />
              </div>

              <button
                type="submit"
                disabled={saving || !selfieBase64}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm py-3 px-4 rounded-xl transition shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Aktifkan Akun & Masuk</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="flex gap-1 py-1 px-2.5 items-center justify-center bg-slate-700/35 border border-slate-700 rounded-xl text-[10px] text-slate-400 font-sans">
                <ShieldCheck size={13} className="text-indigo-400" />
                <span>Foto selfie digunakan Admin untuk mencocokkan verifikasi absensi manual.</span>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
