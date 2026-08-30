<template>
    <div class="h-screen bg-base flex flex-col overflow-hidden">
        <Analytics />

        <AppTopBar />

        <!-- Main Content (Router View) -->
        <main class="flex-1 overflow-y-auto">
            <!-- The console routes go full-bleed; the two legacy pages keep the
                 `container py-8` measure and padding they were built against. -->
            <div :class="isLegacyRoute ? 'container py-8' : ''">
                <router-view v-slot="{ Component }">
                    <transition name="fade" mode="out-in">
                        <component :is="Component" />
                    </transition>
                </router-view>
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { Analytics } from '@vercel/analytics/vue';
import AppTopBar from './components/AppTopBar.vue';
import { useSectorLink } from './composables/useSectorLink';

const route = useRoute();

// At the app's root, not in a view: a shared link may land on either the console
// or a system page, and both need the sector it names before they can show
// anything — and both should publish the sector they end up holding.
useSectorLink();

const LEGACY_ROUTES = ['documentation', 'api-reference'];

const isLegacyRoute = computed(() => LEGACY_ROUTES.includes(String(route.name)));
</script>

<style>
/* Additional global styles */
</style>
