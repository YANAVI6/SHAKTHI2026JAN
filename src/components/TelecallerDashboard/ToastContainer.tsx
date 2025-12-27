import React from 'react';
import Toast from './Toast';
import { ToastData } from './hooks';

interface ToastContainerProps {
  toasts: ToastData[];
  onRemoveToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemoveToast }) => {
  return (
    <div className="fixed top-4 right-4 z-[99999] pointer-events-none max-w-[calc(100vw-2rem)] w-full sm:w-auto">
      <div className="flex flex-col items-end space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={onRemoveToast}
          />
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;