<template>
    <div class="flex min-h-full flex-col">
        <template v-if="row && system">
            <!-- Breadcrumb bar (handoff 1d). -->
            <div
                data-breadcrumb
                class="flex h-[52px] flex-none items-center justify-between gap-4 border-b border-line-strong bg-header px-[18px]"
            >
                <div class="flex min-w-0 items-center gap-[10px]">
                    <RouterLink
                        to="/"
                        data-breadcrumb-back
                        class="flex-none font-mono font-medium text-[11px] text-acc-blue-light hover:underline"
                    >
                        ← SECTOR {{ store.currentSeed }}
                    </RouterLink>
                    <span aria-hidden="true" class="flex-none font-mono text-[11px]" style="color: #334155">/</span>
                    <h1 data-system-name class="truncate font-sans font-semibold text-[13px] text-ink">
                        {{ system.name }}
                    </h1>
                    <span v-if="system.hasProperName" class="ug-badge ug-badge-iau flex-none">IAU</span>
                    <span v-if="row.hasLife" class="ug-badge ug-badge-life flex-none">LIFE DETECTED</span>
                </div>

                <div
                    data-system-readout
                    class="hidden flex-none items-center gap-[22px] font-mono text-[10px] md:flex"
                >
                    <span v-for="entry in readout" :key="entry.label" class="flex items-center gap-[6px]">
                        <span class="text-dim">{{ entry.label }}</span>
                        <span class="text-[#e2e8f0]">{{ entry.value }}</span>
                    </span>
                </div>
            </div>

            <!-- 5-up KPI strip, this system's own counts. -->
            <div data-system-kpi class="grid grid-cols-2 border-b border-line-strong md:grid-cols-3 lg:grid-cols-5">
                <div
                    v-for="(cell, index) in kpis"
                    :key="cell.label"
                    :data-kpi="cell.label"
                    class="flex flex-col gap-[6px] border-line-soft px-[18px] py-[14px]"
                    :class="index < kpis.length - 1 ? 'border-r' : ''"
                    :style="cell.tint ? { background: cell.tint } : undefined"
                >
                    <span class="font-mono font-medium text-[9px] tracking-[.14em] text-dim">
                        {{ cell.label }}
                    </span>
                    <div class="flex items-baseline gap-2">
                        <span
                            class="font-mono font-semibold text-[26px] leading-none"
                            :style="{ color: cell.ink }"
                        >
                            {{ cell.value }}
                        </span>
                        <span v-if="cell.suffix" class="font-mono font-medium text-[11px] text-dim">
                            {{ cell.suffix }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- S-1: one full-width stack, no rail — every planet is listed
                 under the star it orbits. -->
            <section data-system-contents class="flex-1">
                <div
                    class="flex items-baseline justify-between gap-3 border-b border-line-strong px-[18px] py-[12px]"
                >
                    <span data-contents-header class="font-mono font-semibold text-[10px] tracking-[.14em] text-dim">
                        STARS &amp; PLANETS
                    </span>
                    <span class="font-mono text-[9px] text-faint">each star with the planets that orbit it</span>
                </div>

                <article
                    v-for="group in groups"
                    :key="group.starId"
                    :data-star-group="group.starId"
                    class="border-b border-line-strong"
                    role="group"
                    :aria-labelledby="`star-name-${group.starId}`"
                >
                    <header
                        :data-star-entry="group.starId"
                        class="flex items-center gap-3 bg-panel px-[18px] py-[12px]"
                    >
                        <CelestialThumb kind="star" :code="group.spectralClass" :px="group.px" />
                        <div class="flex min-w-0 flex-col gap-[3px]">
                            <h2
                                :id="`star-name-${group.starId}`"
                                class="truncate font-sans font-semibold text-[14px] text-ink"
                            >
                                {{ group.name }}
                            </h2>
                            <!-- D-21: the class is named in text beside the
                                 decorative render. -->
                            <span class="truncate font-mono text-[10px] text-muted">
                                {{ group.classCode }} · {{ group.classLabel }}
                            </span>
                            <span data-star-facts class="truncate font-mono text-[9px] text-faint">
                                {{ group.facts }}
                            </span>
                        </div>

                        <!-- S-4: every star that has planets carries its own map,
                             here in its own header rather than one primary-only
                             map above a list organised per star. `rawPlanets`,
                             not the table's display rows — those carry neither
                             starId nor semiMajorAxis.
                             S-10a: hidden below sm:. The map takes what the
                             identity block leaves — 105px at 375px — and a
                             nine-planet star overlaps by 5.7px in that space.
                             The header and the table below still name the star. -->
                        <div v-if="group.rawPlanets.length" class="hidden min-w-0 flex-1 sm:block">
                            <OrbitalMap :star="group.star" :planets="group.rawPlanets" variant="compact" />
                        </div>
                    </header>

                    <p
                        v-if="group.planets.length === 0"
                        :data-star-empty="group.starId"
                        class="px-[18px] py-[14px] font-sans text-[12px]"
                        style="color: #475569"
                    >
                        No planets orbit this star.
                    </p>

                    <template v-else>
                        <!-- S-10: only the grid scrolls sideways; the star header
                             above it stays readable at every width. -->
                        <div class="overflow-x-auto">
                            <div class="min-w-[620px] px-[18px]">
                                <div
                                    :class="GRID"
                                    class="border-b border-line-strong py-[10px] font-mono font-medium text-[9px] tracking-[.12em] text-faint"
                                >
                                    <span>#</span>
                                    <span>PLANET</span>
                                    <span>TYPE</span>
                                    <span class="text-right">Ø KM</span>
                                    <span class="text-right">TEMP</span>
                                    <span class="text-right">MOONS</span>
                                    <span class="text-right">ZONE</span>
                                </div>

                                <div
                                    v-for="planetRow in group.planets"
                                    :key="planetRow.key"
                                    :data-planet-row="planetRow.key"
                                    role="button"
                                    tabindex="0"
                                    :aria-label="`Open detail for ${planetRow.name}`"
                                    :class="[GRID, planetRow.habitableZone ? 'ug-row-habitable' : '']"
                                    class="ug-row cursor-pointer border-b border-line-hairline py-[10px] transition-colors duration-150 focus:outline focus:outline-acc-blue"
                                    @click="openPanel(planetRow.key)"
                                    @keydown.enter.prevent="openPanel(planetRow.key)"
                                    @keydown.space.prevent="openPanel(planetRow.key)"
                                >
                                    <span class="font-mono text-[11px] text-faint">
                                        {{ planetRow.orbitalNumber }}
                                    </span>

                                    <div class="flex items-center gap-2 overflow-hidden">
                                        <CelestialThumb
                                            kind="planet"
                                            :code="planetRow.planetType"
                                            :px="planetRow.px"
                                            :ring="planetRow.habitableZone ? '#34d399' : undefined"
                                        />
                                        <span
                                            data-cell="name"
                                            class="truncate font-sans font-semibold text-[12px] text-ink"
                                            :title="planetRow.name"
                                        >
                                            {{ planetRow.name }}
                                        </span>
                                        <span v-if="planetRow.hasLife" class="ug-badge ug-badge-life flex-none">
                                            LIFE
                                        </span>
                                    </div>

                                    <span data-cell="type" class="truncate font-mono text-[11px] text-ink-2">
                                        {{ planetShortLabel(planetRow.planetType) }}
                                    </span>

                                    <span class="text-right font-mono font-medium text-[12px] text-[#e2e8f0]">
                                        {{ thinThousands(planetRow.diameter) }}
                                    </span>
                                    <span
                                        data-cell="temp"
                                        class="text-right font-mono font-medium text-[12px]"
                                        :class="tempTextClass(planetRow.zone)"
                                    >
                                        {{ thinThousands(Math.round(planetRow.temperature)) }}
                                    </span>
                                    <span class="text-right font-mono font-medium text-[12px] text-muted">
                                        {{ planetRow.moonCount }}
                                    </span>
                                    <span class="flex justify-end">
                                        <span data-cell="zone" :class="zoneBadgeClass(planetRow.zone)">
                                            {{ planetRow.zone.toUpperCase() }}
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </template>
                </article>
            </section>
        </template>

        <div v-else data-system-missing class="flex flex-1 flex-col items-center justify-center gap-4 py-16">
            <p class="font-sans text-[14px] text-ink">System not found in the current sector.</p>
            <RouterLink to="/" class="ug-btn-outline px-4 py-2">BACK TO SECTOR</RouterLink>
        </div>

        <!-- 4b overlays the system detail exactly as it overlays the tables. -->
        <PlanetDetailPanel v-if="store.selectedPlanetKey" @close="store.selectPlanet(null)" />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import CelestialThumb from '../components/CelestialThumb.vue';
import OrbitalMap from '../components/OrbitalMap.vue';
import PlanetDetailPanel from '../components/PlanetDetailPanel.vue';
import { useSectorStore } from '../stores/sectorStore';
import { useSectorStats } from '../composables/useSectorStats';
import { usePlanetDeepLink } from '../composables/usePlanetDeepLink';
import { starPhysical } from '../utils/starPhysical';
import { starShortLabel } from '../utils/starDisplay';
import { planetDisplayName, planetShortLabel } from '../utils/planetDisplay';
import { tempTextClass, thermalZone, zoneBadgeClass } from '../utils/thermalZone';
import { formatCoord, thinThousands } from '../utils/format';

// Handoff 1d: # 38px · PLANET 1.3fr · TYPE 1fr · Ø 84px · TEMP 78px ·
// MOONS 70px · ZONE 92px.
const GRID = 'grid items-center gap-[10px] grid-cols-[38px_1.3fr_1fr_84px_78px_70px_92px]';

const route = useRoute();
const store = useSectorStore();

// Every count on this page comes from the shared indexing pass (spec §7.5);
// the view itself aggregates nothing.
const stats = useSectorStats(() => store.sectorData, () => store.zone);

usePlanetDeepLink();

const systemId = computed(() => Number(route.params.id));

const row = computed(() =>
    stats.systemRows.value.find(entry => entry.systemId === systemId.value) || null);

const system = computed(() => store.getSystemById(String(route.params.id)));

const readout = computed(() => {
    const target = row.value;
    if (!target || !system.value) return [];
    return [
        { label: 'X', value: formatCoord(target.xPos) },
        { label: 'Y', value: formatCoord(target.yPos) },
        { label: 'Z', value: formatCoord(target.zPos) },
        { label: 'AGE', value: `${system.value.age} Gyr` }
    ];
});

const kpis = computed(() => {
    const target = row.value;
    if (!target) return [];
    return [
        { label: 'STARS', value: String(target.starCount), suffix: '', ink: '#c4b5fd', tint: '' },
        { label: 'PLANETS', value: String(target.planetCount), suffix: '', ink: '#6ee7b7', tint: '' },
        { label: 'MOONS', value: String(target.moonCount), suffix: '', ink: '#fcd34d', tint: '' },
        {
            label: 'IN HABITABLE ZONE',
            value: String(target.habitableCount),
            suffix: '',
            ink: '#34d399',
            tint: 'rgb(16 185 129 / .06)'
        },
        {
            label: 'TOTAL MASS',
            value: target.mass.toFixed(2),
            suffix: 'M☉',
            ink: '#e2e8f0',
            tint: ''
        }
    ];
});

// One block per star, in payload order (story 001's starGroups), each carrying
// the planets that orbit it in orbitalNumber order.
const groups = computed(() => {
    const target = row.value;
    if (!target) return [];
    const maxMass = target.stars.reduce(
        (max, star) => Math.max(max, starPhysical(star.spectralClass).mass), 0);

    return target.starGroups.map(group => {
        const physical = starPhysical(group.star.spectralClass);
        const temp = physical.effectiveTemp > 0 ? `${thinThousands(physical.effectiveTemp)} K` : '—';
        const maxDiameter = group.planets.reduce(
            (max, planet) => Math.max(max, planet.diameter), 0);

        return {
            starId: group.starId,
            star: group.star,
            name: group.star.name,
            spectralClass: group.star.spectralClass,
            classCode: group.star.subclass === undefined
                ? group.star.spectralClass
                : `${group.star.spectralClass}-${group.star.subclass}`,
            classLabel: starShortLabel(group.star.spectralClass),
            // Handoff 1d: 52-64px, sized by mass relative to the heaviest star.
            px: maxMass > 0 ? Math.round(52 + 12 * (physical.mass / maxMass)) : 52,
            facts: `${physical.mass.toFixed(2)} M☉ · ${temp} · ${group.planets.length} planets`,
            // The map needs the domain model — starId and semiMajorAxis — which
            // the display rows below deliberately drop.
            rawPlanets: group.planets,
            planets: group.planets.map(planet => ({
                key: `${planet.starId}-${planet.orbitalNumber}`,
                orbitalNumber: planet.orbitalNumber,
                name: planetDisplayName(planet, group.star),
                planetType: planet.planetType,
                diameter: planet.diameter,
                temperature: planet.temperature,
                moonCount: planet.moonCount,
                habitableZone: planet.habitableZone,
                hasLife: planet.hasLife,
                zone: thermalZone(planet),
                // The thumbnail is sized by diameter, as it is in 3a's profile.
                px: maxDiameter > 0 ? Math.round(18 + 10 * (planet.diameter / maxDiameter)) : 18
            }))
        };
    });
});

const openPanel = (key: string) => {
    store.selectPlanet(key);
};
</script>
