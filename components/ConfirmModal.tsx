'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AlertTriangle, Trash2, X, AlertCircle } from 'lucide-react';

export interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextType {
  confirm: (options?: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({});
  const [isLoading, setIsLoading] = useState(false);

  // Store the resolver for the Promise
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts?: ConfirmOptions | string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      if (typeof opts === 'string') {
        setOptions({
          title: 'Silme Onayı',
          message: opts,
          confirmText: 'Evet, Sil',
          cancelText: 'İptal',
          variant: 'danger',
        });
      } else {
        setOptions({
          title: opts?.title || 'Silmek İstediğinize Emin Misiniz?',
          message: opts?.message || 'Bu işlem geri alınamaz. İlgili kayıt kalıcı olarak silinecektir.',
          confirmText: opts?.confirmText || 'Evet, Sil',
          cancelText: opts?.cancelText || 'İptal',
          variant: opts?.variant || 'danger',
        });
      }
      setIsLoading(false);
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = () => {
    setIsLoading(true);
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
    setIsOpen(false);
    setIsLoading(false);
  };

  const handleCancel = () => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
    setIsOpen(false);
    setIsLoading(false);
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const isDanger = options.variant === 'danger' || !options.variant;
  const isWarning = options.variant === 'warning';

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
          onClick={handleCancel}
        >
          <div
            className="bg-[#151518] border border-[#2A2A34] rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient background glow */}
            <div 
              className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20 ${
                isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-indigo-500'
              }`}
            />

            {/* Header with icon & close button */}
            <div className="flex items-start justify-between gap-4 relative z-10">
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                    isDanger
                      ? 'bg-red-500/10 border-red-500/25 text-red-500'
                      : isWarning
                      ? 'bg-amber-500/10 border-amber-500/25 text-amber-500'
                      : 'bg-[#6366F1]/10 border-[#6366F1]/25 text-[#6366F1]'
                  }`}
                >
                  {isDanger ? <Trash2 size={22} /> : isWarning ? <AlertTriangle size={22} /> : <AlertCircle size={22} />}
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                  <h3 className="font-bold text-lg text-white tracking-tight">
                    {options.title}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                    {options.message}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCancel}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors shrink-0"
                aria-label="Kapat"
              >
                <X size={18} />
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#23232C] relative z-10">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 border border-[#2A2A34] transition-all disabled:opacity-50"
              >
                {options.cancelText || 'İptal'}
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isLoading}
                className={`flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg disabled:opacity-50 ${
                  isDanger
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                    : isWarning
                    ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20'
                    : 'bg-[#6366F1] hover:bg-[#5254D8] text-white shadow-[#6366F1]/20'
                }`}
              >
                {isDanger && <Trash2 size={15} />}
                <span>{options.confirmText || 'Evet, Sil'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

// Standalone Modal component for direct declarative usage if needed
export interface StandaloneConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Silmek İstediğinize Emin Misiniz?',
  message = 'Bu işlem geri alınamaz. İlgili kayıt kalıcı olarak silinecektir.',
  confirmText = 'Evet, Sil',
  cancelText = 'İptal',
  variant = 'danger',
  isLoading = false,
}: StandaloneConfirmModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#151518] border border-[#2A2A34] rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20 ${
            isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-indigo-500'
          }`}
        />

        <div className="flex items-start justify-between gap-4 relative z-10">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                isDanger
                  ? 'bg-red-500/10 border-red-500/25 text-red-500'
                  : isWarning
                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-500'
                  : 'bg-[#6366F1]/10 border-[#6366F1]/25 text-[#6366F1]'
              }`}
            >
              {isDanger ? <Trash2 size={22} /> : isWarning ? <AlertTriangle size={22} /> : <AlertCircle size={22} />}
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <h3 className="font-bold text-lg text-white tracking-tight">{title}</h3>
              <p className="text-sm text-gray-400 mt-1 leading-relaxed">{message}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#23232C] relative z-10">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 border border-[#2A2A34] transition-all disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg disabled:opacity-50 ${
              isDanger
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                : isWarning
                ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20'
                : 'bg-[#6366F1] hover:bg-[#5254D8] text-white shadow-[#6366F1]/20'
            }`}
          >
            {isDanger && <Trash2 size={15} />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
