import React, { useState } from 'react';
import { X, CreditCard, Landmark, QrCode, Wallet, ShieldCheck, RefreshCw } from 'lucide-react';

interface MidtransSimModalProps {
  orderId: string;
  amount: number;
  planName: string;
  onPaymentSuccess: () => void;
  onClose: () => void;
}

export default function MidtransSimModal({
  orderId,
  amount,
  planName,
  onPaymentSuccess,
  onClose,
}: MidtransSimModalProps) {
  const [method, setMethod] = useState<'va' | 'qris' | 'gopay' | 'cc' | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorString, setErrorString] = useState('');

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const handleSimulatePayment = async (status: 'success' | 'fail') => {
    setLoading(true);
    setErrorString('');
    try {
      const response = await fetch('/api/simulate/webhook-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          amount: amount,
          action: status,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Simulasi pembayaran gagal.');
      }

      if (status === 'success') {
        onPaymentSuccess();
      } else {
        setErrorString('Simulasi pembayaran ditolak/gagal.');
      }
    } catch (err: any) {
      setErrorString(err.message || 'Terjadi kesalahan simulasi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 flex flex-col">
        {/* Midtrans Modal Head */}
        <div className="bg-blue-900 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center font-bold text-xs text-blue-200">
              M
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-none">Midtrans Sandbox</h3>
              <p className="text-[10px] text-blue-200 mt-1">Hadir.id Payment Portal</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition">
            <X size={18} />
          </button>
        </div>

        {/* Order Details Banner */}
        <div className="bg-gray-50 border-b border-gray-100 p-4 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Pembayaran</p>
          <p className="text-2xl font-bold text-blue-950 mt-1">{formatRupiah(amount)}</p>
          <div className="mt-2 inline-flex items-center gap-2 bg-blue-50 text-blue-800 text-xs px-2.5 py-1 rounded-full font-medium">
            <span>{planName}</span>
            <span className="text-gray-300">|</span>
            <span className="font-mono text-[10px]">{orderId}</span>
          </div>
        </div>

        {/* Payment Select Interface */}
        <div className="p-5 flex-1 min-h-[250px] flex flex-col justify-between">
          {!method ? (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-3">Pilih Metode Pembayaran Demo:</p>
              <div className="space-y-2">
                <button
                  onClick={() => setMethod('va')}
                  className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/20 active:bg-blue-50/50 transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                      <Landmark size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800">Virtual Account (VA)</h4>
                      <p className="text-[11px] text-gray-500">Transfer Mandiri, BCA, BNI, BRI</p>
                    </div>
                  </div>
                  <span className="text-xs text-blue-600 font-medium font-sans">Pilih &rarr;</span>
                </button>

                <button
                  onClick={() => setMethod('qris')}
                  className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/20 active:bg-blue-50/50 transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                      <QrCode size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800">QRIS (OVO, Dana, LinkAja)</h4>
                      <p className="text-[11px] text-gray-500">Scan kode QR dinamis otomatis</p>
                    </div>
                  </div>
                  <span className="text-xs text-blue-600 font-medium font-sans">Pilih &rarr;</span>
                </button>

                <button
                  onClick={() => setMethod('gopay')}
                  className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/20 active:bg-blue-50/50 transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
                      <Wallet size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800">Uang Elektronik (GoPay / ShopeePay)</h4>
                      <p className="text-[11px] text-gray-500">Pembayaran instan 1-klik</p>
                    </div>
                  </div>
                  <span className="text-xs text-blue-600 font-medium font-sans">Pilih &rarr;</span>
                </button>

                <button
                  onClick={() => setMethod('cc')}
                  className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/20 active:bg-blue-50/50 transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800">Kartu Kredit / Debit Online</h4>
                      <p className="text-[11px] text-gray-500">Visa, Mastercard, JCB Secure</p>
                    </div>
                  </div>
                  <span className="text-xs text-blue-600 font-medium font-sans">Pilih &rarr;</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1 justify-between gap-4">
              <div className="space-y-4">
                <button
                  onClick={() => setMethod(null)}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  &larr; Ganti metode pembayaran
                </button>

                <div className="p-4 border border-dashed border-gray-200 rounded-xl bg-gray-50/50 flex flex-col items-center justify-center text-center">
                  <span className="uppercase text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-sm mb-2">
                    {method === 'va' && 'Virtual Account Transfer'}
                    {method === 'qris' && 'Dynamic QRIS Code'}
                    {method === 'gopay' && 'E-Wallet GoPay / ShopeePay'}
                    {method === 'cc' && 'Visa / Mastercard Secure'}
                  </span>

                  {method === 'qris' && (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg mb-3 shadow-xs">
                      {/* Generates a robust QR simulation */}
                      <div className="w-32 h-32 bg-gray-800 flex items-center justify-center text-white border-4 border-white font-mono text-xs p-1 text-center font-bold">
                        [ HADIR.ID QRIS DEPAY ]
                      </div>
                    </div>
                  )}

                  {method === 'va' && (
                    <div className="mb-3 text-center">
                      <p className="text-xs text-gray-500">Nomor Rekening Virtual Account (BCA)</p>
                      <p className="text-lg font-mono font-bold text-gray-900 flex items-center gap-1 mt-1 bg-yellow-50 px-3 py-1 rounded-sm border border-yellow-100">
                        880012 34567890
                      </p>
                    </div>
                  )}

                  {method === 'gopay' && (
                    <div className="mb-3 text-center">
                      <p className="text-xs text-gray-500 font-sans">Scan atau Masuk ke Aplikasi Gojek</p>
                      <p className="text-sm font-semibold text-gray-800 mt-1">Pembayaran Instan Demo Diaktifkan</p>
                    </div>
                  )}

                  {method === 'cc' && (
                    <div className="space-y-2 w-full max-w-xs mb-3 text-left">
                      <div className="p-2.5 border border-gray-200 rounded bg-white text-xs font-mono">
                        <p className="text-[10px] text-gray-400">Card Number (Demo Sandbox)</p>
                        <p className="font-semibold text-gray-700">4811 0000 0000 1234</p>
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-gray-500">
                    Ini adalah simulasi resmi Midtrans sandbox. Klik tombol di bawah ini untuk mensimulasikan hasil respons payment gateway Anda.
                  </p>
                </div>
              </div>

              {errorString && (
                <p className="text-xs text-red-600 font-medium bg-red-50 p-2.5 rounded-lg text-center border border-red-100 animate-pulse">
                  {errorString}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 mt-2">
                <button
                  disabled={loading}
                  onClick={() => handleSimulatePayment('fail')}
                  className="p-3 border border-red-200 hover:bg-red-50 text-red-700 text-sm font-semibold rounded-xl transition disabled:opacity-50"
                >
                  Simulasikan Gagal
                </button>
                <button
                  disabled={loading}
                  onClick={() => handleSimulatePayment('success')}
                  className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition shadow-md shadow-emerald-200 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {loading && <RefreshCw size={14} className="animate-spin" />}
                  Bayar Sekarang
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Secure badge footer */}
        <div className="bg-gray-100 px-4 py-3 flex items-center justify-center gap-1.5 text-[10px] text-gray-500 font-sans border-t border-gray-200">
          <ShieldCheck size={14} className="text-blue-600" />
          <span>Transaksi Terenskripsi 256-bit SSL | Midtrans Sandbox Signature Verified</span>
        </div>
      </div>
    </div>
  );
}
