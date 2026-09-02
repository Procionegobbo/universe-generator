<template>
    <div class="fixed inset-0 z-50">
        <!-- Backdrop: one of the three documented close triggers. The table
             behind is untouched, so it keeps its scroll position. -->
        <div data-panel-backdrop class="absolute inset-0 bg-black/50" @click="close"></div>

        <div
            ref="panelRef"
            data-planet-panel
            role="dialog"
            aria-modal="true"
            :aria-label="heading"
            tabindex="-1"
            class="absolute top-0 right-0 flex h-full w-[520px] max-w-full flex-col overflow-y-auto border-l border-line-strong bg-panel focus:outline-none"
            :style="panelStyle"
        >
            <template v-if="planet && star">
                <!-- 1. Header bar -->
                <div
                    class="flex h-[48px] flex-none items-center justify-between border-b border-line-strong px-[18px]"
                >
                    <span class="font-mono font-semibold text-[10px] tracking-[.14em] text-dim">
                        PLANET DETAIL
                    </span>
                    <button
                        type="button"
                        data-panel-close
                        aria-label="Close planet detail"
                        class="px-1 font-mono text-[14px] text-muted transition-colors duration-150 hover:text-ink"
                        @click="close"
                    >
                        ✕
                    </button>
                </div>

                <!-- 2. Hero -->
                <div
                    class="flex items-center gap-4 border-b border-line-soft px-[18px] py-[22px]"
                    :style="{ background: HERO_GRADIENT }"
                >
                    <CelestialThumb
                        kind="planet"
                        :code="planet.planetType"
                        :px="118"
                        :ring="planet.habitableZone ? '#34d399' : undefined"
                        glow="rgba(52,211,153,.25)"
                    />
                    <div class="flex min-w-0 flex-col gap-[6px]">
                        <div class="flex items-center gap-2">
                            <h2 data-panel-name class="truncate font-sans font-semibold text-[21px] text-ink">
                                {{ heading }}
                            </h2>
                            <span v-if="planet.hasLife" class="ug-badge ug-badge-life flex-none">LIFE</span>
                        </div>
                        <!-- D-8's life-aware label, carried over from the modal. -->
                        <span data-panel-type class="font-mono text-[11px] text-ink-2">
                            {{ planetTypeLabel(planet) }} · type {{ planet.planetType }}
                        </span>
                        <span data-panel-provenance class="font-mono text-[10px] text-dim">
                            {{ star.name }} · orbit #{{ planet.orbitalNumber }} of {{ siblings.length }}
                        </span>
                        <span v-if="planet.habitableZone" class="ug-badge ug-badge-goldilocks self-start">
                            GOLDILOCKS ZONE
                        </span>
                    </div>
                </div>

                <!-- 3. Three-up stats -->
                <div class="grid grid-cols-3 border-b border-line-soft">
                    <div
                        v-for="(cell, index) in headlineStats"
                        :key="cell.label"
                        :data-stat="cell.label"
                        class="flex flex-col gap-[5px] border-line-soft px-[18px] py-[14px]"
                        :class="index < 2 ? 'border-r' : ''"
                    >
                        <span class="font-mono font-medium text-[9px] tracking-[.14em] text-dim">
                            {{ cell.label }}
                        </span>
                        <span class="font-mono font-semibold text-[19px] leading-none text-ink">
                            {{ cell.value }}
                        </span>
                        <span class="font-mono text-[9px] text-faint">{{ cell.caption }}</span>
                    </div>
                </div>

                <!-- 4. Position in system -->
                <div class="flex flex-col gap-[10px] border-b border-line-soft px-[18px] py-[14px]">
                    <span class="font-mono font-semibold text-[9px] tracking-[.14em] text-dim">
                        POSITION IN SYSTEM
                    </span>
                    <OrbitalMap
                        :star="star"
                        :planets="siblings"
                        variant="compact"
                        :highlight-key="planetKey"
                    />
                </div>

                <!-- 5. Physical profile. D-7: every row is a real field of the
                     model — no water cover, no atmosphere composition. -->
                <div class="flex flex-col gap-[10px] border-b border-line-soft px-[18px] py-[14px]">
                    <span class="font-mono font-semibold text-[9px] tracking-[.14em] text-dim">
                        PHYSICAL PROFILE
                    </span>
                    <div
                        v-for="row in physicalRows"
                        :key="row.label"
                        :data-profile-row="row.label"
                        class="grid grid-cols-[96px_1fr_62px] items-center gap-[10px]"
                    >
                        <span class="font-mono text-[10px] text-muted">{{ row.label }}</span>
                        <div
                            class="relative h-[6px] overflow-hidden rounded-[3px] bg-line-soft"
                            :title="row.over ? `${row.value} ${row.unit} — past the ${row.scale} bar scale` : undefined"
                        >
                            <div
                                data-profile-bar
                                class="h-full rounded-[3px]"
                                :style="{ width: `${row.fill * 100}%`, background: row.color }"
                            ></div>
                            <!-- A full rail means "at least this much", not "the
                                 most there is": hatch the tip so the two do not
                                 read alike. -->
                            <span
                                v-if="row.over"
                                data-profile-over
                                aria-hidden="true"
                                class="absolute inset-y-0 right-0 w-[13px]"
                                :style="{ background: OVER_SCALE_HATCH }"
                            ></span>
                        </div>
                        <span
                            data-profile-value
                            class="text-right font-mono font-medium text-[11px] text-[#e2e8f0]"
                        >
                            {{ row.value }} <span class="text-dim">{{ row.unit }}</span>
                            <span v-if="row.over" class="sr-only">
                                , past the {{ row.scale }} bar scale
                            </span>
                        </span>
                    </div>
                </div>

                <!-- 6. Life block -->
                <div
                    data-life-block
                    class="flex flex-col gap-[12px] border-b border-line-soft px-[18px] py-[14px]"
                    :style="planet.hasLife ? { background: 'rgb(16 185 129 / .06)' } : undefined"
                >
                    <div class="flex items-center gap-[10px]">
                        <span class="font-mono font-semibold text-[9px] tracking-[.14em] text-dim">
                            LIFE
                        </span>
                        <!-- D-8: the repo's own stage ladder, uppercased. -->
                        <span
                            v-if="planet.hasLife"
                            data-life-stage
                            class="font-mono font-semibold text-[9px] tracking-[.1em]"
                            style="color: #6ee7b7"
                        >
                            {{ stageLabel }}
                        </span>
                    </div>

                    <p
                        v-if="planet.hasLife"
                        data-life-description
                        class="font-sans text-[12px] leading-relaxed text-ink-2"
                    >
                        {{ planetLongDescription(planet) }}
                    </p>

                    <div class="flex flex-wrap items-center gap-[6px]">
                        <span
                            v-for="pill in lifePills"
                            :key="pill"
                            data-life-pill
                            class="rounded-pill border border-line-control px-[9px] py-[3px] font-mono text-[9px] text-muted"
                        >
                            {{ pill }}
                        </span>
                    </div>

                    <!-- D-9: all six repo stages, never the design's illustrative
                         four. The bar shows how far this planet got into each. -->
                    <div class="flex flex-col gap-[6px]">
                        <span class="font-mono font-medium text-[9px] tracking-[.12em] text-faint">
                            LIFE BY DEVELOPMENT STAGE
                        </span>
                        <div
                            v-for="stage in stageRows"
                            :key="stage.level"
                            :data-life-stage-row="stage.level"
                            class="grid grid-cols-[132px_1fr] items-center gap-[10px]"
                        >
                            <span class="truncate font-mono text-[9px] text-dim">{{ stage.label }}</span>
                            <div class="h-[6px] overflow-hidden rounded-[3px] bg-line-soft">
                                <div
                                    data-stage-bar
                                    class="h-full rounded-[3px]"
                                    :style="{ width: `${stage.fill * 100}%`, background: stage.color }"
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 7. Actions -->
                <div class="grid grid-cols-2 gap-[10px] px-[18px] py-[14px]">
                    <button type="button" data-action="open-system" class="ug-btn-primary py-[10px]" @click="openSystem">
                        OPEN SYSTEM
                    </button>
                    <button type="button" data-action="copy-json" class="ug-btn-outline py-[10px]" @click="copyJson">
                        {{ copied ? 'COPIED' : 'COPY JSON' }}
                    </button>
                </div>
            </template>

            <!-- The key resolved to nothing (a sector regenerated under an open
                 panel); the panel says so rather than rendering blank. -->
            <div v-else class="flex flex-1 flex-col items-center justify-center gap-4 p-6">
                <p class="font-sans text-[12px]" style="color: #475569">
                    That planet is not part of the current sector.
                </p>
                <button type="button" data-panel-close class="ug-btn-outline px-4 py-2" @click="close">
                    CLOSE
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import CelestialThumb from './CelestialThumb.vue';
import OrbitalMap from './OrbitalMap.vue';
import { useSectorStore } from '../stores/sectorStore';
import { useSectorNav } from '../composables/useSectorNav';
import { LIFE_STAGE_LABELS } from '../types';
import { planetLongDescription, planetTypeLabel } from '../utils/planetDescription';
import { lifeStageLevel } from '../utils/lifeStage';
import { densityGCm3, gravityG, massEarths, planetDisplayName } from '../utils/planetDisplay';
import { thermalZone } from '../utils/thermalZone';
import { thinThousands } from '../utils/format';

