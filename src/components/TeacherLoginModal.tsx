import React, { useState } from 'react';
import { ShieldCheck, X, KeyRound, AlertCircle } from 'lucide-react';
import { verifyTeacherLogin } from '../api/client';

interface TeacherLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TeacherLoginModal: React.FC<TeacherLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [credentialInput, setCredentialInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!credentialInput.trim()) {
      setErrorMsg('Silakan masukkan verifikasi kredensial guru.');
      return;
    }

    setIsLoading(true);
    try {
      const isOk = await verifyTeacherLogin(credentialInput);
      if (isOk) {
        setCredentialInput('');
        onSuccess();
      } else {
        setErrorMsg('Verifikasi gagal. Nama guru tidak dikenali.');
      }
    } catch (err) {
      setErrorMsg('Gagal menghubungkan ke server verifikasi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-5 animate-in zoom-in-95 duration-200 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-blue-700 font-extrabold text-sm sm:text-base">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <span>Verifikasi Pengampu Kelas</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Kredensial Guru Kelas V:
            </label>
            <div className="relative">
              <input
                type="text"
                value={credentialInput}
                onChange={(e) => {
                  setCredentialInput(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Masukkan identitas guru..."
                autoComplete="off"
                className="w-full h-12 px-4 text-sm font-semibold bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-600 focus:bg-white focus:outline-hidden transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Khusus pengampu SDN 11 Anggrek untuk membuka dashboard penilaian.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isLoading ? 'Memverifikasi...' : 'Masuk Dashboard Guru'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
