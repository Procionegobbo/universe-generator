<template>
    <div class="animate-fade-in">
        <div class="mb-8 flex items-center justify-between">
            <div>
                <h2 class="text-3xl font-bold text-white mb-2">API Reference</h2>
                <p class="text-gray-400">Documentation for the Stellar Universe Generator REST API</p>
            </div>
            <button @click="router.push('/')" class="btn btn-secondary">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Generator
            </button>
        </div>

        <div class="space-y-8">
            <!-- Base URL -->
            <div class="card bg-blue-900/10 border-blue-800/50">
                <h3 class="text-lg font-bold text-blue-300 mb-2 flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Base URL
                </h3>
                <code class="text-blue-400 font-mono bg-blue-950/50 px-3 py-1 rounded">/api/sector</code>
            </div>

            <!-- Health Check -->
            <section class="card">
                <div class="flex items-center gap-3 mb-4">
                    <span class="bg-green-600 text-white px-3 py-1 rounded-md text-sm font-bold uppercase">GET</span>
                    <h3 class="text-xl font-bold">/health</h3>
                </div>
                <p class="text-gray-300 mb-4">Returns the current status of the generator service and its version.</p>
                
                <h4 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Response Sample</h4>
                <pre class="bg-gray-950 rounded-lg p-4 font-mono text-sm text-blue-300 overflow-x-auto">
{
  "status": "ok",
  "service": "stellar-generator-api",
  "version": "1.0.0",
  "timestamp": "2024-02-09T00:00:00.000Z"
}</pre>
            </section>

            <!-- Generate Sector -->
            <section class="card">
                <div class="flex items-center gap-3 mb-4">
                    <span class="bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-bold uppercase">POST</span>
                    <h3 class="text-xl font-bold">/generate</h3>
                </div>
                <p class="text-gray-300 mb-6">Generates a new stellar sector with systems, stars, and planets based on the provided constraints.</p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h4 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Request Body</h4>
                        <pre class="bg-gray-950 rounded-lg p-4 font-mono text-sm text-purple-300 overflow-x-auto">
{
  "systemCount": number, // 1-1000
  "sectorSize": number   // 1-100000
}</pre>
                    </div>
                    <div>
                        <h4 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Response Data</h4>
                        <p class="text-sm text-gray-400 mb-2">Returns a complex object with:</p>
                        <ul class="text-sm text-gray-400 list-disc list-inside space-y-1">
                            <li><code class="text-blue-300">systems</code>: Array of coordinate pairs</li>
                            <li><code class="text-yellow-300">stars</code>: Generated stellar bodies</li>
                            <li><code class="text-green-300">planets</code>: Planetary orbits & types</li>
                        </ul>
                    </div>
                </div>
            </section>

            <!-- Data Models -->
            <section>
                <h3 class="text-xl font-bold text-gray-300 mb-4">Data Models</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                        <h4 class="font-bold text-purple-400 mb-2">Star</h4>
                        <ul class="text-xs text-gray-500 space-y-1 font-mono">
                            <li>starId: number</li>
                            <li>name: string</li>
                            <li>spectralClass: string</li>
                            <li>subclass: number</li>
                        </ul>
                    </div>
                    <div class="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                        <h4 class="font-bold text-green-400 mb-2">Planet</h4>
                        <ul class="text-xs text-gray-500 space-y-1 font-mono">
                            <li>starId: number</li>
                            <li>planetType: string</li>
                            <li>orbitalNumber: number</li>
                            <li>diameter: number</li>
                            <li>moonCount: number</li>
                        </ul>
                    </div>
                    <div class="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                        <h4 class="font-bold text-blue-400 mb-2">System</h4>
                        <ul class="text-xs text-gray-500 space-y-1 font-mono">
                            <li>systemId: number</li>
                            <li>xPos: number</li>
                            <li>yPos: number</li>
                            <li>zPos: number</li>
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
const router = useRouter();
</script>
