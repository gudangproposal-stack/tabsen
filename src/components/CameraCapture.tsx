import React, { useState, useRef } from 'react';
import { Camera, Image, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (base64Data: string) => void;
  label?: string;
}

export default function CameraCapture({ onCapture, label = "Pas Foto Selfie Wajah (Referensi)" }: CameraCaptureProps) {
  const [streamActive, setStreamActive] = useState(false);
  const [photoCaptured, setPhotoCaptured] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Mode live camera view
  const startCamera = async () => {
    setPermissionError(null);
    setLoading(true);
    try {
      const constraints = {
        video: { width: 400, height: 400, facingMode: 'user' },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStreamActive(true);
    } catch (err: any) {
      console.warn('Camera access denied or unavailable, using fallback upload method', err);
      setPermissionError(
        'Izin kamera ditolak atau tidak didukung pada browser/perangkat Anda. Gunakan opsi unggah foto file di bawah.'
      );
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setStreamActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Center crop the camera square ratio
        ctx.drawImage(videoRef.current, 0, 0, 400, 400);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhotoCaptured(dataUrl);
        onCapture(dataUrl);
        stopCamera();
      }
    }
  };

  // Fallback upload file method
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPhotoCaptured(base64);
        onCapture(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col items-center">
      <p className="text-xs font-semibold text-gray-700 mb-3 text-center w-full">{label}</p>

      {/* View Finder or Saved Selfie Frame */}
      <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-200 flex items-center justify-center">
        {photoCaptured ? (
          <img src={photoCaptured} alt="Captured Selfie" className="w-full h-full object-cover" />
        ) : streamActive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          <div className="flex flex-col items-center text-center p-3 text-gray-400">
            <Camera size={38} className="stroke-[1.5] mb-2" />
            <p className="text-[10px] leading-tight">Gunakan kamera langsung atau upload file</p>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <RefreshCw size={24} className="text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="w-full mt-4 flex flex-col gap-2">
        {streamActive ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={capturePhoto}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5"
            >
              <Check size={14} /> Ambil Foto Sekarang
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs py-2.5 px-4 rounded-xl transition font-semibold"
            >
              Batal
            </button>
          </div>
        ) : (
          <div className="space-y-3 w-full">
            <button
              type="button"
              onClick={startCamera}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2"
            >
              <Camera size={15} /> Ambil Foto via Kamera Laptop/HP
            </button>

            {/* Direct File Picker Fallback */}
            <label className="w-full border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/10 cursor-pointer rounded-xl p-3 flex flex-col items-center justify-center transition">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="flex items-center gap-1.5 text-xs text-gray-600 font-semibold">
                <Image size={15} className="text-indigo-600" />
                <span>Pilih Foto dari Galeri</span>
              </div>
            </label>
          </div>
        )}

        {photoCaptured && (
          <button
            type="button"
            onClick={() => {
              setPhotoCaptured(null);
              setPermissionError(null);
            }}
            className="text-xs text-indigo-600 hover:underline mt-2 text-center block w-full font-semibold"
          >
            Ulangi Ambil Foto
          </button>
        )}

        {permissionError && (
          <div className="mt-3 flex gap-2 p-2.5 bg-yellow-50 text-yellow-800 border border-yellow-100 rounded-lg text-[10px] leading-relaxed">
            <AlertCircle size={14} className="shrink-0 text-yellow-600 mt-0.5" />
            <span>{permissionError}</span>
          </div>
        )}
      </div>
    </div>
  );
}
