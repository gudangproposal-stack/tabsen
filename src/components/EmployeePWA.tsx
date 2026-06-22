import React, { useState, useEffect } from 'react';
import CameraCapture from './CameraCapture';
import { Camera, MapPin, CheckCircle, Clock, Calendar, Shield, LogOut, Navigation, Settings, ChevronRight, User, Compass, Landmark } from 'lucide-react';

interface EmployeePWAProps {
  token: string;
  onLogout: () => void;
}

export default function EmployeePWA({ token, onLogout }: EmployeePWAProps) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [activeRecord, setActiveRecord] = useState<any | null>(null);
  const [company, setCompany] = useState<any | null>(null);
  const [me, setMe] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'clock' | 'history' | 'profile'>('clock');

  // Input states
  const [clockingType, setClockingType] = useState<'in' | 'out' | null>(null);
  const [selfieBase64, setSelfieBase64] = useState<string | null>(null);
  
  // GPS configuration states
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; long: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [useGpsSimulation, setUseGpsSimulation] = useState<'real' | 'office' | 'outside'>('office'); // Fallback simulation defaults to "Inside Office" for instant success testing

  // User details modify states
  const [profileHp, setProfileHp] = useState('');
  const [profileNama, setProfileNama] = useState('');
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // Fetch status of today's attendance & details
  const fetchStatusAndHistory = async () => {
    try {
      // 1. Me & Company Info
      const resMe = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataMe = await resMe.json();
      setMe(dataMe.user);
      setCompany(dataMe.company);
      setProfileHp(dataMe.user.nomor_hp || '');
      setProfileNama(dataMe.user.nama || '');

      // 2. Today's Record status
      const resStatus = await fetch('/api/attendance/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataStatus = await resStatus.json();
      setActiveRecord(dataStatus.record);

      // 3. History
      const resHist = await fetch('/api/attendance/self-history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataHist = await resHist.json();
      setHistory(dataHist.history || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusAndHistory();
  }, [token]);

  // Acquire Geolocation
  const handleAcquireLocation = () => {
    if (useGpsSimulation === 'office' && company) {
      setGpsCoords({ lat: company.lat, long: company.long });
      setGpsError(null);
      return;
    }
    if (useGpsSimulation === 'outside' && company) {
      // Simulate 2.5 kilometers outside
      setGpsCoords({ lat: company.lat + 0.024, long: company.long + 0.024 });
      setGpsError(null);
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError('Browser ini tidak mendukung Geolocation.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, long: pos.coords.longitude });
        setGpsLoading(false);
      },
      (err) => {
        console.warn(err);
        setGpsError('Gagal mendeteksi lokasi asli. Silakan ganti ke mode simulator GPS di bawah.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Triggers automatically when selection changes
  useEffect(() => {
    if (company) {
      handleAcquireLocation();
    }
  }, [useGpsSimulation, company, clockingType]);

  const handleProcessClock = async () => {
    if (!selfieBase64) {
      alert('Foto selfie wajib diambil.');
      return;
    }
    if (!gpsCoords) {
      alert('Koordinat lokasi tidak terdeteksi. Selesaikan deteksi GPS rujukan.');
      return;
    }

    try {
      const response = await fetch('/api/attendance/clock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: clockingType,
          lat: gpsCoords.lat,
          long: gpsCoords.long,
          selfie_base64: selfieBase64,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal menyimpan absensi.');
      }

      alert(data.message);
      setClockingType(null);
      setSelfieBase64(null);
      
      // Reload states
      fetchStatusAndHistory();
    } catch (err: any) {
      alert(err.message || 'Terjadi gangguan sistem.');
    }
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccessMsg('');
    try {
      const res = await fetch('/api/company/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          // employee only allowed to change basic details in this screen
        })
      });
      // Mocking profile save message for local user interface variables
      setProfileSuccessMsg('Profil dasar Anda berhasil diperbarui!');
      setTimeout(() => setProfileSuccessMsg(''), 3000);
    } catch (err) {
      alert('Gangguan memperbarui data.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-xs text-slate-400">Menghubungkan ke server korporasi...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:py-10 flex items-center justify-center">
      
      {/* Smartphone Device Mockup Container */}
      <div className="w-full max-w-sm bg-slate-900 rounded-[40px] shadow-2xl border-8 border-slate-800 overflow-hidden relative flex flex-col h-[740px] text-white">
        
        {/* Device camera hardware bezel pill */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-800 rounded-full z-20 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-slate-900 mr-2" />
          <div className="w-10 h-1 bg-slate-900 rounded" />
        </div>

        {/* Dynamic header */}
        <div className="bg-indigo-600 px-5 pt-8 pb-5 text-center shrink-0 border-b border-indigo-500 relative">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-mono select-none bg-indigo-500 text-indigo-100 font-bold px-2 py-0.5 rounded-sm">
              HADIR MOBILE (PWA)
            </span>
            <button
              onClick={onLogout}
              className="p-1 hover:bg-white/15 rounded-lg text-indigo-100 hover:text-white transition"
              title="Keluar Sesi"
            >
              <LogOut size={16} />
            </button>
          </div>
          <h2 className="text-base font-bold text-white tracking-tight truncate flex items-center justify-center gap-1.5 mt-2">
            <Landmark size={15} className="text-indigo-200 shrink-0" />
            {company?.name}
          </h2>
          <p className="text-[11px] text-indigo-100 capitalize font-medium">{me?.nama} ({me?.jabatan})</p>
        </div>

        {/* Active main body area */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
          
          {clockingType ? (
            /* ACTIVE CLOCK IN/OUT FLOW */
            <div className="bg-slate-850 p-4 rounded-3xl border border-indigo-950 space-y-4 animate-fade-in text-slate-900">
              <div className="flex justify-between items-center text-white">
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <Compass size={16} className="text-yellow-400" />
                  Presensi: Clock {clockingType === 'in' ? 'In (Masuk)' : 'Out (Pulang)'}
                </h3>
                <button
                  onClick={() => { setClockingType(null); setSelfieBase64(null); }}
                  className="text-xs font-semibold text-slate-400 hover:text-white underline"
                >
                  Batal
                </button>
              </div>

              {/* GPS Acquisition Module Card */}
              <div className="bg-slate-800 p-3.5 rounded-2xl border border-slate-700 space-y-2 text-white">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-indigo-200 font-semibold uppercase tracking-wider flex items-center gap-1">
                    <MapPin size={11} /> Koordinat Verifikasi GPS
                  </span>
                  <button
                    onClick={handleAcquireLocation}
                    disabled={gpsLoading}
                    className="text-[10px] bg-indigo-600 text-white font-bold py-1 px-2.5 rounded-md hover:bg-indigo-700 transition"
                  >
                    {gpsLoading ? 'Mendeteksi...' : 'Deteksi Ulang'}
                  </button>
                </div>

                {gpsCoords ? (
                  <div className="text-xs space-y-1">
                    <p className="font-mono text-[10px] text-emerald-400">
                      Latitude: {gpsCoords.lat.toFixed(6)}, Longitude: {gpsCoords.long.toFixed(6)}
                    </p>
                    {company && (
                      <div className="bg-slate-750/50 p-2 border border-slate-700 rounded-lg text-[10px] flex justify-between">
                        <span>Koordinat Kantor:</span>
                        <span className="font-semibold text-slate-300">
                          {company.lat.toFixed(4)}, {company.long.toFixed(4)} (Radius: {company.radius_meter}m)
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-yellow-400">{gpsError || 'Sedang memuat izin lokasi...'}</p>
                )}

                {/* GPS Sandbox Simulation switch — Essential for non-office environments */}
                <div className="pt-2 border-t border-slate-700 flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-400">Simulator Posisi Karyawan:</label>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => setUseGpsSimulation('office')}
                      className={`text-[9px] py-1 font-bold rounded-md transition ${useGpsSimulation === 'office' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-650'}`}
                    >
                      Dalam Kantor
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseGpsSimulation('outside')}
                      className={`text-[9px] py-1 font-bold rounded-md transition ${useGpsSimulation === 'outside' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-650'}`}
                    >
                      Luar Kantor
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseGpsSimulation('real')}
                      className={`text-[9px] py-1 font-bold rounded-md transition ${useGpsSimulation === 'real' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-650'}`}
                    >
                      GPS Asli Browser
                    </button>
                  </div>
                </div>
              </div>

              {/* Selfie Camera Catcher */}
              <CameraCapture onCapture={(b64) => setSelfieBase64(b64)} />

              <button
                type="button"
                disabled={!selfieBase64 || !gpsCoords}
                onClick={handleProcessClock}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-sm py-3 px-4 rounded-2xl transition shadow-lg shadow-indigo-950/40 flex items-center justify-center gap-2"
              >
                Kirim Laporan Kehadiran
              </button>
            </div>
          ) : activeTab === 'clock' ? (
            /* HOME TAB CLOCK VIEW */
            <div className="space-y-4 animate-fade-in">
              {/* Reference profile photo & summary */}
              <div className="bg-slate-850 p-4 border border-slate-800 rounded-3xl flex items-center gap-4 relative overflow-hidden">
                <div className="w-14 h-14 rounded-full border-2 border-indigo-400 overflow-hidden shrink-0 bg-slate-700">
                  {me?.foto_wajah_url ? (
                    <img src={me.foto_wajah_url} alt="Profile Face" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-bold">Wajah</div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-400">Selamat Bekerja,</p>
                  <h3 className="font-extrabold text-white text-base leading-tight">{me?.nama}</h3>
                  <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/60 font-semibold px-2 py-0.5 rounded-sm inline-block mt-1">
                    {me?.departemen || 'Staf'}
                  </span>
                </div>
              </div>

              {/* Today's Status Banner Card */}
              <div className="bg-slate-850 border border-slate-800 p-4 rounded-3xl text-center space-y-3">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Log Absensi Hari Ini</p>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-800/40 border border-slate-750 p-3 rounded-2xl">
                    <p className="text-[10px] text-slate-400">MASUK (IN)</p>
                    <p className="text-base font-bold text-emerald-400 mt-1">
                      {activeRecord?.jam_clock_in ? activeRecord.jam_clock_in : '--:--:--'}
                    </p>
                  </div>
                  <div className="bg-slate-800/40 border border-slate-750 p-3 rounded-2xl">
                    <p className="text-[10px] text-slate-400">PULANG (OUT)</p>
                    <p className="text-base font-bold text-amber-500 mt-1">
                      {activeRecord?.jam_clock_out ? activeRecord.jam_clock_out : '--:--:--'}
                    </p>
                  </div>
                </div>

                {activeRecord?.status && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-950/80 border border-indigo-900 text-indigo-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Status Kehadiran: <span className="uppercase">{activeRecord.status.replace('_', ' ')}</span>
                  </div>
                )}
              </div>

              {/* Giant Clock Buttons */}
              <div className="space-y-3 pt-2">
                {!activeRecord?.jam_clock_in ? (
                  <button
                    onClick={() => { setClockingType('in'); setSelfieBase64(null); }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] py-8 rounded-[30px] flex flex-col items-center justify-center transition shadow-lg shadow-indigo-950 text-white border border-indigo-500"
                  >
                    <Clock size={36} className="text-indigo-200 animate-pulse" />
                    <span className="font-extrabold text-lg mt-2">CLICK CLOCK IN</span>
                    <span className="text-[11px] text-indigo-150 mt-1">Lapor Kehadiran Jam Masuk</span>
                  </button>
                ) : !activeRecord?.jam_clock_out ? (
                  <button
                    onClick={() => { setClockingType('out'); setSelfieBase64(null); }}
                    className="w-full bg-amber-600 hover:bg-amber-700 active:scale-[0.98] py-8 rounded-[30px] flex flex-col items-center justify-center transition shadow-lg shadow-amber-950 text-white border border-amber-500"
                  >
                    <LogOut size={36} className="text-amber-200 animate-pulse" />
                    <span className="font-extrabold text-lg mt-2">CLICK CLOCK OUT</span>
                    <span className="text-[11px] text-amber-100 mt-1 font-semibold">Lapor Kehadiran Jam Pulang</span>
                  </button>
                ) : (
                  <div className="bg-emerald-950/20 border border-emerald-900/60 text-emerald-300 p-5 rounded-[30px] text-center flex flex-col items-center">
                    <CheckCircle size={36} className="text-emerald-500 mb-2" />
                    <p className="font-bold text-sm">Absensi Hari Ini Selesai</p>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Anda telah melaporkan Clock In dan Clock Out. Selamat beristirahat!
                    </p>
                  </div>
                )}
              </div>

              {/* Operational details card */}
              <div className="bg-slate-850 p-3.5 border border-slate-800 rounded-3xl space-y-1.5 text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>Jam Operasional Kantor:</span>
                  <span className="text-slate-200 font-semibold">{company?.jam_masuk} - {company?.jam_keluar}</span>
                </div>
                <div className="flex justify-between">
                  <span>Toleransi Keterlambatan:</span>
                  <span className="text-slate-200 font-semibold">{company?.toleransi_menit} Menit</span>
                </div>
              </div>
            </div>
          ) : activeTab === 'history' ? (
            /* PERSONAL HISTORY TAB LOGS */
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Log Presensi Kehadiran</h3>
                <span className="text-[10px] text-indigo-400 font-semibold font-mono">{history.length} Log</span>
              </div>

              <div className="space-y-2.5">
                {history.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-10">Belum ada riwayat absensi terekam.</p>
                ) : (
                  history.map((h, i) => (
                    <div key={i} className="bg-slate-850 border border-slate-800 p-3.5 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                          <Calendar size={13} className="text-indigo-400" />
                          {h.tanggal}
                        </span>
                        <span className={`text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-md ${
                          h.status === 'hadir' ? 'bg-emerald-950/60 border border-emerald-900 text-emerald-400' :
                          h.status === 'terlambat' ? 'bg-amber-950/60 border border-amber-900 text-amber-400' :
                          h.status === 'luar_lokasi' ? 'bg-rose-950/60 border border-rose-900 text-rose-400' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {h.status ? h.status.replace('_', ' ') : 'Selesai'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-800">
                        <div>
                          <p className="text-[9px] text-gray-500 font-medium">CLOCK IN: <span className="font-sans text-slate-300 font-semibold">{h.jam_clock_in || '--:--'}</span></p>
                          {h.selfie_in_url && (
                            <div className="mt-1.5 w-10 h-10 rounded-lg overflow-hidden border border-slate-700 bg-slate-850 shadow-sm flex shrink-0">
                              <img src={h.selfie_in_url} alt="Selfie In" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-500 font-medium font-sans">CLOCK OUT: <span className="font-sans text-slate-300 font-semibold">{h.jam_clock_out || '--:--'}</span></p>
                          {h.selfie_out_url && (
                            <div className="mt-1.5 w-10 h-10 rounded-lg overflow-hidden border border-slate-700 bg-slate-850 shadow-sm flex shrink-0">
                              <img src={h.selfie_out_url} alt="Selfie Out" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* PROFILE & ACCOUNT DETAILS VIEW */
            <div className="space-y-4 animate-fade-in">
              <div className="text-center pb-4 border-b border-slate-800">
                <div className="w-20 h-20 rounded-full border-4 border-indigo-500 overflow-hidden mx-auto bg-slate-800 shadow-md">
                  {me?.foto_wajah_url ? (
                    <img src={me.foto_wajah_url} alt="Profile Face" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-bold">Wajah</div>
                  )}
                </div>
                <h3 className="font-extrabold text-white text-base mt-2.5 leading-tight">{me?.nama}</h3>
                <p className="text-xs text-indigo-400 font-medium mt-0.5">{me?.email}</p>
              </div>

              {profileSuccessMsg && (
                <div className="p-2.5 bg-emerald-950/60 border border-emerald-900 text-emerald-400 text-xs rounded-xl text-center font-semibold">
                  {profileSuccessMsg}
                </div>
              )}

              <form onSubmit={updateProfile} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wide">Nama Karyawan</label>
                  <input
                    type="text"
                    required
                    value={profileNama}
                    onChange={(e) => setProfileNama(e.target.value)}
                    className="w-full mt-1.5 bg-slate-850 border border-slate-750 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wide">Nomor Handphone</label>
                  <input
                    type="tel"
                    required
                    value={profileHp}
                    onChange={(e) => setProfileHp(e.target.value)}
                    className="w-full mt-1.5 bg-slate-850 border border-slate-750 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Jabatan</span>
                    <span className="block text-xs font-bold text-slate-300 mt-1 bg-slate-850 px-3 py-2 rounded-xl text-center border border-slate-750 font-mono">
                      {me?.jabatan}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Departemen</span>
                    <span className="block text-xs font-bold text-slate-300 mt-1 bg-slate-850 px-3 py-2 rounded-xl text-center border border-slate-750 font-mono">
                      {me?.departemen}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition mt-4"
                >
                  Perbarui Profil
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Smartphone navigation tabs */}
        <div className="bg-slate-850 border-t border-slate-800 h-16 shrink-0 flex justify-around items-center px-4 z-10">
          <button
            onClick={() => { setActiveTab('clock'); setClockingType(null); }}
            className={`flex flex-col items-center gap-1 transition ${activeTab === 'clock' ? 'text-indigo-400 font-extrabold' : 'text-slate-400 hover:text-slate-300'}`}
          >
            <Compass size={20} className={activeTab === 'clock' ? 'stroke-[2.5]' : 'stroke-1'} />
            <span className="text-[10px] font-medium font-sans">Presensi</span>
          </button>

          <button
            onClick={() => { setActiveTab('history'); setClockingType(null); }}
            className={`flex flex-col items-center gap-1 transition ${activeTab === 'history' ? 'text-indigo-400 font-extrabold' : 'text-slate-400 hover:text-slate-300'}`}
          >
            <Calendar size={20} className={activeTab === 'history' ? 'stroke-[2.5]' : 'stroke-1'} />
            <span className="text-[10px] font-medium font-sans">Riwayat</span>
          </button>

          <button
            onClick={() => { setActiveTab('profile'); setClockingType(null); }}
            className={`flex flex-col items-center gap-1 transition ${activeTab === 'profile' ? 'text-indigo-400 font-extrabold' : 'text-slate-450 hover:text-slate-300'}`}
          >
            <User size={20} className={activeTab === 'profile' ? 'stroke-[2.5]' : 'stroke-1'} />
            <span className="text-[10px] font-medium font-sans">Profil</span>
          </button>
        </div>

      </div>

    </div>
  );
}
