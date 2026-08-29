import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSectorStore } from './sectorStore';
import { vi } from 'vitest';
import type { Mock } from 'vitest';
import axios from 'axios';

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

// --- Story 003: generation and UI state (additive) ---

const okResponse = {
  data: {
    success: true,
    data: { systems: [], stars: [], planets: [] },
    stats: { systemCount: 1, starCount: 2, planetCount: 3, generationTimeMs: 4 }
  }
};

// The module mock above only defines `post`; `isCancel` is added here so the store's
// cancellation branch can be exercised.
const axiosMock = axios as unknown as {
  post: Mock;
  isCancel: (e: unknown) => boolean;
};

describe('sectorStore generation state', () => {
  beforeEach(() => {
    localStorage.clear();
    axiosMock.isCancel = () => false;
  });

  it('T-F42: generateSector goes running then done, and stores lastStats', async () => {
    const store = getFreshStore();
    let settle: (value: unknown) => void = () => {};
    axiosMock.post.mockReturnValueOnce(new Promise((resolve) => { settle = resolve; }));

    const pending = store.generateSector({ systemCount: 10, sectorVolume: 1000 });
    expect(store.generationStatus).toBe('running');
    expect(store.isLoading).toBe(true);

    settle(okResponse);
    await pending;

    expect(store.generationStatus).toBe('done');
    expect(store.isLoading).toBe(false);
    expect(store.lastStats).toEqual(okResponse.data.stats);
    expect(store.activeTab).toBe('overview');
    expect(store.generationProgress).toBe(1);
  });

  it('T-F43: a rejected request sets error status and leaves sectorData untouched', async () => {
    const store = getFreshStore();
    await store.generateSector({ systemCount: 10, sectorVolume: 1000 });
    const previous = store.sectorData;
    expect(previous).not.toBeNull();

    axiosMock.post.mockRejectedValueOnce(new Error('network down'));
    await store.generateSector({ systemCount: 10, sectorVolume: 1000 });

    expect(store.generationStatus).toBe('error');
    expect(store.error).toBe('network down');
    expect(store.sectorData).toBe(previous);
    expect(store.isLoading).toBe(false);
  });

  it('T-F43: an unsuccessful response sets error status and leaves sectorData untouched', async () => {
    const store = getFreshStore();
    await store.generateSector({ systemCount: 10, sectorVolume: 1000 });
    const previous = store.sectorData;

    axiosMock.post.mockResolvedValueOnce({ data: { success: false, error: 'bad request' } });
    await store.generateSector({ systemCount: 10, sectorVolume: 1000 });

    expect(store.generationStatus).toBe('error');
    expect(store.error).toBe('bad request');
    expect(store.sectorData).toBe(previous);
  });

  it('T-F44: an aborted request restores the previous sector and returns to done', async () => {
    const store = getFreshStore();
    await store.generateSector({ systemCount: 10, sectorVolume: 1000 });
    const snapshot = store.sectorData;

    axiosMock.isCancel = () => true;
    axiosMock.post.mockRejectedValueOnce(new Error('canceled'));
    const controller = new AbortController();
    const result = await store.generateSector({ systemCount: 20, sectorVolume: 1000 }, controller.signal);

    expect(result).toBeNull();
    expect(store.sectorData).toBe(snapshot);
    expect(store.generationStatus).toBe('done');
    expect(store.error).toBeNull();
  });

  it('T-F44: an aborted request with no previous sector returns to idle', async () => {
    const store = getFreshStore();
    expect(store.sectorData).toBeNull();

    axiosMock.isCancel = () => true;
    axiosMock.post.mockRejectedValueOnce(new Error('canceled'));
    const controller = new AbortController();
    await store.generateSector({ systemCount: 20, sectorVolume: 1000 }, controller.signal);

    expect(store.sectorData).toBeNull();
    expect(store.generationStatus).toBe('idle');
  });

  it('T-F45: generateSector called with one argument behaves exactly as before', async () => {
    const store = getFreshStore();

    const response = await store.generateSector({
      systemCount: 42,
      sectorVolume: 999,
      seed: 12345,
      zone: 'core'
    });

    // The default axios mock resolves without stats, exactly as before this story.
    expect(response).toEqual({ success: true, data: { systems: [], stars: [], planets: [] } });
    expect(store.sectorData).toEqual({ systems: [], stars: [], planets: [] });
    expect(store.error).toBeNull();
    expect(store.systemCount).toBe(42);
    expect(store.sectorVolume).toBe(999);
    expect(store.currentSeed).toBe(12345);
    expect(store.zone).toBe('core');

    const parsed = JSON.parse(localStorage.getItem('universe-generator-sector-params')!);
    expect(parsed).toEqual({
      currentSeed: 12345,
      systemCount: 42,
      sectorVolume: 999,
      zone: 'core'
    });
  });
});

describe('sectorStore UI state', () => {
  beforeEach(() => {
    localStorage.clear();
    axiosMock.isCancel = () => false;
  });

  it('T-F46: hasSavedParams is false until a sector is generated, false again after clearing', async () => {
    const store = getFreshStore();
    expect(store.hasSavedParams).toBe(false);

    await store.generateSector({ systemCount: 42, sectorVolume: 999, seed: 12345, zone: 'core' });
    expect(store.hasSavedParams).toBe(true);

    store.clearPersistentMemory();
    expect(store.hasSavedParams).toBe(false);
  });

  it('T-F47: clearPersistentMemory resets UI state as well as the parameters', () => {
    const store = getFreshStore();
    localStorage.setItem('universe-generator-sector-params', JSON.stringify({
      currentSeed: 111,
      systemCount: 222,
      sectorVolume: 333,
      zone: 'core'
    }));

    store.activeTab = 'planets';
    store.systemFilters.query = 'alpha';
    store.starFilters.sort = 'name-asc';
    store.planetFilters.hasLife = true;
    store.planetFilters.types = ['E'];
    store.page.systems = 4;
    store.page.stars = 3;
    store.page.planets = 2;
    store.lastStats = { systemCount: 1, starCount: 2, planetCount: 3, generationTimeMs: 4 };

    store.clearPersistentMemory();

    expect(localStorage.getItem('universe-generator-sector-params')).toBeNull();
    expect(store.systemCount).toBe(100);
    expect(store.sectorVolume).toBe(1000);
    expect(store.zone).toBe('medium');
    expect(store.sectorData).toBeNull();

    expect(store.activeTab).toBe('overview');
    expect(store.lastStats).toBeNull();
    expect(store.systemFilters).toEqual({ query: '', preset: 'all', primaryClass: 'any', sort: 'planets-desc' });
    expect(store.starFilters).toEqual({ query: '', preset: 'all', sort: 'id-asc' });
    expect(store.planetFilters).toEqual({
      types: [],
      zone: 'any',
      hasLife: false,
      hasMoons: false,
      sort: 'diameter-desc'
    });
    expect(store.page).toEqual({ systems: 1, stars: 1, planets: 1 });
  });

  it('T-F48: selectPlanet sets and clears the selected planet key', () => {
    const store = getFreshStore();
    expect(store.selectedPlanetKey).toBeNull();

    store.selectPlanet('7-3');
    expect(store.selectedPlanetKey).toBe('7-3');

    store.selectPlanet(null);
    expect(store.selectedPlanetKey).toBeNull();
  });
});
