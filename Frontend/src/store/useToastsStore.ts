import { create } from 'zustand';
import { ToastProps } from '../components/layout/Toast';

interface Toast extends Omit<ToastProps, 'onOpenChange'> {
  id: string;
}

interface ToastsStore {
  toasts: Toast[];
  addToast: (toast: Omit<ToastProps, 'open' | 'onOpenChange'>) => void;
  removeToast: (id: string) => void;
}

export const useToastsStore = create<ToastsStore>((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          ...toast,
          open: true,
          id: Date.now().toString(),
        },
      ],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));
