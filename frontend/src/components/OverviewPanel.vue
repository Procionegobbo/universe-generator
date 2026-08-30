<template>
    <div class="flex flex-col">
        <div class="grid grid-cols-1 lg:grid-cols-2">
            <div class="flex flex-col border-b border-line-soft lg:border-r lg:border-b-0">
                <SpectralDistribution :rows="stats.spectralDistribution.value" :total="stats.starCount.value" />

                <div class="mt-auto grid grid-cols-3 gap-3 border-t border-line-soft px-[18px] py-4">
                    <div v-for="ratio in ratios" :key="ratio.label" class="flex flex-col gap-[6px]">
                        <span class="font-mono font-medium text-[9px] tracking-[.14em] text-dim">
                            {{ ratio.label }}
                        </span>
                        <span class="font-mono font-semibold text-[20px] text-ink">{{ ratio.value }}</span>
                    </div>
                </div>
            </div>

            <div class="flex flex-col">
                <PlanetTypeDistribution
                    :rows="stats.planetTypeDistribution.value"
                    :total="stats.planetCount.value"
                />
                <ThermalZoneBar
                    class="border-t border-line-soft"
                    title="HABITABLE ZONE OCCUPANCY"
                    :occupancy="stats.thermalOccupancy.value"
                    :total="stats.planetCount.value"
                />
            </div>
        </div>

        <NotableSystems
            class="border-t border-line-strong"
            :notable="stats.notableSystems.value"
            :rows="stats.systemRows.value"
        />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import NotableSystems from './NotableSystems.vue';
import PlanetTypeDistribution from './PlanetTypeDistribution.vue';
import SpectralDistribution from './SpectralDistribution.vue';
import ThermalZoneBar from './ThermalZoneBar.vue';
import { useSectorStore } from '../stores/sectorStore';
import { useSectorStats } from '../composables/useSectorStats';

const store = useSectorStore();

// One aggregate source (spec §3): every number on this tab comes from this call,
// which is the same pure derivation the KPI strip and the Statistics tab run.
const stats = useSectorStats(() => store.sectorData, () => store.zone);

const ratios = computed(() => [
    { label: 'STARS / SYSTEM', value: stats.starsPerSystem.value.toFixed(2) },
    { label: 'PLANETS / STAR', value: stats.planetsPerStar.value.toFixed(2) },
    { label: 'MOONS / PLANET', value: stats.moonsPerPlanet.value.toFixed(2) }
]);
</script>