const emit = defineEmits<{ (event: 'close'): void }>();

const HERO_GRADIENT = 'radial-gradient(320px 180px at 18% 50%, rgba(16,185,129,.14), transparent 70%)';

/** Earth's mean diameter in km — the reference for the R⊕ sub-caption. */
const EARTH_DIAMETER_KM = 12742;

/**
 * Reference maxima for the profile bars. The model has no upper bound for any
 * of these, so the bars are read against a fixed familiar scale — a 10 M⊕
 * super-Earth, 3 g, and 10 g/cm³ all fill their rail — and the printed number
 * beside each is always the exact value.
 *
 * The scale is fixed rather than per-sector because the distribution is heavily
 * skewed: a sector's median planet is well under 1 M⊕ while its largest is in
 * the hundreds, so scaling to the maximum would flatten three quarters of the
 * planets into an invisible sliver. The cost is the other end — roughly a fifth
 * of planets, the giants, run past 10 M⊕ — so a bar that is merely full is
 * marked as clipped. Without that mark a 912 M⊕ giant and an 11 M⊕ super-Earth
 * draw the same full rail and read as equal rather than as both off-scale.
 */
const MASS_FULL_SCALE = 10;
const GRAVITY_FULL_SCALE = 3;
const DENSITY_FULL_SCALE = 10;

