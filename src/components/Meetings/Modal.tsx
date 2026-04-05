import type { ReactNode } from 'react';

const Modal = ({
  title,
  children,
  onClose,
  maxWidth = 'max-w-xl',
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className={`w-full ${maxWidth} bg-white rounded-2xl shadow-xl overflow-hidden`}>
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-xl"
        >
          ✕
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

export default Modal;
