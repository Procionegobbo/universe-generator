<template>
    <div class="animate-fade-in pb-12">
        <div class="mb-8 flex items-center justify-between">
            <div>
                <h2 class="text-3xl font-bold text-white mb-2">Project Documentation</h2>
                <p class="text-gray-400">Understanding the procedural generation and stellar mechanics</p>
            </div>
            <button @click="router.push('/')" class="btn btn-secondary">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Generator
            </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <!-- Sidebar Navigation -->
            <div class="lg:col-span-1">
                <nav class="sticky top-24 space-y-1">
                    <a href="#overview" class="block px-4 py-2 text-sm font-medium text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">Overview</a>
                    <a href="#stellar-classification" class="block px-4 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800/50 rounded-lg transition-colors">Stellar Classification</a>
                    <a href="#planetary-types" class="block px-4 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800/50 rounded-lg transition-colors">Planetary Types</a>
                    <a href="#orbital-mechanics" class="block px-4 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800/50 rounded-lg transition-colors">Orbital Mechanics</a>
                </nav>
            </div>

            <!-- Content -->
            <div class="lg:col-span-3 space-y-12">
                <!-- Overview Section -->
                <section id="overview" class="scroll-mt-24">
                    <h3 class="text-2xl font-bold text-white mb-4">Overview</h3>
                    <div class="prose prose-invert max-w-none text-gray-400 space-y-4">
                        <p>
                            The **Stellar Universe Generator** is a procedural engine designed to create realistic star systems based on scientific spectral classifications and orbital probability models.
                        </p>
                        <p>
                            Each generated sector is a 3D coordinate space where systems are distributed, stars are instantiated with specific physical properties, and planetary bodies are simulated with consistent orbital hierarchies.
                        </p>
                    </div>
                </section>

                <hr class="border-gray-800">

                <!-- Stellar Classification -->
                <section id="stellar-classification" class="scroll-mt-24">
                    <h3 class="text-2xl font-bold text-white mb-6">Stellar Classification</h3>
                    <p class="text-gray-400 mb-6">
                        The generator uses the Morgan-Keenan (MK) spectral classification system. Stars are categorized by their spectral class (temperature) and luminosity.
                    </p>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div v-for="(desc, code) in STAR_TYPE_DESCRIPTIONS" :key="code" 
                             class="p-4 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-blue-500/30 transition-all flex items-center gap-6 group">
                            <div class="relative w-20 h-20 shrink-0">
                                <!-- Round container for the star image -->
                                <div class="w-full h-full rounded-full overflow-hidden bg-gray-950 border-2 border-gray-800 group-hover:border-blue-500/50 transition-colors duration-300 flex items-center justify-center">
                                    <img :src="getStarImage(String(code))" 
                                         :alt="desc"
                                         class="w-full h-full object-cover filter brightness-110 group-hover:scale-125 transition-transform duration-500">
                                </div>
                                <!-- Superimposed class badge -->
                                <div :class="getStarClassColor(String(code))"
                                     class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded backdrop-blur-sm bg-black/40 border border-white/20 text-[10px] font-black tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-xl">
                                    {{ code }}
                                </div>
                            </div>
                            <div class="flex-1">
                                <h4 class="font-bold text-gray-100 mb-1 leading-tight">{{ desc }}</h4>
                                <div class="flex items-center gap-2">
                                    <div :class="getStarClassColor(String(code))" class="w-2 h-2 rounded-full"></div>
                                    <span class="text-xs text-gray-500 group-hover:text-blue-300 transition-colors">Class {{ code }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <hr class="border-gray-800">

                <!-- Planetary Types -->
                <section id="planetary-types" class="scroll-mt-24">
                    <h3 class="text-2xl font-bold text-white mb-6">Planetary Types</h3>
                    <p class="text-gray-400 mb-6">
                        Planets are generated with specific compositions and atmospheres based on their orbital distance and the host star's radiant flux.
                    </p>
                    
                    <div class="space-y-4">
                        <div v-for="(desc, code) in filteredPlanetDescriptions" :key="code" 
                             class="flex items-start gap-4 p-4 bg-gray-900/50 border border-gray-800 rounded-xl group hover:bg-gray-800/30 transition-all">
                            <div class="w-20 h-20 shrink-0 flex items-center justify-center">
                                <img :src="getPlanetImage(String(code))" :alt="desc" class="w-full h-full object-contain rounded-full border-2 border-gray-800 bg-black" />
                            </div>
                            <div :class="getPlanetTypeColor(String(code))"
                                 class="w-12 h-12 rounded-full shrink-0 flex items-center justify-center font-bold text-xl shadow-lg group-hover:scale-110 transition-transform ml-2">
                                {{ code }}
                            </div>
                            <div>
                                <h4 class="text-lg font-bold text-gray-100 mb-1">{{ desc }}</h4>
                                <p class="text-sm text-gray-400 leading-relaxed">
                                    {{ getPlanetDetailDescription(String(code)) }}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <hr class="border-gray-800">

                <!-- Orbital Mechanics -->
                <section id="orbital-mechanics" class="scroll-mt-24 pb-12">
                    <h3 class="text-2xl font-bold text-white mb-6">Orbital Mechanics</h3>
                    <div class="card bg-purple-900/10 border-purple-800/50 p-6">
                        <h4 class="text-lg font-bold text-purple-300 mb-4 flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                            Titius-Bode Model
                        </h4>
                        <p class="text-gray-400 text-sm mb-4">
                            Orbits are calculated using a modified version of the Titius-Bode law, ensuring stable and predictable planetary spacing.
                        </p>
                        <div class="bg-gray-950 p-4 rounded font-mono text-sm text-green-400">
                            a = 0.4 + 0.3 * 2^n
                        </div>
                        <p class="text-xs text-gray-500 mt-4 italic">
                            Where 'a' is the semi-major axis in Astronomical Units (AU) and 'n' is the orbital sequence number.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { STAR_TYPE_DESCRIPTIONS, PLANET_TYPE_DESCRIPTIONS } from '../types';
import { getStarClassColor, getStarImage } from '../utils/starColors';
import { getPlanetImage } from '../utils/planetImages';

const router = useRouter();

const filteredPlanetDescriptions = computed(() => {
    const { '#': _, ...rest } = PLANET_TYPE_DESCRIPTIONS;
    return rest;
});

const getPlanetTypeColor = (type: string) => {
    const colors: Record<string, string> = {
        'A': 'bg-gray-700 text-gray-400',
        'G': 'bg-yellow-800 text-yellow-300',
        'R': 'bg-orange-900 text-orange-300',
        'C': 'bg-gray-900 text-gray-300',
        'D': 'bg-yellow-900 text-yellow-200',
        'H': 'bg-red-900 text-red-300',
        'M': 'bg-red-800 text-red-200',
        'E': 'bg-green-900 text-green-300'
    };
    return colors[type] || 'bg-gray-800 text-gray-400';
};

const getPlanetDetailDescription = (type: string) => {
    const details: Record<string, string> = {
        'A': 'Remnants of planetary formation, primarily composed of rock, metal, and ice.',
        'G': 'Massive worlds composed primarily of hydrogen and helium, often with complex moon systems.',
        'R': 'Terrestrial bodies with solid surfaces and differentiated internal structures.',
        'C': 'Theoretically predicted planets formed in carbon-rich protoplanetary disks.',
        'D': 'Arid worlds with extremely low liquid water availability but habitable temperature ranges.',
        'H': 'Inhospitable worlds subject to tidal heating or extreme greenhouse effects.',
        'M': 'Worlds with high surface temperatures where geological activity results in persistent lava flows.',
        'E': 'Planets located in the circumstellar habitable zone with potential for liquid water.'
    };
    return details[type] || 'Standard planetary body classification.';
};
</script>

<style scoped>
.prose p {
    margin-bottom: 1rem;
    line-height: 1.7;
}

nav a {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.scroll-mt-24 {
    scroll-margin-top: 6rem;
}
</style>