/** Hatched cap on a clipped bar: the axis convention for "continues past here". */
const OVER_SCALE_HATCH =
    'repeating-linear-gradient(115deg, rgba(2,6,23,.75) 0 2px, transparent 2px 4px)';

// D-9's teal ramp across LIFE_STAGE_LABELS 1-6.
const STAGE_RAMP = ['#064e3b', '#065f46', '#0f766e', '#0d9488', '#10b981', '#34d399'];

const COPIED_MS = 1200;

const store = useSectorStore();
const router = useRouter();
const { systemTo } = useSectorNav();

const panelRef = ref<HTMLElement | null>(null);
const open = ref(false);
const copied = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | undefined;

// The row that opened the panel, so focus can go back to it on close.
const opener = typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null);

const planetKey = computed(() => store.selectedPlanetKey);

const planet = computed(() => {
    const key = planetKey.value;
    const sector = store.sectorData;
    if (!key || !sector) return null;
    const [starId, orbitalNumber] = key.split('-').map(Number);
    return sector.planets.find(
        entry => entry.starId === starId && entry.orbitalNumber === orbitalNumber
    ) || null;
});

const star = computed(() => {
    const target = planet.value;
    if (!target || !store.sectorData) return null;
    return store.sectorData.stars.find(entry => entry.starId === target.starId) || null;
});

const system = computed(() => {
    const host = star.value;
    if (!host || !store.sectorData) return null;
    return store.sectorData.systems.find(entry => entry.systemId === host.systemId) || null;
});

/** The star's own planets — what the compact map draws. */
const siblings = computed(() => {
    const host = star.value;
    if (!host || !store.sectorData) return [];
    return store.sectorData.planets.filter(entry => entry.starId === host.starId);
});

const heading = computed(() =>
    (planet.value && star.value ? planetDisplayName(planet.value, star.value) : 'Planet detail'));

// 200ms translateX on the documented curve. The transform starts off-canvas and
// flips on the first frame after mount, so the browser animates the change.
const panelStyle = computed(() => ({
    transform: open.value ? 'translateX(0)' : 'translateX(100%)',
    transition: 'transform 200ms cubic-bezier(.2,.8,.2,1)'
}));

const em = (value: number | null): string => (value === null ? '—' : String(value));

