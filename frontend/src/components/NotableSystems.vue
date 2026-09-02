<template>
    <section class="flex flex-col">
        <header class="flex items-baseline justify-between gap-3 px-[18px] py-3">
            <h3 class="font-mono font-semibold text-[11px] tracking-[.12em] text-[#e2e8f0]">
                NOTABLE SYSTEMS
            </h3>
            <button
                type="button"
                class="font-mono text-[10px] tracking-[.08em] whitespace-nowrap hover:underline"
                style="color: #60a5fa"
                @click="store.activeTab = 'systems'"
            >
                VIEW ALL {{ thinThousands(totalSystems) }} →
            </button>
        </header>

        <!-- D-28: at most four, ranked life-bearing planets desc -> habitable
             desc -> planets desc -> systemId asc, so the pick is seed-stable. -->
        <div class="grid grid-cols-1 border-t border-line-soft sm:grid-cols-2 xl:grid-cols-4">
            <RouterLink
                v-for="entry in entries"
                :key="entry.systemId"
                :to="systemTo(entry.systemId)"
                class="ug-row flex flex-col gap-[7px] border-b border-line-hairline px-[18px] py-[14px] transition-colors duration-150 xl:border-b-0 xl:border-r xl:last:border-r-0"
            >
                <div class="flex flex-wrap items-center gap-2">
                    <span class="font-sans font-semibold text-[13px] text-ink">{{ entry.name }}</span>
                    <span v-if="entry.hasProperName" class="ug-badge ug-badge-iau">IAU</span>
                    <span v-if="entry.lifePlanetCount > 0" class="ug-badge ug-badge-life">LIFE</span>
                </div>

                <div class="flex items-center gap-2">
                    <CelestialThumb v-if="entry.primaryStar" kind="star" :code="entry.primaryStar.spectralClass" :px="20" />
                    <span class="font-mono text-[10px] text-muted">{{ entry.summary }}</span>
                </div>

                <span class="font-mono text-[9px] text-faint">{{ entry.coordinates }}</span>
            </RouterLink>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import CelestialThumb from './CelestialThumb.vue';
import type { NotableSystem, SystemRow } from '../composables/useSectorStats';
import { useSectorNav } from '../composables/useSectorNav';
import { useSectorStore } from '../stores/sectorStore';
import { formatCoord, thinThousands } from '../utils/format';

const props = defineProps<{
    /** useSectorStats().notableSystems — already ranked and capped at four. */
    notable: NotableSystem[];
    /** useSectorStats().systemRows, for the display fields the ranking omits. */
    rows: SystemRow[];
}>();

const store = useSectorStore();
const { systemTo } = useSectorNav();

const totalSystems = computed(() => props.rows.length);

const rowsById = computed(() => new Map(props.rows.map(row => [row.systemId, row])));

const plural = (count: number, noun: string): string =>
    `${thinThousands(count)} ${noun}${count === 1 ? '' : 's'}`;

// The ranking carries the counts; the row carries the primary star, the IAU flag
// and the coordinates. Joining them here keeps both halves on one aggregate pass.
const entries = computed(() =>
    props.notable.map(system => {
        const row = rowsById.value.get(system.systemId);
        const star = row?.primaryStar ?? null;
        const starLabel = star
            ? `${star.spectralClass}${star.subclass !== undefined ? `-${star.subclass}` : ''}`
            : 'no star';

        return {
            systemId: system.systemId,
            name: system.name,
            hasProperName: row?.hasProperName ?? false,
            lifePlanetCount: system.lifePlanetCount,
            primaryStar: star,
            summary: `${starLabel} · ${plural(row?.starCount ?? 0, 'star')} · ${plural(system.planetCount, 'planet')}`,
            coordinates: row
                ? `(${formatCoord(row.xPos)}, ${formatCoord(row.yPos)}, ${formatCoord(row.zPos)})`
                : ''
        };
    }));
</script>
