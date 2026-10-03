import { createContext, useContext } from 'react';

export const LoginPromptContext = createContext(null);

export function useLoginPrompt() {
  const context = useContext(LoginPromptContext);
  if (!context) throw new Error('useLoginPrompt harus dipakai di dalam LoginPromptProvider');
  return context;
}
