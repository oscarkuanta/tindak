import { useCallback, useEffect, useState } from 'react';
import { useMe } from '../auth/hooks.js';
import { useMyFollows } from '../boards/hooks.js';

const GUEST_KEY = 'tindak:kota';
const listeners = new Set();
const memory = new Map();

function keyFor(userId) {
  return userId ? `${GUEST_KEY}:u${userId}` : GUEST_KEY;
}

function readCity(userId) {
  const key = keyFor(userId);
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function writeCity(userId, city) {
  const key = keyFor(userId);
  try {
    if (city) window.localStorage.setItem(key, city);
    else window.localStorage.removeItem(key);
  } catch {
    if (city) memory.set(key, city);
    else memory.delete(key);
  }
  listeners.forEach((listener) => listener());
}

export function moveGuestCityTo(userId) {
  const guestCity = readCity(null);
  if (!guestCity) return;
  if (!readCity(userId)) writeCity(userId, guestCity);
  writeCity(null, null);
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function mostCommonCity(follows) {
  const counts = new Map();
  for (const { board } of follows) {
    if (board?.city) counts.set(board.city, (counts.get(board.city) ?? 0) + 1);
  }
  let best = null;
  for (const [city, count] of counts) {
    if (!best || count > best[1]) best = [city, count];
  }
  return best?.[0] ?? null;
}

export function useMyCity() {
  const { data: user } = useMe();
  const userId = user?.id ?? null;
  const [, setVersion] = useState(0);
  useEffect(() => subscribe(() => setVersion((value) => value + 1)), []);
  const stored = readCity(userId);
  const followsQuery = useMyFollows({ enabled: Boolean(user) && !stored });
  const guessed = stored ? null : mostCommonCity(followsQuery.data?.data ?? []);
  const setCity = useCallback((city) => writeCity(userId, city), [userId]);
  return {
    city: stored ?? guessed,
    isGuess: !stored && Boolean(guessed),
    setCity,
  };
}
