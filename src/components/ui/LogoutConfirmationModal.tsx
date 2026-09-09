import React from 'react';
import { LogOut, X } from 'lucide-react';

interface LogoutConfirmationModalProps {
  title?: string;
  message?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
  title = 'Sign out?',
  message = 'You will need to sign in again to access your account.',
  onCancel,
  onConfirm
}) => {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#17181F]/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-[#E7DFCE] bg-white p-5 text-[#17181F] shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <LogOut className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">{title}</h2>
              <p className="mt-1 text-xs leading-5 text-[#6E6C63]">{message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#6E6C63] hover:bg-[#F3EDE0] hover:text-[#17181F]"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[#D8CDB4] bg-white px-4 py-2 text-xs font-bold text-[#404252] hover:bg-[#FAF6EE]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmationModal;
