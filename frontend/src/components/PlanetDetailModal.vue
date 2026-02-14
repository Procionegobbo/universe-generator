<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" @click.self="close">
    <div class="bg-gray-900 rounded-xl shadow-2xl p-8 w-full max-w-md relative animate-fade-in">
      <button @click="close" class="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
      <div class="flex flex-col items-center">
        <img :src="getPlanetImage(planet.planetType, 'medium')" :alt="planet.planetType" class="w-40 h-40 object-contain rounded-full border-4 border-gray-800 bg-black mb-4" />
        <h2 class="text-2xl font-bold text-white mb-2">{{ getPlanetTypeDescription(planet.planetType) }}</h2>
        <div class="text-gray-400 mb-4">Type: <span class="font-mono">{{ planet.planetType }}</span></div>
        <div class="text-gray-300 italic mb-4 text-center">
          {{ getPlanetTypeLongDescription(planet.planetType) }}
        </div>
        <ul class="text-gray-300 space-y-2 w-full">
          <li><b>Diameter:</b> {{ planet.diameter.toLocaleString() }} km</li>
          <li><b>Moons:</b> {{ planet.moonCount }}</li>
          <li><b>Orbit:</b> {{ planet.orbitalNumber }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Planet } from '../types';
import { getPlanetImage } from '../utils/planetImages';
import { PLANET_TYPE_DESCRIPTIONS, PLANET_TYPE_LONG_DESCRIPTIONS } from '../types';

const { planet, close } = defineProps<{
  planet: Planet;
  close: () => void;
}>();

const getPlanetTypeDescription = (type: string) => PLANET_TYPE_DESCRIPTIONS[type] || 'Unknown planet type';
const getPlanetTypeLongDescription = (type: string) => {
  return PLANET_TYPE_LONG_DESCRIPTIONS[type] || PLANET_TYPE_DESCRIPTIONS[type] || 'Unknown planet type';
};
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}
</style>
