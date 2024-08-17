import { create } from 'zustand';
import { persist, StateStorage } from 'zustand/middleware';

interface ModeConfigState {
  mode: 'light' | 'dark';
  setMode: () => void;
}
export const useModeState = create<ModeConfigState>()(
  persist(
    (set) => ({
      mode: 'light',
      setMode: () =>
        set((state) => ({
          mode: state.mode === 'light' ? 'dark' : 'light',
        })),
    }),
    {
      name: 'mode-config',
      getStorage: () => localStorage as StateStorage,
    }
  )
);