const headlineStats = computed(() => {
    const target = planet.value;
    if (!target) return [];
    const radii = target.diameter > 0
        ? (target.diameter / EARTH_DIAMETER_KM).toFixed(2)
        : null;
    return [
        {
            label: 'DIAMETER',
            value: thinThousands(target.diameter),
            caption: radii ? `km · ${radii} R⊕` : 'km'
        },
        {
            label: 'TEMPERATURE',
            value: `${Math.round(target.temperature)} K`,
            caption: `${Math.round(target.temperature - 273.15)} °C mean`
        },
        {
            label: 'MOONS',
            value: String(target.moonCount),
            caption: 'natural satellites'
        }
    ];
});

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const physicalRows = computed(() => {
    const target = planet.value;
    if (!target) return [];
    const mass = massEarths(target);
    const gravity = gravityG(target);
    const density = densityGCm3(target);
    const probability = target.lifeProbability * 100;

    return [
        {
            label: 'Mass',
            value: em(mass),
            unit: 'M⊕',
            color: '#3b82f6',
            fill: mass === null ? 0 : clamp01(mass / MASS_FULL_SCALE),
            over: mass !== null && mass > MASS_FULL_SCALE,
            scale: `${MASS_FULL_SCALE} M⊕`
        },
        {
            label: 'Gravity',
            value: em(gravity),
            unit: 'g',
            color: '#3b82f6',
            fill: gravity === null ? 0 : clamp01(gravity / GRAVITY_FULL_SCALE),
            over: gravity !== null && gravity > GRAVITY_FULL_SCALE,
            scale: `${GRAVITY_FULL_SCALE} g`
        },
        {
            label: 'Density',
            value: em(density),
            unit: 'g/cm³',
            color: '#8b5cf6',
            fill: density === null ? 0 : clamp01(density / DENSITY_FULL_SCALE),
            over: density !== null && density > DENSITY_FULL_SCALE,
            scale: `${DENSITY_FULL_SCALE} g/cm³`
        },
        // D-7 replaces the design's "Water cover" with a field that exists: the
        // model's life probability, real for any eligible planet whether or not
        // life was realised.
        {
            label: 'Life probability',
            value: probability.toFixed(1),
            unit: '%',
            color: '#10b981',
            fill: clamp01(target.lifeProbability),
            // A probability is bounded by definition, so it can never be clipped.
            over: false,
            scale: '100 %'
        }
    ];
});

const stageLabel = computed(() => {
    const target = planet.value;
    if (!target || !target.hasLife) return '';
    return LIFE_STAGE_LABELS[lifeStageLevel(target.lifeComplexity)].toUpperCase();
});

const stageRows = computed(() => {
    const complexity = planet.value?.lifeComplexity ?? 0;
    return STAGE_RAMP.map((color, index) => ({
        level: index + 1,
        label: LIFE_STAGE_LABELS[index + 1],
        color,
        // How far the planet got into this step: full below its own stage,
        // partial at it, empty above.
        fill: clamp01(complexity - index)
    }));
});

// D-7: the design's O₂ / liquid water / magnetosphere pills replaced by the four
// values the model actually carries.
const lifePills = computed(() => {
    const target = planet.value;
    if (!target) return [];
    return [
        `P ${target.lifeProbability.toFixed(2)}`,
        `C ${target.lifeComplexity.toFixed(1)} / 6`,
        thermalZone(target).toUpperCase(),
        `${system.value?.age ?? '—'} Gyr`
    ];
});

const close = () => emit('close');

const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') close();
};

const openSystem = () => {
    const id = star.value?.systemId;
    if (id === undefined) return;
    router.push(systemTo(id));
};

/** The documented fallback: a hidden textarea plus the legacy copy command. */
const copyViaTextarea = (text: string): boolean => {
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        return ok;
    } catch {
        return false;
    }
};

const copyJson = async () => {
    if (!planet.value) return;
    const text = JSON.stringify(planet.value, null, 2);

    let ok = false;
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            ok = true;
        }
    } catch {
        ok = false;
    }
    if (!ok) ok = copyViaTextarea(text);
    if (!ok) return;

    copied.value = true;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { copied.value = false; }, COPIED_MS);
};

onMounted(() => {
    document.addEventListener('keydown', onKeydown);
    panelRef.value?.focus();
    // One frame off-canvas, so the transition has somewhere to travel from.
    requestAnimationFrame(() => { open.value = true; });
});

onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown);
    clearTimeout(copyTimer);
    if (opener && document.contains(opener)) opener.focus();
});
</script>
