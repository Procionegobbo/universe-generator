<template>
    <section data-orbital-map class="flex flex-col gap-[10px]">
        <!-- 1d's header. The compact reduction used inside the planet panel
             carries no header: it sits under its own section label there. -->
        <div v-if="!isCompact" class="flex items-center justify-between gap-3">
            <h3 data-map-header class="font-mono font-semibold text-[10px] tracking-[.14em] text-dim">
                ORBITAL MAP · {{ star.name.toUpperCase() }}
            </h3>
            <div class="flex items-center gap-[14px]">
                <span
                    v-for="entry in LEGEND"
                    :key="entry.label"
                    class="flex items-center gap-[5px] font-mono text-[9px] text-dim"
                >
                    <span
                        aria-hidden="true"
                        class="inline-block h-[9px] w-[9px] rounded-[2px]"
                        :style="{ background: entry.swatch }"
                    ></span>
                    {{ entry.label }}
                </span>
            </div>
        </div>

        <div
            data-map-box
            class="relative overflow-hidden rounded-[6px] border border-line-strong"
            :style="{ height: `${boxHeight}px`, background: THERMAL_GRADIENT }"
        >
            <!-- An NS/BH primary, or an unlucky roll: no bodies, and with no
                 bodies there is no domain, so the HZ rules are omitted too. -->
            <p
                v-if="nodes.length === 0"
                data-map-empty
                class="absolute inset-0 flex items-center justify-center font-mono text-[11px]"
                style="color: #334155"
            >
                no planetary bodies
            </p>

            <template v-else>
                <template v-if="projection.hzRules">
                    <div
                        v-for="rule in hzRuleMarks"
                        :key="rule.id"
                        :data-hz-rule="rule.id"
                        class="absolute top-0 bottom-0 w-px"
                        :style="{ left: `${rule.x}%`, background: 'rgba(52,211,153,.6)' }"
                    >
                        <span
                            v-if="!isCompact"
                            class="absolute top-[5px] left-[4px] font-mono font-medium text-[8px] whitespace-nowrap"
                            style="color: #6ee7b7"
                        >
                            {{ rule.label }}
                        </span>
                    </div>
                </template>

                <!-- The orbit line the bodies sit on. -->
                <div
                    class="absolute right-0 left-0 h-px"
                    style="top: 50%; background: rgba(148,163,184,.25)"
                ></div>

                <!-- The primary bleeds off the left edge, as in the design. -->
                <span
                    v-if="!isCompact"
                    class="absolute -translate-y-1/2"
                    style="left: 0; top: 50%; margin-left: -24px"
                >
                    <CelestialThumb kind="star" :code="star.spectralClass" :px="70" :glow="starGlow" />
                </span>

                <span
                    v-for="node in nodes"
                    :key="node.key"
                    :data-map-planet="node.key"
                    class="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[4px]"
                    :style="{ left: `${node.x}%`, top: '50%' }"
                >
                    <CelestialThumb
                        kind="planet"
                        :code="node.planetType"
                        :px="node.px"
                        :ring="node.ring"
                        :glow="node.glow"
                    />
                    <span
                        v-if="!isCompact"
                        class="font-mono text-[9px]"
                        :style="{ color: node.highlighted ? '#6ee7b7' : '#64748b' }"
                    >
                        {{ node.letter }}
                    </span>
                </span>
            </template>
        </div>

        <div
            v-if="domain"
            data-map-axis
            class="flex items-baseline justify-between gap-3 font-mono text-[9px] text-dim"
        >
            <span data-axis="min">{{ axisCaption(domain.min) }} AU</span>
            <span v-if="isCompact && hzCaption" data-axis="hz" style="color: #6ee7b7">
                {{ hzCaption }}
            </span>
            <span data-axis="max">{{ axisCaption(domain.max) }} AU</span>
        </div>

        <!-- Handoff §Accessibility, success criterion 15: the map is a picture,
             so the same reading is offered as text for a screen reader. -->
        <div data-map-summary class="sr-only">
            <p>{{ summaryHeading }}</p>
            <ul>
                <li v-for="line in summaryLines" :key="line">{{ line }}</li>
            </ul>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import CelestialThumb from './CelestialThumb.vue';
import type { Planet, Star } from '../types';
import { axisCaption, orbitalDomain, orbitalProjection } from '../utils/orbitalScale';
import { habitableZoneBounds } from '../utils/starPhysical';
import { orbitLetter, planetDisplayName, planetShortLabel } from '../utils/planetDisplay';
import { thermalZone } from '../utils/thermalZone';
import { formatAu } from '../utils/format';
import { getStarHexColor } from '../utils/starHexColors';

