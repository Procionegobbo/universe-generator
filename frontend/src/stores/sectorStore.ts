import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import type { Sector, GenerationRequest, GenerationResponse, SectorZone } from '../types';
import axios from 'axios';

export type GenerationStatus = 'idle' | 'running' | 'done' | 'error';
export type GenerationStage = 'coordinates' | 'stars' | 'planets' | 'moons' | 'habitability';
export type SectorTab = 'overview' | 'statistics' | 'systems' | 'stars' | 'planets';

const defaultSystemFilters = () => ({ query: '', preset: 'all', primaryClass: 'any', sort: 'planets-desc' });
const defaultStarFilters = () => ({ query: '', preset: 'all', sort: 'id-asc' });
const defaultPlanetFilters = () => ({
    types: [] as string[],
    zone: 'any',
    hasLife: false,
    hasMoons: false,
    sort: 'diameter-desc'
});
const defaultPage = () => ({ systems: 1, stars: 1, planets: 1 });

export const useSectorStore = defineStore('sector', () => {
    // --- LocalStorage Key ---
    const STORAGE_KEY = 'universe-generator-sector-params';

    // --- Caricamento iniziale dei parametri da LocalStorage ---
    let initial: Record<string, unknown> = {};
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) initial = JSON.parse(raw);
    } catch (e) { initial = {}; }

    function isNumber(val: unknown): val is number {
        return typeof val === 'number' && !isNaN(val);
    }
    function isString(val: unknown): val is string {
        return typeof val === 'string';
    }
    function isZone(val: unknown): val is SectorZone {
        return isString(val) && ['extragalactic','galactic edge','medium','central zone','core'].includes(val);
    }

    const sectorData = ref<Sector | null>(null);
    // The seed that produced `sectorData`, which is not currentSeed: the user can
    // type a new seed without regenerating. The planet deep link compares against
    // this one, so a shared link cannot resolve against a different sector.
    const loadedSeed = ref<number | string | null>(null);
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const currentSeed = ref<number | string>(Math.floor(Math.random() * 1000000));
    const systemCount = ref(100);
    const sectorVolume = ref(1000);
    const zone = ref<SectorZone>('medium');
    if (isNumber(initial['currentSeed']) || isString(initial['currentSeed'])) currentSeed.value = initial['currentSeed'] as number | string;
    if (isNumber(initial['systemCount'])) systemCount.value = initial['systemCount'] as number;
    if (isNumber(initial['sectorVolume'])) sectorVolume.value = initial['sectorVolume'] as number;
    if (isZone(initial['zone'])) zone.value = initial['zone'] as SectorZone;

    // --- Generation state (animated, never measured — see D-19) ---
    const generationStatus = ref<GenerationStatus>('idle');
    const generationStage = ref<GenerationStage>('coordinates');
    const generationProgress = ref(0); // 0..1
    const generationElapsedMs = ref(0);
    const lastStats = ref<GenerationResponse['stats'] | null>(null);

    // isLoading keeps its original meaning and stays in sync with the new status,
    // so existing consumers reading it are unaffected.
    watch(generationStatus, (status) => {
        isLoading.value = status === 'running';
    });

    // --- UI state ---
    const activeTab = ref<SectorTab>('overview');
    const systemFilters = ref(defaultSystemFilters());
    const starFilters = ref(defaultStarFilters());
    const planetFilters = ref(defaultPlanetFilters());
    const selectedPlanetKey = ref<string | null>(null); // "<starId>-<orbitalNumber>"
    const page = ref(defaultPage());

    // --- Persistenza automatica SOLO parametri su LocalStorage ---
    // (RIMOSSO IL WATCHER)

    // Funzione per caricare i parametri salvati
    function loadSavedParams() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    // localStorage is not reactive: bumped whenever the saved parameters are written or
    // removed, so hasSavedParams re-reads them.
    const savedParamsRevision = ref(0);

    // True only when localStorage holds a complete, valid parameter set (D-15).
    const hasSavedParams = computed(() => {
        void savedParamsRevision.value;
        const saved = loadSavedParams();
        if (!saved) return false;
        return (isNumber(saved['currentSeed']) || isString(saved['currentSeed']))
            && isNumber(saved['systemCount'])
            && isNumber(saved['sectorVolume'])
            && isZone(saved['zone']);
    });

    function resetFilters() {
        systemFilters.value = defaultSystemFilters();
        starFilters.value = defaultStarFilters();
        planetFilters.value = defaultPlanetFilters();
        page.value = defaultPage();
    }

    function selectPlanet(key: string | null) {
        selectedPlanetKey.value = key;
    }

    // Actions
    const checkHealth = async (): Promise<boolean> => {
        try {
            const response = await axios.get('/api/sector/health');
            return response.data.status === 'ok';
        } catch (e) {
            return false;
        }
    };

    const generateSector = async (request: GenerationRequest, signal?: AbortSignal) => {
        // Snapshot restored if the request is aborted (D-20).
        const snapshot = sectorData.value;
        const snapshotSeed = loadedSeed.value;
        isLoading.value = true;
        generationStatus.value = 'running';
        generationStage.value = 'coordinates';
        generationProgress.value = 0;
        generationElapsedMs.value = 0;
        error.value = null;

        // Aggiorna i valori dello store con quelli della request
        if (request.systemCount !== undefined) {
            systemCount.value = request.systemCount;
        }
        if (request.sectorVolume !== undefined) {
            sectorVolume.value = request.sectorVolume;
        }
        if (request.zone !== undefined) {
            zone.value = request.zone;
        }

        // If request doesn't have a seed, use the current store seed
        if (request.seed === undefined) {
            request.seed = currentSeed.value;
        } else {
            currentSeed.value = request.seed;
        }

        // Salva i parametri SOLO ora
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                currentSeed: currentSeed.value,
                systemCount: systemCount.value,
                sectorVolume: sectorVolume.value,
                zone: zone.value
            }));
        } catch (e) { /* ignore */ }
        savedParamsRevision.value++;

        try {
            const response = await axios.post('/api/sector/generate', request, { signal });
            if (response.data.success) {
                sectorData.value = response.data.data;
                loadedSeed.value = request.seed ?? null;
                lastStats.value = response.data.stats ?? null;
                generationStatus.value = 'done';
                generationProgress.value = 1;
                activeTab.value = 'overview';
                return response.data;
            } else {
                error.value = response.data.error || 'Failed to generate sector';
                generationStatus.value = 'error';
                return null;
            }
        } catch (e: any) {
            if (axios.isCancel(e)) {
                // Cancelled: leave the previous sector exactly as it was (D-20).
                sectorData.value = snapshot;
                loadedSeed.value = snapshotSeed;
                generationStatus.value = snapshot ? 'done' : 'idle';
                generationProgress.value = snapshot ? 1 : 0;
                return null;
            }
            error.value = e.message || 'An error occurred';
            generationStatus.value = 'error';
            return null;
        } finally {
            isLoading.value = false;
        }
    };

    const getSystemById = (id: string) => {
        const targetId = parseInt(id);
        if (sectorData.value && !isNaN(targetId)) {
            return sectorData.value.systems.find(s => s.systemId === targetId) || null;
        }
        return null;
    };

    // Funzione per azzerare la memoria persistente
    const clearPersistentMemory = () => {
        localStorage.removeItem(STORAGE_KEY);
        sectorData.value = null;
        loadedSeed.value = null;
        currentSeed.value = Math.floor(Math.random() * 1000000);
        systemCount.value = 100;
        sectorVolume.value = 1000;
        zone.value = 'medium';
        savedParamsRevision.value++;
        lastStats.value = null;
        activeTab.value = 'overview';
        resetFilters();
    };

    return {
        sectorData,
        loadedSeed,
        isLoading,
        error,
        currentSeed,
        systemCount,
        sectorVolume,
        zone,
        checkHealth,
        generateSector,
        getSystemById,
        clearPersistentMemory,
        loadSavedParams,
        generationStatus,
        generationStage,
        generationProgress,
        generationElapsedMs,
        lastStats,
        activeTab,
        systemFilters,
        starFilters,
        planetFilters,
        selectedPlanetKey,
        page,
        hasSavedParams,
        resetFilters,
        selectPlanet
    };
});