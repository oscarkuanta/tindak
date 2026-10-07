import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetSockets } from './fakeSocket.js';

vi.mock('socket.io-client', async () => {
  const { createFakeSocket } = await import('./fakeSocket.js');
  return { io: vi.fn(() => createFakeSocket()) };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  resetSockets();
});