const props = withDefaults(defineProps<{
    /** The star whose orbits are drawn — 1d shows the system's primary. */
    star: Star;
    /** That star's own planets; ordered by orbitalNumber before rendering. */
    planets: Planet[];
    /**
     * 'compact' is the 56px reduction the planet panel shows under
     * POSITION IN SYSTEM: no header, no legend, no orbit letters.
     */
    variant?: 'full' | 'compact';
    /** `<starId>-<orbitalNumber>` of the planet to ring and glow. */
    highlightKey?: string | null;
}>(), { variant: 'full', highlightKey: null });

// Handoff 1d: the map body is a 150px box; the panel's reduction is 56px.
const FULL_HEIGHT = 150;
const COMPACT_HEIGHT = 56;

const THERMAL_GRADIENT = 'linear-gradient(90deg, rgba(239,68,68,.16) 0%, rgba(245,158,11,.12) 22%,'
    + ' rgba(16,185,129,.2) 34%, rgba(16,185,129,.2) 48%, rgba(59,130,246,.1) 60%,'
    + ' rgba(59,130,246,.16) 100%)';

const LEGEND = [
    { label: 'HOT', swatch: 'rgba(239,68,68,.55)' },
    { label: 'GOLDILOCKS', swatch: 'rgba(16,185,129,.6)' },
    { label: 'COLD', swatch: 'rgba(59,130,246,.5)' }
];

const isCompact = computed(() => props.variant === 'compact');
const boxHeight = computed(() => (isCompact.value ? COMPACT_HEIGHT : FULL_HEIGHT));

const ordered = computed(() => [...props.planets].sort((a, b) => a.orbitalNumber - b.orbitalNumber));

const hz = computed(() => habitableZoneBounds(props.star.spectralClass));

const distances = computed(() => ordered.value.map(planet => planet.semiMajorAxis));

const projection = computed(() =>
    orbitalProjection(distances.value, hz.value.inner, hz.value.outer));

const domain = computed(() => orbitalDomain(distances.value, hz.value.inner, hz.value.outer));

const hzRuleMarks = computed(() => {
    const rules = projection.value.hzRules;
    if (!rules) return [];
    return [
        { id: 'inner', x: rules.inner, label: `HZ INNER ${formatAu(hz.value.inner)} AU` },
        { id: 'outer', x: rules.outer, label: `HZ OUTER ${formatAu(hz.value.outer)} AU` }
    ];
});

const hzCaption = computed(() => {
    if (!projection.value.hzRules) return '';
    return `HZ ${formatAu(hz.value.inner)} – ${formatAu(hz.value.outer)} AU`;
});

const maxDiameter = computed(() =>
    ordered.value.reduce((max, planet) => Math.max(max, planet.diameter), 0));

/**
 * Handoff 1d: `20 + 24 × (d / dMax)` px, and an asteroid belt (`diameter === 0`)
 * at a flat 14px. A system of nothing but belts has no dMax, so every body there
 * takes the belt size rather than dividing by zero.
 */
const bodySize = (planet: Planet): number => {
    if (planet.diameter === 0 || maxDiameter.value === 0) return isCompact.value ? 8 : 14;
    const ratio = planet.diameter / maxDiameter.value;
    return isCompact.value ? Math.round(8 + 8 * ratio) : Math.round(20 + 24 * ratio);
};

const starGlow = computed(() => {
    const hex = getStarHexColor(props.star.spectralClass).toString(16).padStart(6, '0');
    return `#${hex}80`;
});

const nodes = computed(() =>
    ordered.value.map((planet, index) => {
        const key = `${planet.starId}-${planet.orbitalNumber}`;
        const highlighted = key === props.highlightKey;
        return {
            key,
            planetType: planet.planetType,
            x: projection.value.positions[index],
            px: bodySize(planet),
            letter: orbitLetter(planet.orbitalNumber),
            highlighted,
            ring: highlighted || planet.habitableZone ? '#34d399' : undefined,
            glow: highlighted ? 'rgba(52,211,153,.5)' : undefined
        };
    }));

const summaryHeading = computed(() => {
    const count = ordered.value.length;
    if (count === 0) return `Orbital map of ${props.star.name}: no planetary bodies.`;
    return `Orbital map of ${props.star.name}: ${count} ${count === 1 ? 'body' : 'bodies'}.`;
});

const summaryLines = computed(() =>
    ordered.value.map(planet =>
        `${planetDisplayName(planet, props.star)} — ${planetShortLabel(planet.planetType)},`
        + ` ${formatAu(planet.semiMajorAxis)} AU, ${thermalZone(planet).toLowerCase()} zone`));
</script>
