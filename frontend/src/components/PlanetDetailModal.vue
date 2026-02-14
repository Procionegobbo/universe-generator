<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" @click.self="close">
    <div class="bg-gray-900 rounded-xl shadow-2xl p-8 w-full max-w-md relative animate-fade-in">
      <button @click="close" class="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
      <div class="flex flex-col items-center w-full">
        <img :src="getPlanetImage(planet.planetType, 'medium')" :alt="planet.planetType" class="w-40 h-40 object-contain rounded-full border-4 border-gray-800 bg-black mb-4" />
        <h2 class="text-2xl font-bold text-white mb-2">{{ getPlanetTypeDescription(planet.planetType) }}</h2>
        <div class="text-gray-400 mb-4">Type: <span class="font-mono">{{ planet.planetType }}</span></div>
        <div class="w-full flex flex-col gap-4">
          <div
            class="bg-gray-800/80 rounded-lg p-4 shadow mb-2 modal-section modal-section-vertical"
            :class="planet.habitableZone ? 'ring-4 ring-green-400/60 ring-offset-2 ring-offset-gray-900' : ''"
          >
            <div class="text-gray-300 italic text-center">
              {{ getPlanetTypeLongDescription(planet.planetType) }}
            </div>
            <div v-if="planet.habitableZone" class="mt-2 text-green-300 text-center font-bold text-sm flex items-center justify-center gap-2">
              <svg class="w-5 h-5 inline-block text-green-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-14a6 6 0 110 12A6 6 0 0110 4zm0 2a4 4 0 100 8 4 4 0 000-8z"/></svg>
              In the Goldilocks Zone
            </div>
          </div>
          <div class="bg-gray-800/80 rounded-lg p-4 shadow modal-section modal-section-vertical">
            <ul class="text-gray-300 space-y-2 w-full">
              <li><b>Diameter:</b> {{ planet.diameter.toLocaleString() }} km</li>
              <li><b>Moons:</b> {{ planet.moonCount }}</li>
              <li><b>Orbit:</b> {{ planet.orbitalNumber }}</li>
              <li><b>Semi-major axis:</b> {{ planet.semiMajorAxis.toFixed(2) }} AU</li>
              <li><b>Mass:</b> <span v-if="planet.mass > 0">{{ (planet.mass/5.972e24).toFixed(2) }} Earth masses</span><span v-else>-</span></li>
              <li><b>Gravity:</b> <span v-if="planet.gravity > 0">{{ planet.gravity.toFixed(2) }} m/s² <span class='text-gray-400'>(</span>{{ (planet.gravity/9.807).toFixed(2) }} G<span class='text-gray-400'>)</span></span><span v-else>-</span></li>
            </ul>
          </div>
        </div>
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
.modal-section {
  margin-left: 0.5rem;
  margin-right: 0.5rem;
}
.modal-section-vertical {
  margin-top: 1rem;
  margin-bottom: 1rem;
}
@media (min-width: 640px) {
  .modal-section {
    margin-left: 1.5rem;
    margin-right: 1.5rem;
  }
  .modal-section-vertical {
    margin-top: 1.5rem;
    margin-bottom: 1.5rem;
  }
}
@media (min-width: 768px) {
  .modal-section {
    margin-left: 2rem;
    margin-right: 2rem;
  }
  .modal-section-vertical {
    margin-top: 2rem;
    margin-bottom: 2rem;
  }
}
</style>
