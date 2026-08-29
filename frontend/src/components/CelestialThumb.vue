<template>
    <span class="inline-flex shrink-0 items-center justify-center overflow-hidden" :style="wrapperStyle">
        <img
            :src="src"
            alt=""
            aria-hidden="true"
            :width="px"
            :height="px"
            :style="imageStyle"
            @error="onError"
        />
    </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { getPlanetImage } from '../utils/planetImages';
import { getStarImage } from '../utils/starColors';

const props = defineProps<{
    /** Which mapping table to read the render from. */
    kind: 'planet' | 'star';
    /** Planet type code, or spectral class. */
    code: string;
    /** Rendered size in px; also selects the source directory. */
    px: number;
    /** Optional ring colour, e.g. '#34d399' for a habitable-zone planet. */
    ring?: string;
    /** Optional glow colour, e.g. a spectral-class colour for a star. */
    glow?: string;
}>();

const PLANET_FALLBACK = '/images/planets/thumbs/unknown.png';
const STAR_FALLBACK = '/images/stars/thumbs/star-default.png';

// Handoff §Assets size rule: thumbs at <= 34px rendered, medium above.
// This is the single place the directory is chosen; no caller hard-codes one.
const size = computed<'thumbs' | 'medium'>(() => (props.px <= 34 ? 'thumbs' : 'medium'));

const resolvedSrc = computed(() =>
    props.kind === 'planet' ? getPlanetImage(props.code, size.value) : getStarImage(props.code, size.value)
);

const src = ref(resolvedSrc.value);
watch(resolvedSrc, (value) => {
    src.value = value;
});

// A missing file at runtime (a deploy slip) never leaves an empty cell.
const onError = () => {
    const fallback = props.kind === 'planet' ? PLANET_FALLBACK : STAR_FALLBACK;
    if (src.value !== fallback) {
        src.value = fallback;
    }
};

const shadows = computed(() => {
    const parts: string[] = [];
    if (props.ring) parts.push(`0 0 0 2px ${props.ring}`);
    // Handoff: star glow is 24-50px depending on how large the render is.
    if (props.glow) parts.push(`0 0 ${Math.min(50, Math.max(24, Math.round(props.px * 0.9)))}px ${props.glow}`);
    return parts.join(', ');
});

const wrapperStyle = computed(() => ({
    width: `${props.px}px`,
    height: `${props.px}px`,
    borderRadius: '50%',
    // Planets are rendered with transparent margins, so they sit on black.
    background: props.kind === 'planet' ? '#000000' : 'transparent',
    boxShadow: shadows.value || undefined
}));

const imageStyle = computed(() => ({
    width: `${props.px}px`,
    height: `${props.px}px`,
    borderRadius: '50%',
    objectFit: props.kind === 'planet' ? ('contain' as const) : ('cover' as const),
    display: 'block'
}));
</script>
