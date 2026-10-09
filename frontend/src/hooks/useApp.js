import { useContext } from 'react';
import { AppContext } from '../context/AppContext';

/** Access global state and actions: const { state, navigate, handleLogin, ... } = useApp(); */
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
