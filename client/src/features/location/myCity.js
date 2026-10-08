import { useEffect, useState } from 'react';
import { useMe } from '../auth/hooks.js';
import { useMyFollows } from '../boards/hooks.js';

const STORAGE_KEY = 'tindak:kota';
const listeners = new Set();
let memoryCity = null;

function readCity() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return memoryCity;
  }
}

export function saveMyCity(city) {
  try {
    if (city) window.localStorage.setItem(STORAGE_KEY, city);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    memoryCity = city || null;
  }
  listeners.forEach((listener) => listener());
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
  const [stored, setStored] = useState(readCity);
  useEffect(() => subscribe(() => setStored(readCity())), []);
  const { data: user } = useMe();
  const followsQuery = useMyFollows({ enabled: Boolean(user) && !stored });
  const guessed = stored ? null : mostCommonCity(followsQuery.data?.data ?? []);
  return { city: stored ?? guessed, isGuess: !stored && Boolean(guessed), setCity: saveMyCity };
}
