<template>
    <!-- 3a's ORBIT PROFILE cell: the system's planets in orbital order, sized by
         their diameter relative to the largest planet *in this row*, so every
         row uses its own full 10-28px range. -->
    <div v-if="profile.length === 0" class="font-mono text-[10px]" style="color: #334155">
        no planetary bodies
    </div>

    <div v-else class="flex items-center" :style="{ gap: `${gap}px` }">
        <CelestialThumb
            v-for="entry in profile"
            :key="entry.key"
            kind="planet"
            :code="entry.planetType"
            :px="entry.px"
            :ring="entry.habitableZone ? '#34d399' : undefined"
        />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import CelestialThumb from './CelestialThumb.vue';
import type { Planet } from '../types';

const props = defineProps<{
    /** The system's planets; ordered by orbitalNumber before rendering. */
    planets: Planet[];
}>();

const ordered = computed(() => [...props.planets].sort((a, b) => a.orbitalNumber - b.orbitalNumber));

// Handoff 3a: gap 7px for up to eight planets, 14px beyond that.
const gap = computed(() => (ordered.value.length <= 8 ? 7 : 14));

const profile = computed(() => {
    // An asteroid belt has diameter 0, so a row made only of belts would divide
    // by zero; it falls back to the 10px floor instead.
    const maxDiameter = ordered.value.reduce((max, planet) => Math.max(max, planet.diameter), 0);

    return ordered.value.map(planet => ({
        key: `${planet.starId}-${planet.orbitalNumber}`,
        planetType: planet.planetType,
        habitableZone: planet.habitableZone,
        px: maxDiameter > 0 ? Math.round(10 + 18 * (planet.diameter / maxDiameter)) : 10
    }));
});
</script>
