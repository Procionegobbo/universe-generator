import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { Sector, GenerationRequest, SectorZone } from '../types';
import axios from 'axios';

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

    // Actions
    const checkHealth = async (): Promise<boolean> => {
        try {
            const response = await axios.get('/api/sector/health');
            return response.data.status === 'ok';
        } catch (e) {
            return false;
        }
    };

    const generateSector = async (request: GenerationRequest) => {
        isLoading.value = true;
        error.value = null;

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

        try {
            const response = await axios.post('/api/sector/generate', request);
            if (response.data.success) {
                sectorData.value = response.data.data;
                return response.data;
            } else {
                error.value = response.data.error || 'Failed to generate sector';
                return null;
            }
        } catch (e: any) {
            error.value = e.message || 'An error occurred';
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
        currentSeed.value = Math.floor(Math.random() * 1000000);
        systemCount.value = 100;
        sectorVolume.value = 1000;
        zone.value = 'medium';
    };

    return {
        sectorData,
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
        loadSavedParams
    };
});
