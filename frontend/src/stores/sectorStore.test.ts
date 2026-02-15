import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSectorStore } from './sectorStore';
import { vi } from 'vitest';

// Mock axios prima di importare lo store
vi.mock('axios', () => ({
  default: {
    post: vi.fn(() => Promise.resolve({
      data: {
        success: true,
        data: { systems: [], stars: [], planets: [] }
      }
    }))
  }
}));

// Mock localStorage per ambiente Node.js
if (typeof globalThis.localStorage === 'undefined') {
  let store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    key: (i: number) => Object.keys(store)[i] || null,
    get length() { return Object.keys(store).length; }
  };
}

function getFreshStore() {
  setActivePinia(createPinia());
  return useSectorStore();
}

describe('sectorStore persistent memory (params only)', () => {
  const STORAGE_KEY = 'universe-generator-sector-params';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should save params to localStorage only after generateSector', async () => {
    const store = getFreshStore();

    await store.generateSector({
      systemCount: 42,
      sectorVolume: 999,
      seed: 12345,
      zone: 'core'
    });

    const saved = localStorage.getItem(STORAGE_KEY);
    expect(saved).toBeTruthy();
    const parsed = JSON.parse(saved!);
    expect(parsed.currentSeed).toBe(12345);
    expect(parsed.systemCount).toBe(42);
    expect(parsed.sectorVolume).toBe(999);
    expect(parsed.zone).toBe('core');
  });

  it('should restore params from localStorage on store creation', () => {
    const initial = {
      currentSeed: 54321,
      systemCount: 77,
      sectorVolume: 888,
      zone: 'medium',
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    const store = getFreshStore();
    expect(store.currentSeed).toBe(54321);
    expect(store.systemCount).toBe(77);
    expect(store.sectorVolume).toBe(888);
    expect(store.zone).toBe('medium');
  });

  it('clearPersistentMemory should reset params and clear localStorage', () => {
    const store = getFreshStore();
    // Prima salvo dei parametri
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      currentSeed: 111,
      systemCount: 222,
      sectorVolume: 333,
      zone: 'core',
    }));
    store.clearPersistentMemory();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(store.systemCount).toBe(100);
    expect(store.sectorVolume).toBe(1000);
    expect(store.zone).toBe('medium');
  });
});